import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {buildAiCorpus} from '../scripts/generate-ai-corpus.mjs';

const root=path.resolve(import.meta.dirname,'..');
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const readJson=(relative)=>JSON.parse(read(relative));
const examples=[
  'earnings-after-debt-service',
  'exceptional-deferred-purchase',
  'machinery-borrowing-base',
  'marketing-addback',
  'preference-before-common',
  'seller-rollover-price-bridge',
];

function arrayField(frontmatter,key) {
  const match=frontmatter.match(new RegExp(`^${key}:\\s*(\\[.*\\])\\s*$`,'m'));
  assert.ok(match,`expected ${key} array in example frontmatter`);
  return JSON.parse(match[1]);
}

test('the six reviewed worked examples are fictional Acquisition Companion cases without creator-number associations',()=>{
  for (const slug of examples) {
    const source=read(`src/content/examples/${slug}.md`);
    const match=source.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    assert.ok(match,`${slug} has valid frontmatter`);
    const [,frontmatter,body]=match;
    assert.match(frontmatter,/^status:\s*"hypothetical"\s*$/m,slug);
    for (const key of ['evidence','sources','fundSources','numbers']) assert.deepEqual(arrayField(frontmatter,key),[],`${slug} clears ${key}`);
    assert.match(body,/^## Fictional Acquisition Companion example/m,slug);
    assert.match(body,/hypothetical uses invented/i,slug);
    assert.doesNotMatch(body,/Yusufa Sey|youtube\.com\/watch|reported completed/i,slug);
  }
});

test('fictional worked-example calculations reconcile from their stated inputs',()=>{
  const debt=read('src/content/examples/earnings-after-debt-service.md');
  const annualPrincipal=1_200_000/8, seniorInterest=1_200_000*0.08, seniorDebtService=annualPrincipal+seniorInterest, totalPayments=seniorDebtService+48_000, remaining=330_000-totalPayments, coverage=330_000/totalPayments;
  assert.equal(annualPrincipal,150_000);assert.equal(seniorInterest,96_000);assert.equal(seniorDebtService,246_000);assert.equal(totalPayments,294_000);assert.equal(remaining,36_000);assert.equal(coverage.toFixed(2),'1.12');
  for(const value of ['£150,000','£96,000','£246,000','£294,000','£36,000','1.12×'])assert.ok(debt.includes(value),value);
  const deferred=read('src/content/examples/exceptional-deferred-purchase.md');
  assert.equal(2_100_000-1_650_000,450_000);assert.equal(450_000-380_000,70_000);for(const value of ['£450,000','£70,000','£2,100,000'])assert.ok(deferred.includes(value),value);
  const machinery=read('src/content/examples/machinery-borrowing-base.md');
  const eligible=355_000-55_000,grossBase=eligible*0.62,shareOfBook=grossBase/520_000*100;
  assert.equal(eligible,300_000);assert.equal(grossBase,186_000);assert.equal(shareOfBook.toFixed(1),'35.8');for(const value of ['£300,000','£186,000','35.8%'])assert.ok(machinery.includes(value),value);
  const addback=read('src/content/examples/marketing-addback.md');
  assert.equal(120_000-36_000,84_000);assert.equal(420_000+36_000,456_000);for(const value of ['£84,000','£456,000'])assert.ok(addback.includes(value),value);
  const preference=read('src/content/examples/preference-before-common.md');
  const preferenceAmount=2_000_000*1.4,highConversion=3_600_000*0.25,highCommon=3_600_000-preferenceAmount,lowPreference=Math.min(preferenceAmount,2_400_000),lowConversion=2_400_000*0.25,lowCommon=2_400_000-lowPreference;
  assert.equal(preferenceAmount,2_800_000);assert.equal(highConversion,900_000);assert.equal(highCommon,800_000);assert.equal(lowPreference,2_400_000);assert.equal(lowConversion,600_000);assert.equal(lowCommon,0);for(const value of ['$2,800,000','$900,000','$800,000','$2,400,000','$600,000','$0'])assert.ok(preference.includes(value),value);
  const rollover=read('src/content/examples/seller-rollover-price-bridge.md');
  const impliedEquity=960_000/0.6,retainedValue=impliedEquity*0.4;assert.equal(impliedEquity,1_600_000);assert.equal(retainedValue,640_000);for(const value of ['£1,600,000','£640,000'])assert.ok(rollover.includes(value),value);
});

test('regenerated corpus keeps the October source, provenance, and source-only associations while examples enter as original synthesis',()=>{
  const corpus=buildAiCorpus({root,siteOrigin:'https://acquisitioncompanion.com'});
  const source=readJson('src/data/videos.json').find(item=>item.id==='nYNfdSQqk3o');
  assert.ok(source);
  assert.equal(source.title,'PE entrepreneur on running a €60M group in UK');
  assert.equal(source.creator,'Yusufa Sey');
  assert.equal(source.publishedAt,'2026-10-04');
  assert.equal(source.url,'https://www.youtube.com/watch?v=nYNfdSQqk3o');
  assert.equal(source.transcript.method,'Whisper audio recovery');
  assert.match(source.transcript.caution,/not been independently verified/i);
  assert.deepEqual(source.transcript.sections.map(section=>section.range),['05:57–10:28','10:31–13:50','13:50–15:15','01:18–04:30','13:16–13:27','07:39–08:30']);
  const linked=corpus.documents.filter(document=>document.metadata.publicSourceReferences.yusufaVideoIds.includes(source.id));
  assert.equal(linked.length,16);
  for (const document of linked) {
    const attribution=document.metadata.originalSources.find(item=>item.url===source.url);
    assert.equal(attribution?.transcriptProvenance,'Whisper audio recovery',document.filename);
    assert.match(attribution?.sourceCaution||'',/wording and numerical claims have not been independently verified/i,document.filename);
  }
  assert.equal(corpus.documents.length,153);
  for (const slug of examples) {
    const doc=corpus.documents.find(item=>item.filename===`ac-example--${slug}.md`);
    assert.ok(doc,slug);
    assert.deepEqual(doc.metadata.sourceFamilies,['Acquisition Companion original synthesis'],slug);
    assert.deepEqual(doc.metadata.originalSources,[],slug);
    assert.doesNotMatch(doc.content,/Source-reconstruction boundary|Yusufa Sey|youtube\.com\/watch/,slug);
  }
});

test('public positioning preserves the current financing CTA and separates free education from paid analysis',()=>{
  const home=read('src/pages/index.astro');
  assert.match(home,/Build a capital stack the business can carry\./);
  assert.match(home,/href="\/financing\/">Explore acquisition financing/);
  assert.match(home,/independently authored/i);
  assert.match(home,/creators are sources, not collaborators/i);
  const pricing=read('src/pages/pricing.astro');
  assert.match(pricing,/course, topics, examples and source-linked educational material remain free/i);
  assert.match(pricing,/subscriptions support interactive AI analysis, deterministic calculations, deal-reasoning workflows, fictional deal practice and IC workflows, and associated model and compute costs/i);
  const about=read('src/pages/about.astro');
  assert.match(about,/course, topics, examples and source-linked educational material are free; no account or payment is needed/i);
  assert.doesNotMatch(about,/There are no payments, subscriptions, memberships/i);
  const ai=read('src/pages/ai/index.astro');
  assert.match(ai,/topics, examples and source-linked educational material remain free/i);
  assert.match(ai,/independently authored Acquisition Companion curriculum/i);
  assert.match(ai,/source links identify material by its original creators/i);
});

test('methodology documents a source-closed, independent drafting sequence',()=>{
  const methodology=read('src/pages/methodology.astro');
  for (const phrase of ['concept/fact ledger','remove the raw source from drafting context','existing Acquisition Companion outline','original analysis','factual checking','similarity']) assert.ok(methodology.toLowerCase().includes(phrase.toLowerCase()),phrase);
  assert.match(methodology,/The transcript is not the draft outline/i);
});
