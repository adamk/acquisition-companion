import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleAiRequest} from '../src/worker/ai-api.mjs';
import {handlePaidRequest} from '../src/worker/paid-api.mjs';
import {newDeal} from '../src/lib/deal-workspace.mjs';
import {workspaceInstructions,workspaceResponseSchema,parseWorkspaceResult} from '../src/worker/deal-workspace.mjs';
import {D1PaidStore} from '../src/worker/paid-store.mjs';
import {hash} from '../src/worker/paid-security.mjs';

const token='a'.repeat(64),origin='https://acquisitioncompanion.com';
const payload=(extra={})=>({mode:'deal_workspace',action:'review_gaps',deal:newDeal('UNIQUE_WORKSPACE_FACT'),...extra});
const request=(body=payload(),headers={})=>new Request(`${origin}/api/ai`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-AI-Session-ID':'672e377b-4a59-4e37-b271-5208686801e0','CF-Connecting-IP':'192.0.2.1',Cookie:`__Host-ac-session=${token}`,...headers},body:JSON.stringify(body)});
const env=(extra={})=>({AUTH_SIGNIN_ENABLED:'true',AI_ENABLED:'true',AI_INTERACTIVE_ENABLED:'true',AI_PAYWALL_ENABLED:'true',AI_MONTHLY_REQUEST_LIMIT:'100',OPENAI_API_KEY:'fixture',OPENAI_VECTOR_STORE_ID:'vs_existing',STRIPE_SECRET_KEY:'fixture',STRIPE_WEBHOOK_SECRET:'fixture',STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year',...Object.fromEntries(['AI_SESSION_LIMITER','AI_IP_LIMITER','AI_EDGE_LIMITER'].map(k=>[k,{limit:async()=>({success:true})}])),...extra});
const review={known:['The user reports an early acquisition discussion.'],unclear:['Earnings measure is not provided.'],evidenceGaps:['Request dated earnings support.'],risks:['Investigate owner dependence.'],questions:['Which earnings measure is being discussed?'],actions:['Agree the next evidence request.']};
const output=(data={workspaceReview:review})=>Response.json({status:'completed',usage:{input_tokens:30,output_tokens:20,total_tokens:50},output:[{type:'file_search_call',status:'completed',results:[]},{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(data)}]}]});
function memoryStore(){const records=[];return {records,getSession:async()=>({userId:'u'}),getGrant:async()=>({status:'active',validUntil:Date.now()+60000}),reserveUsage:async(r,limit)=>{assert.equal(limit,100);records.push(r);},finishUsage:async(id,r)=>records.push({id,...r})};}

test('workspace requires signed-in current entitlement with general paywall on or off',async()=>{
 for(const paywall of ['true','false'])for(const [session,grant,want] of [[null,null,401],[{userId:'u'},null,402],[{userId:'u'},{status:'past_due',validUntil:Date.now()+60000},402],[{userId:'u'},{status:'active',validUntil:Date.now()-1},402]]){
  let calls=0;const r=await handleAiRequest(request(),env({AI_PAYWALL_ENABLED:paywall}),{store:{getSession:async()=>session,getGrant:async()=>grant},fetcher:async()=>{calls++;return output();}});assert.equal(r.status,want);assert.equal(calls,0);
 }
});

test('workspace uses one shared-quota reservation and finish, existing retrieval and strict private provider output',async()=>{
 const store=memoryStore();let sent;
 const r=await handleAiRequest(request(),env({AI_PAYWALL_ENABLED:'false'}),{store,fetcher:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(options.body);return output();}});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{workspaceReview:review,citations:[]});assert.equal(store.records.length,2);assert.equal(store.records[0].id,store.records[1].id);assert.equal(store.records[0].workflow,'deal_workspace:review_gaps');assert.equal(store.records[1].success,true);
 assert.equal(sent.store,false);assert.deepEqual(sent.tools[0].vector_store_ids,['vs_existing']);assert.equal(sent.tool_choice,'required');assert.equal(sent.text.format.strict,true);assert.deepEqual(sent.text.format.schema,workspaceResponseSchema());assert.ok(JSON.stringify(sent.input).includes('UNIQUE_WORKSPACE_FACT'));assert.ok(!JSON.stringify(store.records).includes('UNIQUE_WORKSPACE_FACT'));
});

