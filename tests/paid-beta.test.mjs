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
 const env={AI_PAYWALL_ENABLED:'true',STRIPE_SECRET_KEY:'mock',STRIPE_WEBHOOK_SECRET:'mock',STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year'};
 const request=(body,path='/api/billing/checkout')=>new Request(`https://acquisitioncompanion.com${path}`,{method:body?'POST':'GET',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json',Cookie:`__Host-ac-session=${token}`,'X-CSRF-Token':csrf,'Sec-Fetch-Site':'same-origin','X-Account-Request':'1'},...(body?{body:JSON.stringify(body)}:{})});
 const fetcher=async(url,options)=>{calls++;if(url.endsWith('/customers'))return Response.json({id:'cus_fixture'});assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');const params=new URLSearchParams(options.body);assert.equal(params.get('mode'),'subscription');assert.equal(params.get('line_items[0][price]'),'price_month');return Response.json({url:'https://checkout.stripe.com/c/pay/fixture'});};
 const approve=()=>sql.prepare('INSERT INTO beta_checkout_approvals(user_id,approved_at,approved_by) VALUES(?,?,?)').run(user,now,'operator-fixture');
 return {sql,store,user,env,request,fetcher,approve,calls:()=>calls,setCsrf:value=>{csrf=value;}};
}

test('unapproved authenticated accounts cannot create Checkout, even by direct API',async()=>{
 const f=await fixture();try{const r=await handlePaidRequest(f.request({plan:'monthly',usCustomerAttested:true}),f.env,f);assert.equal(r.status,403);assert.equal((await r.json()).error.code,'beta_approval_required');assert.equal(f.calls(),0);assert.equal((await f.store.getUser(f.user)).customerId,null);}finally{f.sql.close();}
});
test('approved accounts must explicitly attest US eligibility before hosted subscription Checkout',async()=>{
 const f=await fixture();try{f.approve();for(const value of [undefined,false,'true',1]){const r=await handlePaidRequest(f.request({plan:'monthly',...(value===undefined?{}:{usCustomerAttested:value})}),f.env,f);assert.equal(r.status,400);assert.equal(f.calls(),0);}
 const r=await handlePaidRequest(f.request({plan:'monthly',usCustomerAttested:true}),f.env,f);assert.equal(r.status,200);assert.match((await r.json()).url,/checkout.stripe.com/);assert.equal(f.calls(),2);}finally{f.sql.close();}
});
test('beta approval never grants AI access; active subscription does, even after approval revocation',async()=>{
 const f=await fixture();try{f.approve();await assert.rejects(requirePaidAccess(f.request(),f.env,f),e=>e.code==='subscription_required');
 await f.store.applySubscription('evt_canonical_fixture',{id:'sub_fixture',userId:f.user,status:'active',validUntil:Date.now()+60000,cancelAtPeriodEnd:false},Date.now());
 assert.equal((await requirePaidAccess(f.request(),f.env,f)).userId,f.user);
 f.sql.prepare('UPDATE beta_checkout_approvals SET revoked_at=?,revoked_by=? WHERE user_id=?').run(Date.now(),'operator-fixture',f.user);
 assert.equal((await requirePaidAccess(f.request(),f.env,f)).userId,f.user);
 f.sql.prepare('UPDATE subscriptions SET status=? WHERE user_id=?').run('canceled',f.user);
 const r=await handlePaidRequest(f.request({plan:'monthly',usCustomerAttested:true}),f.env,f);assert.equal(r.status,403);assert.equal(f.calls(),0);}finally{f.sql.close();}
});
test('account exposes approval boolean only; missing approval storage fails closed before Stripe',async()=>{
 const f=await fixture();try{let r=await handlePaidRequest(f.request(undefined,'/api/account'),f.env,f);assert.equal((await r.json()).checkoutEligible,false);f.approve();r=await handlePaidRequest(f.request(undefined,'/api/account'),f.env,f);const data=await r.json();f.setCsrf(data.csrfToken);assert.equal(data.checkoutEligible,true);assert.equal(data.entitled,false);assert.ok(!JSON.stringify(data).includes('operator-fixture'));
 f.sql.exec('DROP TABLE beta_checkout_approvals');r=await handlePaidRequest(f.request({plan:'monthly',usCustomerAttested:true}),f.env,f);assert.equal(r.status,503);assert.equal(f.calls(),0);}finally{f.sql.close();}
});
