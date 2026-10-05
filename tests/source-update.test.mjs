import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {buildAiCorpus} from '../scripts/generate-ai-corpus.mjs';
const id='nYNfdSQqk3o';
const read=name=>JSON.parse(fs.readFileSync(`src/data/${name}.json`));
test('new audio-recovered source carries qualified provenance through the authored AI corpus',()=>{
 const source=read('videos').find(v=>v.id===id);assert.ok(source);
 assert.equal(source.creator,'Yusufa Sey');assert.equal(source.publishedAt,'2026-10-04');
 assert.equal(source.transcript.method,'Whisper audio recovery');
 assert.match(source.transcript.caution,/not been independently verified/);
 assert.match(source.transcript.caution,/not benchmarks or default assumptions/);
 assert.equal(source.transcript.sections.length,6);
 const corpus=buildAiCorpus();
 for(const slug of ['building-the-capital-stack','management-after-acquisition','building-a-group','debt-terms-and-covenants','earnings-versus-cash','investor-fundraising']){
  const doc=corpus.documents.find(d=>d.metadata.slug===slug&&d.metadata.contentType==='lesson');
  assert.ok(doc.metadata.originalSources.slice(0,8).some(s=>s.url===source.url),'source fits rendered citation limit');
  assert.ok(doc.content.includes(source.transcript.caution),'retrieval keeps source caution');
  assert.ok(doc.content.includes('Whisper audio recovery'));
 }
 for(const name of ['numbers','fund-launch-numbers','evidence'])assert.ok(!JSON.stringify(read(name)).includes(id),'no numerical or legacy evidence entries added');
 assert.equal(fs.readdirSync('src/content/lessons').filter(x=>x.endsWith('.md')).length,20);
 assert.equal(read('modules').length,14);
});
test('legacy importer retains later reviewed source additions without replacing original video identities',()=>{
 const result=spawnSync('python3',['-c',`import importlib.util
s=importlib.util.spec_from_file_location('research','scripts/import-research.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a={'id':'original','title':'fresh import'}
b={'id':'new','url':'https://www.youtube.com/watch?v=new','transcript':{'method':'Whisper audio recovery'}}
assert m.preserve_video_additions([a],[{'id':'original','title':'old'},b])==[a,b]
try: m.preserve_video_additions([a],[{'id':'unknown'}])
except ValueError: pass
else: raise AssertionError('unreviewed addition accepted')
`],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
test('AI citation allowlist exposes the new video from retrieved amortization material',async()=>{
 const {handleAiRequest}=await import('../src/worker/ai-api.mjs');
 const limiter={async limit(){return {success:true};}};
 const env={AI_ENABLED:'true',AI_INTERACTIVE_ENABLED:'true',OPENAI_API_KEY:'test-only-key',OPENAI_VECTOR_STORE_ID:'vs_test_public_course',AI_SESSION_LIMITER:limiter,AI_IP_LIMITER:limiter,AI_EDGE_LIMITER:limiter};
 const filename='ac-topic--amortization.md';
 const request=new Request('https://acquisitioncompanion.com/api/ai',{method:'POST',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json','X-AI-Session-ID':'672e377b-4a59-4e37-b271-5208686801e0','CF-Connecting-IP':'198.51.100.42'},body:JSON.stringify({mode:'ask_course',message:'What does the course say about amortization?',history:[]})});
 const response=await handleAiRequest(request,env,{fetcher:async()=>Response.json({status:'completed',output:[{type:'file_search_call',status:'completed',results:[{filename}]},{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({responseText:'Repayment timing is contextual, not a universal best tenor.',suggestedActions:['explain']}),annotations:[{type:'file_citation',filename}]}]}]})});
 assert.equal(response.status,200);const result=await response.json();
 assert.ok(result.citations[0].originalSources.some(s=>s.url===`https://www.youtube.com/watch?v=${id}`));
 const doc=buildAiCorpus().documents.find(d=>d.filename===filename);
 assert.match(doc.content,/not benchmarks or default assumptions/);
 assert.match(doc.content,/rather than a universal best tenor/);
});
