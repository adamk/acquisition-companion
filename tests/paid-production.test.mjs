import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {billingConfigured,paywallEnabled,monthlyLimit} from '../src/worker/paid-access.mjs';
import {sendSignInMail} from '../src/worker/auth-mailer.mjs';
import {processWebhook,createCheckout} from '../src/worker/stripe-billing.mjs';
import {paidProduct,supportEmail} from '../src/lib/paid-product.mjs';
const settings={PAID_ENVIRONMENT:'production',BILLING_TEST_MODE:'false',STRIPE_SECRET_KEY:'rk_live_fixture',STRIPE_WEBHOOK_SECRET:'fixture',STRIPE_MONTHLY_PRICE_ID:'price_month',STRIPE_ANNUAL_PRICE_ID:'price_year'};
test('production candidate remains disabled, separate from staging, with 100 UTC requests and existing AI rate limits',()=>{
 const config=JSON.parse(fs.readFileSync('wrangler.paid-production.example.json'));
 assert.equal(config.vars.AI_PAYWALL_ENABLED,'false');assert.equal(config.vars.AUTH_SIGNIN_ENABLED,'false');assert.equal(config.vars.BILLING_ENABLED,'false');assert.equal(config.vars.AI_MONTHLY_REQUEST_LIMIT,'100');assert.equal(monthlyLimit(config.vars),100);assert.throws(()=>monthlyLimit({PAID_ENVIRONMENT:'production'}));
 assert.equal(config.d1_databases[0].database_name,'acquisition-companion-paid-production');assert.equal(config.services[0].service,'acquisition-companion-mailer-production');
 const prod=JSON.parse(fs.readFileSync('wrangler.jsonc'));assert.deepEqual(config.ratelimits,prod.ratelimits);assert.equal(prod.vars.AI_PAYWALL_ENABLED,'false');assert.equal(prod.vars.AUTH_SIGNIN_ENABLED,'false');assert.equal(prod.vars.BILLING_ENABLED,'false');assert.equal(prod.vars.AUTH_MAIL_ENABLED,'false');assert.equal(prod.d1_databases[0].database_name,'acquisition-companion-paid-production');assert.equal(prod.services[0].service,'acquisition-companion-mailer-production');assert.equal(paywallEnabled({...settings}),false);
 assert.equal(paidProduct.monthlyUsd,19);assert.equal(paidProduct.annualUsd,190);assert.equal(paidProduct.monthlyRequestAllowance,100);
});
test('production rejects test credentials, unknown mode and test-mode provider objects',async()=>{
 assert.equal(billingConfigured(settings),true);
 for(const patch of [{STRIPE_SECRET_KEY:'sk_test_fixture'},{BILLING_TEST_MODE:'true'},{BILLING_TEST_MODE:undefined}])assert.equal(billingConfigured({...settings,...patch}),false);
 let calls=0;const dependencies={store:{getUser:async()=>({customerId:'cus_fixture'}),getGrant:async()=>null,getBetaCheckoutApproval:async()=>({approvedAt:0,revokedAt:null})},fetcher:async()=>{calls++;return Response.json({livemode:false,url:'https://checkout.stripe.com/c/pay/fixture'});}};
 await assert.rejects(createCheckout('u','monthly','https://acquisitioncompanion.com',settings,dependencies,true));assert.equal(calls,1);
 await assert.rejects(processWebhook({id:'evt_fixture',livemode:false,type:'invoice.paid',data:{object:{}}},settings,{store:{eventProcessed:async()=>{throw Error('no storage');}}}));
});
test('production auth mail is origin locked, supports Reply-To, and remains disabled by default',async()=>{
 const env={AUTH_MAIL_MODE:'production',AUTH_MAIL_ENABLED:'true',AUTH_MAIL_PROVIDER:'ses',AUTH_MAIL_ORIGIN:'https://acquisitioncompanion.com',AUTH_MAIL_FROM:'signin@acquisitioncompanion.com',SES_REGION:'us-east-1',SES_ACCESS_KEY_ID:'fixture',SES_SECRET_ACCESS_KEY:'fixture'};
 const payload={email:'buyer@example.test',url:env.AUTH_MAIL_ORIGIN+'/account/?signin=1#token='+'a'.repeat(64)};let calls=0;
 const dependencies={fetcher:async(_url,options)=>{calls++;const mail=JSON.parse(options.body);assert.deepEqual(mail.ReplyToAddresses,[supportEmail]);assert.equal(mail.FromEmailAddress,'signin@acquisitioncompanion.com');assert.match(mail.Content.Simple.Body.Text.Data,/15 minutes[\s\S]*used once[\s\S]*support@acquisitioncompanion.com/);assert.doesNotMatch(mail.Content.Simple.Subject.Data,/staging/);return Response.json({MessageId:'fixture'});}};
 await sendSignInMail(payload,env,dependencies);assert.equal(calls,1);
 for(const url of [env.AUTH_MAIL_ORIGIN+'/account/#token='+'a'.repeat(64),env.AUTH_MAIL_ORIGIN+'/account/?signin=1&email=private@example.test#token='+'a'.repeat(64),env.AUTH_MAIL_ORIGIN+'/account/?signin=1#token='])await assert.rejects(sendSignInMail({...payload,url},env,dependencies));assert.equal(calls,1);
 for(const patch of [{AUTH_MAIL_ENABLED:'false'},{AUTH_MAIL_MODE:'unknown'},{AUTH_MAIL_ORIGIN:'https://paid-staging.example.test'},{AUTH_MAIL_FROM:'other@example.test'}])await assert.rejects(sendSignInMail(payload,{...env,...patch},dependencies));assert.equal(calls,1);
});
test('paid-beta surfaces name support, US-only availability, free course and legal review without guarantees',()=>{
 for(const file of ['src/pages/pricing.astro','src/pages/account.astro','src/pages/privacy.astro','src/pages/terms.astro'])assert.match(fs.readFileSync(file,'utf8'),/supportEmail/);
 const pricing=fs.readFileSync('src/pages/pricing.astro','utf8'),terms=fs.readFileSync('src/pages/terms.astro','utf8');assert.match(pricing,/United States/);assert.match(terms,/The Wired Nomad LLC/);assert.match(terms,/generally non-refundable after access has been used/);assert.match(terms,/except where required by applicable law/);assert.match(terms,/legal review/);assert.match(terms,/already-paid billing period/);
 assert.doesNotMatch(pricing,/unlimited|guaranteed financing|guaranteed deal success/i);assert.match(terms,/Requests that reach the model count/);assert.match(fs.readFileSync('src/pages/account.astro','utf8'),/analytics={false}/);
});

test('production mail failure diagnostics expose only stage/status and never mail or secrets',async()=>{
 const {sendSesEmail}=await import('../src/worker/ses-mailer.mjs');const reports=[];
 await assert.rejects(sendSesEmail({from:'signin@acquisitioncompanion.com',to:'buyer@example.test',subject:'fixture',text:'PRIVATE_AUTH_LINK'},{AUTH_MAIL_MODE:'production',AUTH_MAIL_DIAGNOSTICS_ENABLED:'true',SES_REGION:'us-east-1',SES_ACCESS_KEY_ID:'PRIVATE_ACCESS',SES_SECRET_ACCESS_KEY:'PRIVATE_SECRET'},{reportFailure:x=>reports.push(x),fetcher:async()=>Response.json({__type:'MessageRejected',message:'PRIVATE_AUTH_LINK PRIVATE_SECRET'},{status:400})}));
 assert.deepEqual(reports,[{type:'ses_delivery_failure',httpStatus:400,code:'MessageRejected'}]);assert.ok(!JSON.stringify(reports).includes('PRIVATE'));
});
