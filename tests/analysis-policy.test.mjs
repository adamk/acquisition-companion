import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisKindFor,analysisPolicyFor} from '../src/worker/analysis-policy.mjs';
import {createResponseRequest} from '../src/worker/openai.mjs';

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
