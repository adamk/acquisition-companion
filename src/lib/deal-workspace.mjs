// Shared browser/server vocabulary and bounds. No storage or network side effects.
export const SCHEMA_VERSION=1;
export const MAX_DEAL_BYTES=10000;
export const MAX_ENTRIES=20;
export const MAX_ENTRY_TEXT=240;
export const STAGES=Object.freeze({initial_interest:'Initial interest',intro_call:'Introductory call',qualification:'Qualification',indicative_offer:'Indicative offer',diligence:'Diligence',financing:'Financing',closing:'Closing',paused:'Paused',passed:'Passed'});
export const EARNINGS_MEASURES=Object.freeze({unknown:'Unknown',ebitda:'EBITDA',adjusted_ebitda:'Adjusted EBITDA',sde:'SDE',ebit:'EBIT',pretax_income:'Pretax income',net_income:'Net income',cash_flow:'Cash flow',other:'Other'});
export const CLAIM_STATUSES=Object.freeze({seller_claim:'Seller claim',clarified:'Clarified',evidence_seen:'Evidence seen',follow_up:'Conflict / follow-up'});
export const EVIDENCE_STATUSES=Object.freeze({not_requested:'Not requested',requested:'Requested',received:'Received',reviewed:'Reviewed',follow_up:'Needs follow-up'});
export const QUESTION_STATUSES=Object.freeze({unanswered:'Unanswered',partial:'Partially answered',answered:'Answered for now',evidence_needed:'Evidence needed'});
export const ACTION_STATUSES=Object.freeze({open:'Open',completed:'Completed'});
export const CATEGORIES=Object.freeze({financial:'Financial',customers:'Customers',operations:'Operations',working_capital:'Working capital',transaction:'Transaction',seller:'Seller / transition',other:'Other'});
const textField=(path,label,max=240,type='textarea')=>({path,label,type,max});
const numberField=(path,label,max=1e12)=>({path,label,type:'number',max,min:path==='economics.earnings'?-1e12:0});
const selectField=(path,label,options)=>({path,label,type:'select',options});
export const FIELD_GROUPS=[
 {id:'identity',label:'Identity',fields:[textField('alias','Project alias',80,'text'),textField('sector','Sector / industry',80,'text'),textField('geography','Broad geography',80,'text'),selectField('stage','Acquisition stage',STAGES)]},
 {id:'economics',label:'Core economics',fields:[numberField('economics.revenue','Revenue'),numberField('economics.earnings','Seller-stated earnings'),selectField('economics.earningsMeasure','Earnings measure',EARNINGS_MEASURES),numberField('economics.askingPrice','Asking price'),numberField('economics.completionCash','Proposed completion cash'),numberField('economics.sellerFinancing','Seller financing / deferred amount'),numberField('economics.buyerEquity','Buyer equity'),numberField('economics.debt','Proposed debt'),numberField('economics.otherConsideration','Other consideration')]},
 {id:'seller',label:'Seller / transition',fields:[textField('seller.motivation','Seller motivation'),textField('seller.timeline','Seller desired timeline'),textField('seller.transition','Expected transition period'),textField('seller.ownerDependence','Owner dependence notes'),selectField('seller.stayingInvolved','Seller staying involved?',{unknown:'Unknown',yes:'Yes',no:'No'})]},
 {id:'business',label:'Business / risks',fields:[numberField('business.largestCustomerPercent','Largest customer (% of revenue)',100),textField('business.recurringRevenue','Recurring / project revenue'),textField('business.management','Management depth'),textField('business.keyPerson','Key-person dependence'),textField('business.capex','Capital expenditure'),textField('business.workingCapital','Working capital')]},
];
const evidenceGroups={financial:['Annual financial statements','Monthly P&L / management accounts','Balance sheets','Cash-flow information','EBITDA / add-back support'],customers:['Customer concentration','Major customer relationships / contracts','Recurring revenue evidence'],operations:['Management / organisation information','Owner responsibilities','Employee / key-person information','Capital-expenditure history','Operational dependencies'],working_capital:['Receivables','Inventory, where relevant','Payables','Normal working-capital needs'],transaction:['Seller expectations','Proposed structure','Transition expectations','Financing assumptions']};

