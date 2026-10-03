import test from 'node:test';import assert from 'node:assert/strict';
import {beginSignIn,finishSignIn,requireCsrf} from '../src/worker/paid-auth.mjs';
import {createCheckout,createPortal,verifyWebhook,processWebhook} from '../src/worker/stripe-billing.mjs';
import {hash} from '../src/worker/paid-security.mjs';
const token='a'.repeat(64),browser='b'.repeat(64);
const req=(cookie='')=>new Request('https://acquisitioncompanion.com/api/auth/start',{method:'POST',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':'192.0.2.1'}});
const settings={AI_PAYWALL_ENABLED:'true',AUTH_SIGNIN_ENABLED:'true',STRIPE_SECRET_KEY:'mock-only',STRIPE_WEBHOOK_SECRET:'mock-signing-secret',STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year',AI_IP_LIMITER:{limit:async()=>({success:true})}};

test('passwordless links are single-use, browser-bound and stored as hashes; session cookie is secure',async()=>{
 let challenge,delivery,session;
 const store={allowEmailAttempt:async()=>true,saveChallenge:async c=>{challenge=c;},consumeChallenge:async(t,b)=>{if(challenge&&t===challenge.tokenHash&&b===challenge.browserHash){challenge=null;return {email:'buyer@example.test'};}return null;},createSession:async(...s)=>{session=s;}};
 const response=await beginSignIn(req(),{email:'buyer@example.test'},settings,{store,sendEmail:async d=>{delivery=d;}});
 const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly; Secure; SameSite=Lax/);assert.ok(!cookie.includes(delivery.url.split('#token=')[1]));
 assert.ok(!JSON.stringify(challenge).includes(delivery.url.split('#token=')[1]));
 const magic=new URL(delivery.url).hash.slice(7);
 await assert.rejects(finishSignIn(req(),{token:magic},settings,{store}),e=>e.code==='invalid_link');
 const result=await finishSignIn(req(cookie.split(';')[0]),{token:magic},settings,{store});
 assert.match(result.headers.get('set-cookie'),/__Host-ac-session=.*HttpOnly; Secure; SameSite=Lax/);assert.ok(!session.includes(magic));
 await assert.rejects(finishSignIn(req(cookie.split(';')[0]),{token:magic},settings,{store}),e=>e.code==='invalid_link');
});

test('CSRF validation requires the session-bound token, missing email integration fails closed',async()=>{
 await requireCsrf(new Request(req(),{headers:{'X-CSRF-Token':token}}),{csrfHash:await hash(token)});
 await assert.rejects(requireCsrf(req(),{csrfHash:await hash(token)}),e=>e.status===403);
 await assert.rejects(beginSignIn(req(),{email:'x@example.test'},settings,{store:{}}),e=>e.code==='billing_unavailable');
});

test('hosted checkout/portal use configured price/customer; no live Stripe calls',async()=>{
 const calls=[],store={getUser:async()=>({id:'u1',customerId:'cus_mock'}),getGrant:async()=>null,getBetaCheckoutApproval:async()=>({approvedAt:0,revokedAt:null})};
 const fetcher=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({url:url.endsWith('checkout/sessions')?'https://checkout.stripe.com/c/pay/mock':'https://billing.stripe.com/p/session/mock'}));};
 const checkout=await createCheckout('u1','annual','https://acquisitioncompanion.com',settings,{store,fetcher},true);
 assert.match(checkout.url,/checkout.stripe.com/);assert.equal(calls.length,1);
 assert.equal(new URLSearchParams(calls[0].options.body).get('line_items[0][price]'),'price_year');
 assert.equal(new URLSearchParams(calls[0].options.body).get('customer'),'cus_mock');
 assert.match((await createPortal('u1','https://acquisitioncompanion.com',settings,{store,fetcher})).url,/billing.stripe.com/);
 await assert.rejects(createCheckout('u1','weekly','https://acquisitioncompanion.com',settings,{store,fetcher}));
 assert.equal(calls.length,2);
});

