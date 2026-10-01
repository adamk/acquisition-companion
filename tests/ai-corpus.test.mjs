import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function loadBuilder() {
  const imported = await import('../scripts/generate-ai-corpus.mjs').catch(() => null);
  assert.equal(typeof imported?.buildAiCorpus, 'function', 'public curriculum corpus builder is available');
  return imported.buildAiCorpus;
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, content, 'utf8');
}

test('corpus uses only authored curriculum and intentional public relationship metadata', async () => {
  const buildAiCorpus = await loadBuilder();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-ai-corpus-'));
  try {
    write(root, 'src/content/lessons/capital-stack.md', `---\ntitle: "Capital stack"\ndescription: "Connect funding to the cash required."\nmodule: 7\ntopics: ["capital-stack", "seller-financing"]\nevidence: ["E010"]\nsources: ["vid-1"]\nfundSources: ["fund-1"]\ntakeaway: "Match sources to uses."\n---\n\nThe authored lesson explains sources and uses.\n`);
    write(root, 'src/content/topics/seller-financing.md', `---\ntitle: "Seller financing"\ndescription: "A seller may defer part of the price."\ndefinition: "A seller claim or investment on agreed terms."\ncategory: "Financing"\ncoverage: "substantive"\nrelated: ["capital-stack"]\nevidence: ["E010"]\nsources: ["vid-1"]\nfundSources: []\n---\n\nA seller note is debt when it creates a repayment claim.\n`);
    write(root, 'src/content/examples/rollover.md', `---\ntitle: "Rollover example"\ndescription: "An original synthetic illustration."\nstatus: "hypothetical"\ntopics: ["rollover-equity"]\nevidence: []\nsources: []\nfundSources: []\nnumbers: []\n---\n\nThis example is authored by Acquisition Companion.\n`);
    write(root, 'src/data/glossary.json', JSON.stringify([{id:'seller-financing',term:'Seller financing',definition:'A seller provides debt or equity capital.',topic:'seller-financing'}]));
    write(root, 'src/data/modules.json', JSON.stringify([{number:7,title:'Assemble the funding',description:'Connect borrowing, seller terms and equity to cash required.'}]));
    write(root, 'src/data/videos.json', JSON.stringify([{id:'vid-1',title:'Original public video',url:'https://www.youtube.com/watch?v=vid-1'}]));
    write(root, 'src/data/fund-launch.json', JSON.stringify([{id:'fund-1',title:'Public lender guide',url:'https://www.fundlaunch.com/launch/direct-lending-fund'}]));
    write(root, 'src/data/evidence.json', 'RESEARCH CLAIM TEXT MUST NOT BE INGESTED');
    write(root, 'private/research.md', 'PRIVATE SOURCE TEXT MUST NOT BE INGESTED');
    write(root, 'whisper_corpus/raw.md', 'RAW TRANSCRIPT TEXT MUST NOT BE INGESTED');

    const result = buildAiCorpus({root, siteOrigin:'https://acquisitioncompanion.com'});
    const serialized = JSON.stringify(result);
    assert.equal(result.documents.length, 5);
    assert.ok(!serialized.includes('RESEARCH CLAIM TEXT'));
    assert.ok(!serialized.includes('PRIVATE SOURCE TEXT'));
    assert.ok(!serialized.includes('RAW TRANSCRIPT TEXT'));
    const lesson = result.documents.find(item => item.filename === 'ac-lesson--capital-stack.md');
    assert.ok(lesson);
    assert.match(lesson.content, /The authored lesson explains sources and uses/);
    assert.deepEqual(lesson.metadata.sourceFamilies, ['Yusufa Sey-derived education', 'Fund Launch enrichment']);
    assert.deepEqual(lesson.metadata.originalSources.map(source => source.url), [
      'https://www.youtube.com/watch?v=vid-1',
      'https://www.fundlaunch.com/launch/direct-lending-fund',
    ]);
    assert.equal(result.manifest[lesson.filename].url, 'https://acquisitioncompanion.com/course/capital-stack/');
    assert.equal(result.manifest['ac-glossary--seller-financing.md'].url, 'https://acquisitioncompanion.com/glossary/#seller-financing');
  } finally {
    fs.rmSync(root, {recursive:true, force:true});
  }
});

test('real corpus manifest contains only the repository public curriculum directories', async () => {
  const buildAiCorpus = await loadBuilder();
  const result = buildAiCorpus({root:process.cwd(), siteOrigin:'https://acquisitioncompanion.com'});
  assert.ok(result.documents.length >= 80, 'all public authored lesson, topic, example, glossary, and module documents are included');
  assert.ok(result.documents.every(item => item.filename.startsWith('ac-')));
  assert.ok(result.documents.every(item => /^https:\/\/acquisitioncompanion\.com\//.test(item.metadata.url)));
  assert.ok(result.documents.every(item => !/transcript|research|provider|number/i.test(item.metadata.contentType)));
  assert.ok(result.documents.some(item => item.metadata.title === 'Customer concentration'));
  assert.ok(result.documents.some(item => item.metadata.slug === 'understanding-private-credit'));
});
