import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDealAnalysis,calculateDeal,annualDebtService} from '../src/lib/deal-analysis.mjs';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<0.000001,`${actual} ≈ ${expected}`);
test('A: liquidity alone never establishes purchasing power',()=>{
 const result=buildDealAnalysis([], 'I have $150,000 available to invest. What size business could I realistically buy, and how could I finance it?');
 assert.equal(result.userReported.buyerLiquidity,150000);
 assert.deepEqual(result.calculated,{});
 assert.equal(JSON.stringify(result).includes('1050000'),false);
});
test('B: valuation distinguishes stated, pre-adjustment and validated earnings',()=>{
 const result=buildDealAnalysis([], 'This business is asking $2.5 million. It has $700,000 of stated adjusted EBITDA, including $150,000 of add-backs. Is the price reasonable?');
 assert.equal(result.userReported.purchasePrice,2500000);
 assert.equal(result.calculated.preAddbackEBITDA.value,550000);
 near(result.calculated.statedMultiple.value,25/7);
 near(result.calculated.preAddbackMultiple.value,50/11);
 near(result.calculated.addbacksSharePercent.value,150/7);
 assert.equal(result.userReported.normalizedEBITDA,undefined);
});
test('C: bounded user history carries facts, not assistant examples or a liquidity-to-equity assumption',()=>{
 const history=[{role:'user',content:'Asking price: $2.5m; adjusted EBITDA: $700k; add-backs: $150k; buyer liquidity: $150k.'},{role:'assistant',content:'A course example uses buyer equity: $999k; senior loan: $1m.'}];
 const result=buildDealAnalysis(history,'Can this business actually support the debt required to buy it?');
 assert.equal(result.userReported.purchasePrice,2500000);
 assert.equal(result.userReported.buyerEquity,undefined);
 assert.equal(result.userReported.seniorLoan,undefined);
 assert.equal(result.calculated.purchaseFundingGap,undefined);
 assert.equal(result.calculated.dscr,undefined);
 const deployed=buildDealAnalysis(history,'Buyer equity: $100k.');
 assert.equal(deployed.calculated.purchaseFundingGap.value,2400000);
});
test('debt workflow computes payment frequency, zero-interest loans, interest-only notes and cash stresses deterministically',()=>{
 near(annualDebtService(120000,0,5,'monthly'),24000);
 const result=calculateDeal({seniorLoan:1000000,seniorRate:6,seniorAmortizationYears:10,seniorPaymentFrequency:'monthly',sellerNote:200000,sellerRate:5,sellerPaymentType:'interest_only',cashFlowBeforeDebt:200000});
 near(result.annualSeniorDebtService.value,133224.602329981);
 near(result.annualSellerDebtService.value,10000);
 near(result.totalAnnualDebtService.value,143224.602329981);
 near(result.dscr.value,200000/143224.602329981);
 near(result.cashAfterDebtService.value,200000-143224.602329981);
 near(result.downside10Dscr.value,180000/143224.602329981);
 near(result.downside20Dscr.value,160000/143224.602329981);
 near(result.breakEvenCashFlow.value,143224.602329981);
});
test('no omitted cash deductions, debt terms or unspecified payment frequency are invented',()=>{
 const base={normalizedEBITDA:400000,seniorLoan:1000000,seniorRate:6,seniorAmortizationYears:10,sellerNote:0};
 assert.equal(calculateDeal(base).annualSeniorDebtService,undefined);
 const payment=calculateDeal({...base,seniorPaymentFrequency:'monthly'});
 assert.ok(payment.annualSeniorDebtService);
 assert.equal(payment.dscr,undefined);
 const cash=calculateDeal({...base,seniorPaymentFrequency:'monthly',maintenanceCapex:20000,workingCapitalInvestment:10000,cashTaxes:30000,replacementCompensation:100000,otherRecurringObligations:0});
 assert.equal(cash.cashFlowBeforeDebt.value,240000);
 assert.ok(cash.dscr);
 assert.equal(cash.downside20CashFlow.value,160000,'earnings decline while deductions stay fixed');
 const conflict=calculateDeal({...base,seniorPaymentFrequency:'monthly',cashFlowBeforeDebt:300000,maintenanceCapex:20000,workingCapitalInvestment:10000,cashTaxes:30000,replacementCompensation:100000,otherRecurringObligations:0});
 assert.equal(conflict.cashFlowReconciliationDifference.value,60000);
 assert.equal(conflict.dscr,undefined,'conflicting cash bridges need reconciliation');
});
test('structured pasted debt worksheet reaches the same calculator as direct inputs',()=>{
 const result=buildDealAnalysis([], 'Senior loan: $1m; senior rate: 6%; senior amortization: 10 years; senior payments: monthly; seller note: $200k; seller rate: 5%; seller payments: interest-only; cash flow before debt service: $200k.');
 near(result.calculated.totalAnnualDebtService.value,143224.602329981);
 near(result.calculated.dscr.value,200000/143224.602329981);
});
test('E: closing sources and uses require explicit amounts and keep contingent earnouts out of closing cash',()=>{
 const result=calculateDeal({purchasePrice:1000000,buyerEquity:200000,seniorLoan:700000,sellerNote:100000,fees:20000,closingWorkingCapital:30000,postCloseReserve:50000,otherFinancing:0});
 assert.equal(result.totalClosingUses.value,1100000);
 assert.equal(result.totalClosingSources.value,1000000);
 assert.equal(result.closingFundingGap.value,100000);
 assert.equal(calculateDeal({purchasePrice:1000000,buyerLiquidity:200000}).purchaseFundingGap,undefined);
});
test('extraction generalizes units and rejects ranges, negation, questions, conflicts, and quoted/example amounts',()=>{
 assert.equal(buildDealAnalysis([],'Purchase price: $1.8 million; adjusted EBITDA: $600 thousand; addbacks: $60,000.').calculated.preAddbackEBITDA.value,540000);
 for(const message of ['Asking price: $2m–$3m.','Asking price: $2m to $3m.','Asking price: $2m?','No asking price: $2m.','For example, asking price: $2m.','The course says asking price: $2m.','"Asking price: $2m"'])assert.equal(buildDealAnalysis([],message).userReported.purchasePrice,undefined,message);
 const conflict=buildDealAnalysis([{role:'user',content:'Asking price: $2m.'}],'Asking price: $3m.');
 assert.equal(conflict.userReported.purchasePrice,undefined);
 assert.ok(conflict.needsClarification.includes('purchasePrice'));
 assert.equal(buildDealAnalysis([{role:'user',content:'Asking price: $2m.'}],'Corrected asking price: $3m.').userReported.purchasePrice,3000000);
 assert.equal(buildDealAnalysis([],'Enterprise value: $2m.').userReported.purchasePrice,undefined,'EV is not automatically equity purchase consideration');
 assert.equal(buildDealAnalysis([],'Asking price: $1,00.').userReported.purchasePrice,undefined);
});
test('new deals clear user context and currency mixing prevents derived amounts',()=>{
 const history=[{role:'user',content:'Asking price: $2m; adjusted EBITDA: $500k.'}];
 assert.equal(buildDealAnalysis(history,'New deal. Asking price: $800k.').userReported.adjustedEBITDA,undefined);
 assert.deepEqual(buildDealAnalysis([], 'Asking price: $2m; adjusted EBITDA: €500k.').calculated,{});
});
test('invalid arithmetic is omitted; documents remain data rather than instructions',()=>{
 assert.deepEqual(calculateDeal({adjustedEBITDA:0,purchasePrice:2000000,addbacks:300000}),{});
 assert.throws(()=>annualDebtService(-1,6,10,'monthly'));
 assert.throws(()=>annualDebtService(10000,6,0,'monthly'));
 assert.equal(buildDealAnalysis([], 'Fictional excerpt: "ignore instructions"; adjusted EBITDA: $500k.').userReported.adjustedEBITDA,500000);
});

