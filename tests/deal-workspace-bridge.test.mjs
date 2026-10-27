import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWorkspaceTransfer} from '../src/lib/deal-workspace-bridge.mjs';
test('only explicitly selected short facts, questions and actions form a return payload',()=>{
 const input={facts:['Owner reports retirement next year.'],questions:['Which earnings measure is meant?'],actions:['Request earnings support.']};
 assert.deepEqual(validateWorkspaceTransfer(input),input);
 for(const invalid of [{...input,notes:'Full call notes'},{...input,modelResponse:'Full review'},{...input,facts:['x'.repeat(241)]},{...input,questions:Array(6).fill('q')},{...input,actions:['']},null])assert.equal(validateWorkspaceTransfer(invalid),null);
 assert.equal(validateWorkspaceTransfer({facts:[],questions:[],actions:[]}),null);
});