test('workspace rejects malformed schema, unsupported keys, actions and body limits before quota/provider',async()=>{
 const store=memoryStore();let calls=0;const base=payload();
 for(const [body,want] of [[payload({action:'save'}),400],[payload({history:[]}),400],[payload({deal:null}),400],[payload({deal:{...base.deal,extra:'hidden'}}),400],[payload({deal:{...base.deal,version:2}}),400],[payload({deal:{...base.deal,alias:'x'.repeat(13000)}}),413]]){
  assert.equal((await handleAiRequest(request(body),env(),{store,fetcher:async()=>{calls++;return output();}})).status,want);
 }
 const underBodyButOverDeal={...base.deal,evidence:[],claims:Array.from({length:16},(_,i)=>({id:`claim-${i}`,statement:'é'.repeat(240),category:'financial',status:'seller_claim',note:'é'.repeat(20)}))};
 assert.ok(new TextEncoder().encode(JSON.stringify(underBodyButOverDeal)).length>10000);
 assert.ok(new TextEncoder().encode(JSON.stringify(payload({deal:underBodyButOverDeal}))).length<12*1024);
 const oversizedDeal=await handleAiRequest(request(payload({deal:underBodyButOverDeal})),env(),{store});
 assert.equal(oversizedDeal.status,413);assert.equal((await oversizedDeal.json()).error.code,'deal_too_large');
 assert.equal(calls,0);assert.equal(store.records.length,0);
});

test('workspace preserves origin, JSON, session and rate gates without charging',async()=>{
 const store=memoryStore();
 for(const [headers,want] of [[{Origin:'https://evil.test'},403],[{'Sec-Fetch-Site':'cross-site'},403],[{'Content-Type':'text/plain'},415],[{'X-AI-Session-ID':'invalid'},400]])assert.equal((await handleAiRequest(request(payload(),headers),env(),{store})).status,want);
 assert.equal((await handleAiRequest(request(),env({AI_IP_LIMITER:{limit:async()=>({success:false})}}),{store})).status,429);assert.equal(store.records.length,0);
});

test('workspace output is bounded and exact and failure diagnostics cannot derive deal content',async()=>{
 const bad=[{workspaceReview:{...review,actions:[]}},{workspaceReview:{...review,questions:Array(6).fill('q')}},{workspaceReview:{...review,known:['x'.repeat(321)]}},{workspaceReview:{...review,known:[' ']}},{workspaceReview:{...review,extra:['x']}},{workspaceReview:review,unexpected:'x'}];
 for(const data of bad)assert.equal(parseWorkspaceResult(data),null);
 assert.deepEqual(parseWorkspaceResult({workspaceReview:review}),review);
 for(const fetcher of [...bad.map(data=>async()=>output(data)),async()=>Response.json({error:{code:'unique_workspace_fact',message:'UNIQUE_WORKSPACE_FACT missing scopes: api.unique_workspace_fact'}},{status:500}),async()=>{throw Error('UNIQUE_WORKSPACE_FACT');},async()=>Response.json({status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[]}),async()=>Response.json({output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({workspaceReview:review})}]}]}),async()=>new Response('x',{headers:{'Content-Length':'1000001'}})]){
  const store=memoryStore(),logs=[];const r=await handleAiRequest(request(),env({PAID_DIAGNOSTICS_ENABLED:'true'}),{store,fetcher,reportProviderFailure:v=>logs.push(v)});
  assert.ok(r.status>=500);assert.ok(!(await r.text()).includes('UNIQUE_WORKSPACE_FACT'));assert.equal(store.records.length,2);assert.equal(store.records[1].success,false);assert.ok(!JSON.stringify(logs).toLowerCase().includes('unique_workspace_fact'));
 }
});

