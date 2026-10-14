import test from 'node:test';
import assert from 'node:assert/strict';
import {coachingFocus,coachInstructions,parseCoachResult} from '../src/worker/seller-call-coach.mjs';
import {sellerCallScenarios} from './fixtures/seller-call-scenarios.mjs';

for(const scenario of sellerCallScenarios)test(`coaching attention: ${scenario.name}`,()=>{
 assert.equal(coachingFocus(scenario),scenario.focus,scenario.expected);
 // The real request policy carries the selected focus, not a canned question.
 assert.ok(coachInstructions({...scenario,action:'next_question'}).includes(`Attention cue (not a finding): ${scenario.focus}`));
});
test('earnings and transition coverage prevent stale cue repetition',()=>{
 assert.equal(coachingFocus({notes:'$600k net profit',coverage:{}}),'highest_value_gap');
 assert.equal(coachingFocus({notes:'Owner handles customers personally.',coverage:{transition:'clear'}}),'highest_value_gap');
 assert.equal(coachingFocus({notes:'Seller says profit is $600k.',coverage:{earnings:'clear'}}),'highest_value_gap');
});
test('output contract rejects huge reviews, duplicate coverage and missing sections',()=>{
 const valid={nextQuestion:'What should happen next?',whyItMatters:'Agree the follow-up.',watchFor:'',coverage:[],review:null};
 assert.deepEqual(parseCoachResult(valid,'next_question'),valid);
 assert.equal(parseCoachResult({...valid,coverage:[{area:'earnings',status:'clear'},{area:'earnings',status:'partial'}]},'next_question'),null);
 assert.equal(parseCoachResult({...valid,nextQuestion:'q'.repeat(321)},'next_question'),null);
 assert.equal(parseCoachResult({...valid,review:{}},'review_call'),null);
});