async function signature(body,time,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${time}.${body}`)));return `t=${time},v1=${Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}`;}

test('webhook signatures authenticate exact raw bytes and reject stale/tampered payloads',async()=>{
 const now=Date.now(),time=Math.floor(now/1000),body=JSON.stringify({id:'evt_mock',type:'customer.subscription.updated',data:{object:{id:'sub_mock',customer:'cus_mock'}}});
 const sig=await signature(body,time,settings.STRIPE_WEBHOOK_SECRET);
 assert.equal((await verifyWebhook(body,sig,settings.STRIPE_WEBHOOK_SECRET,now)).id,'evt_mock');
 await assert.rejects(verifyWebhook(body+' ',sig,settings.STRIPE_WEBHOOK_SECRET,now));
 await assert.rejects(verifyWebhook(body,sig,settings.STRIPE_WEBHOOK_SECRET,now+301000));
});

test('webhooks reconcile canonical status, approved products, renewal, cancellation, failed payment and deduplicate',async()=>{
 const seen=new Set(),applied=[];let providerCalls=0,status='active',price='price_month',locked=false;
 const store={eventProcessed:async id=>seen.has(id),customerUser:async()=>({id:'u1'}),lockCustomer:async()=>!locked,unlockCustomer:async()=>{},applySubscription:async(id,s)=>{seen.add(id);applied.push(s);},markEvent:async id=>seen.add(id)};
 const fetcher=async()=>{providerCalls++;return new Response(JSON.stringify({id:'sub_mock',customer:'cus_mock',status,cancel_at_period_end:true,items:{data:[{price:{id:price},current_period_end:Math.floor(Date.now()/1000)+3600}]}}));};
 const event=id=>({id,type:'customer.subscription.updated',data:{object:{id:'sub_mock',customer:'cus_mock'}}});
 await processWebhook(event('evt_1'),settings,{store,fetcher});await processWebhook(event('evt_1'),settings,{store,fetcher});
 assert.equal(providerCalls,1);assert.equal(applied[0].status,'active');assert.equal(applied[0].cancelAtPeriodEnd,true);
 status='unpaid';await processWebhook(event('evt_2'),settings,{store,fetcher});assert.equal(applied.at(-1).status,'unpaid');
 status='canceled';await processWebhook(event('evt_3'),settings,{store,fetcher});assert.equal(applied.at(-1).status,'canceled');
 status='active';price='price_unrelated';await processWebhook(event('evt_4'),settings,{store,fetcher});assert.equal(applied.at(-1).status,'ineligible');
 locked=true;await assert.rejects(processWebhook(event('evt_5'),settings,{store,fetcher}));assert.equal(seen.has('evt_5'),false);
});
test('an old failed-invoice event cannot revoke a canonically renewed active subscription',async()=>{
 let grant;
 const store={eventProcessed:async()=>false,customerUser:async()=>({id:'u'}),lockCustomer:async()=>true,unlockCustomer:async()=>{},applySubscription:async(_id,g)=>{grant=g;}};
 const event={id:'evt_old',type:'invoice.payment_failed',data:{object:{id:'in_old',customer:'cus_mock',subscription:'sub_mock'}}};
 const fetcher=async()=>Response.json({id:'sub_mock',customer:'cus_mock',status:'active',items:{data:[{price:{id:'price_month'},current_period_end:Math.floor(Date.now()/1000)+3600}]}});
 await processWebhook(event,settings,{store,fetcher});assert.equal(grant.status,'active');
});

test('staging webhook diagnostics identify lock/API/storage failures without content or production logging',async()=>{
 const event={id:'evt_diagnostic',type:'customer.subscription.created',data:{object:{id:'sub_mock',customer:'cus_mock'}}};
 const reports=[];const store={eventProcessed:async()=>false,customerUser:async()=>({id:'u'}),lockCustomer:async()=>false};
 const dependencies={store,reportWebhookFailure:metadata=>reports.push(metadata)};
 await assert.rejects(processWebhook(event,{...settings,PAID_ENVIRONMENT:'staging'},dependencies),e=>e.status===503);
 assert.deepEqual(reports,[{type:'billing_webhook_failure',stage:'customer_lock_busy',httpStatus:503}]);
 reports.length=0;store.lockCustomer=async()=>true;store.unlockCustomer=async()=>{};
 await assert.rejects(processWebhook(event,{...settings,PAID_ENVIRONMENT:'staging'},{...dependencies,fetcher:async()=>{throw Error('SECRET request details');}}));
 assert.deepEqual(reports,[{type:'billing_webhook_failure',stage:'canonical_subscription_lookup',httpStatus:503}]);
 reports.length=0;
 await assert.rejects(processWebhook(event,settings,{...dependencies,fetcher:async()=>{throw Error('SECRET request details');}}));assert.deepEqual(reports,[]);
});

test('subscription-created retries after contention safely share canonical invoice reconciliation',async()=>{
 const seen=new Set(),rows=new Map(),reports=[];let busy=true,fetches=0;
 const store={eventProcessed:async id=>seen.has(id),customerUser:async()=>({id:'u'}),lockCustomer:async()=>!busy,unlockCustomer:async()=>{},applySubscription:async(id,grant)=>{seen.add(id);rows.set(grant.id,grant);}};
 const env={...settings,PAID_ENVIRONMENT:'staging'},dependencies={store,reportWebhookFailure:x=>reports.push(x),fetcher:async()=>{fetches++;return Response.json({id:'sub_mock',customer:'cus_mock',status:'active',items:{data:[{price:{id:'price_month'},current_period_end:2000000000}]}});}};
 const created={id:'evt_created',type:'customer.subscription.created',data:{object:{id:'sub_mock',customer:'cus_mock',status:'canceled'}}};
 await assert.rejects(processWebhook(created,env,dependencies),e=>e.status===503);assert.equal(seen.size,0);assert.equal(fetches,0);assert.equal(reports[0].stage,'customer_lock_busy');
 busy=false;await processWebhook({id:'evt_paid',type:'invoice.paid',data:{object:{customer:'cus_mock',parent:{subscription_details:{subscription:'sub_mock'}}}}},env,dependencies);
 await processWebhook(created,env,dependencies);assert.deepEqual(await processWebhook(created,env,dependencies),{received:true,duplicate:true});
 assert.equal(seen.size,2);assert.equal(rows.size,1);assert.equal(rows.get('sub_mock').status,'active');assert.equal(fetches,2);
});
