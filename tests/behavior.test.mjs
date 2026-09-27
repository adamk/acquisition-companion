import test from 'node:test';
import assert from 'node:assert/strict';
import {matches,readProgress,toggleProgress,progressSummary,canonicalUrl} from '../src/lib/behavior.mjs';
test('filters combine category, classification and case-insensitive multiword search',()=>{
 const row={text:'Seller finance £400,000 deferred payment',category:'seller-financing',kind:'proposed'};
 assert.equal(matches(row,{query:'SELLER payment',category:'seller-financing',kind:'proposed'}),true);
 assert.equal(matches(row,{query:'bank',category:'all',kind:'all'}),false);
 assert.equal(matches(row,{query:'',category:'bank-debt',kind:'all'}),false);
});
test('malformed or unavailable progress storage returns an empty list',()=>{
 assert.deepEqual(readProgress('{broken',['one']),[]);
 assert.deepEqual(readProgress('{"one":true}',['one']),[]);
 assert.deepEqual(readProgress('["one","unknown","one",4]',['one']),['one']);
 assert.deepEqual(readProgress(null,['one']),[]);
});
test('progress can be completed, resumed and reset without accounts',()=>{
 assert.deepEqual(toggleProgress(['first'],'next',true),['first','next']);
 assert.deepEqual(toggleProgress(['first','next'],'first',false),['next']);
 assert.deepEqual(progressSummary(['first'],['first','next']),{complete:1,total:2,percent:50,next:'next'});
 assert.equal(progressSummary(['first','next'],['first','next']).next,null);
});
test('canonical URLs require an intentional public origin and preserve path',()=>{
 assert.equal(canonicalUrl('', '/topics/private-credit/'),null);
 assert.equal(canonicalUrl('https://learning.example','/topics/private-credit/'),'https://learning.example/topics/private-credit/');
 assert.throws(()=>canonicalUrl('javascript:alert(1)','/'));
 assert.throws(()=>canonicalUrl('http://localhost:4321','/'));
 assert.throws(()=>canonicalUrl('https://learning.example/subfolder','/'));
});

test('topic teaching previews exclude low-confidence numbers',async()=>{
 const {selectNumberPreviews}=await import('../src/lib/behavior.mjs');
 const records=[{id:'uncertain',topics:['credit'],confidence:'low'},{id:'good',topics:['credit'],confidence:'medium'},{id:'other',topics:['operations'],confidence:'high'}];
 assert.deepEqual(selectNumberPreviews(records,'credit',5).map(x=>x.id),['good']);
});
