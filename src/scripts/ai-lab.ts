export {};

type Mode='ask_course'|'deal_lab'|'ic_challenge';
type Role='user'|'assistant';
type HistoryItem={role:Role;content:string};
type CaseCard={id:string;title:string;difficulty:string;industry:string;description:string;label?:string};
type ApiResult={responseText?:string;citations?:unknown[];suggestedActions?:string[];case?:Record<string,unknown>|null;calculations?:Record<string,unknown>|null;feedback?:Record<string,unknown>|null;error?:{code?:string;message?:string}};

async function fetchJsonWithTimeout(url:string,init:RequestInit,timeoutMs:number):Promise<{response:Response;body:unknown}> {
 const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{...init,signal:controller.signal});
  try{return {response,body:await response.json()};}
  catch(error){if(controller.signal.aborted)throw error;return {response,body:null};}
 }finally{window.clearTimeout(timeout);}
}

declare global {
 interface Window {acquisitionAnalytics?:{track:(name:string,params?:Record<string,string|number>)=>boolean}}
}

const root=document.querySelector<HTMLElement>('[data-ai-app]');
if(root){
 const appRoot:HTMLElement=root;
 const cards=JSON.parse(root.dataset.caseCards||'[]') as CaseCard[];
 const modeButtons=[...document.querySelectorAll<HTMLButtonElement>('[data-mode]')];
 const contextSections=[...document.querySelectorAll<HTMLElement>('[data-context-mode]')];
 const caseSelects=[...document.querySelectorAll<HTMLSelectElement>('[data-case-select]')];
 const caseChoices=[...document.querySelectorAll<HTMLButtonElement>('[data-case-choice]')];
 const caseDescriptions=[...document.querySelectorAll<HTMLElement>('[data-case-description]')];
 const caseFacts=[...document.querySelectorAll<HTMLElement>('[data-case-facts]')];
 const caseActions=document.querySelector<HTMLElement>('[data-case-actions]')!;
 const stageActions=document.querySelector<HTMLDetailsElement>('[data-stage-actions]')!;
 const startButton=document.querySelector<HTMLButtonElement>('[data-start-case]')!;
 const completeButton=document.querySelector<HTMLButtonElement>('[data-complete]')!;
 const form=document.querySelector<HTMLFormElement>('[data-ai-form]')!;
 const textarea=document.querySelector<HTMLTextAreaElement>('#ai-message')!;
 const submitButton=document.querySelector<HTMLButtonElement>('[data-submit]')!;
 const conversation=document.querySelector<HTMLElement>('[data-conversation]')!;
 const emptyState=document.querySelector<HTMLElement>('[data-empty-state]')!;
 const statusNode=document.querySelector<HTMLElement>('[data-ai-status]')!;
 const accessNotice=document.querySelector<HTMLElement>('[data-ai-access]')!;
 const accessMessage=document.querySelector<HTMLElement>('[data-ai-access-message]')!;
 const accessPricing=document.querySelector<HTMLAnchorElement>('[data-ai-access-pricing]')!;
 const accessRequest=document.querySelector<HTMLAnchorElement>('[data-ai-access-request]')!;
 const accountLink=document.querySelector<HTMLAnchorElement>('[data-ai-account-link]')!;
 const errorBox=document.querySelector<HTMLElement>('[data-ai-error]')!;
 const errorMessage=document.querySelector<HTMLElement>('[data-error-message]')!;
 const retryButton=document.querySelector<HTMLButtonElement>('[data-retry]')!;
 const resetButton=document.querySelector<HTMLButtonElement>('[data-reset]')!;
 const citationsNode=document.querySelector<HTMLElement>('[data-citations]')!;
 const feedbackBox=document.querySelector<HTMLElement>('[data-feedback]')!;
 const feedbackContent=document.querySelector<HTMLElement>('[data-feedback-content]')!;
 const calculationsBox=document.querySelector<HTMLElement>('[data-calculations]')!;
 const calculationsContent=document.querySelector<HTMLElement>('[data-calculations-content]')!;
 const activeLabel=document.querySelector<HTMLElement>('[data-active-mode-label]')!;
 const activeHeading=document.querySelector<HTMLElement>('[data-active-heading]')!;
 const modeSelect=document.querySelector<HTMLSelectElement>('[data-mode-select]')!;
 const mobileCases=document.querySelector<HTMLElement>('[data-mobile-cases]')!;
 const contextPanel=document.querySelector<HTMLDetailsElement>('[data-context-panel]')!;
 const contextSummary=document.querySelector<HTMLElement>('[data-context-summary]')!;
 const starterPrompts=document.querySelector<HTMLElement>('[data-starter-prompts]')!;
 const threadViewport=document.querySelector<HTMLElement>('[data-thread-viewport]')!;
 const mobileLayout=window.matchMedia('(max-width:960px)');
 contextPanel.open=!mobileLayout.matches;
 stageActions.open=!mobileLayout.matches;
 mobileLayout.addEventListener('change',()=>{contextPanel.open=!mobileLayout.matches;stageActions.open=!mobileLayout.matches;});
 const analytics=(name:string,params:Record<string,string|number>={})=>window.acquisitionAnalytics?.track(name,params);
 const state:{mode:Mode;caseId:string;caseStage:number;available:boolean;paid:boolean;pending:boolean;history:HistoryItem[];caseData:Record<string,unknown>|null;lastAttempt:(()=>Promise<void>)|null}={
  mode:'ask_course',caseId:cards[0]?.id||'',caseStage:0,available:false,paid:false,pending:false,history:[],caseData:null,lastAttempt:null,
 };

 function selectedCard():CaseCard|undefined{return cards.find(item=>item.id===state.caseId);}
 function announce(text:string,kind='ready') {statusNode.textContent=text;statusNode.dataset.state=kind;}
 function buildLink(label:string,url:string,external=false):HTMLAnchorElement|null {
  try{
   const parsed=new URL(url,window.location.origin);
   if(external){if(parsed.protocol!=='https:'||parsed.username||parsed.password)return null;}
   else{
    const canonical=document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    const canonicalOrigin=canonical?new URL(canonical).origin:window.location.origin;
    const pageRoute=/^\/(?:course|topics|examples)\/[a-z0-9-]+\/$/.test(parsed.pathname);
    const indexRoute=(parsed.pathname==='/glossary/'&&/^#[a-z0-9-]+$/.test(parsed.hash))||(parsed.pathname==='/course/'&&/^#module-[1-9][0-9]*$/.test(parsed.hash));
    if((parsed.origin!==window.location.origin&&parsed.origin!==canonicalOrigin)||parsed.search||(!pageRoute&&!indexRoute))return null;
   }
   const link=document.createElement('a');link.href=external?parsed.href:new URL(parsed.pathname+parsed.hash,window.location.origin).href;link.textContent=label;
   if(external){link.target='_blank';link.rel='noopener noreferrer';}
   return link;
  }catch{return null;}
 }
 function renderCaseCard(){
  const card=selectedCard();
  for(const choice of caseChoices)choice.setAttribute('aria-pressed',String(choice.dataset.caseChoice===state.caseId));
  for(const title of appRoot.querySelectorAll<HTMLElement>('[data-case-title]'))title.textContent=card?.title||'';
  for(const meta of appRoot.querySelectorAll<HTMLElement>('[data-case-meta]'))meta.textContent=card?`${card.difficulty} · ${card.industry}`:'';
  for(const description of caseDescriptions)description.textContent=card?.description||'';
  for(const factsNode of caseFacts){
   factsNode.replaceChildren();
   if(state.caseData&&state.caseId===state.caseData.id){
    const stageTitle=document.createElement('p');stageTitle.className='small muted';stageTitle.textContent=`Stage ${String(state.caseData.stage)} of ${String(state.caseData.stageCount)} · ${String(state.caseData.stageLabel)}`;factsNode.append(stageTitle);
    const facts=Array.isArray(state.caseData.facts)?state.caseData.facts as Array<{label?:string;value?:string;stageLabel?:string}>:[];
    const groups=new Map<string,Array<{label?:string;value?:string}>>();
    for(const fact of facts){const label=fact.stageLabel||'Case facts';groups.set(label,[...(groups.get(label)||[]),fact]);}
    for(const [label,group] of groups){
     const heading=document.createElement('h3');heading.textContent=label;factsNode.append(heading);
     const list=document.createElement('dl');for(const fact of group){const term=document.createElement('dt');term.textContent=fact.label||'Fact';const detail=document.createElement('dd');detail.textContent=fact.value||'';list.append(term,detail);}factsNode.append(list);
    }
   }else{
    const note=document.createElement('p');note.className='muted';note.textContent=state.mode==='ic_challenge'?'Start the challenge to reveal the case facts.':'Start the case to reveal its first set of fictional facts.';factsNode.append(note);
   }
  }
 }
 function renderMode(){
  modeSelect.value=state.mode;mobileCases.hidden=state.mode==='ask_course';
  contextSummary.textContent=state.mode==='ask_course'?'Sources':state.mode==='deal_lab'?'Case file':'Committee brief';
  for(const section of appRoot.querySelectorAll<HTMLElement>('[data-empty-mode]'))section.hidden=section.dataset.emptyMode!==state.mode;
  starterPrompts.hidden=state.mode!=='ask_course'||conversation.querySelector('.ai-message')!==null;
  document.querySelector<HTMLElement>('[data-case-source-label]')!.hidden=state.mode==='ask_course';
  document.querySelector<HTMLElement>('[data-context-note]')!.hidden=state.mode==='ask_course';
  for(const button of modeButtons)button.setAttribute('aria-pressed',String(button.dataset.mode===state.mode));
  for(const section of contextSections)section.hidden=section.dataset.contextMode!==state.mode;
  activeLabel.textContent=state.mode==='ask_course'?'Ask the Course':state.mode==='deal_lab'?'Deal Lab':'IC Challenge';
  activeHeading.textContent=state.mode==='ask_course'?'Source-grounded course tutor':state.mode==='deal_lab'?'Work through the case.':'Make your investment thesis.';
  caseActions.hidden=state.mode==='ask_course';
  const hasStarted=state.mode!=='ask_course'&&state.caseStage>0;
  startButton.hidden=state.mode==='ask_course'||hasStarted;
  stageActions.hidden=!hasStarted;
  completeButton.hidden=state.mode!=='ic_challenge'||!hasStarted;
  form.hidden=state.mode!=='ask_course'&&!hasStarted;
  textarea.placeholder=state.mode==='ask_course'?'What does Acquisition Companion teach about seller financing?':state.mode==='deal_lab'?'What do you want to test about this case?':'Present your acquisition thesis or respond to the committee.';
  submitButton.textContent=state.mode==='ic_challenge'?'Send to committee':'Send question';
  renderCaseCard();
  setControls();
 }
 function setControls(){
  const disabled=!state.available||state.pending;
  submitButton.textContent=state.pending?'Working…':state.mode==='ic_challenge'?'Send to committee':'Send question';
  for(const control of [...modeButtons,modeSelect,...caseSelects,...caseChoices, ...appRoot.querySelectorAll<HTMLButtonElement>('[data-command]')])control.disabled=state.pending;
  startButton.disabled=disabled;completeButton.disabled=disabled;submitButton.disabled=disabled;
  textarea.disabled=disabled;
  retryButton.disabled=state.pending;
  resetButton.disabled=state.pending;
 }
 function clearFeedback(){feedbackBox.hidden=true;feedbackContent.replaceChildren();calculationsBox.hidden=true;calculationsContent.replaceChildren();}
 function clearSources(){citationsNode.replaceChildren();const empty=document.createElement('p');empty.className='muted';empty.textContent='Sources will appear here after an answer.';citationsNode.append(empty);}
 function isNearLatest(){return threadViewport.scrollHeight-threadViewport.scrollTop-threadViewport.clientHeight<140;}
 function keepLatestVisible(wasNearLatest:boolean){if(wasNearLatest)threadViewport.scrollTop=threadViewport.scrollHeight;}
 function appendTextBlock(parent:HTMLElement,tag:'p'|'h3'|'span',text:string,className=''){
  const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;parent.append(node);return node;
 }
 function addTurn(role:Role,text:string){
  const nearLatest=isNearLatest();emptyState.hidden=true;starterPrompts.hidden=true;
  const article=document.createElement('article');article.className='ai-message';article.dataset.role=role;
  appendTextBlock(article,'span',role==='user'?'You':state.mode==='ic_challenge'?'Investment committee':'Acquisition Companion instructor','ai-message-label');
  appendTextBlock(article,'p',text,'ai-message-text');conversation.append(article);keepLatestVisible(nearLatest);return article;
 }
 function addLoadingTurn(){
  const nearLatest=isNearLatest();emptyState.hidden=true;starterPrompts.hidden=true;
  const article=document.createElement('article');article.className='ai-message';article.dataset.role='assistant';article.dataset.loading='true';article.setAttribute('role','status');article.setAttribute('aria-live','polite');article.setAttribute('aria-atomic','true');
  appendTextBlock(article,'span',state.mode==='ic_challenge'?'Investment committee':'Acquisition Companion instructor','ai-message-label');
  const text=document.createElement('p');text.className='ai-message-text';const copy=document.createElement('span');copy.dataset.loadingCopy='';copy.textContent='Thinking…';const indicator=document.createElement('span');indicator.className='ai-loading-indicator';indicator.dataset.loadingIndicator='';indicator.setAttribute('aria-hidden','true');text.append(copy,indicator);article.append(text);conversation.append(article);
  keepLatestVisible(nearLatest);
  const timers=[window.setTimeout(()=>{if(article.isConnected)copy.textContent='Still working…';},8_000),window.setTimeout(()=>{if(article.isConnected)copy.textContent='This response is taking a little longer than usual…';},15_000)];
  return {article,timers};
 }
 function finishLoadingTurn(loading:{article:HTMLElement;timers:number[]},responseText?:string){
  const nearLatest=isNearLatest();
  for(const timer of loading.timers)window.clearTimeout(timer);
  if(typeof responseText!=='string'){loading.article.remove();return;}
  loading.article.removeAttribute('role');loading.article.removeAttribute('aria-live');loading.article.removeAttribute('aria-atomic');delete loading.article.dataset.loading;
  const text=loading.article.querySelector<HTMLElement>('.ai-message-text');if(text)text.replaceChildren(document.createTextNode(responseText));
  keepLatestVisible(nearLatest);
 }
 function safeArray(value:unknown):string[]{return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string').slice(0,4):[];}
 function renderFeedback(value:Record<string,unknown>|null){
  feedbackContent.replaceChildren();feedbackBox.hidden=!value;if(!value)return;
  const labels:Record<string,string>={strengths:'Reasoning strengths',risksIdentified:'Risks identified',risksMissed:'Important risks missed',assumptionsNeedingEvidence:'Assumptions needing evidence'};
  for(const [key,label] of Object.entries(labels)){
   const items=safeArray(value[key]);if(!items.length)continue;
   appendTextBlock(feedbackContent,'h3',label);const list=document.createElement('ul');for(const item of items){const li=document.createElement('li');li.textContent=item;list.append(li);}feedbackContent.append(list);
  }
  const lessons=Array.isArray(value.lessonsToReview)?value.lessonsToReview as Array<{title?:string;url?:string}>:[];
  if(lessons.length){appendTextBlock(feedbackContent,'h3','Acquisition Companion lessons to review');const list=document.createElement('ul');for(const lesson of lessons){const li=document.createElement('li');const link=buildLink(lesson.title||'Review this course page',lesson.url||'');if(link)li.append(link);else li.textContent=lesson.title||'Course page';list.append(li);}feedbackContent.append(list);}
 }
 function renderCalculations(value:Record<string,unknown>|null){
  calculationsContent.replaceChildren();calculationsBox.hidden=!value;if(!value)return;
  const rows:Array<[string,string]> = [];
  const money=(amount:unknown)=>typeof amount==='number'?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(amount):'';
  const ratio=(amount:unknown)=>typeof amount==='number'?`${amount.toFixed(2)}x`:'';
  const normalization=value.normalization as Record<string,unknown>|undefined;
  const integration=value.integration as Record<string,unknown>|undefined;
  if(integration){
   rows.push(['Combined baseline EBITDA',money(integration.baselineEbitda)],['Planned annual integration benefit',money(integration.plannedAnnualBenefit)],['Planned one-time integration costs',money(integration.oneTimeCost)]);
   const scenarios=Array.isArray(integration.scenarios)?integration.scenarios as Array<Record<string,unknown>>:[];
   for(const scenario of scenarios.slice(0,2)){
    if(typeof scenario.name!=='string')continue;
    rows.push([`${scenario.name}: incremental project NPV`,money(scenario.incrementalNpv)]);
    if(Array.isArray(scenario.annualCashFlows))rows.push([`${scenario.name}: annual net project cash flows`,scenario.annualCashFlows.map(money).join(' · ')]);
   }
  }
  if(typeof value.normalizedEbitda==='number')rows.push(['Normalized EBITDA',money(value.normalizedEbitda)]);
  if(typeof value.normalizedMultiple==='number')rows.push(['Enterprise value / normalized EBITDA',ratio(value.normalizedMultiple)]);
  if(typeof value.workingCapitalShortfall==='number')rows.push(['Working capital shortfall',money(value.workingCapitalShortfall)]);
  const sourcesUses=value.sourcesAndUses as Record<string,unknown>|undefined;
  if(sourcesUses&&typeof sourcesUses.imbalance==='number')rows.push(['Sources and uses imbalance',money(sourcesUses.imbalance)]);
  if(typeof value.totalLeverage==='number')rows.push(['Total debt / normalized EBITDA',ratio(value.totalLeverage)]);
  const service=value.annualDebtService as Record<string,unknown>|undefined;
  if(service&&typeof service.total==='number')rows.push(['Annual modeled cash debt service',money(service.total)]);
  const base=value.baseCashFlow as Record<string,unknown>|undefined;
  if(base&&typeof base.coverage==='number')rows.push(['Base cash available / debt service',ratio(base.coverage)]);
  const downside=value.downsideCashFlow as Record<string,unknown>|undefined;
  if(downside&&typeof downside.coverage==='number')rows.push(['Downside cash available / debt service',ratio(downside.coverage)]);
  const equity=value.equityCapitalization as Record<string,unknown>|undefined;
  if(equity&&typeof equity.sellerRolloverPct==='number')rows.push(['Seller rollover share of equity',`${equity.sellerRolloverPct.toFixed(1)}%`]);
  const mezzanine=value.mezzanine as Record<string,unknown>|undefined;
  if(mezzanine&&typeof mezzanine.pikAccrual==='number'&&mezzanine.pikAccrual>0)rows.push(['One-year PIK accrual',money(mezzanine.pikAccrual)]);
  const list=document.createElement('dl');for(const [label,result] of rows){const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=result;list.append(dt,dd);}calculationsContent.append(list);
  appendTextBlock(calculationsContent,'p',integration&&typeof integration.assumptions==='string'?integration.assumptions:'Illustrative annual figures only. Fees, covenants, taxes, lender conditions, and actual payment schedules may change the result.','muted');
  if(normalization&&typeof normalization.addbacks==='number'&&typeof normalization.deductions==='number')appendTextBlock(calculationsContent,'p',`Add-backs ${money(normalization.addbacks)} less replacement costs ${money(normalization.deductions)}.`);
 }
 function renderSources(citations:unknown[],caseRefs:unknown[]=[]){
  citationsNode.replaceChildren();
  const items=new Map<string,{title:string;url:string;sourceFamilies:string[];originalSources:Array<{title:string;url:string;family:string}>}>();
  for(const item of citations){
   if(!item||typeof item!=='object')continue;const citation=item as Record<string,unknown>;
   if(typeof citation.title!=='string'||typeof citation.url!=='string')continue;
   const url=buildLink(citation.title,citation.url);if(!url)continue;
   const originals=Array.isArray(citation.originalSources)?citation.originalSources as Array<{title?:string;url?:string;family?:string}>:[];
   items.set(url.pathname+url.hash,{title:citation.title,url:citation.url,sourceFamilies:safeArray(citation.sourceFamilies),originalSources:originals.filter(source=>typeof source.title==='string'&&typeof source.url==='string').slice(0,4).map(source=>({title:source.title!,url:source.url!,family:source.family||'Original source'}))});
  }
  for(const item of caseRefs){
   if(!item||typeof item!=='object')continue;const reference=item as Record<string,unknown>;
   if(typeof reference.title!=='string'||typeof reference.url!=='string')continue;
   const link=buildLink(reference.title,reference.url);if(link&&!items.has(link.pathname+link.hash))items.set(link.pathname+link.hash,{title:reference.title,url:reference.url,sourceFamilies:[],originalSources:[]});
  }
  if(!items.size){const empty=document.createElement('p');empty.className='muted';empty.textContent='The available course material did not return a page reference for this turn.';citationsNode.append(empty);return;}
  const list=document.createElement('ul');list.className='ai-source-list';
  for(const item of items.values()){
   const li=document.createElement('li');const link=buildLink(item.title,item.url);if(link)li.append(link);
   if(item.sourceFamilies.length){const meta=document.createElement('small');meta.textContent=item.sourceFamilies.join(' · ');li.append(meta);}
   for(const source of item.originalSources){const original=buildLink(source.title,source.url,true);if(original){const sub=document.createElement('ul');const sourceItem=document.createElement('li');sourceItem.append(original);sub.append(sourceItem);li.append(sub);}}
   list.append(li);
  }
  citationsNode.append(list);
 }
 function renderCaseResponse(data:Record<string,unknown>|null){
  if(!data||data.id!==state.caseId)return;
  state.caseData=data;state.caseStage=typeof data.stage==='number'?data.stage:state.caseStage;
  renderMode();
 }
 function trimHistory():HistoryItem[]{
  const history=state.history.slice(-8).map(item=>({role:item.role,content:Array.from(item.content).slice(0,1200).join('')}));
  let length=history.reduce((sum,item)=>sum+Array.from(item.content).length,0);
  const historyBytes=()=>new TextEncoder().encode(JSON.stringify(history)).byteLength;
  while(history.length&&(length>4500||historyBytes()>3000)){
   // Retain supplied facts ahead of older explanations, within the same caps.
   const assistant=history.findIndex(item=>item.role==='assistant');const index=assistant>=0?assistant:0;
   length-=Array.from(history[index].content).length;history.splice(index,1);
  }
  return history;
 }
 function caseMeta():Record<string,string|number>{const card=selectedCard();return card?{case_id:card.id,difficulty:card.difficulty}:{};}
 async function submit(message:string,action?:string,alreadyRendered=false,attempt?:{payload:Record<string,unknown>;message:string;action?:string},trigger?:HTMLButtonElement){
  if(!state.available||state.pending)return;
  // Resubmitting the unchanged failed input is also a user-initiated retry.
  const lastTurn=state.history.at(-1);
  if(!attempt&&state.lastAttempt&&lastTurn?.role==='user'&&lastTurn.content===message){await state.lastAttempt();return;}
  const payload=attempt?.payload||{
   mode:state.mode,message,history:trimHistory(),
   ...(state.mode!=='ask_course'?{caseId:state.caseId,caseStage:state.caseStage}:{}),
   ...(action?{action}:{}),
  };
  if(!alreadyRendered)addTurn('user',message);
  // Retain facts on failure. A retry uses the captured payload and does not add this turn again.
  if(!attempt){state.history.push({role:'user',content:message});state.history=state.history.slice(-8);}
  const triggerLabel=trigger?.textContent||'';state.pending=true;errorBox.hidden=true;const loading=addLoadingTurn();if(trigger)trigger.textContent='Working…';announce('Preparing a response…','working');setControls();
  const requestAttempt={payload,message,action};
  state.lastAttempt=()=>submit(message,action,true,requestAttempt,retryButton);
  let response:Response;let body:unknown;
  try{
   const result=await fetchJsonWithTimeout('/api/ai',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-AI-Session-ID':getSessionId()},body:JSON.stringify(payload)},25_000);
   response=result.response;body=result.body;
  }catch(error){
   state.pending=false;finishLoadingTurn(loading);const timedOut=error instanceof DOMException&&error.name==='AbortError';showError(timedOut?'The response took too long. You can try again.':'AI Deal Lab could not reach its service. Check your connection and try again.',timedOut?'timeout':'network');setControls();if(trigger)trigger.textContent=triggerLabel;return;
  }
  const result=body&&typeof body==='object'?body as ApiResult:{};
  state.pending=false;
  if(!response.ok||typeof result.responseText!=='string'){
   const code=result.error?.code||'unavailable';
   const messageText=code==='rate_limited'?'AI Deal Lab is receiving too many requests. Wait about a minute, then try again.':code==='response_too_long'?'The explanation reached its response limit. Please try again.':code==='timeout'?'The response took too long. You can try again.':code==='message_too_large'?'That message is too long. Shorten it and try again.':code==='invalid_history'?'This conversation reached its context limit. Start a new session to continue.':response.status===503?'AI Deal Lab is unavailable right now. It may still be in setup. Please try again shortly.':result.error?.message||'AI Deal Lab could not prepare a response. Please try again.';
   finishLoadingTurn(loading);showError(messageText,code);setControls();if(trigger)trigger.textContent=triggerLabel;return;
  }
  state.history.push({role:'assistant',content:result.responseText});state.history=state.history.slice(-8);
  const nearLatest=isNearLatest();finishLoadingTurn(loading,result.responseText);
  if(result.case)renderCaseResponse(result.case);
  renderSources(Array.isArray(result.citations)?result.citations:[],result.case&&Array.isArray((result.case as Record<string,unknown>).lessonRefs)?(result.case as Record<string,unknown>).lessonRefs as unknown[]:[]);
  renderFeedback(result.feedback&&typeof result.feedback==='object'?result.feedback:null);
  renderCalculations(result.calculations&&typeof result.calculations==='object'?result.calculations:null);
  if(state.mode==='deal_lab'&&action==='start')analytics('deal_lab_start',caseMeta());
  if(state.mode==='ic_challenge'&&action==='start')analytics('ic_challenge_start',caseMeta());
  if(action==='complete')analytics(state.mode==='deal_lab'?'deal_lab_complete':'ic_challenge_complete',{...caseMeta(),completion_status:'complete'});
  if(state.mode==='ask_course')analytics('ai_question',{mode:'ask_course'});
  if(state.paid)analytics('ai_paid_request',{mode:state.mode});
  state.lastAttempt=null;textarea.value='';announce('Response ready.');resetButton.hidden=false;setControls();if(trigger)trigger.textContent=triggerLabel;keepLatestVisible(nearLatest);
 }
 function showError(message:string,code:string){
  if(['login_required','subscription_required','billing_unavailable'].includes(code)){
   state.available=false;accessNotice.hidden=false;retryButton.hidden=true;accessPricing.hidden=code==='billing_unavailable';accessRequest.hidden=code!=='subscription_required';
   accessMessage.textContent=code==='login_required'?'Interactive Deal Lab analysis requires an active subscription. The free course remains available.':code==='subscription_required'?'No active Deal Lab subscription. The initial beta is invite-only for U.S. customers.':'Deal Lab access is temporarily unavailable. The core course remains free.';
  }
  errorMessage.textContent=message;errorBox.hidden=false;retryButton.hidden=['rate_limited','response_too_long','login_required','subscription_required','billing_unavailable'].includes(code);announce(code==='rate_limited'?'Rate limit reached. Please wait before continuing.':code==='unavailable'?'AI Deal Lab is currently unavailable.':'There was a problem preparing your response.',code==='rate_limited'?'unavailable':'error');
 }
 function newSession(){
  state.history=[];state.caseStage=0;state.caseData=null;state.lastAttempt=null;conversation.replaceChildren();emptyState.hidden=false;conversation.append(emptyState);clearSources();clearFeedback();errorBox.hidden=true;renderMode();threadViewport.scrollTop=0;announce(state.available?'AI Deal Lab is ready.':'AI Deal Lab is being configured.',state.available?'ready':'unavailable');
 }
 function getSessionId(){
  const key='ac-ai-session-id';let value:string|null=null;
  try{value=sessionStorage.getItem(key);}catch{/* Fall through to an in-memory identifier. */}
  if(value&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))return value;
  value=crypto.randomUUID();try{sessionStorage.setItem(key,value);}catch{/* Rate limiting still works for this page session. */}return value;
 }
 function chooseMode(value:string){
  if(!['ask_course','deal_lab','ic_challenge'].includes(value))return;
  const mode=value as Mode;if(mode===state.mode)return;
  state.mode=mode;state.history=[];state.caseStage=0;state.caseData=null;state.lastAttempt=null;conversation.replaceChildren();emptyState.hidden=false;conversation.append(emptyState);clearSources();clearFeedback();errorBox.hidden=true;renderMode();threadViewport.scrollTop=0;analytics('ai_mode_select',{mode});
 }
 modeButtons.forEach(button=>button.addEventListener('click',()=>chooseMode(button.dataset.mode||'')));
 modeSelect.addEventListener('change',()=>chooseMode(modeSelect.value));
 for(const starter of appRoot.querySelectorAll<HTMLButtonElement>('[data-starter-prompt]'))starter.addEventListener('click',()=>{if(state.pending)return;textarea.value=starter.dataset.starterPrompt||'';textarea.focus();});
 function chooseCase(value:string){
  for(const other of caseSelects)other.value=value;
  if(value===state.caseId)return;
  state.caseId=value;newSession();
 }
 caseSelects.forEach(select=>select.addEventListener('change',()=>chooseCase(select.value)));
 caseChoices.forEach(choice=>choice.addEventListener('click',()=>chooseCase(choice.dataset.caseChoice||'')));
 for(const command of root.querySelectorAll<HTMLButtonElement>('[data-command]'))command.addEventListener('click',()=>{
  const action=command.dataset.command||'message';const commands:Record<string,string>={hint:'Give me a hint',explain:'Explain this',what_did_i_miss:'What did I miss?',challenge_assumptions:'Challenge my assumptions',reveal_next:'Reveal the next stage',show_answer:'Show the answer',complete:'Complete the IC Challenge'};
  void submit(commands[action]||'Continue.',action,false,undefined,command);
 });
 startButton.addEventListener('click',()=>void submit(state.mode==='ic_challenge'?'Start the IC Challenge.':'Start the case.','start',false,undefined,startButton));
 form.addEventListener('submit',event=>{event.preventDefault();const message=textarea.value.trim();if(message)void submit(message,undefined,false,undefined,submitButton);});
 retryButton.addEventListener('click',()=>{if(state.lastAttempt)void state.lastAttempt();});
 resetButton.addEventListener('click',newSession);
 renderMode();
 for(const select of caseSelects)select.value=state.caseId;
 renderCaseCard();
 clearSources();
 analytics('ai_lab_open');
 void (async()=>{
  try{
   const {response,body}=await fetchJsonWithTimeout('/api/ai/status',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}},8_000);
   if(!response.ok||!body||typeof body!=='object')throw new Error('status');const data=body as {available?:boolean;access?:string;paid?:boolean;interactiveEnabled?:boolean};
   state.available=data.available===true;state.paid=data.paid===true;
   if(data.interactiveEnabled===false){accountLink.hidden=false;accountLink.textContent='Account';accessNotice.hidden=false;accessPricing.hidden=true;accessRequest.hidden=true;accessMessage.textContent='Paid beta opening soon. The public course and Deal Lab examples remain available.';announce('Paid beta opening soon. Interactive AI is not available yet. The public course remains free.','unavailable');setControls();return;}
   let accountState:{signedIn?:boolean;checkoutEligible?:boolean;entitled?:boolean}|null=null;
   try{
    const {response:billingResponse,body:billingBody}=await fetchJsonWithTimeout('/api/billing/status',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}},8_000);
    if(billingResponse.ok&&billingBody&&typeof billingBody==='object'&&(billingBody as {signInAvailable?:boolean}).signInAvailable===true){
     accountLink.hidden=false;accountLink.textContent='Sign in';
     const {response:accountResponse,body:accountBody}=await fetchJsonWithTimeout('/api/account',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','X-Account-Request':'1'}},8_000);
     if(accountResponse.ok&&accountBody&&typeof accountBody==='object'){
     accountState=accountBody as {signedIn?:boolean;checkoutEligible?:boolean;entitled?:boolean};
      if(accountState.signedIn===true){accountLink.textContent='Account';state.paid=state.paid||accountState.entitled===true;}
     }
    }else{accountLink.hidden=false;accountLink.textContent='Sign in';}
   }catch{accountLink.hidden=false;accountLink.textContent='Sign in';}
   if(data.access){
    accessNotice.hidden=false;accessPricing.hidden=false;accessRequest.hidden=true;
    if(data.access==='login_required'){
     accessMessage.textContent='Interactive Deal Lab analysis requires an active subscription. The free course remains available.';
     announce('Sign in to use Deal Lab.','unavailable');
    }else if(data.access==='subscription_required'){
     if(accountState?.signedIn&&accountState.checkoutEligible){
      accessMessage.textContent='Checkout approval is active. AI access begins only after a subscription becomes active.';
      accessPricing.textContent='Choose a plan';announce('Checkout approval is active.','unavailable');
     }else if(accountState?.signedIn){
      accessMessage.textContent='No active Deal Lab subscription. The initial beta is invite-only for U.S. customers.';
      accessRequest.hidden=false;announce('No active Deal Lab subscription.','unavailable');
     }else{
      accessMessage.textContent='A Deal Lab subscription is required. The core course remains free.';
      announce('A Deal Lab subscription is required.','unavailable');
     }
    }else{
     accessMessage.textContent='Deal Lab account access is temporarily unavailable. The core course remains free.';
     accessPricing.hidden=true;announce('Account access is being configured.','unavailable');
    }
    setControls();return;
   }
   accessNotice.hidden=true;
   announce(state.available?'AI Deal Lab is ready.':'AI Deal Lab is being configured. You can still review the three practice modes and fictional case descriptions. Visit the course while AI is unavailable.',''+(state.available?'ready':'unavailable'));
  }catch{state.available=false;announce('AI Deal Lab service status could not be reached. Try again later or visit the course.','error');}
  setControls();
 })();
}
