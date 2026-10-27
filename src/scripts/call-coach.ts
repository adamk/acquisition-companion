import {CALL_AREAS,COVERAGE_STATUSES} from '../lib/seller-call-coach.mjs';
import {installCoachWorkspaceBridge} from '../lib/deal-workspace-bridge.mjs';

const root=document.querySelector<HTMLElement>('[data-call-coach]');
if(root){
 const one=<T extends Element=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const notes=one<HTMLTextAreaElement>('#call-notes'),ask=one<HTMLButtonElement>('[data-ask-next]'),review=one<HTMLButtonElement>('[data-review-call]');
 const status=one('[data-coach-status]'),error=one('[data-coach-error]'),dialog=one<HTMLDialogElement>('[data-clear-dialog]');
 const selects=Array.from(root.querySelectorAll<HTMLSelectElement>('[data-coverage]'));
 let ready=false,busy=false,generation=0,revision=0,controller:AbortController|null=null;
 let questionRevision:number|null=null,reviewRevision:number|null=null;
 let recentQuestions:string[]=[];
 let followUpQuestions:string[]=[];
 const manual=new Set<string>();
 const sessionId=crypto.randomUUID();
 function controls(){ask.disabled=review.disabled=!ready||busy||!notes.value.trim();one('[data-answer-panel]').setAttribute('aria-busy',String(busy));}
 function counts(){one('[data-note-count]').textContent=`${Array.from(notes.value).length.toLocaleString()} / 4,000`;one('[data-coverage-count]').textContent=`${selects.filter(s=>s.value==='clear').length} / ${CALL_AREAS.length} clear`;controls();}
 function clear(preserveWorkspace=false){
  generation++;controller?.abort();controller=null;busy=false;revision=0;questionRevision=reviewRevision=null;notes.value='';recentQuestions=[];followUpQuestions=[];manual.clear();
  if(!preserveWorkspace)dealBridge.clear();
  selects.forEach(s=>{s.value='not_discussed';one(`[data-coverage-hint="${s.dataset.coverage}"]`).textContent='';});
  one('[data-next-question]').textContent='Add a few notes, then ask for your next question.';
  one('[data-why]').textContent='';one('[data-watch]').textContent='';one('[data-review-sections]').replaceChildren();one('[data-call-sources]').replaceChildren();one('[data-review-sources]').replaceChildren();
  for(const s of ['[data-question-detail]','[data-watch-panel]','[data-review]','[data-sources-panel]','[data-review-sources-panel]','[data-freshness]','[data-review-freshness]','[data-coach-error]'])one(s).hidden=true;
  ask.textContent='What should I ask next?';review.textContent='Review this call';counts();
 }
 function freshness(justReturned?:string){
  for(const [selector,version,action] of [['[data-freshness]',questionRevision,'next_question'],['[data-review-freshness]',reviewRevision,'review_call']] as const){
   const stale=version!==null&&version!==revision,el=one(selector);
   el.hidden=!stale;el.textContent=stale?(justReturned===action?'Notes changed while coaching was requested. This response uses your earlier summaries; ask again when ready.':'Notes or coverage changed since this response. Ask again when you need an updated response.'):'';
  }
 }
 function changed(){revision++;freshness();counts();}
 notes.value=''; // Never restore browser form state as a saved call.
 notes.addEventListener('input',changed);
 selects.forEach(s=>s.addEventListener('change',()=>{manual.add(s.dataset.coverage!);one(`[data-coverage-hint="${s.dataset.coverage}"]`).textContent='Your selection';changed();}));
 one('[data-clear-call]').addEventListener('click',()=>dialog.showModal());
 one('[data-keep-call]').addEventListener('click',()=>dialog.close());
 one('[data-confirm-clear]').addEventListener('click',()=>{clear();dialog.close();notes.focus();});

 async function access(){
  ready=false;controls();
  try{
   const [serviceResponse,accountResponse]=await Promise.all([fetch('/api/ai/status',{credentials:'same-origin',cache:'no-store'}),fetch('/api/account',{credentials:'same-origin',cache:'no-store',headers:{'X-Account-Request':'1'}})]);
   const service=await serviceResponse.json();const account=accountResponse.ok?await accountResponse.json():null;
   ready=serviceResponse.ok&&service.available===true&&account?.entitled===true;
   status.textContent=ready?'Ready · each coaching request or review uses 1 of your 100 monthly AI requests.':accountResponse.status===401||service.access==='login_required'?'Sign in to use Seller Call Coach.':account&&!account.entitled?'An active Deal Lab subscription is required.':'Seller Call Coach is temporarily unavailable. Reload to check again.';
   one('[data-coach-access-links]').hidden=ready;
   if(ready)void dealBridge.ready();
  }catch{status.textContent='Unable to check access. Reload to try again.';}
  controls();
 }
 function sources(citations:unknown,action:string){
  const isReview=action==='review_call';
  const list=one(isReview?'[data-review-sources]':'[data-call-sources]');list.replaceChildren();
  if(Array.isArray(citations))for(const c of citations.slice(0,8)){
   if(typeof c?.title!=='string'||typeof c?.url!=='string')continue;
   try{
    const url=new URL(c.url,location.origin);
    if(![location.origin,'https://acquisitioncompanion.com'].includes(url.origin)||url.username||url.password||!/^\/(course|topics|examples|glossary)\/[a-z0-9-]+\/$/.test(url.pathname)||url.search||url.hash)continue;
    const li=document.createElement('li'),a=document.createElement('a');a.href=url.pathname;a.textContent=c.title.slice(0,300);li.append(a);list.append(li);
   }catch{/* Ignore unsupported citation URLs. */}
  }
  one(isReview?'[data-review-sources-panel]':'[data-sources-panel]').hidden=!list.childElementCount;
 }
 // Treat even our own endpoint's response as untrusted. Never render HTML.
 function validCoach(c:any,action:string){
  const text=(v:unknown,n:number)=>typeof v==='string'&&Array.from(v).length<=n;
  if(!c||!text(c.nextQuestion,320)||!text(c.whyItMatters,500)||!text(c.watchFor,320)||!Array.isArray(c.coverage)||c.coverage.length>9)return false;
  if(c.coverage.some((v:any)=>!CALL_AREAS.some(a=>a.id===v?.area)||!Object.hasOwn(COVERAGE_STATUSES,v?.status)))return false;
  if(action==='next_question')return !!c.nextQuestion.trim()&&!!c.whyItMatters.trim()&&c.review===null;
  return c.review&&['learned','unclear','risks','agenda','followUpQuestions'].every(k=>Array.isArray(c.review[k])&&c.review[k].length>0&&c.review[k].length<=4&&c.review[k].every((v:unknown)=>text(v,320)));
 }
 async function send(action:'next_question'|'review_call'){
  if(!ready||busy||!notes.value.trim())return;
  if(!await dealBridge.authorize()||!ready||busy||!notes.value.trim())return;
  error.hidden=true;
  const body=JSON.stringify({mode:'seller_call_coach',action,notes:notes.value,coverage:Object.fromEntries(selects.map(s=>[s.dataset.coverage,s.value])),recentQuestions:recentQuestions.slice(-3)});
  if(Array.from(notes.value).length>4000||new TextEncoder().encode(body).length>12*1024){error.textContent='Your notes are too long for this request. Shorten the summaries and try again.';error.hidden=false;return;}
  const run=generation,requestedRevision=revision,abort=new AbortController();controller=abort;busy=true;controls();
  const button=action==='next_question'?ask:review,oldLabel=button.textContent;button.textContent=action==='next_question'?'Finding your next question…':'Reviewing this call…';
  const timeout=setTimeout(()=>abort.abort(),30000);
  try{
   const response=await fetch('/api/ai',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-AI-Session-ID':sessionId},body,signal:abort.signal,cache:'no-store'});
   if(run!==generation)return;
   if(!response.ok){
    let code='';try{code=(await response.json())?.error?.code||'';}catch{/* Never display provider/server messages. */}
    if(response.status===401||response.status===402){ready=false;status.textContent=response.status===401?'Sign in to use Seller Call Coach.':'An active Deal Lab subscription is required.';one('[data-coach-access-links]').hidden=false;}
    throw new Error(response.status===429?(code==='monthly_limit'?'Your monthly allowance is used up. Check Account & usage.':'Too many requests right now. Wait a minute before trying again.'):response.status===401||response.status===402?'Check your account access before trying again.':'Coaching could not finish. Your notes are still here. A request that reached the AI service counts toward your allowance. Try again only when you are ready.');
   }
   const data=await response.json();if(run!==generation)return;
   if(!validCoach(data.coach,action))throw new Error('Coaching could not prepare a safe response. Your notes are still here. This request may count toward your allowance.');
   const c=data.coach;
   sources(data.citations,action);
   if(action==='next_question'){
    one('[data-next-question]').textContent=c.nextQuestion;one('[data-why]').textContent=c.whyItMatters;one('[data-watch]').textContent=c.watchFor;
    one('[data-question-detail]').hidden=false;one('[data-watch-panel]').hidden=!c.watchFor.trim();
    recentQuestions=[...recentQuestions,c.nextQuestion].slice(-3);questionRevision=requestedRevision;
   }else{
    const sections=one('[data-review-sections]');sections.replaceChildren();
    for(const [key,label] of [['learned','What we learned'],['unclear','What remains unclear'],['risks','Potential risks to investigate'],['agenda','Suggested next-call agenda'],['followUpQuestions','Suggested follow-up questions']]){
     const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('ul');heading.textContent=label;
     for(const item of c.review[key]){const li=document.createElement('li');li.textContent=item;list.append(li);}section.append(heading,list);sections.append(section);
    }
    one('[data-review]').hidden=false;reviewRevision=requestedRevision;followUpQuestions=[...c.review.followUpQuestions];
   }
   const changedDuringRequest=revision!==requestedRevision;
   if(!changedDuringRequest)for(const suggestion of c.coverage){
    if(manual.has(suggestion.area))continue;
    const select=selects.find(s=>s.dataset.coverage===suggestion.area)!;select.value=suggestion.status;one(`[data-coverage-hint="${suggestion.area}"]`).textContent='Coach suggested · you can change this';
   }
   freshness(changedDuringRequest?action:undefined);
  }catch(e){
   if(run!==generation)return;
   error.textContent=abort.signal.aborted?'The request timed out. Your notes are still here. It may count toward your allowance; there is no automatic retry.':e instanceof Error&&e.message.startsWith('Coaching')||e instanceof Error&&/^(Your monthly|Too many|Check your)/.test(e.message)?e.message:'Unable to complete coaching. Your notes are still here. The request may count toward your allowance. Please try again when ready.';
   error.hidden=false;
  }finally{clearTimeout(timeout);if(run===generation){controller=null;busy=false;button.textContent=oldLabel;counts();}}
 }
 ask.addEventListener('click',()=>void send('next_question'));review.addEventListener('click',()=>void send('review_call'));
 const dealBridge=installCoachWorkspaceBridge({
  async getNamespace(){
   const response=await fetch('/api/account',{credentials:'same-origin',cache:'no-store',headers:{'X-Account-Request':'1'}});
   if(!response.ok)return null;const account=await response.json();
   return account.entitled===true&&typeof account.localWorkspaceNamespace==='string'?account.localWorkspaceNamespace:null;
  },
  onContext(summary:string){clear(true);notes.value=summary;changed();},
  onAccessCheck(checking:boolean){one('.coach-grid').hidden=checking;if(checking){ask.disabled=true;review.disabled=true;}else controls();},
  onInvalidContext(){clear();ready=false;status.textContent='Deal context is no longer available. Reload to check your account and start a fresh call.';one('[data-coach-access-links]').hidden=false;controls();},
  questions:()=>[...recentQuestions,...followUpQuestions],
 });
 window.addEventListener('pagehide',()=>{clear();ready=false;controls();});
 window.addEventListener('pageshow',event=>{if(event.persisted){clear();void access();}});
 counts();void access();
}
