import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {D1PaidStore} from '../src/worker/paid-store.mjs';
import {handleAiRequest} from '../src/worker/ai-api.mjs';
import {handlePaidRequest} from '../src/worker/paid-api.mjs';
import {hash} from '../src/worker/paid-security.mjs';
function storage(){
 const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(new URL('../migrations/0001_paid_access.sql',import.meta.url),'utf8'));
 const db={prepare(query){return {bind(...args){return {async first(){const row=sql.prepare(query).get(...args.map(a=>a===undefined?null:a));return row?{...row}:null;},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};}};}};},async batch(items){sql.exec('BEGIN');try{const results=[];for(const item of items)results.push(await item.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 sql.prepare('INSERT INTO users(id,email,created_at) VALUES(?,?,?)').run('u','test@example.test',0);
 return {store:new D1PaidStore(db),sql};
}

test('D1 migration supports atomic quota reservation, failure accounting, monthly aggregation and unknown cost',async()=>{
 const {store,sql}=storage(),record={id:'r1',userId:'u',timestamp:1,month:'2026-10',workflow:'ask_course:debt',model:'mock'};
 await store.reserveUsage(record,1);
 await assert.rejects(store.reserveUsage({...record,id:'r2'},1),e=>e.code==='monthly_limit');
 assert.equal(sql.prepare('SELECT count(*) AS n FROM usage_events').get().n,1);
 await store.finishUsage('r1',{success:false,latencyMs:100,inputTokens:50,cachedInputTokens:null,outputTokens:10,reasoningTokens:null,totalTokens:60,estimatedCost:0.1});
 await store.finishUsage('r1',{success:false,latencyMs:100,inputTokens:50,cachedInputTokens:null,outputTokens:10,reasoningTokens:null,totalTokens:60,estimatedCost:0.1});
 assert.deepEqual(await store.usageSummary('u','2026-10'),{requestCount:1,knownEstimatedCost:0.1,unknownCostCount:0});
 await store.reserveUsage({...record,id:'r3',month:'2026-11'},null);
 await store.finishUsage('r3',{success:false,latencyMs:100,inputTokens:null,cachedInputTokens:null,outputTokens:null,reasoningTokens:null,totalTokens:null,estimatedCost:null});
 assert.equal((await store.usageSummary('u','2026-11')).unknownCostCount,1);
 assert.equal(sql.prepare('SELECT success FROM usage_events WHERE id=?').get('r1').success,0);
 const columns=sql.prepare('PRAGMA table_info(usage_events)').all().map(c=>c.name);
 assert.ok(!columns.some(c=>/prompt|response|content|facts|history/.test(c)));
 sql.close();
});

test('D1 expiry, browser-bound challenges, logout and webhook ledger are real SQL operations',async()=>{
 const {store,sql}=storage();
 await store.saveChallenge({tokenHash:'t',browserHash:'b',email:'test@example.test',expiresAt:10});
 assert.equal(await store.consumeChallenge('t','wrong',1),null);
 assert.deepEqual(await store.consumeChallenge('t','b',1),{email:'test@example.test'});
 assert.equal(await store.consumeChallenge('t','b',1),null);
 await store.createSession('test@example.test','s','c',10,0);
 assert.equal((await store.getSession('s',1)).userId,'u');assert.equal(await store.getSession('s',10),null);
 await store.logout('s');assert.equal(await store.getSession('s',1),null);
 assert.equal(await store.lockCustomer('cus','owner',0),true);assert.equal(await store.lockCustomer('cus','other',1),false);
 await store.unlockCustomer('cus','other');assert.equal(await store.lockCustomer('cus','other',2),false);
 await store.unlockCustomer('cus','owner');assert.equal(await store.lockCustomer('cus','other',3),true);
 await store.applySubscription('evt',{id:'sub',userId:'u',status:'active',validUntil:100,cancelAtPeriodEnd:true},1);
 assert.equal(await store.eventProcessed('evt'),true);assert.equal((await store.getGrant('u')).validUntil,100);
 await assert.rejects(store.applySubscription('evt',{id:'sub',userId:'u',status:'unpaid',validUntil:100,cancelAtPeriodEnd:false},2));
 assert.equal((await store.getGrant('u')).status,'active');sql.close();
});

test('challenge diagnostics classify state without consuming a challenge or returning stored values',async()=>{
 const {store,sql}=storage();
 await store.saveChallenge({tokenHash:'token-a',browserHash:'browser-a',email:'sensitive@example.test',expiresAt:10});
 assert.equal(await store.inspectChallenge('missing','browser-a',1),'not_found');
 assert.equal(await store.inspectChallenge('token-a','browser-b',1),'binding_mismatch');
 assert.equal(await store.inspectChallenge('token-a','browser-a',10),'expired');
 assert.equal(await store.inspectChallenge('token-a','browser-a',9),'eligible');
 assert.equal(sql.prepare('SELECT count(*) AS n FROM auth_challenges').get().n,1,'classification is read-only and does not consume the challenge');
 sql.close();
});

test('real AI seam records token metadata for success and failures without any user/assistant content',async()=>{
 const records=[];let calls=0;
 const store={getSession:async()=>({userId:'u'}),getGrant:async()=>({status:'active',validUntil:Date.now()+100000}),reserveUsage:async r=>records.push(r),finishUsage:async(id,r)=>records.push({id,...r})};
 const settings={AI_ENABLED:'true',OPENAI_API_KEY:'mock',OPENAI_VECTOR_STORE_ID:'vs_mock',AI_PAYWALL_ENABLED:'true',STRIPE_SECRET_KEY:'mock',STRIPE_WEBHOOK_SECRET:'mock',STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year',...Object.fromEntries(['AI_SESSION_LIMITER','AI_IP_LIMITER','AI_EDGE_LIMITER'].map(k=>[k,{limit:async()=>({success:true})}]))};
 const request=()=>new Request('https://acquisitioncompanion.com/api/ai',{method:'POST',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json',Cookie:`__Host-ac-session=${'a'.repeat(64)}`,'X-AI-Session-ID':'672e377b-4a59-4e37-b271-5208686801e0','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({mode:'ask_course',message:'UNIQUE_USER_TEXT',history:[]})});
 const fetcher=async()=>{calls++;return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:30,total_tokens:130,output_tokens_details:{reasoning_tokens:10}},output:[{type:'file_search_call',status:'completed',results:[]},{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({responseText:'UNIQUE_ASSISTANT_TEXT',suggestedActions:[]})}]}]});};
 assert.equal((await handleAiRequest(request(),settings,{store,fetcher})).status,200);
 assert.equal(calls,1);assert.equal(records[1].outputTokens,30);assert.equal(records[1].reasoningTokens,10);
 assert.equal(records[0].workflow,'ask_course:message');
 assert.equal((await handleAiRequest(request(),settings,{store,fetcher:async()=>new Response('{}',{status:500})})).status,503);
 assert.equal(records[3].success,false);assert.equal(records[3].inputTokens,null);
 assert.ok(!JSON.stringify(records).includes('UNIQUE_'));assert.ok(!JSON.stringify(records).includes('vs_mock'));
});