export function newDeal(alias='Project Atlas',now=new Date().toISOString()){
 return {version:SCHEMA_VERSION,id:crypto.randomUUID(),alias,sector:'',geography:'',stage:'initial_interest',createdAt:now,updatedAt:now,
  economics:{revenue:null,earnings:null,earningsMeasure:'unknown',askingPrice:null,completionCash:null,sellerFinancing:null,buyerEquity:null,debt:null,otherConsideration:null},
  seller:{motivation:'',timeline:'',transition:'',ownerDependence:'',stayingInvolved:'unknown'},
  business:{largestCustomerPercent:null,recurringRevenue:'',management:'',keyPerson:'',capex:'',workingCapital:''},
  claims:[],evidence:Object.entries(evidenceGroups).flatMap(([category,labels])=>labels.map((label,i)=>({id:`e-${category}-${i}`,label,category,status:'not_requested',note:'',asOf:''}))),questions:[],actions:[]};
}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const text=(v,max,required=false)=>typeof v==='string'&&Array.from(v).length<=max&&(!required||v.trim().length>0)&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(v);
const member=(v,list)=>typeof v==='string'&&Object.hasOwn(list,v);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const day=v=>v===''||typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const number=(v,max=1e12,min=0)=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const rows=(v,max,check)=>Array.isArray(v)&&v.length<=max&&v.every(check)&&new Set(v.map(r=>r.id)).size===v.length;

export function validateDeal(raw){
 try{
  if(!exact(raw,['version','id','alias','sector','geography','stage','createdAt','updatedAt','economics','seller','business','claims','evidence','questions','actions'])||raw.version!==SCHEMA_VERSION||!id(raw.id)||!text(raw.alias,80,true)||!text(raw.sector,80)||!text(raw.geography,80)||!member(raw.stage,STAGES)||!date(raw.createdAt)||!date(raw.updatedAt)||raw.updatedAt<raw.createdAt)return null;
  const e=raw.economics,s=raw.seller,b=raw.business;
  if(!exact(e,['revenue','earnings','earningsMeasure','askingPrice','completionCash','sellerFinancing','buyerEquity','debt','otherConsideration'])||!member(e.earningsMeasure,EARNINGS_MEASURES)||Object.entries(e).some(([k,v])=>k!=='earningsMeasure'&&!number(v,1e12,k==='earnings'?-1e12:0)))return null;
  if(!exact(s,['motivation','timeline','transition','ownerDependence','stayingInvolved'])||!['unknown','yes','no'].includes(s.stayingInvolved)||Object.entries(s).some(([k,v])=>k!=='stayingInvolved'&&!text(v,240)))return null;
  if(!exact(b,['largestCustomerPercent','recurringRevenue','management','keyPerson','capex','workingCapital'])||!number(b.largestCustomerPercent,100)||Object.entries(b).some(([k,v])=>k!=='largestCustomerPercent'&&!text(v,240)))return null;
  if(!rows(raw.claims,MAX_ENTRIES,r=>exact(r,['id','statement','category','status','note'])&&id(r.id)&&text(r.statement,240,true)&&member(r.category,CATEGORIES)&&member(r.status,CLAIM_STATUSES)&&text(r.note,160)))return null;
  if(!rows(raw.evidence,30,r=>exact(r,['id','label','category','status','note','asOf'])&&id(r.id)&&text(r.label,80,true)&&member(r.category,CATEGORIES)&&member(r.status,EVIDENCE_STATUSES)&&text(r.note,160)&&day(r.asOf)))return null;
  if(!rows(raw.questions,MAX_ENTRIES,r=>exact(r,['id','text','status'])&&id(r.id)&&text(r.text,240,true)&&member(r.status,QUESTION_STATUSES)))return null;
  if(!rows(raw.actions,MAX_ENTRIES,r=>exact(r,['id','text','status','category'])&&id(r.id)&&text(r.text,240,true)&&member(r.status,ACTION_STATUSES)&&member(r.category,CATEGORIES)))return null;
  if(new TextEncoder().encode(JSON.stringify(raw)).length>MAX_DEAL_BYTES)return null;
  return structuredClone(raw);
 }catch{return null;}
}

