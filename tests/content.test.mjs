import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
test('course contains substantive lessons, not navigation placeholders',()=>{
 const dir=new URL('src/content/lessons/',root);
 const files=fs.readdirSync(dir).filter(x=>x.endsWith('.md'));
 assert.equal(files.length,20);
 for(const f of files){const text=fs.readFileSync(new URL(f,dir),'utf8');assert.ok(text.split(/\s+/).length>=450,f);for(const heading of ['What it means','Why it matters','How it works','Practical interpretation','A worked example','Common mistakes','Related concepts','Further viewing'])assert.ok(text.includes('## '+heading),f+': '+heading);}
});
test('topic and example libraries are populated',()=>{
 assert.equal(fs.readdirSync(new URL('src/content/topics/',root)).filter(x=>x.endsWith('.md')).length,44);
 assert.equal(fs.readdirSync(new URL('src/content/examples/',root)).filter(x=>x.endsWith('.md')).length,12);
});
