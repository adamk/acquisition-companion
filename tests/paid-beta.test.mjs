import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {D1PaidStore} from '../src/worker/paid-store.mjs';
import {handlePaidRequest} from '../src/worker/paid-api.mjs';
import {requirePaidAccess} from '../src/worker/paid-access.mjs';
import {hash} from '../src/worker/paid-security.mjs';

async function fixture(){
 const sql=new DatabaseSync(':memory:');for(const file of fs.readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync(`migrations/${file}`,'utf8'));
 const db={prepare(query){return {bind(...args){return {async first(){const r=sql.prepare(query).get(...args);return r?{...r}:null;},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}};}};},async batch(items){sql.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const store=new D1PaidStore(db),token='a'.repeat(64),now=Date.now();let csrf='b'.repeat(64);
 await store.createSession('fictional@example.test',await hash(token),await hash(csrf),now+60000,now);
 const user=(await store.getSession(await hash(token),now)).userId;let calls=0;
 const env={AI_PAYWALL_ENABLED:'true',AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'true',STRIPE_SECRET_KEY:'mock',STRIPE_WEBHOOK_SECRET:'mock',STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year'};
 const request=(body,path='/api/billing/checkout')=>new Request(`https://acquisitioncompanion.com${path}`,{method:body?'POST':'GET',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json',Cookie:`__Host-ac-session=${token}`,'X-CSRF-Token':csrf,'Sec-Fetch-Site':'same-origin','X-Account-Request':'1'},...(body?{body:JSON.stringify(body)}:{})});
 const fetcher=async(url,options)=>{calls++;if(url.endsWith('/customers'))return Response.json({id:'cus_fixture'});assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');const params=new URLSearchParams(options.body);assert.equal(params.get('mode'),'subscription');assert.equal(params.get('line_items[0][price]'),'price_month');return Response.json({url:'https://checkout.stripe.com/c/pay/fixture'});};
 const approve=()=>sql.prepare('INSERT INTO beta_checkout_approvals(user_id,approved_at,approved_by) VALUES(?,?,?)').run(user,now,'operator-fixture');
 return {sql,store,user,env,request,fetcher,approve,calls:()=>calls,setCsrf:value=>{csrf=value;}};
}

test('signed-in non-subscribers can create hosted Checkout without a legacy beta approval',async()=>{
 const f=await fixture();try{const r=await handlePaidRequest(f.request({plan:'monthly',usCustomerAttested:true}),f.env,f);assert.equal(r.status,200);assert.match((await r.json()).url,/checkout.stripe.com/);assert.equal(f.calls(),2);assert.equal((await f.store.getUser(f.user)).customerId,'cus_fixture');assert.equal(await f.store.getBetaCheckoutApproval(f.user),null);}finally{f.sql.close();}
});
test('public Checkout still requires an explicit boolean U.S.-customer attestation',async()=>{
 const f=await fixture();try{for(const value of [undefined,false,'true',1]){const r=await handlePaidRequest(f.request({plan:'monthly',...(value===undefined?{}:{usCustomerAttested:value})}),f.env,f);assert.equal(r.status,400);assert.equal((await r.json()).error.code,'us_attestation_required');assert.equal(f.calls(),0);}
 const r=await handlePaidRequest(f.request({plan:'monthly',usCustomerAttested:true}),f.env,f);assert.equal(r.status,200);assert.match((await r.json()).url,/checkout.stripe.com/);assert.equal(f.calls(),2);}finally{f.sql.close();}
});
test('signed-out Checkout is denied before any Stripe customer or session call',async()=>{
 const f=await fixture();try{const request=new Request('https://acquisitioncompanion.com/api/billing/checkout',{method:'POST',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json','X-CSRF-Token':'b'.repeat(64)},body:JSON.stringify({plan:'monthly',usCustomerAttested:true})});const r=await handlePaidRequest(request,f.env,f);assert.equal(r.status,401);assert.equal((await r.json()).error.code,'login_required');assert.equal(f.calls(),0);}finally{f.sql.close();}
});
test('active subscriber including period-end cancellation cannot create duplicate Checkout',async()=>{
 const f=await fixture();try{await f.store.applySubscription('evt_operator_fixture',{id:'sub_operator_fixture',userId:f.user,status:'active',validUntil:Date.UTC(2026,10,4),cancelAtPeriodEnd:true},Date.now());const r=await handlePaidRequest(f.request({plan:'monthly',usCustomerAttested:true}),f.env,f);assert.equal(r.status,409);assert.equal((await r.json()).error.code,'already_subscribed');assert.equal(f.calls(),0);assert.equal(Boolean((await f.store.getGrant(f.user)).cancelAtPeriodEnd),true);const account=await handlePaidRequest(f.request(undefined,'/api/account'),f.env,f);assert.equal((await account.json()).checkoutEligible,false);}finally{f.sql.close();}
});
test('beta approval never grants AI access; active subscription does, even after approval revocation',async()=>{
 const f=await fixture();try{f.approve();await assert.rejects(requirePaidAccess(f.request(),f.env,f),e=>e.code==='subscription_required');
 await f.store.applySubscription('evt_canonical_fixture',{id:'sub_fixture',userId:f.user,status:'active',validUntil:Date.now()+60000,cancelAtPeriodEnd:false},Date.now());
 assert.equal((await requirePaidAccess(f.request(),f.env,f)).userId,f.user);
 f.sql.prepare('UPDATE beta_checkout_approvals SET revoked_at=?,revoked_by=? WHERE user_id=?').run(Date.now(),'operator-fixture',f.user);
 assert.equal((await requirePaidAccess(f.request(),f.env,f)).userId,f.user);
 f.sql.prepare('UPDATE subscriptions SET status=? WHERE user_id=?').run('canceled',f.user);
 const r=await handlePaidRequest(f.request({plan:'monthly',usCustomerAttested:true}),f.env,f);assert.equal(r.status,200,'historical approval revocation does not block public Checkout');assert.equal(f.calls(),2);}finally{f.sql.close();}
});

test('a signed event replay after a verified customer-mapping correction repairs subscription ownership without duplicating the row',async()=>{
 const f=await fixture();try{
  await f.store.applySubscription('evt_original',{id:'sub_fixture',userId:f.user,status:'active',validUntil:Date.now()+60000,cancelAtPeriodEnd:false},Date.now());
  await f.store.createSession('correct-owner@example.test','correct-owner-token','correct-owner-csrf',Date.now()+60000,Date.now());
  const correctedUser=(await f.sql.prepare('SELECT id FROM users WHERE email=?').get('correct-owner@example.test')).id;
  f.sql.prepare('DELETE FROM webhook_events WHERE id=?').run('evt_original');
  await f.store.applySubscription('evt_replayed',{id:'sub_fixture',userId:correctedUser,status:'active',validUntil:Date.now()+120000,cancelAtPeriodEnd:false},Date.now());
  const row=f.sql.prepare('SELECT id,user_id,status FROM subscriptions WHERE id=?').get('sub_fixture');
  assert.deepEqual({...row},{id:'sub_fixture',user_id:correctedUser,status:'active'});
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM subscriptions WHERE id=?').get('sub_fixture').n,1);
  assert.equal(await f.store.getGrant(f.user),null);
  assert.equal((await f.store.getGrant(correctedUser)).status,'active');
 }finally{f.sql.close();}
});
test('account exposes public Checkout eligibility without querying historical approval records',async()=>{
 const f=await fixture();try{let r=await handlePaidRequest(f.request(undefined,'/api/account'),f.env,f);let data=await r.json();assert.equal(data.checkoutEligible,true);assert.equal(data.entitled,false);f.approve();r=await handlePaidRequest(f.request(undefined,'/api/account'),f.env,f);data=await r.json();f.setCsrf(data.csrfToken);assert.equal(data.checkoutEligible,true);assert.equal(data.entitled,false);assert.ok(!JSON.stringify(data).includes('operator-fixture'));
 f.sql.exec('DROP TABLE beta_checkout_approvals');r=await handlePaidRequest(f.request({plan:'monthly',usCustomerAttested:true}),f.env,f);assert.equal(r.status,200);assert.equal(f.calls(),2);}finally{f.sql.close();}
});
