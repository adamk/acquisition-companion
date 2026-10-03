import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');

test('homepage introduces acquisition entrepreneurship and its audience without promising superior outcomes',()=>{
 const home=read('src/pages/index.astro'),hero=home.match(/<section class="hero">([\s\S]*?)<aside/)[1];
 assert.match(hero,/Buy an existing business\.<br\/>Build from there\./);
 for(const phrase of ['Starting a company from scratch','existing profitable business','customers, employees, revenue and operating history','does not remove them','Existing profit needs validation','first-time buyers','operators considering growth by acquisition','finance professionals'])assert.ok(hero.includes(phrase),phrase);
 assert.ok(hero.indexOf('Starting a company from scratch')<hero.indexOf('href="/start-here/"'));
 assert.ok(hero.indexOf('href="/start-here/"')<hero.indexOf('href="/course/"'));
 assert.doesNotMatch(hero,/easier than|safer than|likely to succeed|fast path to wealth|build an empire|IPO Capital|Buy Then Build/i);
 assert.doesNotMatch(home,/href="\/(?:pricing|account|ai)\//,'homepage keeps learning as the primary experience');
});

test('Start Here offers one conceptual comparison and retains its existing seven-step learning path',()=>{
 const start=read('src/pages/start-here.astro');
 const comparison=start.match(/<section aria-labelledby="buy-vs-build-heading">([\s\S]*?)<\/section>/)[1];
 for(const phrase of ['Starting from scratch','Buying an existing business','historical financials','working toward profitability','manage repayments','does not remove them','Valuation, leverage, diligence, management transition, integration and capital structure'])assert.ok(comparison.includes(phrase),phrase);
 assert.equal((start.match(/id="buy-vs-build-heading"/g)||[]).length,1);
 const steps=start.match(/<ol class="step-list">([\s\S]*?)<\/ol>/)[1];
 assert.equal((steps.match(/<li>/g)||[]).length,7);
 assert.match(start,/Existing profit is a starting point for investigation, not a guarantee/);
 assert.match(start,/<Sources ids=/,'existing public provenance remains available');
 assert.doesNotMatch(comparison,/easier than|safer than|likely to succeed|fast path to wealth|build an empire|IPO Capital|Buy Then Build|\d+%/i);
});

test('framing links reuse existing authored lessons rather than creating new acquisition claims or modules',()=>{
 const pages=read('src/pages/index.astro')+read('src/pages/start-here.astro');
 for(const slug of ['acquisition-entrepreneurship','choosing-a-target','earnings-versus-cash','building-the-capital-stack','diligencing-the-business','structuring-the-price','getting-to-completion','management-after-acquisition']){
  assert.ok(pages.includes(`href="/course/${slug}/"`),slug);
  assert.ok(fs.existsSync(`src/content/lessons/${slug}.md`),slug);
 }
 const lesson=read('src/content/lessons/acquisition-entrepreneurship.md');
 assert.match(lesson,/customers, employees and operating history/);
 assert.match(lesson,/does not guarantee/);
});
