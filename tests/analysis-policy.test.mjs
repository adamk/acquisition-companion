import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisKindFor,analysisPolicyFor} from '../src/worker/analysis-policy.mjs';
import {createResponseRequest} from '../src/worker/openai.mjs';
import * as policy from '../src/worker/analysis-policy.mjs';
import {integrationQuestion} from './fixtures/integration-scenario.mjs';

test('integration lens addresses execution reality without inventing course facts or changing budgets',()=>{
 assert.equal(typeof policy.operationalPolicyFor,'function');
 const instructions=policy.operationalPolicyFor(integrationQuestion,[]);
 for(const term of ['ideal process','self-preservation','fear','politics','Stabilize','optimize','talent flight','customer disruption','temporarily necessary','neither incumbent','20%','denominator','timing','partial','mediocre','hypotheses','firsthand','historical'])assert.ok(instructions.toLowerCase().includes(term.toLowerCase()),term);
 assert.equal(policy.operationalPolicyFor('What is seller financing?',[]),'');
 assert.ok(policy.operationalPolicyFor('What should we defer?',[{role:'user',content:'We are merging teams.'}]).length>0);
 assert.equal(policy.operationalPolicyFor('What should we defer?',[{role:'assistant',content:'An unrelated integration example.'}]),'');
 for(const message of ['Plan post-close integration','How do we handle layoffs?','Management succession and culture clashes','Customer retention after organizational redesign','Evaluate synergy realization','Employee retention and key-person risk'])assert.ok(policy.operationalPolicyFor(message,[]),message);
 for(const mode of ['ask_course','deal_lab','ic_challenge']){
  const request=createResponseRequest({vectorStoreId:'fixture',input:[],instructions,allowedActions:['explain'],allowedLessonSlugs:[],mode,action:'message'});
  assert.equal(request.max_output_tokens,mode==='ask_course'?1152:960);assert.equal(request.store,false);assert.equal(request.tool_choice,'required');
 }
});

test('merger regression requires explicit human reality and a concise answer without leaking into valuation',()=>{
 const instructions=policy.operationalPolicyFor(integrationQuestion,[]);
 for(const requirement of [
  /explicitly contrast.*on paper.*in practice/i,
  /explicitly mention.*employee uncertainty\/fear.*rumor/i,
  /high performers.*may leave before.*decisions/i,
  /managers.*incentives.*information/i,
  /customer disruption.*account-owner turnover.*billing errors/i,
  /at most four.*principles/i,
  /temporary retention.*permanent leadership/i,
  /neither incumbent/i,
  /20%.*baseline\/denominator.*timing/i,
  /mediocre execution/i,
  /200–275 words.*explicitly asks for depth/i,
  /hard ceiling.*275 words/i,
  /10–12 short sentences.*25 words/i,
  /five labeled points.*35–45 words/i,
  /criteria.*single clause/i,
  /duplicated roles.*remain temporarily necessary/i,
  /Before returning.*length.*remove.*generic/i,
 ])assert.match(instructions,requirement);
 const valuation='This business is asking $2.5 million. It has $700,000 of stated adjusted EBITDA, including $150,000 of add-backs. Is the price reasonable?';
 assert.equal(policy.operationalPolicyFor(valuation,[]),'');
 assert.equal(analysisKindFor(valuation),'valuation');
 assert.match(analysisPolicyFor('valuation'),/adjustment share/);
});

test('analytical intent selects compact shapes and targeted budgets without changing public actions',()=>{
 for(const [message,kind,budget,shape] of [
  ['Can these earnings support the debt? Show debt service and downside DSCR.','debt',1600,'Debt service'],
  ['Fictional excerpt: customer concentration is 35%. What concerns require diligence before an offer?','diligence',1600,'Confirmed concerns'],
  ['What should I offer and how should I structure this acquisition?','offer',1400,'Valuation basis'],
  ['What is seller financing?',null,1152,''],
  ['What does DSCR mean?',null,1152,''],
 ]){
  assert.equal(analysisKindFor(message),kind);
  const instructions=analysisPolicyFor(kind);
  assert.ok(instructions.includes(shape));
  assert.match(instructions,/tangential course examples/);
  const body=createResponseRequest({vectorStoreId:'fixture',input:[],instructions,allowedActions:['explain'],allowedLessonSlugs:[],mode:'ask_course',action:'message',analysisKind:kind});
  assert.equal(body.max_output_tokens,budget);
  assert.equal(body.store,false);assert.equal(body.tool_choice,'required');assert.equal(body.reasoning.effort,'low');
  assert.deepEqual(body.text.format.schema.required,['responseText','suggestedActions']);
 }
 const caseRequest=createResponseRequest({vectorStoreId:'fixture',input:[],instructions:'',allowedActions:['hint'],allowedLessonSlugs:[],mode:'deal_lab',action:'hint',analysisKind:'debt'});
 assert.equal(caseRequest.max_output_tokens,576,'analytical budgets never override synthetic actions');
 const hint=createResponseRequest({vectorStoreId:'fixture',input:[],instructions:'',allowedActions:['hint'],allowedLessonSlugs:[],mode:'ask_course',action:'hint',analysisKind:'debt'});
 assert.equal(hint.max_output_tokens,576);
});

test('complex response guidance limits breadth while retaining grounding and analytical distinctions',()=>{
 const debt=analysisPolicyFor('debt');
 assert.match(debt,/300 words/);assert.match(debt,/both.*pre-add-back/i);assert.match(debt,/2–4/);assert.match(debt,/lender approval/);
 const diligence=analysisPolicyFor('diligence');
 assert.match(diligence,/350 words/);assert.match(diligence,/at most 5/);assert.match(diligence,/generic checklist/);
 const offer=analysisPolicyFor('offer');
 assert.match(offer,/250 words/);assert.match(offer,/2–4/);assert.match(offer,/no default discount/);
 for(const policy of [debt,diligence,offer]){
  assert.match(policy,/no uploads/);assert.match(policy,/Never invent a universal approval threshold/);
  assert.match(policy,/course claims grounded/);assert.match(policy,/unverified/);
 }
});
