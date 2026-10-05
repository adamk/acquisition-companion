import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePaidRequest} from '../src/worker/paid-api.mjs';
import {handleAiRequest} from '../src/worker/ai-api.mjs';
import {requirePaidAccess,isUserEntitledTo} from '../src/worker/paid-access.mjs';
import {hash} from '../src/worker/paid-security.mjs';
import productionWorker from '../src/worker/paid-production-index.mjs';

const token='a'.repeat(64),csrf='b'.repeat(64),userId='buyer-fixture';

function baseEnv(overrides={}){
 return {
  AI_ENABLED:'true',AI_INTERACTIVE_ENABLED:'true',OPENAI_API_KEY:'test-only',OPENAI_VECTOR_STORE_ID:'vs_test',
  AI_SESSION_LIMITER:{limit:async()=>({success:true})},AI_IP_LIMITER:{limit:async()=>({success:true})},AI_EDGE_LIMITER:{limit:async()=>({success:true})},
  PAID_ENVIRONMENT:'staging',BILLING_TEST_MODE:'true',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',
  STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year',PAID_DB:{prepare(){}},
  AUTH_MAILER:{async fetch(){return Response.json({accepted:true});}},...overrides,
 };
}

function fixture({approved=false,grant=null,session=true}={}){
 let customerId=null,calls=0,savedChallenge=null;const usage=[];
 const store={
  async getSession(){return session?{userId,csrfHash:await hash(csrf)}:null;},
  async getGrant(){return grant;},
  async getUser(){return {id:userId,email:'buyer@example.test',customerId};},
  async getBetaCheckoutApproval(){return approved?{approvedAt:Date.now()-1,revokedAt:null}:null;},
  async setCustomer(_id,id){customerId=id;return id;},
  async allowEmailAttempt(){return true;},
  async saveChallenge(challenge){savedChallenge=challenge;},
  async reserveUsage(record){usage.push(record);},
  async finishUsage(){},
 };
 const dependencies={store,async sendEmail(){},async fetcher(url){calls++;if(url.endsWith('/customers'))return Response.json({object:'customer',id:'cus_fixture',livemode:false});return Response.json({object:'checkout.session',url:'https://checkout.stripe.com/c/pay/fixture',livemode:false});}};
 const paidRequest=(path,body,authenticated=true)=>new Request(`https://acquisitioncompanion.com${path}`,{method:body===undefined?'GET':'POST',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json','Sec-Fetch-Site':'same-origin','CF-Connecting-IP':'198.51.100.42',...(authenticated?{Cookie:`__Host-ac-session=${token}`,'X-CSRF-Token':csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const aiRequest=(authenticated=false)=>new Request('https://acquisitioncompanion.com/api/ai',{method:'POST',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json','X-AI-Session-ID':'672e377b-4a59-4e37-b271-5208686801e0','CF-Connecting-IP':'198.51.100.42',...(authenticated?{Cookie:`__Host-ac-session=${token}`}:{})},body:JSON.stringify({mode:'ask_course',message:'Explain EBITDA briefly.',history:[]})});
 return {store,dependencies,paidRequest,aiRequest,calls:()=>calls,usage:()=>usage,savedChallenge:()=>savedChallenge,setSession(value){session=value;},setGrant(value){grant=value;}};
}

function modelOutput(){return Response.json({status:'completed',output:[{type:'file_search_call',status:'completed',results:[]},{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({responseText:'A concise sourced answer.',suggestedActions:['explain']})}]}]});}

