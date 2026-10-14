import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleAiRequest} from '../src/worker/ai-api.mjs';
import {D1PaidStore} from '../src/worker/paid-store.mjs';
import {hash} from '../src/worker/paid-security.mjs';

const token='a'.repeat(64),origin='https://acquisitioncompanion.com';
const payload=(extra={})=>({mode:'seller_call_coach',action:'next_question',notes:'Owner says $600k profit. UNIQUE_CALL_NOTE',coverage:{},recentQuestions:[],...extra});
const request=(body=payload(),headers={})=>new Request(`${origin}/api/ai`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-AI-Session-ID':'672e377b-4a59-4e37-b271-5208686801e0','CF-Connecting-IP':'192.0.2.1',Cookie:`__Host-ac-session=${token}`,...headers},body:JSON.stringify(body)});
const env=(extra={})=>({AI_ENABLED:'true',AI_INTERACTIVE_ENABLED:'true',AI_PAYWALL_ENABLED:'true',AI_MONTHLY_REQUEST_LIMIT:'100',OPENAI_API_KEY:'fixture',OPENAI_VECTOR_STORE_ID:'vs_existing',STRIPE_SECRET_KEY:'fixture',STRIPE_WEBHOOK_SECRET:'fixture',STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year',...Object.fromEntries(['AI_SESSION_LIMITER','AI_IP_LIMITER','AI_EDGE_LIMITER'].map(k=>[k,{limit:async()=>({success:true})}])),...extra});
const next={nextQuestion:'Which earnings measure does that profit refer to?',whyItMatters:'Define earnings before discussing valuation or debt.',watchFor:'A verbal claim is unverified.',coverage:[{area:'earnings',status:'partial'}],review:null};
const review={nextQuestion:'',whyItMatters:'',watchFor:'',coverage:[],review:{learned:['Seller reports profit; basis undefined.'],unclear:['Earnings definition.'],risks:['Owner dependence needs evidence.'],agenda:['Clarify earnings.'],followUpQuestions:['Which earnings measure did you mean?']}};
const output=(data=next)=>Response.json({status:'completed',usage:{input_tokens:30,output_tokens:20,total_tokens:50},output:[{type:'file_search_call',status:'completed',results:[]},{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(data)}]}]});
function memoryStore(){const records=[];return {records,getSession:async()=>({userId:'u'}),getGrant:async()=>({status:'active',validUntil:Date.now()+60000}),reserveUsage:async(r,limit)=>{assert.equal(limit,100);records.push(r);},finishUsage:async(id,r)=>records.push({id,...r})};}

test('coach always requires a signed-in active entitlement, even with general paywall disabled',async()=>{
 for(const paywall of ['true','false'])for(const [session,grant,want] of [[null,null,401],[{userId:'u'},null,402],[{userId:'u'},{status:'past_due',validUntil:Date.now()+60000},402]]){
  let calls=0;const store={getSession:async()=>session,getGrant:async()=>grant};
  const r=await handleAiRequest(request(),env({AI_PAYWALL_ENABLED:paywall}),{store,fetcher:async()=>{calls++;return output();}});
  assert.equal(r.status,want);assert.equal(calls,0);
 }
});

test('next question and review use one reservation each, existing File Search and no provider history storage',async()=>{
 const store=memoryStore();const sent=[];
 for(const action of ['next_question','review_call']){
  const r=await handleAiRequest(request(payload({action})),env({AI_PAYWALL_ENABLED:'false'}),{store,fetcher:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');sent.push(JSON.parse(options.body));return output(action==='review_call'?review:next);}});
  assert.equal(r.status,200);const result=await r.json();assert.deepEqual(result.coach,action==='review_call'?review:next);
 }
 assert.equal(store.records.length,4);assert.equal(store.records[0].workflow,'seller_call_coach:next_question');assert.equal(store.records[2].workflow,'seller_call_coach:review_call');
 for(const body of sent){assert.equal(body.store,false);assert.deepEqual(body.tools[0].vector_store_ids,['vs_existing']);assert.equal(body.tool_choice,'required');assert.equal(body.text.format.strict,true);assert.ok(JSON.stringify(body.input).includes('UNIQUE_CALL_NOTE'));}
 assert.ok(!JSON.stringify(store.records).includes('UNIQUE_CALL_NOTE'));
});

test('invalid coach input fails before quota or provider calls',async()=>{
 const store=memoryStore();let calls=0;
 for(const [body,want] of [[payload({notes:'  '}),400],[payload({notes:'x'.repeat(4001)}),413],[payload({coverage:{unknown:'clear'}}),400],[payload({coverage:{earnings:'verified'}}),400],[payload({recentQuestions:['x'.repeat(321)]}),400],[payload({recentQuestions:Array(4).fill('q')}),400],[payload({transcript:'no uploads'}),400],[payload({action:'lender_call'}),400]]){
  const r=await handleAiRequest(request(body),env(),{store,fetcher:async()=>{calls++;return output();}});assert.equal(r.status,want);
 }
 assert.equal((await handleAiRequest(request(payload({notes:'é'.repeat(8000)})),env(),{store})).status,413);
 assert.equal(calls,0);assert.equal(store.records.length,0);
});

test('coach preserves same-origin and rate limits before charging',async()=>{
 const store=memoryStore();assert.equal((await handleAiRequest(request(payload(),{Origin:'https://evil.test'}),env(),{store})).status,403);
 assert.equal((await handleAiRequest(request(),env({AI_IP_LIMITER:{limit:async()=>({success:false})}}),{store})).status,429);assert.equal(store.records.length,0);
});

test('malformed output and provider failures stay generic and count once without note diagnostics',async()=>{
 for(const fetcher of [async()=>output({...next,nextQuestion:'First? Second?'}),async()=>output({...next,coverage:[{area:'earnings',status:'verified'}]}),async()=>Response.json({error:{code:'unique_call_note',message:'UNIQUE_CALL_NOTE missing scopes: api.unique_call_note'}},{status:500}),async()=>{throw Error('UNIQUE_CALL_NOTE');},async()=>Response.json({status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[]})]){
  const store=memoryStore(),logs=[];const r=await handleAiRequest(request(),env({PAID_DIAGNOSTICS_ENABLED:'true'}),{store,fetcher,reportProviderFailure:v=>logs.push(v)});
  assert.ok(r.status>=500);assert.ok(!(await r.text()).includes('UNIQUE_CALL_NOTE'));assert.equal(store.records.length,2);assert.equal(store.records[1].success,false);assert.ok(!JSON.stringify(logs).toLowerCase().includes('unique_call_note'));
 }
});

test('real D1 accounting stores no notes or model output, and shares the 100-request quota',async()=>{
 const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync(new URL('../migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync(new URL(`../migrations/${f}`,import.meta.url),'utf8'));
 const writes=[];const db={prepare(q){return {bind(...args){return {async first(){return sql.prepare(q).get(...args)??null;},async run(){writes.push({q,args});const r=sql.prepare(q).run(...args);return {meta:{changes:Number(r.changes)}};}};}};},async batch(items){sql.exec('BEGIN');try{const r=[];for(const i of items)r.push(await i.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 try{
  const store=new D1PaidStore(db),now=Date.now(),month=new Date(now).toISOString().slice(0,7);
  await store.createSession('fixture@example.test',await hash(token),await hash('c'.repeat(64)),now+60000,now);const user=(await store.getSession(await hash(token),now)).userId;
  await store.applySubscription('evt_coach',{id:'sub_coach',userId:user,status:'active',validUntil:now+60000,cancelAtPeriodEnd:false},now);
  for(const action of ['next_question','review_call'])assert.equal((await handleAiRequest(request(payload({action})),env(),{store,fetcher:async()=>output(action==='review_call'?review:next)})).status,200);
  assert.equal((await store.usageSummary(user,month)).requestCount,2);
  assert.equal(sql.prepare('SELECT count(*) n FROM usage_events').get().n,2);
  assert.ok(!JSON.stringify(writes).includes('UNIQUE_CALL_NOTE'));assert.ok(!JSON.stringify(writes).includes(next.nextQuestion));
  sql.prepare('UPDATE monthly_usage SET request_count=100 WHERE user_id=? AND month=?').run(user,month);
  const r=await handleAiRequest(request(),env(),{store,fetcher:async()=>{assert.fail('quota denial must precede model');}});assert.equal(r.status,429);assert.equal(sql.prepare('SELECT count(*) n FROM usage_events').get().n,2);
 }finally{sql.close();}
});
