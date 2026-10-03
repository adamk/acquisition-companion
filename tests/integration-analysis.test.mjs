import test from 'node:test';
import assert from 'node:assert/strict';
import {getCase,calculateCase,visibleCalculations} from '../src/lib/ai-cases.mjs';

test('fictional integration has reproducible project economics and stage-isolated downside facts',()=>{
 const scenario=getCase('two-companies-one-team');
 assert.match(scenario.description,/fictional/i);
 const result=calculateCase(scenario.id).integration;
 assert.equal(result.baselineEbitda,1000000);
 assert.equal(result.plannedAnnualBenefit,200000);assert.equal(result.improvementPercent,20);
 assert.equal(result.oneTimeCost,250000);
 assert.deepEqual(result.scenarios[0].annualCashFlows,[40000,200000,200000,200000,200000]);
 assert.deepEqual(result.scenarios[1].annualCashFlows,[-60000,-210000,-50000,-50000,-50000]);
 for(const item of result.scenarios){
  const independent=-item.oneTimeCost+item.annualCashFlows.reduce((sum,flow,i)=>sum+flow/1.1**(i+1),0);
  assert.equal(item.incrementalNpv,Math.round(independent));
 }
 assert.equal(Object.hasOwn(visibleCalculations(scenario.id,2),'integration'),false);
 assert.equal(visibleCalculations(scenario.id,3).integration.scenarios.length,1);
 assert.equal(visibleCalculations(scenario.id,4).integration.scenarios.length,2);
 assert.ok(result.scenarios[0].incrementalNpv>0);assert.ok(result.scenarios[1].incrementalNpv<0);
});

test('integration math validates schedules and distinguishes zero from unspecified costs',async()=>{
 const module=await import('../src/lib/integration-analysis.mjs').catch(()=>null);
 assert.equal(typeof module?.calculateIntegration,'function');
 const inputs=getCase('two-companies-one-team').integration;
 assert.throws(()=>module.calculateIntegration({...inputs,discountRate:-0.1}),/discount/i);
 assert.throws(()=>module.calculateIntegration({...inputs,costs:{systems:undefined}}),/cost/i);
 assert.throws(()=>module.calculateIntegration({...inputs,scenarios:[{...inputs.scenarios[0],realization:[1]}]}),/schedule/i);
 const zero=module.calculateIntegration({...inputs,costs:{systems:0}});assert.equal(zero.oneTimeCost,0);
});
