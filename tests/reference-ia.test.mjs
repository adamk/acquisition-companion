import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');

test('quantitative archive remains available outside primary learner navigation',()=>{
 const layout=read('src/layouts/Base.astro');
 const nav=layout.match(/const nav=(\[.*?\]);/)[1];
 assert.ok(!nav.includes('/numbers/'));
 assert.deepEqual([...nav.matchAll(/\['([^']+)','([^']+)'\]/g)].map(m=>m[1]),['Start here','Course','AI Deal Lab','Topics','Financing','Examples','Glossary','Sources','About']);
 const page=read('src/pages/numbers.astro');
 assert.match(page,/<h1>Quantitative Reference<\/h1>/);
 assert.match(page,/title="Quantitative Reference"/);
 assert.match(page,/type="Quantitative Reference"/);
 assert.match(page,/title:'Quantitative Reference'/);
 assert.match(page,/not current market benchmarks/);
 assert.match(page,/reported figures/);
 assert.ok(!/\bnoindex\b/.test(page),'archive inherits existing canonical/indexing policy');
 for(const path of ['src/pages/sources/index.astro','src/pages/methodology.astro'])assert.match(read(path),/href="\/numbers\/"[^>]*>Quantitative Reference/);
});

test('quantitative reference retains all 317 unique source-linked records',()=>{
 const records=['numbers','fund-launch-numbers'].flatMap(name=>JSON.parse(read(`src/data/${name}.json`)));
 assert.equal(records.length,317);assert.equal(new Set(records.map(r=>r.id)).size,317);
 for(const record of records){assert.ok(record.kind);assert.ok(record.context);assert.ok(record.videoIds?.length||record.sourceUrl);}
});
