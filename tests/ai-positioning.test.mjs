import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('AI workspace offers a compact secondary explanation without model-superiority or exclusive-capability claims',()=>{
 const page=fs.readFileSync('src/pages/ai/index.astro','utf8');
 const explanation=page.match(/<details class="ai-purpose">([\s\S]*?)<\/details>/)?.[1];
 assert.ok(explanation,'native disclosure stays separate from conversation rendering');
 assert.match(explanation,/<summary>Why not just use ChatGPT\?<\/summary>/);
 assert.match(explanation,/You absolutely can use a general AI assistant/);
 for(const term of ['valuation','financing','debt capacity','downside','diligence','structure','deterministic','curriculum','new buyers','IC practice'])assert.ok(explanation.includes(term),term);
 assert.match(explanation,/don’t claim a smarter underlying model or exclusive capabilities/);
 assert.ok(!explanation.includes('/pricing/'),'workspace explanation is not a sales CTA');
 const text=explanation.replace(/<[^>]+>/g,' ').trim();assert.ok(text.split(/\s+/).length<=120,'explanation stays concise');
 assert.match(page,/build their own M&amp;A prompts, models and learning framework from scratch/);
 // The pricing page is prepared on paid staging and is not deployed to production.
 if(fs.existsSync('src/pages/pricing.astro')){
  const pricing=fs.readFileSync('src/pages/pricing.astro','utf8');
  assert.match(pricing,/build their own M&amp;A prompts, models and learning framework from scratch/);
  assert.match(pricing,/do not claim a superior underlying AI model or exclusive analytical capabilities/);
 }
});