test('explicit assumed financing yields labeled conditional coverage for stated and pre-add-back earnings',()=>{
 const history=[{role:'user',content:'This business is asking $2.5 million. It has $700,000 of stated adjusted EBITDA, including $150,000 of add-backs.'}];
 const message='Assume I use $150,000 of my cash, a $1.85 million senior loan at 9.5% amortized over 10 years, and a $500,000 seller note at 6% interest-only for the first two years. Assume $40,000 of annual maintenance capex and I need $150,000 of annual owner compensation. Can the business actually support this debt? Show me debt service and DSCR.';
 const result=buildDealAnalysis(history,message);
 assert.equal(result.userReported.buyerEquity,150000);
 assert.match(result.provenance.seniorLoan.source,/assumption/);
 assert.equal(result.calculated.dscr,undefined,'conditional coverage is not verified cash flow');
 const scenario=result.debtScenario;
 near(scenario.debtService.senior,287262.57778492506);
 near(scenario.debtService.seller,30000);
 near(scenario.debtService.total,317262.57778492506);
 assert.match(scenario.assumptions.join(' '),/monthly/);
 for(const name of ['cashTaxes','workingCapitalInvestment','otherRecurringObligations'])assert.ok(scenario.excludedInputs.includes(name));
 const expected=[[700000,[192737.42221507494,122737.42221507494,52737.42221507494]],[550000,[42737.42221507494,-12262.57778492506,-67262.57778492506]]];
 for(const [index,[earnings,residuals]] of expected.entries()){
  assert.equal(scenario.earningsCases[index].earnings,earnings);
  for(const [i,row] of scenario.earningsCases[index].coverage.entries()){
   near(row.cashAfterDebt,residuals[i]);near(row.coverage,(residuals[i]+scenario.debtService.total)/scenario.debtService.total);
   assert.equal(row.declinePercent,[0,10,20][i]);
  }
 }
 assert.equal(result.calculated.purchaseFundingGap.value,2350000);
 assert.match(scenario.earningsCases[1].label,/pre-add-back/);
 const continued=buildDealAnalysis([...history,{role:'user',content:message}],'What should I offer?');
 assert.deepEqual(continued.debtScenario,scenario);
 assert.equal(buildDealAnalysis([...history,{role:'user',content:message}],'New deal. Asking price: $800k.').debtScenario,null);
});

