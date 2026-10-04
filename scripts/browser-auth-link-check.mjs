import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {handlePaidRequest} from '../src/worker/paid-api.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
const builtAccount=await fs.readFile(path.join(dist,'account/index.html'),'utf8');
const scriptPath=builtAccount.match(/<script type="module" src="([^"]+\.js)"><\/script>/)?.[1];
assert.ok(scriptPath?.startsWith('/_astro/'),'test requires the actual Astro production-built account JavaScript');
const builtScript=await fs.readFile(path.join(dist,scriptPath.slice(1)),'utf8');
const componentScripts=[...builtScript.matchAll(/import["']([^"']+\.js)["']/g)].map(match=>path.resolve(path.dirname(path.join(dist,scriptPath.slice(1))),match[1]));
assert.ok(componentScripts.length>0,'production account entrypoint imports the built account controller');
const builtController=(await Promise.all(componentScripts.map(file=>fs.readFile(file,'utf8')))).join('\n');assert.match(builtController,/auth_fragment_missing/,'built account controller includes the fragment diagnostics');
assert.match(builtAccount,/analytics=false|noindex/,'account page remains a no-analytics noindex page');
const invalidMessage='This sign-in link could not be confirmed. Open it in the same browser that requested it, or request a new link.';
let challenge=null,deliveryUrl='',sessions=0,confirmRequests=0,base='';
const diagnostics=[],diagnosticRequests=[],authRequestObservations=[],pageErrors=[],trackedEvents=[];
const sessionRows=new Map();
const store={
 allowEmailAttempt:async()=>true,
 saveChallenge:async value=>{challenge=value;},
 inspectChallenge:async(tokenHash,browserHash,now)=>!challenge||challenge.tokenHash!==tokenHash?'not_found':challenge.browserHash!==browserHash?'binding_mismatch':challenge.expiresAt<=now?'expired':'eligible',
 consumeChallenge:async(tokenHash,browserHash,now)=>{
  if(!challenge||challenge.tokenHash!==tokenHash||challenge.browserHash!==browserHash||challenge.expiresAt<=now)return null;
  const consumed=challenge;challenge=null;return {email:consumed.email};
 },
 createSession:async(_email,tokenHash,csrfHash,expiresAt)=>{sessions++;sessionRows.set(tokenHash,{userId:'synthetic-account',csrfHash,expiresAt});},
 getSession:async(tokenHash,now)=>{const row=sessionRows.get(tokenHash);return row&&row.expiresAt>now?{userId:row.userId,csrfHash:row.csrfHash}:null;},
 setCsrf:async(tokenHash,csrfHash)=>{const row=sessionRows.get(tokenHash);if(row)row.csrfHash=csrfHash;},
 getGrant:async()=>null,
 getBetaCheckoutApproval:async()=>null,
 usageSummary:async()=>({requestCount:0}),
};
const env={AUTH_SIGNIN_ENABLED:'true',BILLING_ENABLED:'false',AI_PAYWALL_ENABLED:'false',ACCOUNT_ORIGIN:'',PAID_DB:{prepare(){}},AUTH_MAILER:{sendSignIn:async()=>({accepted:true})},AI_IP_LIMITER:{limit:async()=>({success:true})}};
const dependencies={store,sendEmail:async payload=>{deliveryUrl=payload.url;},reportAuthDiagnostic:event=>diagnostics.push(event)};
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.svg','image/svg+xml'],['.woff2','font/woff2'],['.json','application/json; charset=utf-8']]);
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,base||'http://localhost');
  if(url.pathname.startsWith('/api/')){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const raw=chunks.length?Buffer.concat(chunks):undefined,headers=new Headers(req.headers);headers.set('CF-Connecting-IP','127.0.0.1');
   if(url.pathname==='/api/auth/confirm'&&req.method==='POST')confirmRequests++;
   if(url.pathname==='/api/auth/diagnostic'&&req.method==='POST'&&raw){const value=JSON.parse(raw.toString('utf8'));diagnosticRequests.push({keys:Object.keys(value).sort(),reason:value.reason,diagnosticId:value.diagnosticId});}
   if(url.pathname.startsWith('/api/auth/')){
    const referrer=req.headers.referer||'',activeToken=deliveryUrl?new URL(deliveryUrl).hash.slice(7):'';
    authRequestObservations.push({path:url.pathname,hasQuery:url.search!=='',urlHasToken:!!activeToken&&req.url.includes(activeToken),referrerHasMarker:referrer.includes('signin=1'),referrerHasFragment:referrer.includes('#'),referrerHasToken:!!activeToken&&referrer.includes(activeToken)});
   }
   const workerRequest=new Request(url,{method:req.method,headers,...(raw?{body:raw}:{})});
   const result=await handlePaidRequest(workerRequest,env,dependencies);
   const responseHeaders=Object.fromEntries(result.headers.entries());delete responseHeaders['set-cookie'];
   const cookies=result.headers.getSetCookie?.()||[];
   res.writeHead(result.status,{...responseHeaders,...(cookies.length?{'Set-Cookie':cookies}:{})});res.end(Buffer.from(await result.arrayBuffer()));return;
  }
  let pathname=decodeURIComponent(url.pathname);if(pathname.endsWith('/'))pathname+='index.html';
  const target=path.resolve(dist,`.${pathname}`);
  if(!target.startsWith(`${dist}${path.sep}`)){res.writeHead(404);res.end();return;}
  const file=await fs.readFile(target);res.writeHead(200,{'Content-Type':mime.get(path.extname(target))||'application/octet-stream','Cache-Control':'no-store'});res.end(file);
 }catch(error){res.writeHead(500,{'Content-Type':'text/plain'});res.end(error instanceof Error?error.message:'local fixture error');}
});
await new Promise(resolve=>server.listen(0,'::',resolve));base=`http://localhost:${server.address().port}`;env.ACCOUNT_ORIGIN=base;
const browser=await chromium.launch({channel:'chrome',headless:true}),contextA=await browser.newContext(),contextB=await browser.newContext(),contextC=await browser.newContext();
for(const context of [contextA,contextB,contextC])await context.addInitScript(()=>{window.__authTelemetry=[];window.acquisitionAnalytics={track:(...args)=>window.__authTelemetry.push(args)};});
const pageA=await contextA.newPage(),pageB=await contextB.newPage(),pageC=await contextC.newPage();
for(const page of [pageA,pageB,pageC]){page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('Failed to load resource:'))pageErrors.push(message.text());});page.on('request',request=>{if(/google-analytics|googletagmanager|analytics\.js/i.test(request.url()))trackedEvents.push(request.url());});}
for(const context of [contextA,contextB,contextC])await context.route('https://mail.example.test/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><a id="magic-link" href="${deliveryUrl}">Open sign-in link</a>`}));

try{
 // A normal visit is still the ordinary anonymous sign-in form, without a failure diagnostic.
 await pageC.goto(`${base}/account/`);await pageC.locator('[data-signin-form]').waitFor({state:'visible'});
 assert.doesNotMatch(await pageC.locator('[data-paid-status]').innerText(),/could not be confirmed/);
 assert.equal(diagnostics.length,0,'ordinary account visits do not create auth failure diagnostics');

 // The non-secret marker lets the built client identify a lost fragment without attempting confirmation.
 const beforeMissing=confirmRequests;
 await pageC.goto(`${base}/account/?signin=1`);await pageC.getByText(invalidMessage,{exact:true}).waitFor();
 assert.equal(await pageC.locator('[data-confirm-signin]').isVisible(),false);
 assert.equal(confirmRequests,beforeMissing,'missing fragment produces no confirmation POST');
 assert.equal(diagnostics.at(-1)?.reason,'auth_fragment_missing');
 assert.equal(await pageC.evaluate(()=>location.href),`${base}/account/`,'marker is removed from the visible URL');

 // Browser A requests a real mocked sign-in message through the actual Worker handler.
 await pageA.goto(`${base}/account/`);await pageA.locator('#account-email').fill('fixture@example.test');
 await pageA.getByRole('button',{name:'Email a sign-in link'}).click();await pageA.getByText(/Open it in this browser within 15 minutes/).waitFor();
 const bindingCookie=(await contextA.cookies(base)).find(cookie=>cookie.name==='__Host-ac-login');assert.ok(bindingCookie,'Browser A receives the binding cookie');
 assert.equal(bindingCookie.httpOnly,true);assert.equal(bindingCookie.secure,true);assert.equal(bindingCookie.sameSite,'Lax');assert.equal(bindingCookie.path,'/');
 const emailUrl=new URL(deliveryUrl),token=emailUrl.hash.slice(7);assert.equal(emailUrl.search,'?signin=1');assert.match(emailUrl.hash,/^#token=[a-f0-9]{64}$/);

 // Browser B can display the email-link state but its missing binding cookie cannot consume the challenge.
 await pageB.goto('https://mail.example.test/inbox/');await pageB.locator('#magic-link').click();await pageB.locator('[data-confirm-signin]').waitFor({state:'visible'});
 assert.equal(await pageB.evaluate(()=>location.href),`${base}/account/`,'token and marker are stripped before confirmation');
 await pageB.locator('[data-confirm-signin]').click();await pageB.getByText(invalidMessage,{exact:true}).waitFor();
 assert.ok(challenge,'wrong-browser confirmation leaves the challenge unconsumed');assert.equal(sessions,0);
 assert.equal(diagnostics.at(-1)?.reason,'auth_confirm_missing_binding');

 // Browser A follows the same cross-site link with its own binding and completes once.
 await pageA.goto('https://mail.example.test/inbox/');await pageA.locator('#magic-link').click();await pageA.locator('[data-confirm-signin]').waitFor({state:'visible'});
 await pageA.locator('[data-confirm-signin]').click();await pageA.locator('[data-account-details]').waitFor({state:'visible'});
 assert.equal(await pageA.locator('[data-subscription-summary]').innerText(),'No subscription yet.','sign-in alone creates no subscription');
 assert.match(await pageA.locator('[data-paid-status]').innerText(),/invite-only/,'sign-in alone does not grant Deal Lab access');
 assert.equal(challenge,null);assert.equal(sessions,1);assert.equal(diagnostics.at(-1)?.reason,'auth_confirm_success');
 assert.equal(await pageA.evaluate(()=>location.href),`${base}/account/`,'fragment and non-secret marker are absent after confirmation');
 const session=(await contextA.cookies(base)).find(cookie=>cookie.name==='__Host-ac-session');assert.ok(session);assert.equal(session.httpOnly,true);assert.equal(session.secure,true);assert.equal(session.sameSite,'Lax');assert.equal(session.path,'/');

 // Reusing the same link in Browser A fails after success; the successful flow has cleared its short-lived binding cookie.
 await pageA.goto('https://mail.example.test/inbox/');await pageA.locator('#magic-link').click();await pageA.locator('[data-confirm-signin]').waitFor({state:'visible'});
 await pageA.locator('[data-confirm-signin]').click();await pageA.getByText(invalidMessage,{exact:true}).waitFor();
 assert.equal(challenge,null,'successful confirmation consumed the challenge');assert.equal(sessions,1,'same-browser replay cannot create a second session');assert.equal(diagnostics.at(-1)?.reason,'auth_confirm_missing_binding');

 // Diagnostics contain only allowlisted reason codes and UUIDs; no token or email reaches telemetry/log records.
 assert.ok(diagnostics.some(event=>event.reason==='auth_fragment_present'));
 assert.ok(diagnostics.some(event=>event.reason==='auth_confirm_client_attempt'));
 assert.deepEqual(diagnostics.map(event=>Object.keys(event).sort()),diagnostics.map(()=>['diagnosticId','reason','type']));
 assert.ok(diagnostics.every(event=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.diagnosticId)));
 for(const reason of ['auth_confirm_missing_binding','auth_confirm_success']){const serverEvent=diagnostics.find(event=>event.reason===reason),attempt=diagnostics.find(event=>event.reason==='auth_confirm_client_attempt'&&event.diagnosticId===serverEvent.diagnosticId);assert.ok(attempt,`${reason} is correlated to the client confirmation attempt`);}
 assert.ok(!JSON.stringify(diagnostics).includes(token));assert.ok(!JSON.stringify(diagnostics).includes('fixture@example.test'));
 assert.ok(diagnosticRequests.every(event=>event.keys.join(',')==='diagnosticId,reason'));
 assert.ok(!JSON.stringify(diagnosticRequests).includes(token));assert.ok(!JSON.stringify(diagnosticRequests).includes('fixture@example.test'));
 assert.ok(authRequestObservations.every(event=>!event.hasQuery&&!event.urlHasToken&&!event.referrerHasMarker&&!event.referrerHasFragment&&!event.referrerHasToken),'auth API URLs and referrers contain no auth URL material');
 assert.deepEqual(await pageA.evaluate(()=>window.__authTelemetry),[],'auth diagnostics do not use browser analytics');
 assert.deepEqual(await pageB.evaluate(()=>window.__authTelemetry),[]);assert.deepEqual(await pageC.evaluate(()=>window.__authTelemetry),[]);
 assert.deepEqual(trackedEvents,[],'no analytics script or browser tracking request runs on the account page');
 assert.deepEqual(pageErrors,[],'production-built account JS has no browser errors');
 console.log(JSON.stringify({builtAccountJs:'executed',missingFragment:'safe state; no confirm POST',wrongBrowser:'rejected; challenge remains',sameBrowser:'confirmed; one session',replay:'rejected; no second session',diagnostics:'sanitized reason codes and random IDs only',analytics:'none'}));
}finally{await contextA.close();await contextB.close();await contextC.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
