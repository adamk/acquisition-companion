// Local browser tests; all paid/model endpoints are mocked, never production.
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:4321';
await fs.promises.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{localStorage.setItem('acquisition-companion-analytics-consent','granted');window.__injected=false;});
 const errors=[],external=[],calls=[];let entitled=false,signedIn=false,nextError=null,hold=null;
 context.on('request',r=>{if(new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
 await context.route('**/api/account',r=>r.fulfill(signedIn?{json:{signedIn:true,entitled,usage:{requestCount:0},monthlyRequestLimit:100}}:{status:401,json:{error:{code:'login_required'}}}));
 await context.route('**/api/ai/status',r=>r.fulfill({json:entitled?{status:'ready',available:true}:{status:'access_required',available:false,access:signedIn?'subscription_required':'login_required'}}));
 await context.route('**/api/ai',async r=>{
  const body=r.request().postDataJSON();calls.push(body);if(hold){const waiting=hold;hold=null;await waiting;}
  if(nextError){const status=nextError;nextError=null;return r.fulfill({status,json:{error:{code:status===429?'monthly_limit':'unavailable',message:'UNTRUSTED_PROVIDER_MESSAGE'}}});}
  const coach=body.action==='review_call'?{nextQuestion:'',whyItMatters:'',watchFor:'',coverage:[],review:{learned:['Seller reports $600k profit; undefined.'],unclear:['Earnings basis.'],risks:['Owner dependence requires investigation.'],agenda:['Clarify earnings and operations.'],followUpQuestions:['What earnings measure did you mean?']}}:{nextQuestion:calls.length===1?'<img src=x onerror="window.__injected=true"> Which earnings measure do you mean?':'When you say $600k of profit, which earnings measure are you referring to?',whyItMatters:'Define earnings before discussing price.',watchFor:'Seller-reported, not verified.',coverage:[{area:'earnings',status:'partial'},{area:'customers',status:'partial'}],review:null};
  try{await r.fulfill({json:{coach,citations:[{title:body.action==='review_call'?'Management':'Working capital',url:`${base}/topics/${body.action==='review_call'?'management':'working-capital'}/`},{title:'Unsafe',url:'javascript:alert(1)'}]}});}catch{/* Navigation may cancel an explicitly reset request. */}
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/ai/call-coach/`);
 await page.getByText('Sign in to use Seller Call Coach.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'What should I ask next?',exact:true}).isDisabled(),true);
 signedIn=true;await page.reload();await page.getByText('An active Deal Lab subscription is required.',{exact:true}).waitFor();assert.equal(calls.length,0);
 entitled=true;await page.reload();await page.getByText('Ready · each coaching request or review uses 1 of your 100 monthly AI requests.',{exact:true}).waitFor();
 const notes=page.getByRole('textbox',{name:'Live notes',exact:true}),ask=page.getByRole('button',{name:'What should I ask next?',exact:true});
 assert.equal(await ask.isDisabled(),true);await notes.fill('Owner says $600k profit. UNIQUE_BROWSER_NOTE');
 await page.getByLabel('Customers & revenue coverage',{exact:true}).selectOption('clear');await ask.click();
 await page.locator('[data-next-question]').filter({hasText:'Which earnings measure'}).waitFor();assert.equal(calls.length,1);assert.equal(calls[0].mode,'seller_call_coach');assert.equal(calls[0].coverage.customers,'clear');
 assert.equal(await page.locator('[data-next-question] img').count(),0);assert.equal(await page.evaluate(()=>window.__injected),false);
 assert.equal(await page.getByLabel('Earnings definition coverage',{exact:true}).inputValue(),'partial');assert.equal(await page.getByLabel('Customers & revenue coverage',{exact:true}).inputValue(),'clear');
 assert.equal(await page.locator('[data-call-sources] a').count(),1);
 assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('UNIQUE_BROWSER_NOTE')),false);
 assert.equal(await page.locator('script[src*="googletagmanager"]').count(),0);assert.equal(await page.evaluate(()=>!!window.gtag),false);
 await page.getByRole('button',{name:'Review this call',exact:true}).click();await page.getByRole('heading',{name:'What we learned',exact:true}).waitFor();assert.equal(calls.length,2);assert.equal(calls[1].action,'review_call');assert.ok(calls[1].recentQuestions.length>0);
 const questionSourcesAfterReview=await page.locator('[data-call-sources] a').allTextContents();
 await notes.fill('Owner says $600k profit. Revenue is recurring.');await ask.click();await page.locator('[data-next-question]').filter({hasText:'When you say'}).waitFor();
 const reviewStaysStale=await page.locator('[data-review-freshness]').isVisible();
 await notes.fill('Owner says $600k profit. Owner handles quoting.');await page.getByRole('button',{name:'Review this call',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-answer-panel]').getAttribute('aria-busy')==='false');
 assert.deepEqual({questionSourcesAfterReview,reviewStaysStale,questionStaysStale:await page.locator('[data-freshness]').isVisible(),reviewSources:await page.locator('[data-review-sources] a').allTextContents()},{questionSourcesAfterReview:['Working capital'],reviewStaysStale:true,questionStaysStale:true,reviewSources:['Management']},'question/review retain independent freshness and provenance');
 await ask.click();await page.waitForFunction(()=>document.querySelector('[data-answer-panel]').getAttribute('aria-busy')==='false');
 for(const width of [1440,1100,768,390]){
  await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}`);
  assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`axe ${width}`);
  await page.screenshot({path:`artifacts/call-coach-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 const beforeFailure=calls.length;nextError=429;await ask.click();await page.getByRole('alert').filter({hasText:'monthly allowance'}).waitFor();assert.equal(calls.length,beforeFailure+1);assert.ok(!(await page.locator('body').innerText()).includes('UNTRUSTED_PROVIDER_MESSAGE'));
 let release;hold=new Promise(r=>{release=r;});const pending=page.waitForRequest(r=>r.url().endsWith('/api/ai'));await ask.click();await pending;
 // Edit coverage and notes during a request; late suggestions must not replace them.
 await page.getByLabel('Earnings definition coverage',{exact:true}).selectOption('clear');await notes.fill('Owner explains net income. Edited during request.');release();
 await page.getByText('Notes changed while coaching was requested.',{exact:false}).waitFor();assert.equal(await page.getByLabel('Earnings definition coverage',{exact:true}).inputValue(),'clear');
 await page.getByRole('button',{name:'Clear call',exact:true}).click();await page.getByRole('button',{name:'Keep working',exact:true}).click();assert.ok((await notes.inputValue()).includes('Edited'));
 await page.getByRole('button',{name:'Clear call',exact:true}).click();await page.getByRole('button',{name:'Clear notes and coaching',exact:true}).click();assert.equal(await notes.inputValue(),'');assert.equal(await page.locator('[data-review]').isVisible(),false);assert.equal(await ask.isDisabled(),true);
 await notes.fill('Temporary note');await page.reload();await notes.waitFor();assert.equal(await notes.inputValue(),'');
 assert.equal(external.length,0,`no analytics or browser-to-provider requests: ${external}`);assert.deepEqual(errors,[]);
 await context.close();
 console.log('Seller Call Coach: paid gates, next/review, safe text, manual coverage, in-flight edits, clearing, no storage/analytics/provider requests; axe + overflow at 1440/1100/768/390 passed.');
}finally{await browser.close();}
