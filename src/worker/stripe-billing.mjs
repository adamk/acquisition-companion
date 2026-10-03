import {paidStore} from './paid-store.mjs';
import {billingConfigured,isUserEntitledTo,hasAccountCapability} from './paid-access.mjs';
import {PaidError,unavailable} from './paid-security.mjs';
const API='https://api.stripe.com/v1';
// Preserve the API version exercised by staging; upgrade separately after compatibility review.
export const STRIPE_API_VERSION='2025-06-30.basil';
const API_VERSION=STRIPE_API_VERSION;
function correctMode(object,env){return env.PAID_ENVIRONMENT==='production'?object.livemode===true:env.BILLING_TEST_MODE==='true'?object.livemode===false:true;}
async function stripe(path,env,dependencies={},params=null,idempotencyKey=null){
 if(!billingConfigured(env))throw unavailable();
 const headers={Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Stripe-Version':API_VERSION};
 if(params)headers['Content-Type']='application/x-www-form-urlencoded';
 if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
 let response;
 try{response=await (dependencies.fetcher||fetch)(`${API}/${path}`,{method:params?'POST':'GET',headers,...(params?{body:new URLSearchParams(params).toString()}:{}),signal:AbortSignal.timeout(10000)});}catch{throw unavailable();}
 if(!response.ok)throw unavailable();
 const text=await response.text();if(text.length>262144)throw unavailable();
 try{const object=JSON.parse(text);if((object.object!=='list'&&!correctMode(object,env))||(object.object==='list'&&(!Array.isArray(object.data)||object.data.some(item=>!correctMode(item,env)))))throw unavailable();return object;}catch{throw unavailable();}
}
function hostedUrl(value,host){try{const url=new URL(value);if(url.protocol==='https:'&&url.hostname===host&&!url.username&&!url.password)return url.href;}catch{}throw unavailable();}
export async function createCheckout(userId,plan,origin,env,dependencies={},usCustomerAttested=false){
 if(!['monthly','annual'].includes(plan))throw new PaidError(400,'invalid_plan','Choose monthly or annual billing.');
 const store=paidStore(env,dependencies),user=await store.getUser(userId);if(!user)throw unavailable();
 const grant=await store.getGrant(userId);
 if(isUserEntitledTo('ai_deal_lab',grant,Date.now(),true))throw new PaidError(409,'already_subscribed','Manage your existing subscription in the customer portal.');
 if(!hasAccountCapability('paid_beta_checkout',await store.getBetaCheckoutApproval(userId)))throw new PaidError(403,'beta_approval_required','The initial paid beta is invite-only for U.S. customers. Contact support@acquisitioncompanion.com for approval.');
 if(usCustomerAttested!==true)throw new PaidError(400,'us_attestation_required','Confirm that you are a U.S. customer before subscribing to the paid beta.');
 let customer=user.customerId;
 if(!customer){const created=await stripe('customers',env,dependencies,{email:user.email,'metadata[ac_user_id]':userId},`ac-customer-${userId}`);if(!/^cus_[A-Za-z0-9_]+$/.test(created.id||''))throw unavailable();customer=await store.setCustomer(userId,created.id);}
 const session=await stripe('checkout/sessions',env,dependencies,{
  mode:'subscription',customer,client_reference_id:userId,'line_items[0][price]':env[plan==='monthly'?'STRIPE_MONTHLY_PRICE_ID':'STRIPE_ANNUAL_PRICE_ID'],'line_items[0][quantity]':'1',
  success_url:`${origin}/account/?checkout=complete`,cancel_url:`${origin}/pricing/`,
  'subscription_data[metadata][ac_beta_eligibility]':'operator_approved_us_attested',
 },`ac-checkout-${userId}-${plan}-${Math.floor(Date.now()/300000)}`);
 return {url:hostedUrl(session.url,'checkout.stripe.com')};
}
export async function createPortal(userId,origin,env,dependencies={}){
 const user=await paidStore(env,dependencies).getUser(userId);if(!user?.customerId)throw new PaidError(409,'no_subscription','There is no billing account to manage yet.');
 if(env.STRIPE_PORTAL_CONFIGURATION_ID&&!/^bpc_[A-Za-z0-9_]+$/.test(env.STRIPE_PORTAL_CONFIGURATION_ID))throw unavailable();
 const session=await stripe('billing_portal/sessions',env,dependencies,{customer:user.customerId,return_url:`${origin}/account/`,...(env.STRIPE_PORTAL_CONFIGURATION_ID?{configuration:env.STRIPE_PORTAL_CONFIGURATION_ID}:{})});
 return {url:hostedUrl(session.url,'billing.stripe.com')};
}
export async function verifyWebhook(raw,signature,secret,now=Date.now()){
 const invalid=()=>new PaidError(400,'invalid_signature','Invalid webhook signature.');
 if(!secret||typeof signature!=='string'||signature.length>2048)throw invalid();
 const parts=signature.split(',').map(p=>p.split('='));const times=parts.filter(([key])=>key==='t');
 if(times.length!==1||!/^\d+$/.test(times[0][1]))throw invalid();
 const time=Number(times[0][1]);if(Math.abs(now/1000-time)>300)throw invalid();
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 let valid=false;
 for(const [kind,value] of parts){if(kind!=='v1'||!value||!/^[a-f0-9]{64}$/.test(value))continue;const bytes=Uint8Array.from(value.match(/../g),v=>parseInt(v,16));if(await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(`${time}.${raw}`)))valid=true;}
 if(!valid)throw invalid();
 let event;try{event=JSON.parse(raw);}catch{throw invalid();}
 if(!/^evt_[A-Za-z0-9_]+$/.test(event?.id||'')||typeof event.type!=='string'||!event.data?.object)throw invalid();return event;
}
function reportWebhookFailure(env,dependencies,stage,httpStatus=503){
 if(env.PAID_ENVIRONMENT!=='staging'&&env.PAID_DIAGNOSTICS_ENABLED!=='true')return;
 (dependencies.reportWebhookFailure||(metadata=>console.warn(JSON.stringify(metadata))))({type:'billing_webhook_failure',stage,httpStatus});
}
async function webhookStep(env,dependencies,stage,work){
 try{return await work();}catch(error){reportWebhookFailure(env,dependencies,stage,error instanceof PaidError?error.status:503);throw error;}
}
export async function processWebhook(event,env,dependencies={}){
 if(!correctMode(event,env))throw unavailable();
 const store=paidStore(env,dependencies),now=Date.now();
 if(await webhookStep(env,dependencies,'event_deduplication',()=>store.eventProcessed(event.id)))return {received:true,duplicate:true};
 const object=event.data.object;
 let subscriptionId;
 if(event.type.startsWith('customer.subscription.'))subscriptionId=object.id;
 else if(['invoice.paid','invoice.payment_failed'].includes(event.type))subscriptionId=object.parent?.subscription_details?.subscription||object.subscription;
 else {await store.markEvent(event.id,now);return {received:true};}
 const customer=typeof object.customer==='string'?object.customer:object.customer?.id;
 if(!/^sub_[A-Za-z0-9_]+$/.test(subscriptionId||'')||!/^cus_[A-Za-z0-9_]+$/.test(customer||''))throw new PaidError(400,'invalid_event','Unsupported subscription event.');
 const user=await webhookStep(env,dependencies,'customer_mapping',()=>store.customerUser(customer));if(!user){reportWebhookFailure(env,dependencies,'customer_mapping_missing');throw unavailable();} // Retry: never accept client-supplied metadata as identity.
 const owner=crypto.randomUUID();
 if(!await webhookStep(env,dependencies,'customer_lock_acquisition',()=>store.lockCustomer(customer,owner,now))){reportWebhookFailure(env,dependencies,'customer_lock_busy');throw unavailable();}
 try{
  if(await webhookStep(env,dependencies,'locked_event_deduplication',()=>store.eventProcessed(event.id)))return {received:true,duplicate:true};
  // Fetch current state under a customer lock: old event bodies never restore old entitlements.
  const subscription=await webhookStep(env,dependencies,'canonical_subscription_lookup',()=>stripe(`subscriptions/${subscriptionId}`,env,dependencies));
  if(subscription.id!==subscriptionId||subscription.customer!==customer)throw unavailable();
  await webhookStep(env,dependencies,'subscription_write',()=>store.applySubscription(event.id,{...subscriptionGrant(subscription,customer,env),userId:user.id},now));
  return {received:true};
 }finally{await webhookStep(env,dependencies,'customer_unlock',()=>store.unlockCustomer(customer,owner));}
}
function subscriptionGrant(subscription,customer,env){
 if(!/^sub_[A-Za-z0-9_]+$/.test(subscription.id||'')||subscription.customer!==customer||!correctMode(subscription,env))throw unavailable();
 const items=subscription.items?.data||[];
 const approved=items.length===1&&[env.STRIPE_MONTHLY_PRICE_ID,env.STRIPE_ANNUAL_PRICE_ID].includes(items[0]?.price?.id)&&!subscription.pause_collection;
 const period=items[0]?.current_period_end??subscription.current_period_end;
 if(!Number.isSafeInteger(period)||period<0||typeof subscription.status!=='string')throw unavailable();
 return {id:subscription.id,status:approved?subscription.status:'ineligible',validUntil:period*1000,cancelAtPeriodEnd:subscription.cancel_at_period_end===true};
}
// Operator/service invocation only: no public reconciliation endpoint or browser-supplied identity.
export async function reconcileCustomer(customer,env,dependencies={}){
 if(!/^cus_[A-Za-z0-9_]+$/.test(customer||''))throw unavailable();
 const store=paidStore(env,dependencies),user=await store.customerUser(customer),now=Date.now();if(!user)throw unavailable();
 const owner=crypto.randomUUID();if(!await store.lockCustomer(customer,owner,now))throw unavailable();
 try{
  const current=await stripe(`subscriptions?customer=${encodeURIComponent(customer)}&status=all&limit=100`,env,dependencies);
  if(current.has_more!==false||!Array.isArray(current.data)||current.data.length>100)throw unavailable();
  const subscriptions=current.data.map(item=>subscriptionGrant(item,customer,env));
  await store.replaceSubscriptions(`reconcile:${crypto.randomUUID()}`,user.id,subscriptions,now);
  return {reconciled:true,subscriptions:subscriptions.length};
 }finally{await store.unlockCustomer(customer,owner);}
}
