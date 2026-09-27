import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const read = name => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`,import.meta.url)));
test('read-only importer parses aligned sources and escaped title separators',()=>{
 const r=spawnSync('python3',['-c',`import importlib.util
s=importlib.util.spec_from_file_location('research','scripts/import-research.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
r=m.aligned_sources({'video_id':'--DvlTBzkW4 || abcdefghijk','video_title':'A | B || Second','video_url':'https://www.youtube.com/watch?v=--DvlTBzkW4 || https://www.youtube.com/watch?v=abcdefghijk','source_file':'a.md || b.md','transcript_source':'native || recovered'})
assert r[0]['title']=='A | B' and r[1]['sourceFile']=='b.md'
assert m.markdown_cells('| one | title \\| pipe | three |') == ['one','title | pipe','three']
try: m.aligned_sources({'video_id':'a || b','video_title':'one','video_url':'x || y','source_file':'a || b','transcript_source':'a || b'})
except ValueError: pass
else: raise AssertionError('misaligned provenance accepted')`],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
});
test('generated public data retains complete stable record identities and valid relationships',()=>{
 const evidence=read('evidence'),videos=read('videos'),numbers=read('numbers'),providers=read('providers');
 assert.equal(evidence.length,243);assert.equal(videos.length,117);assert.equal(numbers.length,313);assert.equal(providers.length,28);
 const videoIds=new Set(videos.map(v=>v.id));assert.equal(videoIds.size,117);
 const topics=new Set(JSON.parse(readFileSync('docs/content-contract.json')).topics);
 for(const [records,prefix] of [[evidence,'E'],[numbers,'N'],[providers,'P']]) records.forEach((r,i)=>{
   assert.equal(r.id,`${prefix}${String(i+1).padStart(3,'0')}`);
   assert.ok(r.videoIds.length>0,r.id);for(const id of r.videoIds)assert.ok(videoIds.has(id),`${r.id}: ${id}`);
   for(const t of r.topics)assert.ok(topics.has(t),t);
 });
 assert.equal(videos.find(v=>v.id==='--DvlTBzkW4').url,'https://www.youtube.com/watch?v=--DvlTBzkW4');
 assert.ok(numbers.every(r=>r.context && r.caution && r.kind));
 assert.match(providers.find(p=>p.name==='Duke Royalty').status,/prospective|candidate/i);
 assert.match(providers.find(p=>p.name==='MFS').caution,/unresolved|unverified/i);
});
test('public projection excludes internal fields, paths and research bookkeeping',()=>{
 const allowed={evidence:['id','label','type','confidence','videoIds','topics'],videos:['id','title','url','collection','summary','topics','usefulPE','usefulDebt','limited'],numbers:['id','metric','value','context','kind','confidence','caution','videoIds','topics','category'],providers:['id','name','type','role','context','caution','confidence','videoIds','topics','status']};
 for(const [name,keys]of Object.entries(allowed))for(const row of read(name)){
  assert.deepEqual(Object.keys(row).sort(),keys.sort());
  assert.doesNotMatch(JSON.stringify(row),/\/Users\/|whisper_corpus|native_youtube_caption|mlx_whisper_audio|Phase [12]|supporting_context|source_file/);
 }
});
test('uncertain figures and proposed capital retain their distinct status',()=>{
 const n=Object.fromEntries(read('numbers').map(r=>[r.id,r]));
 assert.equal(n.N012.kind,'target');assert.equal(n.N022.kind,'proposed');assert.equal(n.N049.kind,'unverified-claim');
 assert.match(n.N049.caution,/five-year failure.*lifetime/);
 assert.match(n.N092.caution,/£4m.*£2m/);
 assert.match(n.N196.caution,/pounds and euros/);
 assert.match(n.N203.caution,/not 35% annual/);
 assert.match(n.N269.caution,/LIBOR.*erroneous/);
 assert.match(n.N291.caution,/unsupported/);assert.equal(n.N291.confidence,'low');
 assert.equal(n.N311.kind,'unverified-claim');assert.match(n.N313.caution,/80%.*appraisal/);
});
test('private audit maps exact source rows without leaking supporting prose into public context',()=>{
 const audit=JSON.parse(readFileSync('private/provenance.json'));
 const manifest=JSON.parse(readFileSync('private/import-manifest.json'));
 assert.equal(manifest.inputs.length,9);assert.equal(manifest.rawTranscriptsCopied,false);
 assert.equal(audit.evidence[0].original.video_id.split(' || ')[0],'--DvlTBzkW4');
 assert.equal(audit.evidence[0].sources[0].url,'https://www.youtube.com/watch?v=--DvlTBzkW4');
 assert.ok(audit.evidence[0].original.supporting_context.length>0);
 for(const record of audit.evidence){
  assert.equal(record.sources.length,record.original.video_id.split('||').length);
  for(const [i,s]of record.sources.entries())assert.equal(s.sourceFile,record.original.source_file.split('||')[i].trim());
 }
 const n=read('numbers');
 assert.equal(new Set(n.map(x=>x.context)).size,313);
 n.forEach((r,i)=>assert.notEqual(r.context,audit.numbers[i].original.Context));
});
