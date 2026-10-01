// Stateless arithmetic for user-reported practice inputs, never synthetic case truth.
// Extraction is deliberately narrow: ambiguous prose remains for clarification.
const MONEY='([$€£])\\s*(\\d[\\d,]*(?:\\.\\d+)?)\\s*(million|thousand|m|k)?\\b';
const FIELDS={
 purchasePrice:'(?:asking price|purchase price|business is asking)',
 adjustedEBITDA:'(?:(?:stated )?adjusted EBITDA)',
 normalizedEBITDA:'(?:validated normalized EBITDA|normalized EBITDA)',
 addbacks:'(?:add[- ]?backs)',
 buyerLiquidity:'(?:buyer liquidity|available to invest)',
 buyerEquity:'(?:buyer equity|equity deployed)',
 seniorLoan:'(?:senior loan|senior debt)',
 sellerNote:'(?:seller note)',
 cashFlowBeforeDebt:'(?:cash flow before debt service)',
 maintenanceCapex:'(?:annual maintenance capex|maintenance capex)',
 workingCapitalInvestment:'(?:annual working[- ]capital investment)',
 cashTaxes:'(?:annual cash taxes|cash taxes)',
 replacementCompensation:'(?:annual replacement compensation|replacement compensation)',
 otherRecurringObligations:'(?:annual other recurring obligations|other recurring obligations)',
 fees:'(?:transaction fees|fees)',
 closingWorkingCapital:'(?:closing working[- ]capital funding)',
 postCloseReserve:'(?:post[- ]close reserve)',
 otherFinancing:'(?:other financing)',
};
const has=(facts,...keys)=>keys.every(key=>Number.isFinite(facts[key]) && facts[key]>=0);
const payments={monthly:12,quarterly:4,annual:1};

export function annualDebtService(principal,ratePercent,years,frequency) {
 if(!Number.isFinite(principal)||principal<0||!Number.isFinite(ratePercent)||ratePercent<0||!Number.isFinite(years)||years<=0||!payments[frequency])throw new RangeError('Supply valid principal, annual rate, amortization and payment frequency.');
 const frequencyCount=payments[frequency],periodRate=ratePercent/100/frequencyCount,periods=years*frequencyCount;
 if(!Number.isInteger(periods))throw new RangeError('Amortization must comprise whole payment periods.');
 return periodRate===0?principal/years:principal*periodRate/(-Math.expm1(-periods*Math.log1p(periodRate)))*frequencyCount;
}