export function deriveMetrics(deal){
 const e=deal.economics;
 return {ebitdaMultiple:['ebitda','adjusted_ebitda'].includes(e.earningsMeasure)&&typeof e.askingPrice==='number'&&Number.isFinite(e.askingPrice)&&e.askingPrice>=0&&typeof e.earnings==='number'&&Number.isFinite(e.earnings)&&e.earnings>0&&Number.isFinite(e.askingPrice/e.earnings)?e.askingPrice/e.earnings:null};
}
export function unknowns(deal){
 const gaps=[];
 if(deal.economics.earnings===null||deal.economics.earningsMeasure==='unknown')gaps.push('Sustainable earnings and their definition remain unclear.');
 if(!deal.seller.motivation)gaps.push('Seller motivation is not recorded.');
 if(!deal.seller.ownerDependence||!deal.business.management)gaps.push('Owner dependence and management depth need clarification.');
 if(deal.business.largestCustomerPercent===null)gaps.push('Customer concentration is not recorded.');
 if(!deal.seller.transition)gaps.push('Transition expectations are not recorded.');
 if(!deal.business.capex||!deal.business.workingCapital)gaps.push('Capital expenditure and working-capital context remain incomplete.');
 const evidence=deal.evidence.filter(e=>e.status!=='reviewed').length;
 if(evidence)gaps.push(`${evidence} evidence items are not marked reviewed by you.`);
 const questions=deal.questions.filter(q=>q.status!=='answered').length;
 if(questions)gaps.push(`${questions} open or evidence-dependent questions.`);
 if(deal.claims.some(c=>c.status==='follow_up'))gaps.push('Conflicting or follow-up claims require attention.');
 return gaps;
}
export function coachSummary(deal){
 const lines=[`Local alias: ${deal.alias}. All entries are buyer-reported; no verification by Acquisition Companion.`,
  `Stage: ${STAGES[deal.stage]}. Sector: ${deal.sector||'unknown'}. Broad geography: ${deal.geography||'unknown'}.`];
 for(const group of FIELD_GROUPS.filter(g=>g.id!=='identity'))for(const f of group.fields){const v=deal[f.path.split('.')[0]][f.path.split('.')[1]];if(v!==null&&v!==''&&v!=='unknown')lines.push(`${f.label}: ${f.options?f.options[v]:v}.`);}
 if(deal.economics.earningsMeasure==='unknown')lines.push('Earnings measure is unknown; define profit before interpreting price.');
 // Put unresolved questions before optional evidence details so they survive the bounded preview.
 for(const q of deal.questions.filter(q=>q.status!=='answered').slice(0,5))lines.push(`${QUESTION_STATUSES[q.status]}: ${q.text}`);
 for(const c of deal.claims)lines.push(`${CLAIM_STATUSES[c.status]}: ${c.statement}${c.note?` (${c.note})`:''}`);
 for(const e of deal.evidence.filter(e=>e.status!=='not_requested'))lines.push(`${e.label}: ${EVIDENCE_STATUSES[e.status]} by user${e.asOf?`; evidence as of ${e.asOf}`:''}.`);
 const selected=[];let size=0;
 for(const line of lines){if(size+line.length+1>2850){selected.push('Additional local entries omitted from this preview. This summary is not the whole workspace.');break;}selected.push(line);size+=line.length+1;}
 return selected.join('\n');
}