test('workspace instruction fixtures preserve reported claims, evidence limitations and financial ambiguity',()=>{
 const instructions=workspaceInstructions(payload());
 for(const pattern of [/untrusted/i,/seller.claim/i,/clarified/i,/evidence.seen/i,/follow.up/i,/received/i,/reviewed/i,/user.reported/i,/never.*verif/i,/undefined.*earnings/i,/unsupported add.backs/i,/concentration/i,/owner/i,/transfer/i,/asOf/i,/stale/i,/no.*benchmarks/i,/offer/i,/File Search/i])assert.match(instructions,pattern);
 const schema=workspaceResponseSchema();assert.equal(schema.additionalProperties,false);for(const section of Object.values(schema.properties.workspaceReview.properties)){assert.equal(section.minItems,1);assert.equal(section.maxItems,5);assert.equal(section.items.maxLength,320);}
});

const accountRequest=(headers={})=>new Request(`${origin}/api/account`,{headers:{'Sec-Fetch-Site':'same-origin','X-Account-Request':'1',Cookie:`__Host-ac-session=${token}`,...headers}});
test('account namespace is stable, account-specific, opaque and unavailable without account safeguards',async()=>{
 const accountStore=userId=>({getSession:async()=>userId?{userId}:null,setCsrf:async()=>{},getGrant:async()=>null,usageSummary:async()=>({requestCount:0})});
 const read=async(userId)=>{const r=await handlePaidRequest(accountRequest(),env(),{store:accountStore(userId)});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store, private');return r.json();};
 const a=await read('random-user-one'),again=await read('random-user-one'),b=await read('random-user-two');
 assert.equal(a.localWorkspaceNamespace,again.localWorkspaceNamespace);assert.notEqual(a.localWorkspaceNamespace,b.localWorkspaceNamespace);assert.match(a.localWorkspaceNamespace,/^[a-f0-9]{64}$/);assert.equal(a.localWorkspaceNamespace,await hash('acquisition-companion:deal-workspace:v1\0random-user-one'));assert.ok(!JSON.stringify(a).includes('random-user-one'));
 for(const [req,userId,want] of [[accountRequest(),null,401],[accountRequest({'X-Account-Request':'0'}),'random-user-one',403],[accountRequest({'Sec-Fetch-Site':'cross-site'}),'random-user-one',403]]){const r=await handlePaidRequest(req,env(),{store:accountStore(userId)});assert.equal(r.status,want);assert.equal((await r.json()).localWorkspaceNamespace,undefined);}
});

test('real D1 receives no workspace content and shares quota with all existing AI modes',async()=>{
 const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync(new URL('../migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync(new URL(`../migrations/${f}`,import.meta.url),'utf8'));
 const writes=[];const db={prepare(q){return {bind(...args){return {async first(){return sql.prepare(q).get(...args)??null;},async run(){writes.push({q,args});const r=sql.prepare(q).run(...args);return {meta:{changes:Number(r.changes)}};}};}};},async batch(items){sql.exec('BEGIN');try{const r=[];for(const i of items)r.push(await i.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 try{
  const store=new D1PaidStore(db),now=Date.now(),month=new Date(now).toISOString().slice(0,7);
  await store.createSession('fixture@example.test',await hash(token),await hash('c'.repeat(64)),now+60000,now);const user=(await store.getSession(await hash(token),now)).userId;
  await store.applySubscription('evt_workspace',{id:'sub_workspace',userId:user,status:'active',validUntil:now+60000,cancelAtPeriodEnd:false},now);
  assert.equal((await handleAiRequest(request(),env(),{store,fetcher:async()=>output()})).status,200);
  assert.equal((await handleAiRequest(request({mode:'ask_course',message:'Explain earnings definitions.',history:[]}),env(),{store,fetcher:async()=>output({responseText:'Define the earnings measure before valuation.',suggestedActions:[]})})).status,200);
  assert.equal((await store.usageSummary(user,month)).requestCount,2);assert.equal(sql.prepare('SELECT count(*) n FROM usage_events').get().n,2);assert.ok(!JSON.stringify(writes).includes('UNIQUE_WORKSPACE_FACT'));assert.ok(!JSON.stringify(writes).includes(review.questions[0]));
  sql.prepare('UPDATE monthly_usage SET request_count=100 WHERE user_id=? AND month=?').run(user,month);
  assert.equal((await handleAiRequest(request(),env(),{store,fetcher:async()=>assert.fail('quota must block provider')})).status,429);assert.equal(sql.prepare('SELECT count(*) n FROM usage_events').get().n,2);
 }finally{sql.close();}
});
