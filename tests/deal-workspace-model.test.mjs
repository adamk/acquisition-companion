import test from 'node:test';
import assert from 'node:assert/strict';
import {newDeal,validateDeal,deriveMetrics,unknowns,coachSummary,MAX_DEAL_BYTES} from '../src/lib/deal-workspace.mjs';

test('new workspace deals leave unknown economics optional and use an alias',()=>{
 const deal=newDeal('Project Atlas');
 assert.equal(validateDeal(deal)?.alias,'Project Atlas');
 assert.equal(deal.economics.earnings,null);
 assert.equal(deal.economics.earningsMeasure,'unknown');
 assert.equal(deriveMetrics(deal).ebitdaMultiple,null);
 assert.ok(unknowns(deal).some(v=>/earnings/i.test(v)));
 assert.ok(deal.evidence.length>=20);
 assert.ok(deal.evidence.every(e=>e.status==='not_requested'));
});
test('only an explicitly selected EBITDA basis permits an EBITDA multiple',()=>{
 const deal=newDeal();deal.economics.askingPrice=3800000;deal.economics.earnings=650000;
 for(const measure of ['unknown','sde','net_income','cash_flow','ebit','pretax_income','other']){
  deal.economics.earningsMeasure=measure;assert.equal(deriveMetrics(deal).ebitdaMultiple,null);
 }
 for(const measure of ['ebitda','adjusted_ebitda']){
  deal.economics.earningsMeasure=measure;assert.equal(deriveMetrics(deal).ebitdaMultiple,3800000/650000);
 }
 deal.economics.earnings=0;assert.equal(deriveMetrics(deal).ebitdaMultiple,null);
});
test('reported losses are recordable and incomplete numeric edits never produce a multiple',()=>{
 const deal=newDeal();deal.economics.earningsMeasure='ebitda';deal.economics.askingPrice=1000000;deal.economics.earnings=-50000;
 assert.ok(validateDeal(deal));assert.equal(deriveMetrics(deal).ebitdaMultiple,null);
 for(const value of [NaN,Infinity,-Infinity]){deal.economics.earnings=value;assert.equal(deriveMetrics(deal).ebitdaMultiple,null);assert.equal(validateDeal(deal),null);}
 deal.economics.earnings=200000;deal.economics.askingPrice=NaN;assert.equal(deriveMetrics(deal).ebitdaMultiple,null);
});
test('deal validation rejects unsupported material, versions, values and limits without mutating input',()=>{
 const base=newDeal(),copy=structuredClone(base);assert.deepEqual(validateDeal(base),base);assert.deepEqual(base,copy);
 for(const change of [d=>d.version=2,d=>d.transcript='not allowed',d=>d.alias='x'.repeat(81),d=>d.economics.revenue=-1,d=>d.economics.earningsMeasure='verified EBITDA',d=>d.business.largestCustomerPercent=101,d=>d.createdAt='not-a-date',d=>d.claims=Array(21).fill({}),d=>d.questions=[{id:'q',text:'q',status:'verified'}],d=>d.evidence[0].asOf='2026-02-30']){
  const d=structuredClone(base);change(d);assert.equal(validateDeal(d),null);
 }
 const d=structuredClone(base);for(let i=0;i<20;i++)d.claims.push({id:`c${i}`,statement:'😀'.repeat(200),category:'financial',status:'seller_claim',note:''});
 assert.ok(new TextEncoder().encode(JSON.stringify(d)).length>MAX_DEAL_BYTES);assert.equal(validateDeal(d),null);
});
test('evidence and ledger are explicitly user reported and coach summaries preserve unresolved meanings',()=>{
 const d=newDeal();d.economics.earnings=650000;
 d.claims.push({id:'c1',statement:'A $60k owner add-back is claimed.',category:'financial',status:'seller_claim',note:'No support yet.'});
 d.evidence[0].status='reviewed';d.evidence[0].asOf='2025-01-01';
 d.questions.push({id:'q1',text:'What does profit refer to?',status:'evidence_needed'});
 d.business.largestCustomerPercent=35;
 const summary=coachSummary(d);assert.ok(summary.length<=3000);
 assert.match(summary,/unknown|undefined/i);assert.match(summary,/seller claim/i);assert.match(summary,/user|buyer/i);assert.match(summary,/35/);assert.match(summary,/What does profit refer to/);
 assert.ok(!/independently verified/i.test(summary));
});
