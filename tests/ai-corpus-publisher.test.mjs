import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeAiCorpus} from '../scripts/generate-ai-corpus.mjs';

async function loadPublisher() {
  const imported = await import('../scripts/publish-ai-corpus.mjs').catch(() => null);
  assert.equal(typeof imported?.publishAiCorpus, 'function', 'explicit public corpus publisher is available');
  return imported.publishAiCorpus;
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, content, 'utf8');
}

function makeFixture(root) {
  write(root, 'src/content/lessons/lesson.md', '---\ntitle: "Lesson"\ndescription: "Lesson description."\nmodule: 1\ntopics: ["topic"]\nevidence: []\nsources: []\nfundSources: []\ntakeaway: "Takeaway."\n---\n\nAuthored lesson copy.\n');
  write(root, 'src/content/topics/topic.md', '---\ntitle: "Topic"\ndescription: "Topic description."\ndefinition: "Topic definition."\ncategory: "Financing"\ncoverage: "substantive"\nrelated: []\nevidence: []\nsources: []\nfundSources: []\n---\n\nAuthored topic copy.\n');
  write(root, 'src/content/examples/example.md', '---\ntitle: "Example"\ndescription: "Example description."\nstatus: "hypothetical"\ntopics: ["topic"]\nevidence: []\nsources: []\nfundSources: []\nnumbers: []\n---\n\nOriginal hypothetical.\n');
  write(root, 'src/data/glossary.json', '[]');
  write(root, 'src/data/modules.json', '[{"number":1,"title":"Module","description":"Module description."}]');
  write(root, 'src/data/videos.json', '[]');
  write(root, 'src/data/fund-launch.json', '[]');
  writeAiCorpus({root,siteOrigin:'https://acquisitioncompanion.com'});
}

test('publisher refuses missing credentials before making an external request', async () => {
  const publishAiCorpus = await loadPublisher();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-ai-publisher-'));
  let requestCount = 0;
  try {
    makeFixture(root);
    await assert.rejects(() => publishAiCorpus({root,apiKey:'',fetcher:async()=>{requestCount++;}}), /OPENAI_API_KEY/);
    assert.equal(requestCount, 0);
  } finally {
    fs.rmSync(root, {recursive:true,force:true});
  }
});

test('publisher uploads only generated authored documents, applies bounded chunking, and waits for readiness', async () => {
  const publishAiCorpus = await loadPublisher();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-ai-publisher-'));
  const requests = [];
  let uploadIndex = 0;
  try {
    makeFixture(root);
    const fetcher = async (input, init={}) => {
      const url = new URL(input);
      requests.push({url,init});
      if (url.pathname === '/v1/vector_stores' && init.method === 'POST') {
        return Response.json({id:'vs_test_public_course'});
      }
      if (url.pathname === '/v1/files' && init.method === 'POST') {
        const file = init.body.get('file');
        assert.match(file.name, /^ac-(?:lesson|topic|example|glossary|module)--/);
        assert.equal(init.body.get('purpose'), 'assistants');
        assert.match(await file.text(), /Authorship: Acquisition Companion authored public education/);
        uploadIndex++;
        return Response.json({id:`file_test_${uploadIndex}`});
      }
      if (url.pathname === '/v1/vector_stores/vs_test_public_course/file_batches' && init.method === 'POST') {
        const body = JSON.parse(init.body);
        assert.equal(body.files.length, 4);
        assert.ok(body.files.every(item => item.chunking_strategy.type === 'static'));
        assert.ok(body.files.every(item => item.chunking_strategy.static.max_chunk_size_tokens === 500));
        assert.ok(body.files.every(item => item.chunking_strategy.static.chunk_overlap_tokens === 80));
        return Response.json({id:'batch_test',status:'in_progress',file_counts:{failed:0}});
      }
      if (url.pathname === '/v1/vector_stores/vs_test_public_course/file_batches/batch_test' && init.method === 'GET') {
        return Response.json({id:'batch_test',status:'completed',file_counts:{failed:0}});
      }
      assert.fail(`Unexpected OpenAI API request: ${init.method} ${url.pathname}`);
    };
    const result = await publishAiCorpus({root,apiKey:'test-only-key',fetcher,pollIntervalMs:0});
    assert.deepEqual(result,{vectorStoreId:'vs_test_public_course',documentCount:4});
    assert.equal(uploadIndex,4);
    assert.equal(requests.filter(item=>item.url.pathname==='/v1/files').length,4);
    assert.equal(requests.filter(item=>item.url.pathname.endsWith('/file_batches')).length,1);
    assert.equal(requests.filter(item=>item.url.pathname.endsWith('/file_batches/batch_test')).length,1);
  } finally {
    fs.rmSync(root, {recursive:true,force:true});
  }
});
