import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

async function loadCases() {
  const imported = await import('../src/lib/ai-cases.mjs').catch(() => null);
  assert.equal(typeof imported?.getCase, 'function', 'deterministic synthetic case engine is available');
  return imported;
}

test('case cards expose three original practice levels without exposing rubrics', async () => {
  const {listCaseCards} = await loadCases();
  const cards = listCaseCards();
  assert.deepEqual(cards.map(card=>card.difficulty).sort(), ['advanced','beginner','intermediate']);
  assert.equal(new Set(cards.map(card=>card.id)).size, cards.length);
  for (const card of cards) {
    assert.equal(Object.hasOwn(card,'rubric'),false);
    assert.equal(Object.hasOwn(card,'financials'),false);
    assert.equal(Object.hasOwn(card,'stages'),false);
  }
});

test('the Astro case-card data stays aligned with the server case definitions', async () => {
  const {listCaseCards} = await loadCases();
  const cardPath = path.join(process.cwd(),'src/data/ai-case-cards.json');
  assert.ok(fs.existsSync(cardPath),'public case-card data exists');
  const publicCards = JSON.parse(fs.readFileSync(cardPath,'utf8'));
  const serverCards = listCaseCards();
  assert.deepEqual(publicCards.map(({id,title,difficulty,industry,description,label})=>({id,title,difficulty,industry,description,label})),serverCards);
  for (const card of publicCards) {
    for (const forbidden of ['financials','stages','rubric','teachingObjectives','lessonRefs']) assert.equal(Object.hasOwn(card,forbidden),false,`${card.id} does not expose ${forbidden}`);
  }
});

test('each case has balanced sources and uses and deterministic hand-checked arithmetic', async () => {
  const {listCaseCards,calculateCase} = await loadCases();
  const expected = {
    'bluejay-field-services': {normalizedEbitda:440000,normalizedMultiple:5,workingCapitalShortfall:35000,totalUses:2310000,totalSources:2310000,totalDebt:1550000,totalLeverage:3.52,seniorDebtService:256757,totalDebtService:280757,baseCashAvailable:315000,baseCoverage:1.12,downsideEbitda:320000,downsideCashAvailable:210000,downsideCoverage:0.75,rolloverOwnershipPct:0,pikAccrual:0},
    'aster-forge-components': {normalizedEbitda:1280000,normalizedMultiple:5.5,workingCapitalShortfall:180000,totalUses:7470000,totalSources:7470000,totalDebt:4100000,totalLeverage:3.2,seniorDebtService:635810,totalDebtService:698810,baseCashAvailable:850000,baseCoverage:1.22,downsideEbitda:920000,downsideCashAvailable:610000,downsideCoverage:0.87,rolloverOwnershipPct:10,pikAccrual:0},
    'ternbridge-route-logistics': {normalizedEbitda:2460000,normalizedMultiple:7.5,workingCapitalShortfall:350000,totalUses:19350000,totalSources:19350000,totalDebt:10500000,totalLeverage:4.27,seniorDebtService:1168651,totalDebtService:1388651,baseCashAvailable:1740000,baseCoverage:1.25,downsideEbitda:1990000,downsideCashAvailable:1400000,downsideCoverage:1.01,rolloverOwnershipPct:16.9,pikAccrual:140000},
  };
  for (const card of listCaseCards()) {
    const result = calculateCase(card.id);
    const want = expected[card.id];
    assert.ok(want, `expected arithmetic fixture exists for ${card.id}`);
    assert.equal(result.normalizedEbitda,want.normalizedEbitda,card.id);
    assert.equal(result.valuation.normalizedMultiple,want.normalizedMultiple,card.id);
    assert.equal(result.workingCapitalShortfall,want.workingCapitalShortfall,card.id);
    assert.equal(result.sourcesAndUses.uses.total,want.totalUses,card.id);
    assert.equal(result.sourcesAndUses.sources.total,want.totalSources,card.id);
    assert.equal(result.sourcesAndUses.imbalance,0,card.id);
    assert.equal(result.totalDebt,want.totalDebt,card.id);
    assert.equal(result.totalLeverage,want.totalLeverage,card.id);
    assert.equal(result.annualDebtService.senior,want.seniorDebtService,card.id);
    assert.equal(result.annualDebtService.total,want.totalDebtService,card.id);
    assert.equal(result.baseCashFlow.available,want.baseCashAvailable,card.id);
    assert.equal(result.baseCashFlow.coverage,want.baseCoverage,card.id);
    assert.equal(result.downsideCashFlow.ebitda,want.downsideEbitda,card.id);
    assert.equal(result.downsideCashFlow.available,want.downsideCashAvailable,card.id);
    assert.equal(result.downsideCashFlow.coverage,want.downsideCoverage,card.id);
    assert.equal(result.equityCapitalization.sellerRolloverPct,want.rolloverOwnershipPct,card.id);
    assert.equal(result.mezzanine.pikAccrual,want.pikAccrual,card.id);
  }
});

