// Local workerd D1, not remote Cloudflare. All delivery, Stripe and model calls are mocks.
import {Miniflare} from 'miniflare';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {D1PaidStore} from '../src/worker/paid-store.mjs';
import {handlePaidRequest} from '../src/worker/paid-api.mjs';
import {handleAiRequest} from '../src/worker/ai-api.mjs';
import {reconcileCustomer} from '../src/worker/stripe-billing.mjs';
import {isUserEntitledTo} from '../src/worker/paid-access.mjs';
import {hash} from '../src/worker/paid-security.mjs';
const runtime=new Miniflare({telemetry:{enabled:false},workers:[{config:{name:'paid-local',compatibilityDate:'2026-09-30',manifest:{mainModule:'index.mjs',modules:{'index.mjs':{type:'esm',contents:'export default {fetch(){return new Response("local test");}}'}}},env:{PAID_DB:{type:'d1',id:'paid-staging-local'}}}}]});
const passed=[];
try{
 const db=await runtime.getD1Database('PAID_DB');
 // D1 exec treats each nonempty line as a statement; Wrangler's migration loader removes comments.
 for(const file of fs.readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(fs.readFileSync(`migrations/${file}`,'utf8').split('\n').filter(line=>line.trim()&&!line.trim().startsWith('--')).join('\n'));
 const store=new D1PaidStore(db),now=Date.now(),origin='https://paid-staging.example.test';
 await Promise.all(Array.from({length:5},(_,i)=>store.createSession('buyer@example.test',`fixture-session-${i}`,'fixture-csrf',now+60000,now)));
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').first()).n,1);
 const user=(await store.getSession('fixture-session-0',now)).userId;
 await store.saveChallenge({tokenHash:'fixture-token',browserHash:'fixture-browser',email:'buyer@example.test',expiresAt:now+10000});
 const consumed=await Promise.all(Array.from({length:5},()=>store.consumeChallenge('fixture-token','fixture-browser',now)));
 assert.equal(consumed.filter(Boolean).length,1);
 const attempts=await Promise.all(Array.from({length:10},()=>store.allowEmailAttempt('fixture-email-hash',now)));
 assert.equal(attempts.filter(Boolean).length,3);
 passed.push('account uniqueness, one-use tokens, concurrent resend throttling');
 await store.setCustomer(user,'cus_fixture');assert.equal((await store.customerUser('cus_fixture')).id,user);
 await store.applySubscription('evt_fixture',{id:'sub_fixture',userId:user,status:'active',validUntil:now+60000,cancelAtPeriodEnd:true},now);
 await assert.rejects(store.applySubscription('evt_fixture',{id:'sub_fixture',userId:user,status:'unpaid',validUntil:now+60000,cancelAtPeriodEnd:false},now));
 assert.equal((await store.getGrant(user)).status,'active');assert.equal(await store.eventProcessed('evt_fixture'),true);
 assert.equal(await store.lockCustomer('cus_fixture','owner',now),true);assert.equal(await store.lockCustomer('cus_fixture','other',now),false);await store.unlockCustomer('cus_fixture','owner');
 passed.push('customer mapping, entitlement reads/writes, duplicate webhook rollback, customer leases');
 const reservations=await Promise.allSettled(Array.from({length:10},(_,i)=>store.reserveUsage({id:`fixture-request-${i}`,userId:user,timestamp:now,month:'2026-10',workflow:'ask_course:debt',model:'fixture'},3)));
 assert.equal(reservations.filter(r=>r.status==='fulfilled').length,3);assert.equal((await store.usageSummary(user,'2026-10')).requestCount,3);
 const events=(await db.prepare('SELECT id FROM usage_events').all()).results;
 const usage={success:true,latencyMs:100,inputTokens:1000,cachedInputTokens:100,outputTokens:500,reasoningTokens:200,totalTokens:1500,estimatedCost:0.00291};
 await store.finishUsage(events[0].id,usage);await store.finishUsage(events[0].id,usage);
 assert.equal((await store.usageSummary(user,'2026-10')).knownEstimatedCost,0.00291);
 await store.finishUsage(events[1].id,{...usage,success:false,estimatedCost:null});
 assert.equal((await store.usageSummary(user,'2026-10')).unknownCostCount,2);
 await store.reserveUsage({id:'fixture-next-month',userId:user,timestamp:now,month:'2026-11',workflow:'ask_course:message',model:'fixture'},3);
 assert.equal((await store.usageSummary(user,'2026-11')).requestCount,1);
 passed.push('atomic concurrent quota, idempotent completion, failed accounting, monthly cost/count');
 await store.createSession('buyer@example.test','expired','fixture',now-1,now);
 await store.saveChallenge({tokenHash:'expired-token',browserHash:'fixture',email:'buyer@example.test',expiresAt:now-1});
 assert.equal(await store.getSession('expired',now),null);await store.cleanupExpiredAuth(now);
 assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE token_hash='expired'").first()).n,0);
 assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM auth_challenges WHERE token_hash='expired-token'").first()).n,0);
 await store.logout('fixture-session-0');assert.equal(await store.getSession('fixture-session-0',now),null);
 passed.push('expiry enforcement, cleanup and logout');

 // End-to-end application handlers backed by actual local D1 (providers remain mocked).
 let delivered,cookie='',csrf='',status='active',period=Math.floor(now/1000)+3600,modelCalls=0,providerCalls=0;
 const env={PAID_DB:db,AI_PAYWALL_ENABLED:'true',AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'true',ACCOUNT_ORIGIN:origin,BILLING_TEST_MODE:'true',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'fixture-signature-secret',STRIPE_MONTHLY_PRICE_ID:'price_fixture_month',STRIPE_ANNUAL_PRICE_ID:'price_fixture_year',AI_ENABLED:'true',AI_INTERACTIVE_ENABLED:'true',OPENAI_API_KEY:'fixture',OPENAI_VECTOR_STORE_ID:'vs_fixture',OPENAI_MODEL:'fixture',AI_MONTHLY_REQUEST_LIMIT:'20',AI_MODEL_PRICING_JSON:'{"fixture":{"inputPerMillion":1,"cachedInputPerMillion":0.1,"outputPerMillion":4}}',AUTH_MAILER:{sendSignIn:async p=>{delivered=p;return {accepted:true};}},...Object.fromEntries(['AI_SESSION_LIMITER','AI_IP_LIMITER','AI_EDGE_LIMITER'].map(k=>[k,{limit:async()=>({success:true})}]))};
 const subscription=()=>({id:'sub_e2e',object:'subscription',customer:'cus_e2e',livemode:false,status,cancel_at_period_end:status==='active',items:{data:[{price:{id:'price_fixture_month'},current_period_end:period}]}});
 const fetcher=async url=>{
  if(url==='https://api.openai.com/v1/responses'){modelCalls++;return Response.json({status:'completed',usage:{input_tokens:1000,input_tokens_details:{cached_tokens:100},output_tokens:500,output_tokens_details:{reasoning_tokens:200},total_tokens:1500},output:[{type:'file_search_call',status:'completed',results:[]},{type:'message',role:'assistant',content:[{type:'output_text',text:'{"responseText":"Fixture educational answer","suggestedActions":[]}'}]}]});}
  providerCalls++;
  if(url.endsWith('/customers'))return Response.json({id:'cus_e2e',livemode:false});
  if(url.endsWith('/checkout/sessions'))return Response.json({livemode:false,url:'https://checkout.stripe.com/c/pay/fixture'});
  if(url.endsWith('/billing_portal/sessions'))return Response.json({livemode:false,url:'https://billing.stripe.com/p/session/fixture'});
  if(url.includes('/subscriptions?'))return Response.json({object:'list',data:[subscription()],has_more:false});
  if(url.endsWith('/subscriptions/sub_e2e'))return Response.json(subscription());
  throw Error('Unexpected fixture provider call');
 };
 const request=(path,body)=>new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1','Sec-Fetch-Site':'same-origin','X-Account-Request':'1','X-CSRF-Token':csrf,Cookie:cookie,'X-AI-Session-ID':'672e377b-4a59-4e37-b271-5208686801e0'},...(body?{body:JSON.stringify(body)}:{})});
 const ai=()=>handleAiRequest(request('/api/ai',{mode:'ask_course',message:'Fictional test of EBITDA',history:[]}),env,{fetcher});
 assert.equal((await ai()).status,401);
 const started=await handlePaidRequest(request('/api/auth/start',{email:'new-buyer@example.test'}),env);
 assert.equal(started.status,200);cookie=started.headers.get('set-cookie').split(';')[0];
 const confirmed=await handlePaidRequest(request('/api/auth/confirm',{token:new URL(delivered.url).hash.slice(7)}),env);
 assert.equal(confirmed.status,200);csrf=(await confirmed.json()).csrfToken;cookie=confirmed.headers.get('set-cookie').split(';')[0];
 assert.equal((await ai()).status,402);assert.equal(modelCalls,0);
 assert.equal((await handlePaidRequest(request('/api/billing/checkout',{plan:'monthly',usCustomerAttested:true}),env,{fetcher})).status,403);
 assert.equal(providerCalls,0);
 const checkoutUser=(await store.getSession(await hash(cookie.split('=')[1]),Date.now())).userId;
 await db.prepare('INSERT INTO beta_checkout_approvals(user_id,approved_at,approved_by) VALUES(?,?,?)').bind(checkoutUser,now,'fixture-operator').run();
 assert.equal((await ai()).status,402);
 assert.equal((await handlePaidRequest(request('/api/billing/checkout',{plan:'monthly',usCustomerAttested:true}),env,{fetcher})).status,200);
 const webhook=async id=>{
  const body=JSON.stringify({id,livemode:false,type:'customer.subscription.updated',data:{object:subscription()}}),time=Math.floor(Date.now()/1000);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${time}.${body}`))),b=>b.toString(16).padStart(2,'0')).join('');
  return handlePaidRequest(new Request(origin+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':`t=${time},v1=${signature}`},body}),env,{fetcher});
 };
 assert.equal((await webhook('evt_e2e_active')).status,200);const callsBefore=providerCalls;
 assert.equal((await webhook('evt_e2e_active')).status,200);assert.equal(providerCalls,callsBefore);
 assert.equal((await ai()).status,200);assert.equal(modelCalls,1);
 const account=await handlePaidRequest(request('/api/account'),env);const accountData=await account.json();csrf=accountData.csrfToken;
 assert.equal(accountData.entitled,true);assert.equal(accountData.checkoutEligible,true);
 await db.prepare('UPDATE beta_checkout_approvals SET revoked_at=?,revoked_by=? WHERE user_id=?').bind(Date.now(),'fixture-operator',checkoutUser).run();
 assert.equal(isUserEntitledTo('ai_deal_lab',await store.getGrant(checkoutUser),Date.now()),true);assert.equal(accountData.usage.requestCount,1);assert.deepEqual(Object.keys(accountData.usage),['requestCount']);const accountUser=(await store.getSession(await hash(cookie.split('=')[1]),Date.now())).userId;assert.equal((await store.usageSummary(accountUser,new Date().toISOString().slice(0,7))).knownEstimatedCost,0.00291);
 assert.ok(!JSON.stringify(accountData).includes('cus_e2e'));assert.ok(!JSON.stringify(accountData).includes('sub_e2e'));assert.ok(!JSON.stringify(accountData).includes('new-buyer@example.test'));
 assert.equal((await handlePaidRequest(request('/api/billing/portal',{}),env,{fetcher})).status,200);
 assert.equal(isUserEntitledTo('ai_deal_lab',{status:'active',cancelAtPeriodEnd:true,validUntil:period*1000},now),true);
 status='canceled';assert.equal((await webhook('evt_e2e_cancel')).status,200);assert.equal((await ai()).status,402);
 for(const state of ['past_due','unpaid']){status=state;assert.equal((await webhook('evt_e2e_'+state)).status,200);assert.equal((await ai()).status,402);}
 status='active';assert.equal((await webhook('evt_e2e_recover')).status,200);assert.equal((await ai()).status,200);
 period=Math.floor(now/1000)-1;assert.equal((await webhook('evt_e2e_expired')).status,200);assert.equal((await ai()).status,402);
 period=Math.floor(now/1000)+3600;await reconcileCustomer('cus_e2e',env,{fetcher});assert.equal((await ai()).status,200);
 assert.equal((await handlePaidRequest(request('/api/auth/logout',{}),env)).status,200);assert.equal((await ai()).status,401);
 env.AI_PAYWALL_ENABLED='false';assert.equal((await ai()).status,200);
 env.AI_PAYWALL_ENABLED='true';env.PAID_DB=undefined;assert.equal((await ai()).status,503);
 const contents=JSON.stringify((await db.prepare('SELECT * FROM usage_events').all()).results);assert.ok(!contents.includes('Fictional test'));assert.ok(!contents.includes('Fixture educational answer'));
 passed.push('handler E2E: login, test Checkout mock, signed webhook, grant, AI, usage, private account, Portal mock, cancellation/unpaid/expiry/recovery/reconciliation/logout/off/storage failure');
 const monthly=await store.usageSummary((await store.customerUser('cus_e2e')).id,new Date().toISOString().slice(0,7));
 assert.equal(monthly.requestCount,3);assert.equal(monthly.knownEstimatedCost,0.00873);
 // Exercise the staging allowance itself, concurrently, and the real endpoint after exhaustion.
 const quotaUser=(await store.customerUser('cus_e2e')).id;
 const quota=await Promise.allSettled(Array.from({length:25},(_,i)=>store.reserveUsage({id:`staging-cap-${i}`,userId:quotaUser,timestamp:now,month:new Date().toISOString().slice(0,7),workflow:'ask_course:message',model:'fixture'},20)));
 assert.equal(quota.filter(r=>r.status==='fulfilled').length,17);
 assert.equal((await store.usageSummary(quotaUser,new Date().toISOString().slice(0,7))).requestCount,20);
 const quotaToken='b'.repeat(64);await store.createSession('new-buyer@example.test',await hash(quotaToken),'fixture-csrf',Date.now()+60000,now);
 cookie=`__Host-ac-session=${quotaToken}`;env.PAID_DB=db;
 const callsAtLimit=modelCalls,limited=await ai();assert.equal(limited.status,429);assert.equal((await limited.json()).error.code,'monthly_limit');assert.equal(modelCalls,callsAtLimit);
 passed.push('20-request UTC monthly cap: concurrent reservation and exhausted endpoint denial without a model call');
 const report={runtime:'local workerd D1 emulation',remoteCloudflare:false,realEmailDelivered:false,realStripeCalls:0,realOpenAICalls:0,passed,stagingMonthlyLimit:20,requestsAtLimit:20,modelCallsAfterExhaustion:0,syntheticUsageEstimateUsd:0.00291,syntheticInputCostUsd:0.00091,syntheticOutputCostUsd:0.002,syntheticReasoningCostWithinOutputUsd:0.0008,syntheticInputTokens:1000,syntheticCachedInputTokens:100,syntheticOutputTokens:500,syntheticReasoningSubset:200,monthly};
 fs.writeFileSync('artifacts/paid-d1-runtime-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await runtime.dispose();}
