// Incremental, pre-tax integration-project sensitivities. No market assumptions.
export function calculateIntegration({baselineEbitda,revenue,plannedAnnualBenefit,costs,discountRate,years,scenarios}) {
 const amount=(value,label)=>{if(!Number.isFinite(value)||value<0)throw new RangeError(`Invalid ${label}.`);return value;};
 amount(baselineEbitda,'baseline EBITDA');if(baselineEbitda===0)throw new RangeError('Positive baseline EBITDA required.');
 amount(revenue,'revenue');amount(plannedAnnualBenefit,'benefit');amount(discountRate,'discount rate');
 if(!Number.isInteger(years)||years<1||years>20)throw new RangeError('Invalid horizon.');
 if(!costs||!Object.keys(costs).length)throw new RangeError('Explicit cost assumptions required.');
 const oneTimeCost=Object.entries(costs).reduce((sum,[label,value])=>sum+amount(value,`${label} cost`),0);
 if(!Array.isArray(scenarios)||!scenarios.length)throw new RangeError('Scenario schedules required.');
 const results=scenarios.map(scenario=>{
  for(const key of ['realization','duplicateRunningCosts','revenueLoss']){
   if(!Array.isArray(scenario[key])||scenario[key].length!==years)throw new RangeError(`Invalid ${key} schedule.`);
   scenario[key].forEach(value=>{amount(value,key);if(key!=='duplicateRunningCosts'&&value>1)throw new RangeError(`Invalid ${key} fraction.`);});
  }
  amount(scenario.costMultiplier,'cost multiplier');amount(scenario.lostContributionMargin,'lost contribution margin');
  if(scenario.lostContributionMargin>1)throw new RangeError('Invalid contribution margin fraction.');
  const initialCost=oneTimeCost*scenario.costMultiplier;
  const annualCashFlows=scenario.realization.map((fraction,i)=>plannedAnnualBenefit*fraction-scenario.duplicateRunningCosts[i]-revenue*scenario.revenueLoss[i]*scenario.lostContributionMargin);
  const npv=-initialCost+annualCashFlows.reduce((sum,flow,i)=>sum+flow/(1+discountRate)**(i+1),0);
  return {name:scenario.name,oneTimeCost:Math.round(initialCost),annualCashFlows:annualCashFlows.map(Math.round),incrementalNpv:Math.round(npv)};
 });
 return {baselineEbitda,plannedAnnualBenefit,improvementPercent:plannedAnnualBenefit/baselineEbitda*100,oneTimeCost,costBreakdown:{...costs},discountRate,years,scenarios:results,
  assumptions:'Incremental pre-tax integration project only, against keeping operations separate. Costs paid at close; net benefits paid at year-end; no terminal value. Excludes purchase consideration, financing, taxes, capex and working-capital changes. Discount rate and scenario probabilities are not market evidence; no probabilities are assigned.'};
}
