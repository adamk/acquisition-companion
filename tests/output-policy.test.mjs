import test from 'node:test';import assert from 'node:assert/strict';
import {forbiddenOutputPath} from '../scripts/output-policy.mjs';
test('private credit learning routes are public while private metadata stays private',()=>{
 assert.equal(forbiddenOutputPath('course/understanding-private-credit/index.html'),false);
 assert.equal(forbiddenOutputPath('topics/private-credit/index.html'),false);
 for(const p of ['private/provenance.json','whisper_corpus/id.md','data/missing_whisper/id.txt','archive/transcript.mp3','yusufa_analysis/00.md'])assert.equal(forbiddenOutputPath(p),true,p);
});
