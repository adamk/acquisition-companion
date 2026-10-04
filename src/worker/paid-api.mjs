import {paywallEnabled,billingEnabled,billingConfigured,authenticatedUser,isUserEntitledTo,monthlyLimit,hasAccountCapability} from './paid-access.mjs';
import {paidStore} from './paid-store.mjs';
import {beginSignIn,finishSignIn,requireCsrf} from './paid-auth.mjs';
import {createCheckout,createPortal,verifyWebhook,processWebhook} from './stripe-billing.mjs';
import {reply,paidErrorResponse,PaidError,unavailable,sameOriginPost,jsonBody,readBody,hash,cookieValue,secureCookie,randomToken} from './paid-security.mjs';
import {paidProduct} from '../lib/paid-product.mjs';
import {mailerAvailable} from './auth-mailer.mjs';
const paths=new Set(['/api/billing/status','/api/auth/start','/api/auth/confirm','/api/auth/logout','/api/account','/api/billing/checkout','/api/billing/portal','/api/billing/webhook']);
const authPaths=new Set(['/api/auth/start','/api/auth/confirm','/api/auth/logout','/api/account']);
const billingPaths=new Set(['/api/billing/checkout','/api/billing/portal']);
export async function handlePaidRequest(request,env={},dependencies={}){
 const path=new URL(request.url).pathname;if(!paths.has(path))return null;
 if(path==='/api/billing/status'){
  if(request.method!=='GET')return reply(405,{error:{code:'method_not_allowed',message:'Use GET.'}},{Allow:'GET'});
  return reply(200,{enabled:paywallEnabled(env),product:paidProduct,signInAvailable:env.AUTH_SIGNIN_ENABLED==='true'&&mailerAvailable(env)&&!!env.PAID_DB?.prepare,billingAvailable:billingEnabled(env)&&billingConfigured(env)&&!!env.PAID_DB?.prepare});
 }
 if(path==='/api/billing/webhook'){
  try{
   if(request.method!=='POST')return reply(405,{error:{code:'method_not_allowed',message:'Use POST.'}},{Allow:'POST'});
   if(!billingConfigured(env))throw unavailable();
   if(!/^application\/json(?:;.*)?$/i.test(request.headers.get('content-type')||''))throw new PaidError(415,'json_required','Send JSON.');
   const raw=await readBody(request,65536);
   const event=await verifyWebhook(raw,request.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET);
   return reply(200,await processWebhook(event,env,dependencies));
  }catch(error){return paidErrorResponse(error);}
 }
 if(authPaths.has(path)&&env.AUTH_SIGNIN_ENABLED!=='true')return reply(404,{error:{code:'auth_disabled',message:'Account sign-in is not available.'}});
 if(billingPaths.has(path)&&!billingEnabled(env))return reply(404,{error:{code:'billing_disabled',message:'Billing actions are not available.'}});
 try{
  if(path==='/api/account'){
   if(request.method!=='GET')return reply(405,{error:{code:'method_not_allowed',message:'Use GET.'}},{Allow:'GET'});
   // Only same-site JS can rotate CSRF tokens; cross-site requests cannot log users out or invalidate forms.
   if(request.headers.get('sec-fetch-site')!=='same-origin'||request.headers.get('x-account-request')!=='1')throw new PaidError(403,'same_origin_required','Open your account from this site.');
  }else sameOriginPost(request);
  if(path==='/api/auth/start')return await beginSignIn(request,await jsonBody(request,['email']),env,dependencies);
  if(path==='/api/auth/confirm')return await finishSignIn(request,await jsonBody(request,['token']),env,dependencies);
  const store=paidStore(env,dependencies),session=await authenticatedUser(request,store);
  if(!session)throw new PaidError(401,'login_required','Sign in to continue.');
  const tokenHash=await hash(cookieValue(request,'__Host-ac-session'));
  if(path==='/api/account'){
   const csrf=randomToken();await store.setCsrf(tokenHash,await hash(csrf));
   const grant=await store.getGrant(session.userId);
   const usage=await store.usageSummary(session.userId,new Date().toISOString().slice(0,7));
   const checkoutEligible=hasAccountCapability('paid_beta_checkout',await store.getBetaCheckoutApproval(session.userId));
   return reply(200,{signedIn:true,csrfToken:csrf,checkoutEligible,entitled:isUserEntitledTo('ai_deal_lab',grant,Date.now(),env.AI_ALLOW_TRIALS==='true'),subscription:grant?{status:grant.status,accessUntil:grant.validUntil,cancelAtPeriodEnd:!!grant.cancelAtPeriodEnd}:null,usage:{requestCount:usage.requestCount},monthlyRequestLimit:monthlyLimit(env)});
  }
  await requireCsrf(request,session);
  if(path==='/api/auth/logout'){await jsonBody(request,[]);await store.logout(tokenHash);return reply(200,{signedOut:true},{'Set-Cookie':secureCookie('__Host-ac-session','',0)});}
  const origin=new URL(request.url).origin;
  if(origin!==(env.ACCOUNT_ORIGIN||'https://acquisitioncompanion.com'))throw new PaidError(403,'same_origin_required','Use billing from the configured site.');
  if(path==='/api/billing/checkout'){const body=await jsonBody(request,['plan','usCustomerAttested']);return reply(200,await createCheckout(session.userId,body.plan,origin,env,dependencies,body.usCustomerAttested));}
  if(path==='/api/billing/portal'){await jsonBody(request,[]);return reply(200,await createPortal(session.userId,origin,env,dependencies));}
  throw unavailable();
 }catch(error){return paidErrorResponse(error);}
}