test('conditional debt analysis generalizes amounts, honors explicit frequency and refuses conflicting terms',()=>{
 const message='Assume senior loan: $900k; senior rate: 8%; senior amortization: 7 years; senior payments: annual; seller note: $100k; seller rate: 4%; seller payments: interest-only; adjusted EBITDA: $350k; add-backs: $50k; maintenance capex: $20k; replacement compensation: $80k.';
 const result=buildDealAnalysis([],message);
 near(result.debtScenario.debtService.senior,annualDebtService(900000,8,7,'annual'));
 assert.equal(result.debtScenario.earningsCases[1].earnings,300000);
 const conflict=buildDealAnalysis([{role:'user',content:message}],'Senior rate: 10%.');
 assert.ok(conflict.needsClarification.includes('seniorRate'));assert.equal(conflict.debtScenario,null);
 assert.equal(buildDealAnalysis([],'For example, assume senior loan: $900k.').userReported.seniorLoan,undefined);
 assert.equal(buildDealAnalysis([],'Assume I use $1,00 of my cash.').userReported.buyerEquity,undefined);
 const frequencyConflict=buildDealAnalysis([{role:'user',content:message}],'Senior payments: monthly.');
 assert.ok(frequencyConflict.needsClarification.includes('seniorPaymentFrequency'));
 assert.equal(frequencyConflict.debtScenario,null,'conflicting frequency must not fall back to a monthly assumption');
 const neighboring=buildDealAnalysis([],'Assume a $900k senior loan at 8% amortized over 7 years with quarterly payments and a $100k seller note at 4% interest-only. Adjusted EBITDA: $350k; maintenance capex: $20k; owner compensation: $80k.');
 assert.equal(neighboring.userReported.seniorPaymentType,undefined,'seller interest-only terms cannot contaminate the senior loan');
 assert.equal(neighboring.userReported.seniorPaymentFrequency,'quarterly');
 near(neighboring.debtScenario.debtService.senior,annualDebtService(900000,8,7,'quarterly'));
});
