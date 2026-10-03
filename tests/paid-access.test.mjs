import test from 'node:test';
import assert from 'node:assert/strict';
import {paywallEnabled,isUserEntitledTo,requirePaidAccess,estimatedCost} from '../src/worker/paid-access.mjs';
import {handleAiRequest} from '../src/worker/ai-api.mjs';

const request=()=>new Request('https://acquisitioncompanion.com/api/ai',{method:'POST',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json','X-AI-Session-ID':'a57b0383-eced-4ff3-83d8-73940fb97c41','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({mode:'ask_course',message:'Explain EBITDA',history:[]})});
const env=()=>({AI_ENABLED:'true',OPENAI_API_KEY:'mock',OPENAI_VECTOR_STORE_ID:'vs_mock',...Object.fromEntries(['AI_SESSION_LIMITER','AI_IP_LIMITER','AI_EDGE_LIMITER'].map(k=>[k,{limit:async()=>({success:true})}]))});

test('paywall defaults off regardless of billing credentials and never touches new storage',async()=>{
 assert.equal(paywallEnabled({STRIPE_SECRET_KEY:'mock'}),false);
 assert.equal(paywallEnabled({AI_PAYWALL_ENABLED:'TRUE'}),false);
 const off={STRIPE_SECRET_KEY:'mock',get PAID_DB(){throw Error('must not touch');}};
 assert.equal(await requirePaidAccess(request(),off),null);
 const response=await handleAiRequest(new Request('https://acquisitioncompanion.com/api/ai/status'),{...env(),STRIPE_SECRET_KEY:'mock',get PAID_DB(){throw Error('must not touch');}});
 assert.deepEqual(await response.json(),{status:'ready',available:true});
});

test('application grants handle active, cancellation, trial, unpaid and expiration separately',()=>{
 const now=1000,grant={status:'active',validUntil:2000};
 assert.equal(isUserEntitledTo('ai_deal_lab',grant,now),true);
 assert.equal(isUserEntitledTo('other',grant,now),false);
 assert.equal(isUserEntitledTo('ai_deal_lab',{...grant,cancelAtPeriodEnd:true},now),true);
 for(const status of ['canceled','unpaid','past_due','incomplete','paused'])assert.equal(isUserEntitledTo('ai_deal_lab',{...grant,status},now),false);
 assert.equal(isUserEntitledTo('ai_deal_lab',{...grant,validUntil:999},now),false);
 assert.equal(isUserEntitledTo('ai_deal_lab',{...grant,status:'trialing'},now),false);
 assert.equal(isUserEntitledTo('ai_deal_lab',{...grant,status:'trialing'},now,true),true);
});

test('enabled access denies no session, no entitlement and storage errors; allows a valid grant',async()=>{
 const settings={AI_PAYWALL_ENABLED:'true',STRIPE_SECRET_KEY:'mock',STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year',STRIPE_WEBHOOK_SECRET:'mock'};
 const store={getSession:async()=>null};
 await assert.rejects(requirePaidAccess(request(),settings,{store}),error=>error.code==='login_required');
 const authenticated=new Request(request(),{headers:{...Object.fromEntries(request().headers),Cookie:'__Host-ac-session=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}});
 store.getSession=async()=>({userId:'u1'});store.getGrant=async()=>null;
 await assert.rejects(requirePaidAccess(authenticated,settings,{store}),error=>error.code==='subscription_required');
 store.getGrant=async()=>({status:'active',validUntil:Date.now()+10000});
 assert.equal((await requirePaidAccess(authenticated,settings,{store})).userId,'u1');
 store.getGrant=async()=>{throw Error('storage');};
 await assert.rejects(requirePaidAccess(authenticated,settings,{store}),error=>error.code==='billing_unavailable');
 await assert.rejects(requirePaidAccess(authenticated,{AI_PAYWALL_ENABLED:'true'},{store}),error=>error.code==='billing_unavailable');
});

test('enabled AI endpoint denies direct unauthenticated or unentitled requests without model calls',async()=>{
 let calls=0;
 for(const store of [{getSession:async()=>null},{getSession:async()=>({userId:'u'}),getGrant:async()=>null}]){
  const response=await handleAiRequest(new Request(request(),{headers:{...Object.fromEntries(request().headers),Cookie:'__Host-ac-session=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}}),{...env(),AI_PAYWALL_ENABLED:'true',STRIPE_SECRET_KEY:'mock',STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year',STRIPE_WEBHOOK_SECRET:'mock'},{store,fetcher:async()=>{calls++;throw Error('no');}});
  assert.ok([401,402].includes(response.status));
 }
 assert.equal(calls,0);
});

test('central cost rates distinguish missing usage/rates from actual zero',()=>{
 const settings={AI_MODEL_PRICING_JSON:JSON.stringify({'mock-model':{inputPerMillion:1,cachedInputPerMillion:0.1,outputPerMillion:4}})};
 assert.equal(estimatedCost(settings,'mock-model',{inputTokens:1000,cachedInputTokens:100,outputTokens:500}),0.00291);
 assert.equal(estimatedCost(settings,'unknown',{inputTokens:0,outputTokens:0}),null);
 assert.equal(estimatedCost(settings,'mock-model',{inputTokens:null,outputTokens:1}),null);
 assert.equal(estimatedCost(settings,'mock-model',{inputTokens:0,outputTokens:0}),0);
});
