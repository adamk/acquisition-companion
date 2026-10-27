// Ephemeral, same-origin window handoff. No storage, URL payloads or AI calls.
const PREFIX='ac-deal-workspace:';
const namespace=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(v);
const short=v=>typeof v==='string'&&!!v.trim()&&Array.from(v).length<=240;
export function validateWorkspaceTransfer(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).sort().join(',')!=='actions,facts,questions')return null;
 if(['facts','questions','actions'].some(k=>!Array.isArray(raw[k])||raw[k].length>5||raw[k].some(v=>!short(v))))return null;
 if(!raw.facts.length&&!raw.questions.length&&!raw.actions.length)return null;
 return {facts:raw.facts.map(v=>v.trim()),questions:raw.questions.map(v=>v.trim()),actions:raw.actions.map(v=>v.trim())};
}

export function installWorkspaceCoachBridge({getContext,receive,authorize}){
 const button=document.querySelector('[data-open-coach]'),dialog=document.querySelector('[data-workspace-coach-dialog]');
 if(!button||!dialog)return;
 const preview=dialog.querySelector('[data-workspace-coach-preview]'),confirm=dialog.querySelector('[data-workspace-coach-confirm]');
 let previewContext=null,approved=null,child=null,nonce=null,closed=false;
 const processed=new Map();
 button.addEventListener('click',()=>{const context=getContext();if(!context)return;previewContext={...context};preview.value=context.summary;dialog.querySelector('[data-workspace-popup-error]')?.remove();dialog.showModal();});
 dialog.querySelector('[data-workspace-coach-cancel]').addEventListener('click',()=>{previewContext=null;dialog.close();});
 confirm.addEventListener('click',()=>{
  if(!previewContext||!namespace(previewContext.namespace)||!id(previewContext.dealId))return;
  const nextChild=window.open('/ai/call-coach/','_blank');
  if(!nextChild){let warning=dialog.querySelector('[data-workspace-popup-error]');if(!warning){warning=document.createElement('p');warning.setAttribute('role','alert');warning.setAttribute('data-workspace-popup-error','');preview.after(warning);}warning.textContent='The browser blocked the new tab. Allow this tab to open Seller Call Coach, then try again.';return;}
  approved=previewContext;previewContext=null;child=nextChild;
  nonce=crypto.randomUUID();processed.clear();
  dialog.close();
 });
 const listener=async event=>{
  if(closed||event.origin!==location.origin||event.source!==child||!approved||!nonce||!event.data||typeof event.data!=='object')return;
  const approvedContext=approved,source=child,approvedNonce=nonce;
  const message=event.data;
  if(![`${PREFIX}ready`,`${PREFIX}return`].includes(message.type))return;
  let allowed=false;try{allowed=await authorize();}catch{}
  if(closed||approved!==approvedContext||child!==source||nonce!==approvedNonce)return;
  const current=getContext();
  if(!allowed||!current||current.namespace!==approved.namespace||current.dealId!==approved.dealId){child?.postMessage({type:`${PREFIX}unavailable`},location.origin);return;}
  if(message.type===`${PREFIX}ready`){
   if(message.namespace!==approved.namespace)return;
   child.postMessage({type:`${PREFIX}context`,nonce,namespace:approved.namespace,dealId:approved.dealId,summary:approved.summary},location.origin);return;
  }
  const payload=validateWorkspaceTransfer(message.items);
  if(message.nonce!==nonce||message.namespace!==approved.namespace||message.dealId!==approved.dealId||!id(message.transferId)||!payload)return;
  if(!processed.has(message.transferId)){
   if(processed.size>=50)return;
   processed.set(message.transferId,(async()=>{try{await receive({namespace:approved.namespace,dealId:approved.dealId,...payload});return true;}catch{return false;}})());
  }
  const ok=await processed.get(message.transferId);
  if(!closed)event.source?.postMessage({type:`${PREFIX}ack`,transferId:message.transferId,ok},location.origin);
 };
 window.addEventListener('message',listener);
 window.addEventListener('pagehide',()=>{closed=true;previewContext=null;approved=null;child=null;window.removeEventListener('message',listener);},{once:true});
}