test('all activation flags off leaves public pages readable and closes AI, auth, billing and mail',async()=>{
 const f=fixture(),env=baseEnv({AI_INTERACTIVE_ENABLED:'false',AI_PAYWALL_ENABLED:'false',AUTH_SIGNIN_ENABLED:'false',BILLING_ENABLED:'false',AUTH_MAIL_ENABLED:'false'});
 const status=await handlePaidRequest(f.paidRequest('/api/billing/status'),env,f.dependencies);
 assert.equal(status.status,200);assert.deepEqual(((await status.json()).enabled),false);
 const signIn=await handlePaidRequest(f.paidRequest('/api/auth/start',{email:'buyer@example.test'},false),env,f.dependencies);
 const checkout=await handlePaidRequest(f.paidRequest('/api/billing/checkout',{plan:'monthly',usCustomerAttested:true}),env,f.dependencies);
 assert.equal(signIn.status,404);assert.equal(checkout.status,404);assert.equal(f.calls(),0);
 const webhook=await handlePaidRequest(new Request('https://acquisitioncompanion.com/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),env,f.dependencies);
 assert.equal(webhook.status,400,'webhook remains independently routed but requires a valid Stripe signature');
 let modelCalls=0;const ai=await handleAiRequest(f.aiRequest(),env,{...f.dependencies,fetcher:async()=>{modelCalls++;return modelOutput();}});
 assert.equal(ai.status,503);assert.equal((await ai.json()).error.code,'interactive_disabled');assert.equal(modelCalls,0);
});

test('sign-in operates with AI paywall off while billing remains independently disabled',async()=>{
 const f=fixture(),env=baseEnv({AI_PAYWALL_ENABLED:'false',AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'false'});
 const status=await handlePaidRequest(f.paidRequest('/api/billing/status'),env,f.dependencies),data=await status.json();
 assert.equal(data.enabled,false);assert.equal(data.signInAvailable,true);assert.equal(data.billingAvailable,false);
 const signIn=await handlePaidRequest(f.paidRequest('/api/auth/start',{email:'buyer@example.test'},false),env,f.dependencies);
 assert.equal(signIn.status,200);assert.ok(f.savedChallenge());
 const checkout=await handlePaidRequest(f.paidRequest('/api/billing/checkout',{plan:'monthly',usCustomerAttested:true}),env,f.dependencies);
 assert.equal(checkout.status,404);assert.equal(f.calls(),0);
 const ai=await handleAiRequest(f.aiRequest(),{...env,AI_INTERACTIVE_ENABLED:'false'},{...f.dependencies,fetcher:async()=>modelOutput()});assert.equal(ai.status,503);assert.equal((await ai.json()).error.code,'interactive_disabled');
});

test('enabling billing alone does not open sign-in or gate anonymous AI',async()=>{
 const f=fixture({session:false}),env=baseEnv({AI_INTERACTIVE_ENABLED:'false',AI_PAYWALL_ENABLED:'false',AUTH_SIGNIN_ENABLED:'false',BILLING_ENABLED:'true'});
 const status=await handlePaidRequest(f.paidRequest('/api/billing/status'),env,f.dependencies),data=await status.json();
 assert.equal(data.enabled,false);assert.equal(data.signInAvailable,false);assert.equal(data.billingAvailable,true);
 const signIn=await handlePaidRequest(f.paidRequest('/api/auth/start',{email:'buyer@example.test'},false),env,f.dependencies);
 const checkout=await handlePaidRequest(f.paidRequest('/api/billing/checkout',{plan:'monthly',usCustomerAttested:true},false),env,f.dependencies);
 assert.equal(signIn.status,404);assert.equal(checkout.status,401);assert.equal(f.calls(),0);
 let modelCalls=0;const ai=await handleAiRequest(f.aiRequest(),env,{...f.dependencies,fetcher:async()=>{modelCalls++;return modelOutput();}});assert.equal(ai.status,503);assert.equal((await ai.json()).error.code,'interactive_disabled');assert.equal(modelCalls,0);
});

test('billing can run with AI paywall off but still requires account approval; approval is not entitlement',async()=>{
 const f=fixture(),env=baseEnv({AI_PAYWALL_ENABLED:'false',AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'true'});
 const status=await handlePaidRequest(f.paidRequest('/api/billing/status'),env,f.dependencies),data=await status.json();
 assert.equal(data.enabled,false);assert.equal(data.signInAvailable,true);assert.equal(data.billingAvailable,true);
 const unapproved=await handlePaidRequest(f.paidRequest('/api/billing/checkout',{plan:'monthly',usCustomerAttested:true}),env,f.dependencies);
 assert.equal(unapproved.status,403);assert.equal(f.calls(),0);
 f.store.getBetaCheckoutApproval=async()=>({approvedAt:Date.now()-1,revokedAt:null});
 const approved=await handlePaidRequest(f.paidRequest('/api/billing/checkout',{plan:'monthly',usCustomerAttested:true}),env,f.dependencies);
 assert.equal(approved.status,200);assert.equal(f.calls(),2);
 const grant={status:'active',validUntil:Date.now()+60_000};
 f.setGrant(grant);
 assert.equal(isUserEntitledTo('ai_deal_lab',grant),true);
 assert.equal(await requirePaidAccess(f.aiRequest(),env,{store:{...f.store,async getSession(){return null;}}}),null,'paywall off keeps anonymous AI open even when billing is enabled');
 assert.equal((await requirePaidAccess(f.aiRequest(true),{...env,AI_PAYWALL_ENABLED:'true',AUTH_SIGNIN_ENABLED:'false',BILLING_ENABLED:'false'},{store:f.store})).userId,userId,'an active grant is sufficient when AI access is subsequently gated');
 const denied=await handlePaidRequest(f.paidRequest('/api/billing/checkout',{plan:'monthly',usCustomerAttested:true}),baseEnv({AI_PAYWALL_ENABLED:'false',AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'false'}),f.dependencies);
 assert.equal(denied.status,404,'turning billing off closes Checkout without changing AI availability');
});

test('AI paywall alone gates AI; auth and billing stay off, and active subscription is sufficient',async()=>{
 const f=fixture({session:false}),env=baseEnv({AI_PAYWALL_ENABLED:'true',AUTH_SIGNIN_ENABLED:'false',BILLING_ENABLED:'false'});
 const auth=await handlePaidRequest(f.paidRequest('/api/auth/start',{email:'buyer@example.test'},false),env,f.dependencies);
 const checkout=await handlePaidRequest(f.paidRequest('/api/billing/checkout',{plan:'monthly',usCustomerAttested:true}),env,f.dependencies);
 assert.equal(auth.status,404);assert.equal(checkout.status,404);
 const anonymous=await handleAiRequest(f.aiRequest(),env,{...f.dependencies,fetcher:async()=>{throw new Error('must not call provider');}});
 assert.equal(anonymous.status,401);
 const paid=fixture({grant:{status:'active',validUntil:Date.now()+60_000}}),paidEnv=baseEnv({AI_PAYWALL_ENABLED:'true',AUTH_SIGNIN_ENABLED:'false',BILLING_ENABLED:'false'});
 assert.equal((await requirePaidAccess(paid.aiRequest(true),paidEnv,{store:paid.store})).userId,userId);
});

test('Checkout approval alone never unlocks AI; active access survives scheduled cancellation only through paid-through time',async()=>{
 let modelCalls=0;
 const approved=fixture({approved:true}),env=baseEnv({AI_PAYWALL_ENABLED:'true',AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'true'});
 const denied=await handleAiRequest(approved.aiRequest(true),env,{...approved.dependencies,fetcher:async()=>{modelCalls++;return modelOutput();}});
 assert.equal(denied.status,402,'paid_beta_checkout does not satisfy ai_deal_lab');
 assert.equal((await denied.json()).error.code,'subscription_required');
 assert.equal(approved.usage().length,0,'denied access creates no paid usage row');
 assert.equal(modelCalls,0,'denied access does not invoke the model');

 const periodEnd=Date.now()+60_000,scheduled=fixture({grant:{status:'active',validUntil:periodEnd,cancelAtPeriodEnd:true}});
 const allowed=await handleAiRequest(scheduled.aiRequest(true),env,{...scheduled.dependencies,fetcher:async()=>{modelCalls++;return modelOutput();}});
 assert.equal(allowed.status,200,'cancel_at_period_end remains entitled through the paid-through time');
 assert.equal(scheduled.usage().length,1);
 assert.equal(modelCalls,1);

 for(const grant of [
  {status:'canceled',validUntil:periodEnd,cancelAtPeriodEnd:true},
  {status:'past_due',validUntil:periodEnd},
  {status:'unpaid',validUntil:periodEnd},
  {status:'active',validUntil:Date.now()-1},
 ]){
  const inactive=fixture({grant});
  const response=await handleAiRequest(inactive.aiRequest(true),env,{...inactive.dependencies,fetcher:async()=>{modelCalls++;return modelOutput();}});
  assert.equal(response.status,402);
  assert.equal(inactive.usage().length,0);
 }
 assert.equal(modelCalls,1,'inactive and expired subscriptions fail before model access');
});

test('scheduled credential cleanup follows sign-in without enabling the AI paywall',async()=>{
 const batches=[];const PAID_DB={prepare(sql){return {bind(...args){return {sql,args};}};},async batch(statements){batches.push(statements.map(s=>s.sql));return [];}};
 await productionWorker.scheduled(null,{PAID_ENVIRONMENT:'production',ACCOUNT_ORIGIN:'https://acquisitioncompanion.com',AI_PAYWALL_ENABLED:'false',AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'false',PAID_DB});
 assert.equal(batches.length,1);assert.match(batches[0].join(' '),/DELETE FROM auth_challenges/);assert.doesNotMatch(batches[0].join(' '),/DELETE FROM usage_events/);
});
