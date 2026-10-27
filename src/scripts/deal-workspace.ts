import {newDeal,validateDeal,deriveMetrics,unknowns,coachSummary,CLAIM_STATUSES,EVIDENCE_STATUSES,QUESTION_STATUSES,ACTION_STATUSES,CATEGORIES,MAX_ENTRIES} from '../lib/deal-workspace.mjs';
import {createDealStorage} from '../lib/deal-workspace-storage.mjs';
import {installWorkspaceCoachBridge} from '../lib/deal-workspace-bridge.mjs';

const root=document.querySelector<HTMLElement>('[data-deal-workspace]')!;
if(root){
 const one=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const content=one('[data-workspace-content]'),status=one('[data-workspace-status]'),error=one('[data-workspace-error]');
 const select=one<HTMLSelectElement>('[data-deal-select]'),save=one<HTMLInputElement>('[data-save-local]'),reviewButton=one<HTMLButtonElement>('[data-review-gaps]');
 const confirm=one<HTMLDialogElement>('[data-workspace-confirm]');
 const sessionId=crypto.randomUUID();
 let deals:any[]=[],selectedId='',namespace='',ready=false,authEpoch=0,reviewGeneration=0,busy=false;
 let storage:ReturnType<typeof createDealStorage>|null=null,saveTimer:ReturnType<typeof setTimeout>|null=null;
 let saved=new Set<string>(),failedSaves=new Set<string>(),savedRevisions=new Map<string,number>(),revisions=new Map<string,number>(),reviewRevision:number|null=null,reviewDealId='';
 let controller:AbortController|null=null,confirmation:(()=>Promise<void>|void)|null=null,confirmTrigger:HTMLElement|null=null;
 const current=()=>deals.find(d=>d.id===selectedId);
 const clone=(value:any)=>structuredClone(value);
 const genericError='This change could not be saved. Keep this page open, shorten the summaries or check browser storage, then try again.';
 function message(text:string){error.textContent=text;error.hidden=!text;}
 function abortReview(){reviewGeneration++;controller?.abort();controller=null;busy=false;reviewButton.textContent='Review gaps';}
 function clearTimer(){if(saveTimer!==null)clearTimeout(saveTimer);saveTimer=null;}
 function mask(){ready=false;content.hidden=true;abortReview();clearTimer();confirm.close();one<HTMLDialogElement>('[data-workspace-coach-dialog]').close();}
 function discard(){deals=[];selectedId='';saved.clear();failedSaves.clear();savedRevisions.clear();revisions.clear();reviewRevision=null;reviewDealId='';storage?.close();storage=null;namespace='';one('[data-review-sections]').replaceChildren();one('[data-review-sources]').replaceChildren();one('[data-review-panel]').hidden=true;one<HTMLTextAreaElement>('[data-workspace-coach-preview]').value='';root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-field]').forEach(el=>el.value='');for(const kind of ['claim','evidence','question','action'])one(`[data-${kind}-list]`).replaceChildren();select.replaceChildren();message('');}
 function controls(){
  root.querySelectorAll<HTMLButtonElement>('[data-new-deal]')[0].disabled=!ready||deals.length>=20;
  reviewButton.disabled=!ready||busy||!validateDeal(current());
  one<HTMLButtonElement>('[data-open-coach]').disabled=!ready||!validateDeal(current());
  one('[data-review-panel]').setAttribute('aria-busy',String(busy));
 }
 function freshness(){const stale=reviewDealId===selectedId&&reviewRevision!==null&&reviewRevision!==(revisions.get(selectedId)||0);one('[data-review-stale]').hidden=!stale;one('[data-review-stale]').textContent=stale?'This review uses an earlier version of this deal. Your entries changed; review again when ready.':'';}
 function derived(){
  const deal=current();if(!deal)return;
  const list=one('[data-workspace-unknowns]');list.replaceChildren();for(const gap of unknowns(deal)){const li=document.createElement('li');li.textContent=gap;list.append(li);}
  if(!list.childElementCount){const li=document.createElement('li');li.textContent='No standard missing fields flagged. Your reports still need independent verification.';list.append(li);}
  const multiple=deriveMetrics(deal).ebitdaMultiple;
  one('[data-workspace-metric]').textContent=multiple===null?'EBITDA multiple: unavailable. Enter an asking price, positive earnings and an explicit EBITDA or adjusted EBITDA measure. SDE and undefined profit are not EBITDA.':`Asking price / ${deal.economics.earningsMeasure==='adjusted_ebitda'?'adjusted EBITDA':'EBITDA'}: ${multiple.toLocaleString(undefined,{maximumFractionDigits:2})}×. Based on your entries; not a valuation. Use consistent currency and periods for all amounts.`;
  for(const [tab,key] of [['claims','claims'],['evidence','evidence'],['questions','questions'],['actions','actions']])one(`[data-tab-count="${tab}"]`).textContent=String(deal[key].length);
  one('[data-deal-dates]').textContent=`Created ${new Date(deal.createdAt).toLocaleDateString()} · Updated ${new Date(deal.updatedAt).toLocaleString()}`;
  freshness();controls();
 }
 function renderSelect(){select.replaceChildren();for(const deal of deals){const option=document.createElement('option');option.value=deal.id;option.textContent=deal.alias||'Unnamed deal';select.append(option);}select.value=selectedId;one('[data-deal-count]').textContent=`${deals.length} / 20 deals`;}
 async function persist(deal:any,expectedNamespace=namespace){
  const adapter=storage,id=deal.id;
  if(!ready||!adapter||expectedNamespace!==namespace||!saved.has(id)||!deals.some(d=>d.id===id))return;
  const valid=validateDeal(deal);if(!valid){if(id===selectedId){one('[data-save-status]').textContent='Unsaved changes · complete entry text and stay within the summary limits.';}return;}
  const epoch=authEpoch,revision=revisions.get(id)||0;
  try{await adapter.save(valid);if(epoch===authEpoch&&expectedNamespace===namespace&&saved.has(id)){savedRevisions.set(id,revision);failedSaves.delete(id);if(id===selectedId)one('[data-save-status]').textContent=revision===(revisions.get(id)||0)?'Saved in this browser':'Unsaved changes';}}
  catch{if(epoch===authEpoch&&expectedNamespace===namespace){failedSaves.add(id);if(!savedRevisions.has(id))saved.delete(id);message(genericError);if(id===selectedId){save.checked=saved.has(id);one('[data-save-status]').textContent='Latest changes not saved · an older saved copy may remain';}}}
 }
 function changed(){
  const deal=current();if(!ready||!deal)return;deal.updatedAt=new Date().toISOString();revisions.set(deal.id,(revisions.get(deal.id)||0)+1);derived();
  if(saved.has(deal.id)){clearTimer();one('[data-save-status]').textContent='Unsaved changes';const snapshot=clone(deal),scope=namespace;saveTimer=setTimeout(()=>{saveTimer=null;void persist(snapshot,scope);},250);}
 }
 function field(value:any,path:string,next?:any,write=false){const keys=path.split('.');let target=value;for(const key of keys.slice(0,-1))target=target[key];if(write)target[keys.at(-1)!]=next;return target[keys.at(-1)!];}
 for(const input of root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[data-field]')){
  input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{if(!ready||!current())return;field(current(),input.dataset.field!,input instanceof HTMLInputElement&&input.type==='number'?(input.value===''?null:input.valueAsNumber):input.value,true);if(input.dataset.field==='alias')renderSelect();changed();});
 }
 function entryField(row:any,key:string,label:string,options:Record<string,string>|null,max=240,type='text'){
  const wrap=document.createElement('div');wrap.className=`workspace-field ${key==='note'||key==='statement'||key==='text'?'field-wide':''}`;
  const lab=document.createElement('label'),id=`workspace-entry-${row.id}-${key}`;lab.htmlFor=id;lab.textContent=label;
  let input:HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;
  if(options){const el=document.createElement('select');for(const [value,label]of Object.entries(options)){const option=document.createElement('option');option.value=value;option.textContent=label;el.append(option);}input=el;}
  else if(key==='statement'||key==='text'||key==='note'){const el=document.createElement('textarea');el.rows=2;el.maxLength=max;input=el;}
  else{const el=document.createElement('input');el.type=type;el.maxLength=max;input=el;}
  input.id=id;input.dataset.entryField=key;input.value=row[key];input.autocomplete='off';input.addEventListener(options?'change':'input',()=>{if(!ready)return;row[key]=input.value;changed();});wrap.append(lab,input);return wrap;
 }
 const configs:any={claim:{key:'claims',title:'Claim',text:'statement',label:'Statement / claim',statuses:CLAIM_STATUSES,status:'seller_claim',max:20},evidence:{key:'evidence',title:'Evidence item',text:'label',label:'Evidence label',statuses:EVIDENCE_STATUSES,status:'not_requested',max:30},question:{key:'questions',title:'Question',text:'text',label:'Question',statuses:QUESTION_STATUSES,status:'unanswered',max:20},action:{key:'actions',title:'Action',text:'text',label:'Next action',statuses:ACTION_STATUSES,status:'open',max:20}};
 function renderEntries(kind:string){
  const config=configs[kind],list=one(`[data-${kind}-list]`),deal=current();list.replaceChildren();if(!deal)return;
  if(!deal[config.key].length){const p=document.createElement('p');p.className='workspace-empty';p.textContent=`No ${kind==='action'?'next actions':config.key} yet. Add a short ${kind} when you are ready.`;list.append(p);}
  for(const [index,row]of deal[config.key].entries()){
   const item=document.createElement('div');item.className='workspace-entry';item.dataset.rowId=row.id;
   const heading=document.createElement('div');heading.className='workspace-entry-heading';const title=document.createElement('p');title.textContent=`${config.title} ${index+1}`;
   const remove=document.createElement('button');remove.type='button';remove.className='workspace-text-button danger';remove.textContent='Remove';remove.dataset.removeEntry='';remove.setAttribute('aria-label',`Remove ${kind} ${index+1}`);
   remove.addEventListener('click',()=>{if(!ready)return;askConfirmation(`Remove this ${kind}?`,'This entry will be removed from this deal. This cannot be undone.',`Remove ${kind}`,async()=>{deal[config.key]=deal[config.key].filter((r:any)=>r.id!==row.id);changed();renderEntries(kind);one<HTMLButtonElement>(`[data-add-${kind}]`).focus();});});heading.append(title,remove);
   const fields=document.createElement('div');fields.className='workspace-fields';fields.append(entryField(row,config.text,config.label,null,kind==='evidence'?80:240));
   if(kind!=='question')fields.append(entryField(row,'category','Category',CATEGORIES));fields.append(entryField(row,'status',kind==='evidence'?'Evidence status · reported by you':'Status · reported by you',config.statuses));
   if(kind==='claim'||kind==='evidence')fields.append(entryField(row,'note','Short source / context note',null,160));if(kind==='evidence')fields.append(entryField(row,'asOf','Evidence as of (optional)',null,10,'date'));
   item.append(heading,fields);list.append(item);
  }
  one<HTMLButtonElement>(`[data-add-${kind}]`).disabled=deal[config.key].length>=config.max;
 }
 function render(){
  renderSelect();const deal=current();if(!deal)return;
  for(const input of root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[data-field]'))input.value=field(deal,input.dataset.field!)??'';
  one<HTMLSelectElement>('[data-deal-stage]').value=deal.stage;save.checked=saved.has(deal.id);save.disabled=!storage;one('[data-save-status]').textContent=failedSaves.has(deal.id)?'Browser save not confirmed · an older saved copy may remain':save.checked?(savedRevisions.get(deal.id)===(revisions.get(deal.id)||0)?'Saved in this browser':'Unsaved changes'):'Page memory only';
  for(const kind of Object.keys(configs))renderEntries(kind);one('[data-review-panel]').hidden=reviewDealId!==selectedId;derived();
 }
 function choose(id:string){clearTimer();const previous=current();if(previous&&saved.has(previous.id))void persist(clone(previous));abortReview();selectedId=id;message('');render();}
 select.addEventListener('change',()=>{if(ready)choose(select.value);});
 one<HTMLSelectElement>('[data-deal-stage]').addEventListener('change',event=>{if(ready){current().stage=(event.target as HTMLSelectElement).value;changed();}});
 one('[data-new-deal]').addEventListener('click',()=>{if(!ready||deals.length>=20)return;const deal=newDeal();deals.push(deal);choose(deal.id);one<HTMLInputElement>('[data-field="alias"]').focus();});
 for(const kind of Object.keys(configs))one(`[data-add-${kind}]`).addEventListener('click',()=>{
  if(!ready)return;const config=configs[kind],deal=current();if(deal[config.key].length>=config.max)return;
  const row:any={id:crypto.randomUUID(),[config.text]:'',status:config.status};if(kind!=='question')row.category='other';if(kind==='claim'||kind==='evidence')row.note='';if(kind==='evidence')row.asOf='';deal[config.key].push(row);changed();renderEntries(kind);one<HTMLInputElement|HTMLTextAreaElement>(`[data-row-id="${row.id}"] [data-entry-field="${config.text}"]`).focus();
 });
 save.addEventListener('change',()=>{
  if(!ready)return;const deal=current(),adapter=storage,epoch=authEpoch;
  if(!adapter){save.checked=false;message('Browser saving is unavailable. Your deal remains on this page; allow browser storage and reload to try again.');return;}
  clearTimer();if(save.checked){if(!validateDeal(deal)){save.checked=false;message('Complete entry text and keep summaries within the workspace limits before saving.');return;}saved.add(deal.id);void persist(clone(deal));}
  else{saved.delete(deal.id);one('[data-save-status]').textContent='Removing browser save…';void adapter.remove(deal.id).then(()=>{if(epoch===authEpoch){savedRevisions.delete(deal.id);failedSaves.delete(deal.id);if(deal.id===selectedId)one('[data-save-status]').textContent='Page memory only';}}).catch(()=>{if(epoch===authEpoch){saved.add(deal.id);failedSaves.add(deal.id);if(deal.id===selectedId){save.checked=true;one('[data-save-status]').textContent='Removal not confirmed · a saved copy may remain';}message('The browser save could not be deleted. Keep this page open and try removing it again.');}});}
 });
 function askConfirmation(title:string,description:string,label:string,action:()=>Promise<void>|void){confirmation=action;confirmTrigger=document.activeElement as HTMLElement;one('[data-confirm-title]').textContent=title;one('[data-confirm-description]').textContent=description;one('[data-confirm-accept]').textContent=label;confirm.showModal();one<HTMLButtonElement>('[data-confirm-cancel]').focus();}
 one('[data-confirm-cancel]').addEventListener('click',()=>confirm.close());confirm.addEventListener('close',()=>{confirmation=null;if(confirmTrigger?.isConnected)confirmTrigger.focus();});
 one('[data-confirm-accept]').addEventListener('click',()=>{const action=confirmation;confirmation=null;confirm.close();if(ready)void action?.();});
 one('[data-delete-deal]').addEventListener('click',()=>{if(!ready)return;const id=selectedId;askConfirmation('Delete this deal?','This removes this deal from page memory and any saved copy in this browser. This cannot be undone.','Delete deal',async()=>{clearTimer();abortReview();const adapter=storage,epoch=authEpoch;saved.delete(id);deals=deals.filter(d=>d.id!==id);if(!deals.length)deals=[newDeal()];selectedId=deals[0].id;render();try{await adapter?.remove(id);}catch{if(epoch===authEpoch)message('The deal was removed from this page, but its browser save could not be deleted. Try deleting saved workspace data again.');}});});
 one('[data-clear-all]').addEventListener('click',()=>{if(!ready)return;askConfirmation('Delete all saved workspace data?','This permanently deletes all Deal Workspace saves for every account in this browser profile and clears deals open in workspace tabs. Other site and account data is untouched. This cannot be undone.','Delete all saved data',async()=>{clearTimer();const adapter=storage,epoch=authEpoch;try{if(!adapter)throw new Error('Storage unavailable');await adapter.clearAll();if(epoch===authEpoch){resetLocalWorkspace();message('');}}catch{if(epoch===authEpoch)message('Saved workspace data could not be deleted. Check browser storage access and try again.');}});});
 const tabs=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-workspace-tab]'));
 function activate(tab:HTMLButtonElement,focus=false){for(const button of tabs){const active=button===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;one(`[data-workspace-panel="${button.dataset.workspaceTab}"]`).hidden=!active;}if(focus)tab.focus();}
 tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab));tab.addEventListener('keydown',event=>{let next=-1;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next>=0){event.preventDefault();activate(tabs[next],true);}});});
 one('[data-workspace-retry]').addEventListener('click',()=>void checkAccess());
 async function checkAccess():Promise<boolean>{
  const epoch=++authEpoch,oldNamespace=namespace;mask();status.textContent='Checking paid access…';
  try{
    const response=await fetch('/api/account',{credentials:'same-origin',cache:'no-store',headers:{'X-Account-Request':'1'}});const account=response.ok?await response.json():null;
    if(epoch!==authEpoch)return false;
    const definiteSignOut=response.status===401||response.status===403;
    const definiteRevocation=response.ok&&account&&typeof account==='object'&&!Array.isArray(account)&&account.entitled===false;
    if(definiteSignOut||definiteRevocation){
     discard();status.textContent=definiteSignOut?'Sign in to use Deal Workspace.':'An active Deal Lab subscription is required.';one('[data-workspace-access-links]').hidden=false;one('[data-workspace-retry]').hidden=true;return false;
    }
    if(!response.ok||account?.entitled!==true||typeof account.localWorkspaceNamespace!=='string'||!/^[a-f0-9]{64}$/.test(account.localWorkspaceNamespace)){
     status.textContent='Unable to check workspace access. Your workspace is hidden; retry access to continue. Keep this tab open to preserve page-memory deals.';one('[data-workspace-access-links]').hidden=false;one('[data-workspace-retry]').hidden=false;return false;
    }
    const next=account.localWorkspaceNamespace;
    if(next!==oldNamespace||!deals.length){
     discard();namespace=next;let nextStorage:ReturnType<typeof createDealStorage>|null=null,loaded:any[]=[],storageFailed=false;
     try{nextStorage=createDealStorage(next);loaded=await nextStorage.list();}catch{storageFailed=true;}
     if(epoch!==authEpoch){nextStorage?.close();return false;}
     storage=nextStorage;deals=loaded;if(storageFailed)message('Saved workspace data could not be opened. You can work in page memory; check browser storage before saving.');
     saved=new Set(deals.map(d=>d.id));savedRevisions=new Map(deals.map(d=>[d.id,0]));if(!deals.length)deals=[newDeal()];selectedId=deals[0].id;
    }
    ready=true;content.hidden=false;status.textContent='Paid workspace ready · your deals stay in this browser unless you explicitly request AI review.';one('[data-workspace-access-links]').hidden=true;one('[data-workspace-retry]').hidden=true;render();if(saved.has(selectedId)&&savedRevisions.get(selectedId)!==(revisions.get(selectedId)||0))void persist(clone(current()));return true;
   }catch{if(epoch===authEpoch){mask();status.textContent='Unable to check workspace access. Your workspace is hidden; retry access to continue. Keep this tab open to preserve page-memory deals.';one('[data-workspace-access-links]').hidden=false;one('[data-workspace-retry]').hidden=false;}return false;}
 }
 function validReview(review:any){const keys=['known','unclear','evidenceGaps','risks','questions','actions'];return review&&Object.keys(review).length===6&&keys.every(key=>Array.isArray(review[key])&&review[key].length>=1&&review[key].length<=5&&review[key].every((value:any)=>typeof value==='string'&&!!value.trim()&&Array.from(value).length<=320));}
 function sources(citations:any){const list=one('[data-review-sources]');list.replaceChildren();if(Array.isArray(citations))for(const citation of citations.slice(0,8)){if(typeof citation?.title!=='string'||typeof citation?.url!=='string')continue;try{const url=new URL(citation.url,location.origin);if(![location.origin,'https://acquisitioncompanion.com'].includes(url.origin)||url.username||url.password||!/^\/(course|topics|examples|glossary)\/[a-z0-9-]+\/$/.test(url.pathname)||url.search||url.hash)continue;const li=document.createElement('li'),link=document.createElement('a');link.href=url.pathname;link.textContent=citation.title.slice(0,300);li.append(link);list.append(li);}catch{/* Ignore unsupported citation URLs. */}}one('[data-review-sources-panel]').hidden=!list.childElementCount;}
 function renderReview(review:any){const container=one('[data-review-sections]');container.replaceChildren();for(const[key,label]of [['known','What is recorded'],['unclear','What remains unclear'],['evidenceGaps','Evidence gaps'],['risks','Potential risks to investigate'],['questions','Suggested questions'],['actions','Suggested next actions']]){const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('ul');heading.textContent=label;for(const text of review[key]){const li=document.createElement('li');if(key==='questions'||key==='actions'){const label=document.createElement('label'),checkbox=document.createElement('input'),span=document.createElement('span');checkbox.type='checkbox';checkbox.dataset.reviewSuggestion='';checkbox.dataset.kind=key==='questions'?'question':'action';checkbox.value=text;span.textContent=text;label.append(checkbox,span);li.append(label);}else li.textContent=text;list.append(li);}section.append(heading,list);container.append(section);}one('[data-review-panel]').hidden=false;}
 reviewButton.addEventListener('click',()=>void requestReview());
 async function requestReview(){
  if(!ready||busy)return;const deal=validateDeal(current());if(!deal){message('Complete entry text and keep summaries within the workspace limits before requesting a review.');return;}
  const scope=namespace,id=deal.id,revision=revisions.get(id)||0,run=++reviewGeneration,epoch=authEpoch,abort=new AbortController();controller=abort;busy=true;message('');reviewButton.textContent='Reviewing gaps…';controls();const timeout=setTimeout(()=>abort.abort(),30000);
  try{const response=await fetch('/api/ai',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-AI-Session-ID':sessionId},body:JSON.stringify({mode:'deal_workspace',action:'review_gaps',deal}),signal:abort.signal});if(run!==reviewGeneration||epoch!==authEpoch||scope!==namespace||selectedId!==id)return;
   if(!response.ok){if([401,402,403].includes(response.status)){mask();void checkAccess();}message(response.status===429?'The request allowance or rate limit was reached. Check Account & usage before trying again.':'The review could not finish. Your summaries remain here. A request that reached the AI service may count toward your allowance. Try again only when ready.');return;}
   const data=await response.json();if(run!==reviewGeneration||epoch!==authEpoch||scope!==namespace||selectedId!==id)return;if(!validReview(data.workspaceReview)){message('A safe review could not be prepared. Your summaries remain here. This request may count toward your allowance.');return;}
   reviewDealId=id;reviewRevision=revision;renderReview(data.workspaceReview);sources(data.citations);freshness();
  }catch{if(run===reviewGeneration&&epoch===authEpoch)message(abort.signal.aborted?'The review timed out. Your summaries remain here. This request may count toward your allowance; there is no automatic retry.':'Unable to complete the review. Your summaries remain here. Try again only when ready.');}
  finally{clearTimeout(timeout);if(run===reviewGeneration){busy=false;controller=null;reviewButton.textContent='Review gaps';controls();}}
 }
 one('[data-add-selected]').addEventListener('click',()=>{if(!ready||selectedId!==reviewDealId)return;const deal=current();let changedAny=false;for(const checkbox of root.querySelectorAll<HTMLInputElement>('[data-review-suggestion]:checked')){const key=checkbox.dataset.kind==='question'?'questions':'actions';if(deal[key].length>=MAX_ENTRIES){message('This list has reached its 20-entry limit. Remove an entry before adding more.');continue;}if(Array.from(checkbox.value).length>240){message('Shorten this suggestion to 240 characters before adding it manually.');continue;}if(deal[key].some((r:any)=>r.text===checkbox.value)){checkbox.checked=false;continue;}const row:any={id:crypto.randomUUID(),text:checkbox.value,status:key==='questions'?'unanswered':'open'};if(key==='actions')row.category='other';const next=clone(deal);next[key].push(row);if(!validateDeal(next)){message('The workspace summary limit was reached. Shorten entries before adding more.');continue;}deal[key].push(row);checkbox.checked=false;changedAny=true;}
  if(changedAny){changed();renderEntries('question');renderEntries('action');}
 });
 installWorkspaceCoachBridge({
  getContext:()=>ready&&current()&&validateDeal(current())?{namespace,dealId:selectedId,summary:coachSummary(current())}:null,
  authorize:async()=>{const scope=namespace;return await checkAccess()&&namespace===scope;},
  receive:async(payload:any)=>{
   if(!ready||payload.namespace!==namespace||payload.dealId!==selectedId)throw new Error('Transfer unavailable');
   const deal=current(),candidate=clone(deal);
   if((payload.facts||[]).length+candidate.claims.length>MAX_ENTRIES||(payload.questions||[]).filter((text:string)=>!candidate.questions.some((q:any)=>q.text===text)).length+candidate.questions.length>MAX_ENTRIES||(payload.actions||[]).filter((text:string)=>!candidate.actions.some((a:any)=>a.text===text)).length+candidate.actions.length>MAX_ENTRIES){message('This list has reached its 20-entry limit. Remove entries before returning more Coach items.');throw new Error('Transfer exceeds workspace limits');}
   for(const statement of payload.facts||[])if(candidate.claims.length<MAX_ENTRIES)candidate.claims.push({id:crypto.randomUUID(),statement,category:'other',status:'seller_claim',note:'Selected from Call Coach; unverified summary.'});
   for(const text of payload.questions||[])if(candidate.questions.length<MAX_ENTRIES&&!candidate.questions.some((q:any)=>q.text===text))candidate.questions.push({id:crypto.randomUUID(),text,status:'unanswered'});
   for(const text of payload.actions||[])if(candidate.actions.length<MAX_ENTRIES&&!candidate.actions.some((a:any)=>a.text===text))candidate.actions.push({id:crypto.randomUUID(),text,status:'open',category:'other'});
   if(!validateDeal(candidate)){message('Selected Coach items could not fit within the workspace limits. Shorten summaries or remove entries, then try again.');throw new Error('Transfer exceeds workspace limits');}
   const index=deals.findIndex(d=>d.id===selectedId);deals[index]=candidate;changed();render();if(saved.has(candidate.id)){clearTimer();await persist(clone(candidate));}
  }
 });
 function resetLocalWorkspace(){authEpoch++;clearTimer();abortReview();saved.clear();failedSaves.clear();savedRevisions.clear();revisions.clear();reviewDealId='';reviewRevision=null;deals=[newDeal()];selectedId=deals[0].id;one('[data-review-sections]').replaceChildren();one('[data-review-panel]').hidden=true;storage?.close();try{storage=namespace?createDealStorage(namespace):null;}catch{storage=null;message('Browser storage is unavailable. You can work in page memory.');}if(ready)render();else void checkAccess();}
 const resetChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('ac-deal-workspace-reset-v1'):null;resetChannel?.addEventListener('message',event=>{if(event.data==='clear')resetLocalWorkspace();});
 window.addEventListener('focus',()=>{if(!document.hidden)void checkAccess();});document.addEventListener('visibilitychange',()=>{if(document.hidden){authEpoch++;mask();}else void checkAccess();});
 window.addEventListener('pagehide',()=>{authEpoch++;mask();discard();});window.addEventListener('pageshow',event=>{if(event.persisted)void checkAccess();});
 void checkAccess();
}
