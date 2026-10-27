// Synthetic local checks. Account and model endpoints are mocked; IndexedDB is real.
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:4321';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'local preview required');
const origin=new URL(base).origin,namespaceA='a'.repeat(64),namespaceB='b'.repeat(64);
const moduleSources={model:await fs.readFile('src/lib/deal-workspace.mjs','utf8'),storage:await fs.readFile('src/lib/deal-workspace-storage.mjs','utf8')};
const marker='SYNTHETIC_WORKSPACE_MARKER',profile=await fs.mkdtemp(path.join(os.tmpdir(),'acq-workspace-browser-'));
await fs.mkdir('artifacts',{recursive:true});
const context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000}});
const external=[],errors=[],logs=[],calls=[],accountHeaders=[],contentRequests=[];let signedIn=false,entitled=false,namespace=namespaceA,nextError=null,hold=null,accountFailure=false;
context.on('page',page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>logs.push(m.text()));});
context.on('request',request=>{const url=new URL(request.url());if(url.origin!==origin)external.push(request.url());if(request.url().includes(marker)||(request.postData()||'').includes(marker))contentRequests.push({path:url.pathname,urlContainsMarker:request.url().includes(marker)});});
await context.addInitScript(()=>{try{localStorage.setItem('acquisition-companion-analytics-consent','granted');}catch{/* Opaque about:blank and axe frames have no site storage. */}window.__injected=false;window.addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.type==='ac-deal-workspace:context')window.__testWorkspaceContext=event.data;});});
await context.route('**/*',async route=>{if(new URL(route.request().url()).origin!==origin)return route.abort();await route.continue();});
await context.route('**/api/account',route=>{accountHeaders.push(route.request().headers());return route.fulfill(accountFailure?{status:503,json:{error:{code:'unavailable'}}}:signedIn?{json:{signedIn:true,entitled,localWorkspaceNamespace:namespace,usage:{requestCount:0},monthlyRequestLimit:100}}:{status:401,json:{error:{code:'login_required'}}});});
await context.route('**/api/ai/status',route=>route.fulfill({json:entitled?{status:'ready',available:true}:{status:'access_required',available:false,access:signedIn?'subscription_required':'login_required'}}));
await context.route('**/api/ai',async route=>{
 const body=route.request().postDataJSON();calls.push({body,headers:route.request().headers()});
 if(hold){const waiting=hold;hold=null;await waiting;}
 if(nextError){const status=nextError;nextError=null;return route.fulfill({status,json:{error:{code:status===429?'monthly_limit':'unavailable',message:'UNTRUSTED_MODEL_ERROR'}}});}
 const workspaceReview={known:['Seller-reported earnings remain unverified.'],unclear:['Which earnings measure does profit mean?'],evidenceGaps:['Request earnings reconciliation.'],risks:['Owner dependence needs investigation.'],questions:['<img src=x onerror="window.__injected=true"> Clarify the earnings measure.'],actions:['Request a short earnings reconciliation.']};
 try{await route.fulfill({json:body.mode==='deal_workspace'?{workspaceReview,citations:[{title:'Working capital',url:`${base}/topics/working-capital/`},{title:'Unsafe',url:'javascript:alert(1)'}]}:{coach:{nextQuestion:'Which earnings measure do you mean?',whyItMatters:'Define earnings before price.',watchFor:'Seller-reported, not verified.',coverage:[],review:null},citations:[]}});}catch{/* A navigation or explicit cancellation can abort a mocked response. */}
});
const page=await context.newPage();
const field=name=>page.locator(`[data-field="${name}"]`);
const content=page.locator('[data-workspace-content]');
const claimValues=()=>page.locator('[data-claim-list] [data-entry-field="statement"]').evaluateAll(nodes=>nodes.map(node=>node.value));
const ready=async()=>{await expect(content).toBeVisible();await expect(field('alias')).toBeEnabled();};
const openDetails=async name=>{const details=field(name).locator('xpath=ancestor::details');if(await details.count())await details.evaluate(el=>{el.open=true;});};
const allRows=()=>page.evaluate(async()=>{
 const result=[];for(const info of await indexedDB.databases()){
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(info.name);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('storage inspection failed'));});
  for(const store of db.objectStoreNames){const rows=await new Promise((resolve,reject)=>{const request=db.transaction(store).objectStore(store).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('storage inspection failed'));});result.push(...rows);}
  db.close();
 }return result;
});
const savedContains=async text=>JSON.stringify(await allRows()).includes(text);
try{
 await page.goto(`${base}/ai/deal-workspace/`);await expect(page.locator('[data-workspace-status]')).not.toContainText('Checking');assert.equal(await content.isVisible(),false);assert.equal(calls.length,0);
 signedIn=true;await page.reload();await expect(page.locator('[data-workspace-status]')).not.toContainText('Checking');assert.equal(await content.isVisible(),false);assert.equal(calls.length,0);
 entitled=true;await page.reload();await ready();
 await field('alias').fill(`${marker}_TRANSIENT`);accountFailure=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(content).not.toBeVisible();await expect(page.locator('[data-workspace-status]')).not.toContainText('Checking');accountFailure=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await ready();assert.equal(await field('alias').inputValue(),`${marker}_TRANSIENT`);
 await field('alias').fill(`${marker}_UNSAVED`);await page.reload();await ready();assert.equal(await field('alias').inputValue(),'Project Atlas');
 const second=await context.newPage();await second.goto(`${base}/ai/deal-workspace/`);await expect(second.locator('[data-workspace-content]')).toBeVisible();assert.equal(await second.locator('[data-field="alias"]').inputValue(),'Project Atlas');await second.close();
 await field('alias').fill(`${marker}_A`);
 await openDetails('economics.earnings');await field('economics.earnings').fill('600000');await field('economics.askingPrice').fill('3000000');
 await expect(page.locator('[data-workspace-metric]')).not.toContainText('5.00');
 await field('economics.earningsMeasure').selectOption('ebitda');await expect(page.locator('[data-workspace-metric]')).toContainText('5');
 await field('economics.earnings').fill('-50000');assert.equal(await field('economics.earnings').evaluate(input=>input.checkValidity()),true);await expect(page.locator('[data-workspace-metric]')).toContainText('unavailable');await field('economics.earnings').fill('600000');
 await field('economics.earningsMeasure').selectOption('unknown');
 await page.locator('[data-save-local]').check();await expect.poll(()=>savedContains(`${marker}_A`)).toBe(true);
 await page.reload();await ready();assert.equal(await field('alias').inputValue(),`${marker}_A`);assert.equal(await page.locator('[data-save-local]').isChecked(),true);
 // A second page in this persistent browser profile sees only explicitly saved data.
 const savedPage=await context.newPage();await savedPage.goto(`${base}/ai/deal-workspace/`);await expect(savedPage.locator('[data-field="alias"]')).toHaveValue(`${marker}_A`);await savedPage.close();
 namespace=namespaceB;await page.reload();await ready();assert.equal(await field('alias').inputValue(),'Project Atlas');await field('alias').fill(`${marker}_B`);await page.locator('[data-save-local]').check();await expect.poll(()=>savedContains(`${marker}_B`)).toBe(true);
 namespace=namespaceA;await page.reload();await ready();assert.equal(await field('alias').inputValue(),`${marker}_A`);assert.ok(!(await page.locator('[data-deal-select]').innerText()).includes(`${marker}_B`));
 // Keyboard navigation follows the tabs; dialogs start with the safe action.
 await page.locator('[data-workspace-tab="overview"]').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-workspace-tab="claims"]')).toBeFocused();await page.keyboard.press('Home');await expect(page.locator('[data-workspace-tab="overview"]')).toBeFocused();
 await page.locator('[data-delete-deal]').click();await expect(page.locator('[data-workspace-confirm]')).toBeVisible();await expect(page.locator('[data-confirm-cancel]')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('[data-workspace-confirm]')).not.toBeVisible();assert.equal(await field('alias').inputValue(),`${marker}_A`);
 await page.locator('[data-workspace-tab="questions"]').click();await page.locator('[data-add-question]').click();const question=page.locator('[data-question-list] [data-entry-field="text"]').first();await question.fill('Which earnings measure is reported?');
 const questionCount=await page.locator('[data-question-list] [data-row-id]').count(),claimCount=await page.locator('[data-claim-list] [data-row-id]').count();
 assert.equal(calls.length,0);await page.locator('[data-review-gaps]').click();await expect(page.locator('[data-review-panel]')).toBeVisible();assert.equal(calls.length,1);assert.equal(calls[0].body.mode,'deal_workspace');assert.equal(calls[0].body.action,'review_gaps');assert.match(calls[0].headers['x-ai-session-id'],/^[a-f0-9-]{36}$/);assert.equal(calls[0].body.deal.economics.earningsMeasure,'unknown');
 assert.equal(await page.locator('[data-question-list] [data-row-id]').count(),questionCount);assert.equal(await page.locator('[data-claim-list] [data-row-id]').count(),claimCount);assert.equal(await page.locator('[data-question-list] [data-entry-field="status"]').first().inputValue(),'unanswered');assert.equal(await page.locator('[data-review-panel] img').count(),0);assert.equal(await page.evaluate(()=>window.__injected),false);
 await page.locator('[data-review-suggestion][data-kind="question"]').first().check();await page.locator('[data-add-selected]').click();assert.equal(await page.locator('[data-question-list] [data-row-id]').count(),questionCount+1);assert.equal(await page.locator('[data-question-list] [data-entry-field="status"]').last().inputValue(),'unanswered');
 await question.fill('What supports the earnings reconciliation?');await expect(page.locator('[data-review-stale]')).toBeVisible();
 for(const width of [1440,1100,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}`);assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],`axe ${width}`);await page.screenshot({path:`artifacts/deal-workspace-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:1440,height:1000});nextError=429;await page.locator('[data-review-gaps]').click();await expect(page.locator('[data-workspace-error]')).toBeVisible();assert.equal(calls.length,2);assert.ok(!(await page.locator('body').innerText()).includes('UNTRUSTED_MODEL_ERROR'));
 // An edit during an explicitly requested review must not accept late output as current.
 let release;hold=new Promise(resolve=>{release=resolve;});const pending=page.waitForRequest(r=>r.url().endsWith('/api/ai'));await page.locator('[data-review-gaps]').click();await pending;await question.fill('Edited during pending review');release();await expect(page.locator('[data-review-stale]')).toBeVisible();assert.equal(calls.length,3);
 await page.locator('[data-open-coach]').click();await expect(page.locator('[data-workspace-coach-dialog]')).toBeVisible();assert.match(await page.locator('[data-workspace-coach-preview]').inputValue(),/no verification|unverified|not verified/i);assert.equal(calls.length,3);await page.locator('[data-workspace-coach-cancel]').click();
 // A real popup receives only the approved preview. Opening it is not an AI action.
 await page.locator('[data-open-coach]').click();const approvedPreview=await page.locator('[data-workspace-coach-preview]').inputValue();await page.evaluate(()=>{window.__testRealOpen=window.open;window.open=()=>null;});await page.locator('[data-workspace-coach-confirm]').click();await expect(page.locator('[data-workspace-popup-error]')).toBeVisible();assert.equal(await page.locator('[data-workspace-coach-preview]').inputValue(),approvedPreview);assert.equal(calls.length,3);await page.evaluate(()=>{window.open=window.__testRealOpen;});const popupEvent=page.waitForEvent('popup');await page.locator('[data-workspace-coach-confirm]').click();const coach=await popupEvent;await coach.bringToFront();await expect(coach.locator('[data-coach-workspace]')).toBeVisible();const notes=coach.getByRole('textbox',{name:'Live notes',exact:true});await expect(notes).toHaveValue(new RegExp(`${marker}_A`));assert.equal(calls.length,3);assert.equal(new URL(coach.url()).search,'');assert.equal(new URL(coach.url()).hash,'');
 // Merely opening a new preview must not replace an earlier confirmed handoff.
 await page.bringToFront();await ready();await page.locator('[data-workspace-tab="overview"]').click();await field('alias').fill(`${marker}_UNCONFIRMED`);await page.locator('[data-open-coach]').click();await expect(page.locator('[data-workspace-coach-preview]')).toHaveValue(new RegExp(`${marker}_UNCONFIRMED`));await page.locator('[data-workspace-coach-cancel]').click();await coach.reload();await coach.bringToFront();await expect(coach.locator('[data-coach-workspace]')).toBeVisible();await expect(notes).toHaveValue(new RegExp(`${marker}_A`));assert.ok(!(await notes.inputValue()).includes(`${marker}_UNCONFIRMED`));assert.equal(calls.length,3);await page.bringToFront();await ready();await field('alias').fill(`${marker}_A`);await coach.bringToFront();
 await notes.fill(`${await notes.inputValue()}\nFULL_NOTES_SHOULD_NOT_TRANSFER`);await coach.getByRole('button',{name:'What should I ask next?',exact:true}).click();await expect(coach.locator('[data-next-question]')).toContainText('Which earnings measure');assert.equal(calls.length,4);
 await coach.locator('[data-coach-return]').click();await expect(coach.locator('[data-coach-return-dialog]')).toBeVisible();assert.equal(await coach.locator('[data-return-selected]:checked').count(),0);await coach.locator('[data-return-fact]').fill('SYNTHETIC_APPROVED_FACT');await coach.locator('[data-return-action]').fill('SYNTHETIC_APPROVED_ACTION');await coach.locator('[data-return-selected]').first().check();await coach.locator('[data-return-confirm]').click();await expect(coach.locator('[data-coach-return-dialog]')).not.toBeVisible();await expect.poll(claimValues).toContain('SYNTHETIC_APPROVED_FACT');assert.equal(await savedContains('FULL_NOTES_SHOULD_NOT_TRANSFER'),false);assert.equal(calls.length,4);
 // Replay an identical, correctly sourced transfer. It may be acknowledged again,
 // but it must add its approved payload only once.
 const beforeReplay=await page.locator('[data-claim-list] [data-row-id]').count();await coach.evaluate(()=>{const c=window.__testWorkspaceContext;const message={type:'ac-deal-workspace:return',namespace:c.namespace,dealId:c.dealId,nonce:c.nonce,transferId:'synthetic-replay-id',items:{facts:['SYNTHETIC_REPLAY_FACT'],questions:[],actions:[]}};window.opener.postMessage(message,location.origin);window.opener.postMessage(message,location.origin);});await expect.poll(()=>page.locator('[data-claim-list] [data-row-id]').count()).toBe(beforeReplay+1);
 namespace=namespaceB;await coach.evaluate(()=>{const c=window.__testWorkspaceContext;window.opener.postMessage({type:'ac-deal-workspace:return',namespace:c.namespace,dealId:c.dealId,nonce:c.nonce,transferId:'synthetic-wrong-account',items:{facts:['SYNTHETIC_MISMATCHED_FACT'],questions:[],actions:[]}},location.origin);});await expect(coach.locator('[data-coach-workspace]')).not.toBeVisible();assert.ok(!(await claimValues()).includes('SYNTHETIC_MISMATCHED_FACT'));await coach.close();namespace=namespaceA;await page.reload();await ready();
 // One-record deletion preserves the other namespace. Global deletion explicitly covers both.
 await page.locator('[data-delete-deal]').click();await page.locator('[data-confirm-accept]').click();await expect.poll(()=>savedContains(`${marker}_A`)).toBe(false);assert.equal(await savedContains(`${marker}_B`),true);
 await page.locator('.workspace-privacy summary').click();await page.locator('[data-clear-all]').click();await expect(page.locator('[data-confirm-description]')).toContainText(/all.*accounts|every account/i);await page.locator('[data-confirm-cancel]').click();assert.equal(await savedContains(`${marker}_B`),true);
 await page.locator('[data-clear-all]').click();await page.locator('[data-confirm-accept]').click();await expect.poll(()=>savedContains(`${marker}_B`)).toBe(false);
 // Entitlement loss while a tab is open must mask the editor before interaction resumes.
 entitled=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(content).not.toBeVisible();assert.equal(calls.length,4);
 // Exercise the unmodified persistence adapter against real Chromium IndexedDB,
 // including corrupted/future rows and denied/quota failures, without a fake IDB.
 const storageProof=await page.evaluate(async({model,storage,namespace})=>{
  const modelUrl=URL.createObjectURL(new Blob([model],{type:'text/javascript'}));
  const storageUrl=URL.createObjectURL(new Blob([storage.replace("'./deal-workspace.mjs'",JSON.stringify(modelUrl))],{type:'text/javascript'}));
  try{
   const {newDeal}=await import(modelUrl),{createDealStorage}=await import(storageUrl),adapter=createDealStorage(namespace);
   const deal=newDeal('SYNTHETIC_CORRUPTION_SENTINEL');await adapter.save(deal);adapter.close();
   const rawDb=await new Promise((resolve,reject)=>{const request=indexedDB.open('acquisition-companion-deal-workspace-v1',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('inspection failed'));});
   const corrupt=async version=>new Promise((resolve,reject)=>{const tx=rawDb.transaction('deals','readwrite');tx.objectStore('deals').put({key:`${namespace}:${deal.id}`,namespace,deal:{...deal,version}});tx.oncomplete=resolve;tx.onerror=()=>reject(new Error('inspection failed'));});
   const failures=[];
   for(const version of [2,null]){await corrupt(version);const check=createDealStorage(namespace);try{await check.list();failures.push('ACCEPTED');}catch(error){failures.push(error.message);}finally{check.close();}}
   rawDb.close();
   for(const name of ['SecurityError','QuotaExceededError']){const denied=createDealStorage(namespace,{open(){throw new DOMException('SYNTHETIC_PRIVATE_ERROR',name);}});try{await denied.save(deal);failures.push('ACCEPTED');}catch(error){failures.push(error.message);}finally{denied.close();}}
   const cleanup=createDealStorage(namespace);await cleanup.clearAll();cleanup.close();
   const first=createDealStorage(namespace),second=createDealStorage(namespace),race=newDeal('SYNTHETIC_RACE_SENTINEL');await first.save(race);await second.list();await first.remove(race.id);
   let rowFence=false,globalFence=false;try{await second.save(race);}catch{rowFence=true;}await first.save(race);const explicitlyResaved=(await first.list()).some(row=>row.id===race.id);
   await first.clearAll();try{await second.save(race);}catch{globalFence=true;}const noResurrection=(await first.list()).length===0;first.close();second.close();
   return {failures,rowFence,globalFence,explicitlyResaved,noResurrection};
  }finally{URL.revokeObjectURL(modelUrl);URL.revokeObjectURL(storageUrl);}
 },{...moduleSources,namespace:namespaceA});
 assert.equal(storageProof.failures.length,4);assert.ok(storageProof.failures.every(message=>message.includes('Local Deal Workspace storage')&&!message.includes('SYNTHETIC')));assert.deepEqual({...storageProof,failures:undefined},{failures:undefined,rowFence:true,globalFence:true,explicitlyResaved:true,noResurrection:true});
 // Denied device storage must preserve useful page-memory work and show a generic
 // recovery message, with browser saving disabled rather than silently promised.
 entitled=true;const deniedPage=await context.newPage();await deniedPage.addInitScript(()=>Object.defineProperty(window,'indexedDB',{configurable:true,get(){throw new DOMException('SYNTHETIC_PRIVATE_STORAGE_FAILURE','SecurityError');}}));await deniedPage.goto(`${base}/ai/deal-workspace/`);await expect(deniedPage.locator('[data-workspace-content]')).toBeVisible();await expect(deniedPage.locator('[data-save-local]')).toBeDisabled();await expect(deniedPage.locator('[data-workspace-error]')).toBeVisible();await deniedPage.locator('[data-field="alias"]').fill('Page memory remains usable');assert.ok(!(await deniedPage.locator('body').innerText()).includes('SYNTHETIC_PRIVATE_STORAGE_FAILURE'));await deniedPage.close();entitled=false;assert.equal(calls.length,4);
 // A connected Coach must clear context and prevent coaching if its opener closes.
 entitled=true;const temporaryParent=await context.newPage();await temporaryParent.goto(`${base}/ai/deal-workspace/`);await expect(temporaryParent.locator('[data-workspace-content]')).toBeVisible();await temporaryParent.locator('[data-open-coach]').click();const orphanEvent=temporaryParent.waitForEvent('popup');await temporaryParent.locator('[data-workspace-coach-confirm]').click();const orphan=await orphanEvent;await orphan.bringToFront();await expect(orphan.locator('[data-coach-workspace]')).toBeVisible();await temporaryParent.close();await orphan.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(orphan.getByRole('textbox',{name:'Live notes',exact:true})).toHaveValue('');await expect(orphan.getByRole('button',{name:'What should I ask next?',exact:true})).toBeDisabled();await orphan.close();entitled=false;assert.equal(calls.length,4);
 assert.ok(accountHeaders.length>0);assert.ok(accountHeaders.every(h=>h['x-account-request']==='1'));
 assert.equal(await page.evaluate(marker=>JSON.stringify({...localStorage,...sessionStorage}).includes(marker),marker),false);assert.ok(!page.url().includes(marker));assert.ok(!logs.some(log=>log.includes(marker)));assert.ok(contentRequests.every(request=>request.path==='/api/ai'&&!request.urlContainsMarker));assert.equal(await page.locator('script[src*="googletagmanager"]').count(),0);assert.equal(await page.evaluate(()=>!!window.gtag),false);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('Deal Workspace: mocked access/review, transient access recovery, real IndexedDB persistence/namespace/deletion fences, storage failure recovery, memory defaults, safe text, manual suggestions and Coach return/replay/account checks, deletion, keyboard, no content leakage, axe and overflow at 1440/1100/768/390 passed.');
}finally{await context.close();await fs.rm(profile,{recursive:true,force:true});}
