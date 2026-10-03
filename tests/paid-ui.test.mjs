import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {handlePaidRequest} from '../src/worker/paid-api.mjs';
test('paid endpoints stay closed by default; public status discloses no customer/secrets',async()=>{
 const env={STRIPE_SECRET_KEY:'SECRET_SENTINEL',STRIPE_WEBHOOK_SECRET:'WEBHOOK_SENTINEL'};
 for(const path of ['auth/start','auth/confirm','auth/logout','billing/checkout','billing/portal','billing/webhook','account']){
  const r=await handlePaidRequest(new Request(`https://acquisitioncompanion.com/api/${path}`,{method:'POST'}),env);
  assert.equal(r.status,404);assert.ok(!(await r.text()).includes('SENTINEL'));
 }
 const r=await handlePaidRequest(new Request('https://acquisitioncompanion.com/api/billing/status'),env);
 const data=await r.json();assert.equal(data.enabled,false);assert.equal(data.product.monthlyUsd,19);assert.equal(data.product.annualUsd,190);
});
test('account billing mutations require same-origin JSON and authenticated CSRF; GETs cannot mutate billing',async()=>{
 const env={AI_PAYWALL_ENABLED:'true'};
 for(const path of ['auth/start','auth/confirm','auth/logout','billing/checkout','billing/portal']){
  const r=await handlePaidRequest(new Request(`https://acquisitioncompanion.com/api/${path}`,{method:'GET'}),env);
  assert.equal(r.status,405);
  const cross=await handlePaidRequest(new Request(`https://acquisitioncompanion.com/api/${path}`,{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env);
  assert.equal(cross.status,403);
 }
});
test('pricing is a proposed single product with honest comparison; account disabled state collects nothing',()=>{
 const pricing=fs.readFileSync('src/pages/pricing.astro','utf8'),account=fs.readFileSync('src/pages/account.astro','utf8');
 assert.match(pricing,/Why not just use ChatGPT/);assert.match(pricing,/Paid-beta launch pricing/i);assert.match(pricing,/build their own/i);
 assert.match(account,/data-signin-form hidden/);assert.match(account,/Subscriptions are not open/);
 assert.ok(!/type="file"|stripe\.js|localStorage/.test(account+pricing+fs.readFileSync('src/scripts/paid-account.ts','utf8')));
});
test('account pages suppress analytics so email-link fragments never enter page-view URLs',()=>{
 assert.match(fs.readFileSync('src/pages/account.astro','utf8'),/analytics={false}/);
 assert.match(fs.readFileSync('src/layouts/Base.astro','utf8'),/analytics && siteConfig.analytics.measurementId && <AnalyticsConsent/);
});
