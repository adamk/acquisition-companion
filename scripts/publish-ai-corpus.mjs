import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const API = 'https://api.openai.com/v1';
const CHUNKING = {type:'static',static:{max_chunk_size_tokens:500,chunk_overlap_tokens:80}};
const FILE_PATTERN = /^ac-(?:lesson|topic|example|glossary|module)--[a-z0-9-]+\.md$/;

async function responseJson(response) {
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(`OpenAI corpus API returned invalid JSON (${response.status}).`); }
  if (!response.ok) throw new Error(`OpenAI corpus API request failed (${response.status}).`);
  return payload;
}

async function request(fetcher, apiKey, pathname, {method='GET',body,headers={}}={}) {
  const response = await fetcher(`${API}${pathname}`, {
    method,
    headers:{Authorization:`Bearer ${apiKey}`,...headers},
    ...(body !== undefined ? {body} : {}),
  });
  return responseJson(response);
}

function generatedFiles(root) {
  const manifestPath = path.join(root,'src/data/ai-corpus-manifest.json');
  const corpusDirectory = path.join(root,'artifacts/ai-corpus');
  if (!fs.existsSync(manifestPath) || !fs.existsSync(corpusDirectory)) {
    throw new Error('Generate and review the AI corpus first with npm run generate:ai-corpus.');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const filenames = Object.keys(manifest).sort();
  if (!filenames.length || filenames.length > 500 || filenames.some(filename => !FILE_PATTERN.test(filename))) {
    throw new Error('The generated AI corpus manifest is empty or contains an unsupported filename.');
  }
  return filenames.map(filename => {
    const metadata = manifest[filename];
    const filePath = path.join(corpusDirectory,filename);
    if (!fs.existsSync(filePath) || !metadata?.title || !metadata?.url || !metadata?.contentType) {
      throw new Error(`Generated AI corpus document is missing or invalid: ${filename}`);
    }
    const content = fs.readFileSync(filePath);
    if (!content.length || content.length > 1_000_000) throw new Error(`Generated AI corpus document has an invalid size: ${filename}`);
    return {filename,metadata,content};
  });
}

async function mapLimit(values, concurrency, operation) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({length:Math.min(concurrency,values.length)},async()=>{
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await operation(values[index],index);
    }
  }));
  return results;
}

function normalizeStoreId(value) {
  if (typeof value !== 'string' || !/^vs_[A-Za-z0-9_-]+$/.test(value)) throw new Error('OpenAI did not return a valid vector-store ID.');
  return value;
}

export async function publishAiCorpus({root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),apiKey=process.env.OPENAI_API_KEY,fetcher=fetch,pollIntervalMs=1000,maxPolls=180}={}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Set OPENAI_API_KEY in the local shell before publishing the public course corpus.');
  if (typeof fetcher !== 'function') throw new TypeError('A fetch implementation is required.');
  const documents = generatedFiles(root);

  const files = await mapLimit(documents,4,async document=>{
    const form = new FormData();
    form.append('purpose','assistants');
    form.append('file',new Blob([document.content],{type:'text/markdown'}),document.filename);
    const uploaded = await responseJson(await fetcher(`${API}/files`,{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`},
      body:form,
    }));
    if (typeof uploaded.id !== 'string' || !/^file[-_][A-Za-z0-9_-]+$/.test(uploaded.id)) throw new Error('OpenAI corpus API did not return a valid file ID.');
    return {file_id:uploaded.id,attributes:{page_type:document.metadata.contentType,page_slug:document.metadata.slug,canonical_url:document.metadata.url}};
  });

  const vectorStore = await request(fetcher,apiKey,'/vector_stores',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:'Acquisition Companion public curriculum'}),
  });
  const vectorStoreId = normalizeStoreId(vectorStore.id);
  const batch = await request(fetcher,apiKey,`/vector_stores/${encodeURIComponent(vectorStoreId)}/file_batches`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({files:files.map(file=>({...file,chunking_strategy:CHUNKING}))}),
  });
  if (typeof batch.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(batch.id)) throw new Error('OpenAI corpus API did not return a valid file-batch ID.');

  let current = batch;
  for (let attempt=0; current.status === 'in_progress' && attempt < maxPolls; attempt++) {
    if (pollIntervalMs > 0) await new Promise(resolve=>setTimeout(resolve,pollIntervalMs));
    current = await request(fetcher,apiKey,`/vector_stores/${encodeURIComponent(vectorStoreId)}/file_batches/${encodeURIComponent(batch.id)}`);
  }
  if (current.status !== 'completed' || (current.file_counts?.failed || 0) > 0) {
    throw new Error(`OpenAI corpus indexing did not complete successfully (status: ${String(current.status || 'unknown')}).`);
  }
  return {vectorStoreId,documentCount:documents.length};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await publishAiCorpus();
    console.log(`Published ${result.documentCount} public curriculum documents to a ready vector store.`);
    console.log(`Configure OPENAI_VECTOR_STORE_ID as a server-side Worker runtime variable: ${result.vectorStoreId}`);
    console.log('A later corpus update creates a new store; switch the runtime variable only after it is ready, then remove the old store after cutover.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'OpenAI corpus publishing failed.');
    process.exitCode = 1;
  }
}
