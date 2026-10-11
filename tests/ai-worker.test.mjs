import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../src/worker/index.mjs';

test('the Worker handles its API and delegates static site paths to the Assets binding',async()=>{
 const requests=[];
 const env={ASSETS:{async fetch(request){requests.push(new URL(request.url).pathname);return new Response(`static:${new URL(request.url).pathname}`);}}};
 const api=await worker.fetch(new Request('https://acquisitioncompanion.com/api/ai',{method:'POST',headers:{Origin:'https://acquisitioncompanion.com','Content-Type':'application/json'},body:'{}'}),env);
 assert.equal(api.status,503);
 assert.equal((await api.json()).error.code,'interactive_disabled');
 const page=await worker.fetch(new Request('https://acquisitioncompanion.com/ai/'),env);
 assert.equal(await page.text(),'static:/ai/');
 assert.deepEqual(requests,['/ai/']);
});

test('production Wrangler config preserves the live paid-beta gates without embedding runtime secrets',()=>{
 const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
 assert.equal(config.main,'src/worker/paid-production-index.mjs');
 assert.deepEqual(config.assets,{directory:'./dist',binding:'ASSETS',run_worker_first:['/api/*'],not_found_handling:'404-page'});
 assert.equal(config.keep_vars,true);
 assert.equal(config.vars.AI_INTERACTIVE_ENABLED,'true');assert.equal(config.vars.AI_PAYWALL_ENABLED,'true');assert.equal(config.vars.AUTH_SIGNIN_ENABLED,'true');assert.equal(config.vars.BILLING_ENABLED,'true');assert.equal(config.vars.AUTH_MAIL_ENABLED,'false');assert.equal(Object.hasOwn(config.vars,'OPENAI_API_KEY'),false);assert.equal(Object.hasOwn(config.vars,'OPENAI_VECTOR_STORE_ID'),false);assert.equal(Object.hasOwn(config.vars,'OPENAI_MODEL'),false);
 const mailer=JSON.parse(fs.readFileSync('wrangler.mailer-production.example.json','utf8'));
 assert.equal(mailer.name,'acquisition-companion-mailer-production');assert.equal(mailer.vars.AUTH_MAIL_ENABLED,'true');assert.equal(mailer.workers_dev,false);assert.equal(mailer.preview_urls,false);
 assert.deepEqual(config.ratelimits.map(binding=>binding.name),['AI_SESSION_LIMITER','AI_IP_LIMITER','AI_EDGE_LIMITER']);
 assert.equal(new Set(config.ratelimits.map(binding=>binding.namespace_id)).size,3);
 for(const binding of config.ratelimits){assert.match(binding.namespace_id,/^\d+$/);assert.ok(Number(binding.namespace_id)>0);}
 const example=fs.readFileSync('.dev.vars.example','utf8');
 assert.match(example,/^AI_INTERACTIVE_ENABLED=false$/m);
 assert.match(example,/^AI_ENABLED=false$/m);
 assert.match(example,/OPENAI_API_KEY=replace-with-/);
 assert.match(example,/OPENAI_VECTOR_STORE_ID=vs_replace_with_/);
 assert.equal(example.includes('sk-'),false);
});