export function calculateDeal(facts) {
 const result={};
 const add=(key,value,formula)=>{if(Number.isFinite(value))result[key]={value,formula};};
 if(has(facts,'adjustedEBITDA') && facts.adjustedEBITDA>0){
  if(has(facts,'purchasePrice'))add('statedMultiple',facts.purchasePrice/facts.adjustedEBITDA,'purchase price / stated adjusted EBITDA');
  if(has(facts,'addbacks')){
   add('addbacksSharePercent',100*facts.addbacks/facts.adjustedEBITDA,'add-backs / stated adjusted EBITDA × 100');
   const pre=facts.adjustedEBITDA-facts.addbacks;
   add('preAddbackEBITDA',pre,'stated adjusted EBITDA − stated add-backs (not validated normalized EBITDA)');
   if(pre>0 && has(facts,'purchasePrice'))add('preAddbackMultiple',facts.purchasePrice/pre,'purchase price / EBITDA before stated add-backs');
  }
 }
 if(has(facts,'normalizedEBITDA','purchasePrice') && facts.normalizedEBITDA>0)add('normalizedMultiple',facts.purchasePrice/facts.normalizedEBITDA,'purchase price / user-reported normalized EBITDA');
 if(has(facts,'purchasePrice','buyerEquity')){
  add('purchaseFundingGap',facts.purchasePrice-facts.buyerEquity,'purchase price − equity explicitly deployed; excludes fees, reserves and working capital; not approved debt capacity');
  if(facts.purchasePrice>0)add('buyerEquityPercent',100*facts.buyerEquity/facts.purchasePrice,'equity deployed / purchase price × 100');
 }
 const uses=['purchasePrice','fees','closingWorkingCapital','postCloseReserve'];
 const sources=['buyerEquity','seniorLoan','sellerNote','otherFinancing'];
 if(has(facts,...uses))add('totalClosingUses',uses.reduce((sum,key)=>sum+facts[key],0),'purchase price + fees + closing working-capital funding + post-close reserve; assumes price payable at closing');
 if(has(facts,...sources))add('totalClosingSources',sources.reduce((sum,key)=>sum+facts[key],0),'buyer equity + senior loan + seller note + other financing; assumes note finances closing consideration');
 if(result.totalClosingUses && result.totalClosingSources)add('closingFundingGap',result.totalClosingUses.value-result.totalClosingSources.value,'total closing uses − total closing sources; contingent earnouts are not closing funding');
 const deductions=['maintenanceCapex','workingCapitalInvestment','cashTaxes','replacementCompensation','otherRecurringObligations'];
 const derivedCash=has(facts,'normalizedEBITDA',...deductions);
 const cash=has(facts,'cashFlowBeforeDebt')?facts.cashFlowBeforeDebt:derivedCash?facts.normalizedEBITDA-deductions.reduce((sum,key)=>sum+facts[key],0):null;
 if(cash!==null)add('cashFlowBeforeDebt',cash,has(facts,'cashFlowBeforeDebt')?'user-reported sustainable annual cash flow before debt; confirm deductions and no double counting':'normalized EBITDA − maintenance capex − working-capital investment − cash taxes − replacement compensation − other recurring obligations');
 if(derivedCash && has(facts,'cashFlowBeforeDebt'))add('cashFlowReconciliationDifference',facts.cashFlowBeforeDebt-(facts.normalizedEBITDA-deductions.reduce((sum,key)=>sum+facts[key],0)),'user-reported cash flow minus modeled EBITDA cash bridge; reconcile any difference before relying on coverage');
 if(has(facts,'normalizedEBITDA','seniorLoan','sellerNote')&&facts.normalizedEBITDA>0)add('totalDebtToNormalizedEBITDA',(facts.seniorLoan+facts.sellerNote)/facts.normalizedEBITDA,'(senior loan + seller note) / user-reported normalized EBITDA; excludes any other debt');
 for(const [prefix,principalKey,label] of [['senior','seniorLoan','Senior'],['seller','sellerNote','Seller']]){
  if(!has(facts,principalKey))continue;
  const principal=facts[principalKey],rate=facts[`${prefix}Rate`],years=facts[`${prefix}AmortizationYears`],frequency=facts[`${prefix}PaymentFrequency`];
  if(principal===0)add(`annual${label}DebtService`,0,'explicitly zero loan amount');
  else if(Number.isFinite(rate)&&rate>=0 && facts[`${prefix}PaymentType`]==='interest_only')add(`annual${label}DebtService`,principal*rate/100,'principal × annual interest rate; excludes principal balloon at maturity');
  else if(Number.isFinite(years)&&years>0&&Number.isFinite(rate)&&rate>=0&&payments[frequency]){
   try{add(`annual${label}DebtService`,annualDebtService(principal,rate,years,frequency),'level payment: P × (r/n) / [1 − (1+r/n)^(−n×years)] × n; zero rate: P/years; excludes fees and balloons');}catch{/* Ambiguous payment periods need clarification. */}
  }
 }
 if(result.annualSeniorDebtService && result.annualSellerDebtService){
  const debt=result.annualSeniorDebtService.value+result.annualSellerDebtService.value;
  add('totalAnnualDebtService',debt,'annual senior service + annual seller-note service; confirm no other debt');
  if(cash!==null && (!result.cashFlowReconciliationDifference || Math.abs(result.cashFlowReconciliationDifference.value)<0.01)){
   add('cashAfterDebtService',cash-debt,'cash flow before debt − total debt service; compensation already deducted only if included in cash-flow definition');
   if(debt>0){
    add('dscr',cash/debt,'annual cash flow before debt / annual debt service; mathematical coverage, not lender qualification');
    add('breakEvenCashFlow',debt,'cash flow before debt required for 1.0× mathematical coverage; not a lender threshold');
    for(const decline of [10,20]){
     const stress=has(facts,'cashFlowBeforeDebt')?cash*(1-decline/100):facts.normalizedEBITDA*(1-decline/100)-deductions.reduce((sum,key)=>sum+facts[key],0);
     add(`downside${decline}CashFlow`,stress,has(facts,'cashFlowBeforeDebt')?`cash flow declines ${decline}%; debt terms unchanged`:`normalized EBITDA declines ${decline}%; supplied deductions and debt terms held fixed`);
     add(`downside${decline}Dscr`,stress/debt,'stressed annual cash flow / unchanged annual debt service');
     add(`downside${decline}CashAfterDebt`,stress-debt,'stressed annual cash flow − unchanged annual debt service');
    }
   }
  }
 }
 return result;
}