test('case stages reveal facts monotonically and hidden rubric references real public facts', async () => {
  const {listCaseCards,getCase,visibleFacts,answerFor} = await loadCases();
  for (const card of listCaseCards()) {
    const scenario = getCase(card.id);
    assert.ok(scenario.teachingObjectives.length >= 3);
    assert.ok(scenario.rubric.length >= 4);
    const allFactIds = new Set(scenario.stages.flatMap(stage=>stage.facts.map(fact=>fact.id)));
    for (const item of scenario.rubric) for (const factId of item.factIds) assert.ok(allFactIds.has(factId), `${card.id} rubric references ${factId}`);
    for (let stage=1; stage<=scenario.stages.length; stage++) {
      const facts = visibleFacts(card.id,stage);
      assert.deepEqual(facts.map(fact=>fact.id),scenario.stages.slice(0,stage).flatMap(item=>item.facts.map(fact=>fact.id)));
    }
    assert.ok(answerFor(card.id).calculations.sourcesAndUses.imbalance === 0);
  }
});

test('case arithmetic context contains only calculations supported by facts already revealed', async () => {
  const {visibleCalculations} = await loadCases();
  const beginnerFirst = visibleCalculations('bluejay-field-services',1);
  assert.equal(beginnerFirst.reportedMultiple,5.24);
  assert.equal(Object.hasOwn(beginnerFirst,'normalizedEbitda'),false);
  assert.equal(Object.hasOwn(beginnerFirst,'sourcesAndUses'),false);
  assert.equal(Object.hasOwn(beginnerFirst,'downsideCashFlow'),false);
  const beginnerEarnings = visibleCalculations('bluejay-field-services',2);
  assert.deepEqual(Object.keys(beginnerEarnings.normalization),['addbacks','deductions','normalizedEbitda']);
  assert.equal(Object.hasOwn(beginnerEarnings.normalization,'addbackDetails'),false);
  const intermediateFunding = visibleCalculations('aster-forge-components',3);
  assert.equal(intermediateFunding.normalizedEbitda,1_280_000);
  assert.equal(intermediateFunding.sourcesAndUses.imbalance,0);
  assert.equal(Object.hasOwn(intermediateFunding,'downsideCashFlow'),false);
  const advancedDownside = visibleCalculations('ternbridge-route-logistics',4);
  assert.equal(advancedDownside.downsideCashFlow.ebitda,1_990_000);
  assert.equal(advancedDownside.downsideCashFlow.coverage,1.01);
});

test('every case points only to existing curriculum pages and unknown case IDs fail closed', async () => {
  const {listCaseCards,getCase,calculateCase,visibleFacts} = await loadCases();
  for (const card of listCaseCards()) {
    for (const page of getCase(card.id).lessonRefs) {
      const match = page.url.match(/^\/(course|topics)\/([a-z0-9-]+)\/$/);
      assert.ok(match,`${card.id} has a local lesson/topic path`);
      const collection = match[1] === 'course' ? 'lessons' : 'topics';
      assert.ok(fs.existsSync(path.join(process.cwd(),'src/content',collection,`${match[2]}.md`)),page.url);
    }
  }
  assert.throws(()=>getCase('real-company'),/Unknown synthetic case/);
  assert.throws(()=>calculateCase('real-company'),/Unknown synthetic case/);
  assert.throws(()=>visibleFacts('bluejay-field-services',99),/stage/i);
});
