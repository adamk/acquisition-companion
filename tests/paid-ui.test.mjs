import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {handlePaidRequest} from '../src/worker/paid-api.mjs';
import {reportAuthDiagnostic} from '../src/worker/paid-auth-diagnostics.mjs';
test('paid endpoints stay closed by default; public status discloses no customer/secrets',async()=>{
 const env={STRIPE_SECRET_KEY:'SECRET_SENTINEL',STRIPE_WEBHOOK_SECRET:'WEBHOOK_SENTINEL'};
 for(const path of ['auth/start','auth/confirm','auth/diagnostic','auth/logout','billing/checkout','billing/portal','account']){
  const r=await handlePaidRequest(new Request(`https://acquisitioncompanion.com/api/${path}`,{method:'POST'}),env);
  assert.equal(r.status,404);assert.ok(!(await r.text()).includes('SENTINEL'));
 }
 const webhook=await handlePaidRequest(new Request('https://acquisitioncompanion.com/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),env);
 assert.equal(webhook.status,503,'the independently controlled webhook still fails closed without complete billing configuration');
 assert.ok(!(await webhook.text()).includes('SENTINEL'));
 const r=await handlePaidRequest(new Request('https://acquisitioncompanion.com/api/billing/status'),env);
 const data=await r.json();assert.equal(data.enabled,false);assert.equal(data.product.monthlyUsd,19);assert.equal(data.product.annualUsd,190);
});
test('account billing mutations require same-origin JSON and authenticated CSRF; GETs cannot mutate billing',async()=>{
 const env={AI_PAYWALL_ENABLED:'true',AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'true'};
 for(const path of ['auth/start','auth/confirm','auth/diagnostic','auth/logout','billing/checkout','billing/portal']){
  const r=await handlePaidRequest(new Request(`https://acquisitioncompanion.com/api/${path}`,{method:'GET'}),env);
  assert.equal(r.status,405);
  const cross=await handlePaidRequest(new Request(`https://acquisitioncompanion.com/api/${path}`,{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env);
  assert.equal(cross.status,403);
 }
});
test('client auth diagnostics accept only safe reason codes and UUIDs under same-origin rate limiting',async()=>{
 const reports=[],env={AUTH_SIGNIN_ENABLED:'true',AI_IP_LIMITER:{limit:async({key})=>({success:key==='auth-diagnostic:192.0.2.8'})}},id='672e377b-4a59-4e37-b271-5208686801e0';
 const request=(body,origin='https://acquisitioncompanion.com')=>new Request('https://acquisitioncompanion.com/api/auth/diagnostic',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.8'},body:JSON.stringify(body)});
 const dependencies={reportAuthDiagnostic:event=>reports.push(event)};
 const result=await handlePaidRequest(request({reason:'auth_confirm_client_attempt',diagnosticId:id}),env,dependencies);
 assert.equal(result.status,200);assert.deepEqual(reports,[{type:'auth_diagnostic',reason:'auth_confirm_client_attempt',diagnosticId:id}]);
 for(const body of [{reason:'not-allowed',diagnosticId:id},{reason:'auth_fragment_missing',diagnosticId:'not-an-id'},{reason:'auth_fragment_missing',diagnosticId:'672e377b-4a59-1e37-b271-5208686801e0'},{reason:'auth_fragment_missing',diagnosticId:id,email:'private@example.test'}]){
  assert.equal((await handlePaidRequest(request(body),env,dependencies)).status,400);
 }
 assert.equal(reports.length,1,'invalid diagnostic fields never reach the reporter');
 assert.equal((await handlePaidRequest(request({reason:'auth_fragment_missing',diagnosticId:id},'https://evil.example'),env,dependencies)).status,403);
 assert.equal((await handlePaidRequest(request({reason:'auth_fragment_missing',diagnosticId:id}),{...env,AUTH_SIGNIN_ENABLED:'false'},dependencies)).status,404);
});
test('same-origin confirmation requests rejected before body parsing are logged with the attempt ID only',async()=>{
 const reports=[],id='672e377b-4a59-4e37-b271-5208686801e0',deps={reportAuthDiagnostic:event=>reports.push(event)},env={AUTH_SIGNIN_ENABLED:'true'};
 const malformed=new Request('https://acquisitioncompanion.com/api/auth/confirm',{method:'POST',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'text/plain','X-Auth-Diagnostic-ID':id},body:'PRIVATE_TOKEN'});
 const response=await handlePaidRequest(malformed,env,deps),result=await response.json();assert.equal(response.status,400);assert.equal(result.error.message,'This sign-in link could not be confirmed. Open it in the same browser that requested it, or request a new link.');assert.deepEqual(reports,[{type:'auth_diagnostic',reason:'auth_confirm_invalid_request',diagnosticId:id}]);assert.ok(!JSON.stringify(reports).includes('PRIVATE_TOKEN'));
 const crossSite=new Request('https://acquisitioncompanion.com/api/auth/confirm',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'text/plain','X-Auth-Diagnostic-ID':id},body:'PRIVATE_TOKEN'});
 assert.equal((await handlePaidRequest(crossSite,env,deps)).status,403);assert.equal(reports.length,1,'cross-site invalid requests cannot spam internal diagnostics');
});
test('Worker auth logs serialize only an allowlisted stage and validated random correlation ID',()=>{
 const output=[],original=console.warn;console.warn=value=>output.push(value);
 try{reportAuthDiagnostic('auth_confirm_binding_mismatch','672e377b-4a59-4e37-b271-5208686801e0');reportAuthDiagnostic('auth_confirm_binding_mismatch','SECRET_TOKEN buyer@example.test');reportAuthDiagnostic('SECRET_TOKEN','672e377b-4a59-4e37-b271-5208686801e0');}
 finally{console.warn=original;}
 assert.equal(output.length,2);for(const line of output){const event=JSON.parse(line);assert.deepEqual(Object.keys(event).sort(),['diagnosticId','reason','type']);assert.equal(event.type,'auth_diagnostic');assert.equal(event.reason,'auth_confirm_binding_mismatch');assert.match(event.diagnosticId,/^[0-9a-f-]{36}$/i);assert.ok(!line.includes('SECRET_TOKEN'));assert.ok(!line.includes('buyer@example.test'));}
});
test('paid access is discoverable without putting account requirements in the free course',()=>{
 const pricing=fs.readFileSync('src/pages/pricing.astro','utf8'),account=fs.readFileSync('src/pages/account.astro','utf8'),paidAccount=fs.readFileSync('src/scripts/paid-account.ts','utf8'),ai=fs.readFileSync('src/pages/ai/index.astro','utf8'),base=fs.readFileSync('src/layouts/Base.astro','utf8'),home=fs.readFileSync('src/pages/index.astro','utf8');
 assert.match(pricing,/Why not just use ChatGPT/);assert.match(pricing,/data-checkout="monthly"/);assert.match(pricing,/data-checkout="annual"/);assert.match(pricing,/build their own/i);
 assert.match(account,/data-signin-form hidden/);assert.match(account,/free course remains accessible without an account/);
 assert.match(ai,/data-ai-account-link/);assert.doesNotMatch(ai,/data-ai-account-link hidden/,'the dormant AI page keeps a discoverable sign-in path');assert.match(ai,/data-ai-access-message/);assert.match(ai,/data-ai-access-pricing/);assert.match(ai,/data-ai-access-request/);
 assert.match(pricing,/data-account-link/);assert.match(pricing,/Already subscribed\? Sign in/);
 assert.match(base,/href="\/account\/"[^>]*>Account \/ sign in/);
 assert.match(pricing,/The course, topics, examples and source-linked educational material remain free/);assert.match(pricing,/subscriptions support interactive AI analysis, deterministic calculations, deal-reasoning workflows, fictional deal practice and IC workflows, and associated model and compute costs/);
 assert.match(ai,/topics, examples and source-linked educational material remain free/);assert.match(ai,/fictional deal practice and IC workflows/);assert.match(ai,/associated model and compute costs/);
 assert.match(home,/<strong>Free course<\/strong> no account needed/);
 assert.match(account,/data-entitled-usage hidden/);assert.match(account+paidAccount,/No active Deal Lab subscription\./);
 assert.match(account,/data-beta-request hidden/);assert.equal((account.match(/invite-only for U\.S\. customers/g)||[]).length,1,'the account page has one initially hidden beta message');
 assert.equal((paidAccount.match(/invite-only for U\.S\. customers/g)||[]).length,0,'the account script does not duplicate static beta copy');
 assert.ok(!/type="file"|stripe\.js|localStorage/.test(account+pricing+fs.readFileSync('src/scripts/paid-account.ts','utf8')));
});
test('account pages suppress analytics so email-link fragments never enter page-view URLs',()=>{
 assert.match(fs.readFileSync('src/pages/account.astro','utf8'),/analytics={false}/);
 assert.match(fs.readFileSync('src/layouts/Base.astro','utf8'),/analytics && siteConfig.analytics.measurementId && <AnalyticsConsent/);
 const account=fs.readFileSync('src/scripts/paid-account.ts','utf8');assert.match(account,/getAll\('signin'\)\.includes\('1'\)/);assert.match(account,/location\.hash\.startsWith\('#token='/);assert.match(account,/auth_fragment_missing/);assert.match(account,/auth_confirm_client_attempt/);assert.ok(account.includes("history.replaceState(null,'',location.pathname)"));assert.match(account,/diagnosticId/);assert.ok(!account.includes("track('auth_")&&!account.includes('track("auth_'));
});