test('open AI meters only canonical paid accounts and enforces the 100-request cap only when paywall is on',async()=>{
 const {store,sql}=storage(),now=Date.now(),month=new Date(now).toISOString().slice(0,7);
 const paidToken='a'.repeat(64),freeToken='b'.repeat(64),expiresAt=now+60*60*1000;
 await store.createSession('test@example.test',await hash(paidToken),await hash('c'.repeat(64)),expiresAt,now);
 await sql.prepare('INSERT INTO users(id,email,created_at) VALUES(?,?,?)').run('free-user','free@example.test',now);
 await store.createSession('free@example.test',await hash(freeToken),await hash('d'.repeat(64)),expiresAt,now);
 await store.applySubscription('evt_active',{id:'sub_active',userId:'u',status:'active',validUntil:expiresAt,cancelAtPeriodEnd:false},now);
 let providerCalls=0;
 const limiter={limit:async()=>({success:true})};
 const env={AI_ENABLED:'true',OPENAI_API_KEY:'mock',OPENAI_VECTOR_STORE_ID:'vs_mock',OPENAI_MODEL:'gpt-test',PAID_ENVIRONMENT:'staging',AI_PAYWALL_ENABLED:'false',AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'true',BILLING_TEST_MODE:'true',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year',AI_MONTHLY_REQUEST_LIMIT:'1',AI_SESSION_LIMITER:limiter,AI_IP_LIMITER:limiter,AI_EDGE_LIMITER:limiter};
 const request=token=>new Request('https://acquisitioncompanion.com/api/ai',{method:'POST',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json','X-AI-Session-ID':'672e377b-4a59-4e37-b271-5208686801e0','CF-Connecting-IP':'192.0.2.1',...(token?{Cookie:`__Host-ac-session=${token}`}:{})},body:JSON.stringify({mode:'ask_course',message:'Explain EBITDA briefly.',history:[]})});
 const fetcher=async()=>{providerCalls++;return Response.json({status:'completed',usage:{input_tokens:20,output_tokens:10,total_tokens:30},output:[{type:'file_search_call',status:'completed',results:[]},{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({responseText:'EBITDA is operating earnings before interest, taxes, depreciation and amortization.',suggestedActions:[]})}]}]});};
 assert.equal((await handleAiRequest(request(null),env,{store,fetcher})).status,200,'anonymous AI remains open');
 assert.equal((await handleAiRequest(request(freeToken),env,{store,fetcher})).status,200,'a signed-in non-subscriber still uses open AI');
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM monthly_usage').get().n,0,'neither anonymous nor non-entitled requests create monthly paid usage');
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM usage_events').get().n,0,'neither anonymous nor non-entitled requests create paid usage events');
 assert.equal((await handleAiRequest(request(paidToken),env,{store,fetcher})).status,200,'an active entitled account is metered with paywall off');
 assert.equal((await store.usageSummary('u',month)).requestCount,1);
 assert.equal((await handleAiRequest(request(paidToken),env,{store,fetcher})).status,200,'a second HTTP request is counted once');
 assert.equal((await store.usageSummary('u',month)).requestCount,2);
 const paidRows=sql.prepare("SELECT id,user_id AS userId,timestamp,month,workflow,model FROM usage_events WHERE user_id='u' ORDER BY timestamp,id").all();
 await assert.rejects(store.reserveUsage(paidRows[0],null),'replaying the same reservation ID is rejected transactionally');
 assert.equal((await store.usageSummary('u',month)).requestCount,2,'a duplicate reservation ID cannot increment the aggregate twice');
 await store.finishUsage(paidRows[0].id,{success:true,latencyMs:1,inputTokens:20,cachedInputTokens:0,outputTokens:10,reasoningTokens:0,totalTokens:30,estimatedCost:null});
 assert.equal((await store.usageSummary('u',month)).requestCount,2,'re-finishing an already completed usage event does not increment the monthly count');
 sql.prepare('UPDATE monthly_usage SET request_count=99,unknown_cost_count=99 WHERE user_id=? AND month=?').run('u',month);
 const paywallEnv={...env,AI_PAYWALL_ENABLED:'true',AI_MONTHLY_REQUEST_LIMIT:'100'};
 assert.equal((await handleAiRequest(request(paidToken),paywallEnv,{store,fetcher})).status,200,'the 100th paid request is allowed');
 assert.equal((await store.usageSummary('u',month)).requestCount,100);
 const beforeBlocked=providerCalls,response=await handleAiRequest(request(paidToken),paywallEnv,{store,fetcher});
 assert.equal(response.status,429);assert.equal((await response.json()).error.code,'monthly_limit');
 assert.equal(providerCalls,beforeBlocked,'the 101st request is blocked before calling the provider');
 assert.equal((await store.usageSummary('u',month)).requestCount,100);
 const anonymous=await handleAiRequest(request(null),paywallEnv,{store,fetcher});
 assert.equal(anonymous.status,401,'paywall-on access still requires an active entitlement');
 assert.equal(providerCalls,beforeBlocked);
 sql.close();
});

test('ordinary account usage exposes request count without internal cost accounting',async()=>{
 const store={getSession:async()=>({userId:'u'}),setCsrf:async()=>{},getGrant:async()=>null,getBetaCheckoutApproval:async()=>null,usageSummary:async()=>({requestCount:2,knownEstimatedCost:0.001,unknownCostCount:1})};
 const request=new Request('https://acquisitioncompanion.com/api/account',{headers:{Cookie:`__Host-ac-session=${'a'.repeat(64)}`,'Sec-Fetch-Site':'same-origin','X-Account-Request':'1'}});
 const response=await handlePaidRequest(request,{AI_PAYWALL_ENABLED:'true',AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'false'},{store});
 assert.equal(response.status,200);
 const data=await response.json();assert.deepEqual(data.usage,{requestCount:2});assert.equal(data.subscription,null);
});


test('reviewed usage retention is optional and cannot erase current-month quota or unfinished calls',async()=>{
 const {usageRetentionCutoffs}=await import('../src/worker/paid-retention.mjs');
 const now=Date.UTC(2026,9,15),off=usageRetentionCutoffs({},now);
 assert.equal(off,null);assert.equal(usageRetentionCutoffs({PAID_USAGE_RETENTION_DAYS:'1'},now),null);
 assert.throws(()=>usageRetentionCutoffs({PAID_RETENTION_POLICY_APPROVED:'true',PAID_USAGE_RETENTION_DAYS:'0'},now));
 const policy=usageRetentionCutoffs({PAID_RETENTION_POLICY_APPROVED:'true',PAID_USAGE_RETENTION_DAYS:'1',PAID_MONTHLY_USAGE_RETENTION_MONTHS:'1'},now);
 assert.equal(policy.usageBefore,Date.UTC(2026,9,1));assert.equal(policy.monthBefore,'2026-09');
 const {store,sql}=storage();
 for(const [id,month,timestamp,complete] of [['old','2026-08',Date.UTC(2026,7,1),true],['unfinished','2026-08',Date.UTC(2026,7,2),false],['current','2026-10',Date.UTC(2026,9,1),true]]){
  await store.reserveUsage({id,userId:'u',timestamp,month,workflow:'ask_course:message',model:'fixture'},100);
  if(complete)await store.finishUsage(id,{success:true,latencyMs:1,inputTokens:1,cachedInputTokens:0,outputTokens:1,reasoningTokens:0,totalTokens:2,estimatedCost:null});
 }
 await store.cleanupUsage(null);assert.equal(sql.prepare('SELECT count(*) AS n FROM usage_events').get().n,3);
 await store.cleanupUsage(policy);
 assert.deepEqual(sql.prepare('SELECT id FROM usage_events ORDER BY id').all().map(r=>r.id),['current','unfinished']);
 assert.equal((await store.usageSummary('u','2026-10')).requestCount,1);
 assert.equal((await store.usageSummary('u','2026-08')).requestCount,2,'unfinished accounting retains its historical aggregate');
 sql.close();
});

test('retention config must use positive integral periods and leaves billing/idempotency data untouched',async()=>{
 const {usageRetentionCutoffs}=await import('../src/worker/paid-retention.mjs');
 for(const value of ['-1','1.5','forever','999999999999999999'])assert.throws(()=>usageRetentionCutoffs({PAID_RETENTION_POLICY_APPROVED:'true',PAID_USAGE_RETENTION_DAYS:value},Date.UTC(2026,9,15)));
 assert.equal(usageRetentionCutoffs({PAID_RETENTION_POLICY_APPROVED:'true'},Date.UTC(2026,9,15)),null);
 const {store,sql}=storage();await store.applySubscription('evt_retained',{id:'sub_retained',userId:'u',status:'canceled',validUntil:1,cancelAtPeriodEnd:false},1);
 await store.cleanupUsage({usageBefore:Date.UTC(2026,9,1),monthBefore:'2026-09'});
 assert.equal(await store.eventProcessed('evt_retained'),true);assert.equal((await store.getUser('u')).id,'u');assert.equal((await store.getGrant('u')).status,'canceled');sql.close();
});
