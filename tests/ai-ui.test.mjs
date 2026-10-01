import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page=fs.readFileSync('src/pages/ai/index.astro','utf8');
const client=fs.readFileSync('src/scripts/ai-lab.ts','utf8');
const privacy=fs.readFileSync('src/pages/privacy.astro','utf8');

test('the public AI page exposes three modes, a fictional-deal warning, and no upload control',()=>{
 for(const text of ['Ask the Course','Deal Lab','IC Challenge','Practice with fictional deals','confidential, proprietary, personal, or non-public deal information','/privacy/#ai-deal-lab'])assert.ok(page.includes(text),text);
 assert.equal(/<input[^>]+type=["']file/i.test(page),false);
 assert.equal(page.includes('CIM upload'),false);
 assert.match(page,/data-case-cards=/);
 assert.match(page,/aria-live="polite"/);
 assert.match(page,/data-pagefind-ignore/);
});

test('model content is built as text and conversations are not persisted',()=>{
 assert.equal(client.includes('innerHTML'),false);
 assert.match(client,/textContent\s*=\s*text/);
 assert.equal(client.includes('localStorage'),false);
 assert.match(client,/sessionStorage\.setItem\(key,value\)/);
 assert.equal(/sessionStorage\.setItem\([^,]*(?:history|conversation|message|prompt)/i.test(client),false);
 assert.match(client,/history:trimHistory\(\)/);
 assert.match(client,/AbortController/);
 assert.match(client,/fetchJsonWithTimeout\('\/api\/ai'/);
 assert.match(client,/await response\.json\(\)/);
 assert.match(client,/fetchJsonWithTimeout\('\/api\/ai\/status'/);
 assert.match(client,/},8_000\)/);
});

test('privacy page describes OpenAI processing without promising zero retention',()=>{
 for(const text of ['Optional AI Deal Lab','OpenAI','store: false','does not intentionally maintain a server-side chat history','not a zero-retention guarantee','no private deal-document, CIM, or data-room uploads','does not receive question text, answer text','completion status'])assert.ok(privacy.toLowerCase().includes(text.toLowerCase()),text);
 assert.equal(/zero retention is guaranteed|zero-retention guarantee\s*\./i.test(privacy),false);
});
