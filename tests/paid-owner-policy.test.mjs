import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {supportEmail} from '../src/lib/paid-product.mjs';

const read=path=>fs.readFileSync(path,'utf8');
const terms=read('src/pages/terms.astro');
const privacy=read('src/pages/privacy.astro');
const product=read('src/lib/paid-product.mjs');

test('live Terms state the owner-approved beta offer and operating rules without draft gates',()=>{
 assert.doesNotMatch(terms,/<Base[^>]*\bnoindex\b/);
 for(const phrase of [
  'The Wired Nomad LLC','Acquisition Companion','publicly available','United States','18 or older',
  'paidProduct.monthlyUsd','paidProduct.annualUsd','paidProduct.monthlyRequestAllowance',
  'The course and source-linked educational material remain free',
  'interactive analysis','recurring','cancel recurring billing at any time through Manage billing',
  'already-paid billing period','generally non-refundable after access has been used',
  'except where required by applicable law','AI can make mistakes',
  'not legal, tax, accounting, investment or financing advice',
  'Do not submit confidential, proprietary, personal or non-public deal information',
  'supportEmail','/privacy/','independent educational product',
 ])assert.ok(terms.toLowerCase().includes(phrase.toLowerCase()),phrase);
 assert.match(product,/monthlyUsd:19/);assert.match(product,/annualUsd:190/);assert.match(product,/monthlyRequestAllowance:100/);
 assert.equal(supportEmail,'support@acquisitioncompanion.com');
 assert.doesNotMatch(terms,/not yet open|subscriptions are not open|review draft|legal review required|before launch|retention periods remain/i);
 assert.doesNotMatch(terms,/attorney approved|legal review completed|counsel approved/i);
});

test('live Privacy describes actual account, billing, AI, analytics and processor data flows',()=>{
 for(const phrase of [
  'The Wired Nomad LLC','email address','account UUID','hashes','sign-in challenge','15 minutes',
  'seven days','24 hours','Stripe customer','canonical subscription status','beta approval',
  'approval and revocation timestamps','operator labels','usage-event identifiers','Monthly aggregates','Stripe event IDs','90 days after completion',
  '13 months','current-month quota','in-flight','billing locks','60 seconds',
  'usage records do not store prompts, responses, deal facts or conversation history',
  'do not collect or store card numbers or card security codes','Stripe','Amazon Web Services SES','Cloudflare',
  'OpenAI','store: false','not a zero-retention guarantee','Google Analytics',
  'event timestamp, delivery event type and SES message identifier for 14 days',
  'consent','do not sell personal information','targeted advertising',
  '{supportEmail}','access, correction or deletion',
  'account deletion','retention practices are not controlled','12 months','applicable law',
 ])assert.ok(privacy.toLowerCase().includes(phrase.toLowerCase()),phrase);
 assert.doesNotMatch(privacy,/preparation notice|paid access is not yet open|retention periods remain|legal review required|no general retention period has been chosen/i);
 assert.doesNotMatch(privacy,/OpenAI guarantees zero retention|zero retention is guaranteed/i);
 assert.equal(supportEmail,'support@acquisitioncompanion.com');
});

test('retention policy and account-deletion runbook match the live cleanup boundary',()=>{
 const retention=read('docs/paid-retention-review.md'),deletion=read('docs/account-deletion-operations.md');
 assert.match(retention,/PAID_USAGE_RETENTION_DAYS=90/);
 assert.match(retention,/PAID_MONTHLY_USAGE_RETENTION_MONTHS=13/);
 assert.match(retention,/PAID_RETENTION_POLICY_APPROVED.*remain unset/i);
 assert.match(retention,/completed_at/);
 assert.match(retention,/current UTC month/i);
 assert.match(retention,/unfinished|in-flight/i);
 for(const phrase of ['verify account ownership','cancel','dispute','revoke','before-state','transaction','after-state','never manually create','processor'])assert.ok(deletion.toLowerCase().includes(phrase),phrase);
 assert.doesNotMatch(deletion,/DELETE FROM users(?! WHERE)/i);
 assert.match(deletion,/success IS NOT NULL AND completed_at IS NOT NULL/);
});

test('first-customer operations checklist treats Terms, Privacy and retention as settled owner policy',()=>{
 const ops=read('docs/paid-beta-launch-operations.md');
 assert.match(ops,/Terms and Privacy state the owner-approved live-beta policy/);
 assert.doesNotMatch(ops,/legal review required|retention periods remain unresolved|not legally approved/i);
 for(const phrase of ['public customer flow','customer signs in','u.s. attestation','stripe-hosted checkout','entitlement','usage','cancellation','webhook failures','stop and escalate'])assert.ok(ops.toLowerCase().includes(phrase),phrase);
 assert.match(ops,/manual account-approval procedure.*historical\/legacy/i);
 assert.doesNotMatch(ops,/approve Checkout only|approval as a normal onboarding step/i);
});