export function startsNewDeal(message) {
 const text=message.replace(/"[^"\n]*"|“[^”\n]*”/g,'');
 return /(?:^|[.!?\n])\s*(?:(?:let's|let us|now|switch to|consider|analyze)\s+)?(?:a )?(?:new|different|another) (?:deal|business|company|scenario)\b|^(?:reset|forget|discard) (?:the |all )?(?:previous|prior) (?:deal|facts|numbers)\b/i.test(text);
}

export function buildDealAnalysis(history,message) {
 const turns=[...history.filter(item=>item.role==='user').map(item=>item.content),message];
 let start=0;
 turns.forEach((text,index)=>{if(startsNewDeal(text))start=index;});
 const candidates=new Map(),currencies=new Set();
 const record=(key,value,turn,corrected=false)=>{
  if(!Number.isFinite(value)||value<0||value>1e12)return;
  const entries=corrected?[]:candidates.get(key)||[];
  entries.push({value,turn});candidates.set(key,entries);
 };
 for(let turn=start;turn<turns.length;turn++){
  // Quoted examples and uncertain ranges must not silently become deal facts.
  const text=turns[turn].replace(/"[^"\n]*"|“[^”\n]*”/g,'');
  const clauses=text.split(/[;\n]|(?<=[.!?])\s+(?!\d)/);
  for(const clause of clauses){
   if(/\?|\b(?:not|no|example|suppose|assuming|assume|if|course says|might|could be|between|approximately|about)\b/i.test(clause)||/\d\s*(?:[mk]|million|thousand)?\s*(?:[-–—]|to|or)\s*[$€£]?\s*\d/i.test(clause))continue;
   for(const [key,label] of Object.entries(FIELDS)){
    const forward=new RegExp(`\\b${label}\\s*(?:(?:is|of|at)\\s*|[:=]\\s*)?${MONEY}`,'ig');
    const reverse=new RegExp(`${MONEY}\\s*(?:of\\s+)?${label}\\b`,'ig');
    const matches=[...clause.matchAll(forward),...clause.matchAll(reverse)];
    for(const match of matches){
     const symbol=match[1],value=Number(match[2].replaceAll(',',''))*({m:1e6,million:1e6,k:1e3,thousand:1e3}[match[3]?.toLowerCase()]||1);
     if(!/^\d+(?:\.\d+)?$|^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(match[2]))continue;
     currencies.add(symbol);record(key,value,turn,/\b(?:corrected|updated|revised)\b/i.test(clause));
    }
   }
   for(const prefix of ['senior','seller']){
    const rate=clause.match(new RegExp(`\\b${prefix} (?:loan |note )?(?:annual )?(?:interest )?rate\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*%`,'i'));
    if(rate)record(`${prefix}Rate`,Number(rate[1]),turn);
    const amort=clause.match(new RegExp(`\\b${prefix} (?:loan |note )?amortization\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*years?`,'i'));
    if(amort)record(`${prefix}AmortizationYears`,Number(amort[1]),turn);
    const frequency=clause.match(new RegExp(`\\b${prefix} (?:loan |note )?payments?\\s*[:=]?\\s*(monthly|quarterly|annual)\\b`,'i'));
    if(frequency){const key=`${prefix}PaymentFrequency`;const entries=candidates.get(key)||[];entries.push({value:frequency[1].toLowerCase(),turn});candidates.set(key,entries);}
    if(new RegExp(`\\b${prefix} (?:loan |note )?payments?\\s*[:=]?\\s*interest[- ]only\\b`,'i').test(clause)){const key=`${prefix}PaymentType`;const entries=candidates.get(key)||[];entries.push({value:'interest_only',turn});candidates.set(key,entries);}
   }
  }
 }
 const userReported={},provenance={},needsClarification=[];
 for(const [key,entries] of candidates){
  const values=[...new Set(entries.map(item=>item.value))];
  if(values.length!==1){needsClarification.push(key);continue;}
  userReported[key]=values[0];provenance[key]={source:'user-reported, unverified',userTurn:entries.at(-1).turn};
 }
 if(currencies.size>1)needsClarification.push('currency');
 return {userReported,provenance,needsClarification,currency:currencies.size===1?[...currencies][0]:null,calculated:currencies.size>1?{}:calculateDeal(userReported)};
}