export function installCoachWorkspaceBridge({getNamespace,onContext,onInvalidContext,onAccessCheck,questions}){
 const panel=document.querySelector('[data-coach-workspace]'),dialog=document.querySelector('[data-coach-return-dialog]');
 let context=null,pending=null,closed=false,accepting=false,contextGeneration=0,accessGeneration=0;
 const status=panel.querySelector('[data-coach-workspace-status]'),error=dialog.querySelector('[data-return-error]');
 const clear=()=>{contextGeneration++;accessGeneration++;accepting=false;context=null;panel.hidden=true;pending=null;onAccessCheck(false);if(dialog.open)dialog.close();dialog.querySelector('[data-return-fact]').value='';dialog.querySelector('[data-return-action]').value='';dialog.querySelector('[data-return-questions]').replaceChildren();};
 async function authorize(){
  if(!context)return true;
  const linked=context,run=++accessGeneration;panel.hidden=true;onAccessCheck(true);
  let current=null;try{current=await getNamespace();}catch{}
  if(closed||run!==accessGeneration||context!==linked||document.hidden)return false;
  if(current!==context.namespace||!window.opener||window.opener.closed){clear();onInvalidContext();return false;}
  onAccessCheck(false);panel.hidden=false;
  return true;
 }
 const listener=async event=>{
  if(closed||event.origin!==location.origin||!window.opener||event.source!==window.opener||!event.data||typeof event.data!=='object')return;
  const m=event.data;
  if(m.type===`${PREFIX}unavailable`){clear();onInvalidContext();return;}
  if(m.type===`${PREFIX}ack`){
   if(!pending||m.transferId!==pending)return;
   pending=null;dialog.querySelector('[data-return-confirm]').disabled=false;
   if(m.ok===true){dialog.close();status.textContent='Selected items returned to your open Deal Workspace. Browser saving is separate; check the workspace save status.';}
   else{error.textContent='The transfer was not confirmed. Check the workspace before trying again.';error.hidden=false;}
   return;
  }
  if(m.type!==`${PREFIX}context`||context||accepting||!namespace(m.namespace)||!id(m.dealId)||!id(m.nonce)||typeof m.summary!=='string'||Array.from(m.summary).length>3000)return;
  accepting=true;const generation=contextGeneration;
  let current=null;try{current=await getNamespace();}catch{}
  if(closed||generation!==contextGeneration)return;
  accepting=false;if(current!==m.namespace)return;
  context={namespace:m.namespace,dealId:m.dealId,nonce:m.nonce};
  onContext(m.summary);panel.hidden=document.hidden;if(document.hidden)onAccessCheck(true);status.textContent='Using the context you selected in your open Deal Workspace. Nothing is sent to AI until you request coaching.';
 };
 window.addEventListener('message',listener);
 panel.querySelector('[data-coach-return]').addEventListener('click',async()=>{
  if(!context||!await authorize())return;
  const list=dialog.querySelector('[data-return-questions]');list.replaceChildren();
  for(const [index,q] of [...new Set(questions())].slice(0,5).entries()){
   const row=document.createElement('div'),label=document.createElement('label'),box=document.createElement('input'),input=document.createElement('textarea');
   box.type='checkbox';box.dataset.returnSelected='';box.id=`return-select-${index}`;
   label.htmlFor=box.id;label.append(box,document.createTextNode(` Return question ${index+1}`));
   input.setAttribute('aria-label',`Question to return ${index+1}`);input.maxLength=240;input.rows=2;input.value=q.slice(0,240);input.dataset.returnQuestion='';
   row.append(label,input);list.append(row);
  }
  dialog.querySelector('[data-return-fact]').value='';dialog.querySelector('[data-return-action]').value='';error.hidden=true;pending=null;dialog.querySelector('[data-return-confirm]').disabled=false;dialog.showModal();
 });
 dialog.querySelector('[data-return-cancel]').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-return-confirm]').addEventListener('click',async()=>{
  if(!context||pending||!await authorize())return;
  const fact=dialog.querySelector('[data-return-fact]').value.trim(),action=dialog.querySelector('[data-return-action]').value.trim();
  const selected=[...dialog.querySelectorAll('[data-return-selected]:checked')].map(box=>box.closest('div').querySelector('[data-return-question]').value.trim());
  const items=validateWorkspaceTransfer({facts:fact?[fact]:[],questions:selected,actions:action?[action]:[]});
  if(!items){error.textContent='Select a question or enter a short approved fact or action. Keep each within 240 characters.';error.hidden=false;return;}
  pending=crypto.randomUUID();dialog.querySelector('[data-return-confirm]').disabled=true;
  window.opener.postMessage({type:`${PREFIX}return`,...context,transferId:pending,items},location.origin);
  const transfer=pending;
  setTimeout(()=>{if(pending===transfer){pending=null;dialog.querySelector('[data-return-confirm]').disabled=false;error.textContent='The transfer was not confirmed. Check the workspace before trying again.';error.hidden=false;}},12000);
 });
 const ready=async()=>{
  if(!window.opener||window.opener.closed||closed)return;
  let current=null;try{current=await getNamespace();}catch{}
  if(!closed&&namespace(current))window.opener.postMessage({type:`${PREFIX}ready`,namespace:current},location.origin);
 };
 const focus=()=>{if(context)void authorize();};
 const visibility=()=>{if(!context)return;if(document.hidden){accessGeneration++;panel.hidden=true;onAccessCheck(true);if(dialog.open)dialog.close();}else void authorize();};
 window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
 return {ready,authorize,clear,close(){closed=true;clear();window.removeEventListener('message',listener);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);}};
}
