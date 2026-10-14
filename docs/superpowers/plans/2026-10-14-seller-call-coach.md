# Seller Call Coach V1

The supplied product brief is the implementation specification. Build locally from origin/main; do not deploy or publish a corpus.

## Design

Use `/ai/call-coach/` for a focused laptop workspace with notes and the next question side by side and compact, overridable call-goal coverage. Link from AI Deal Lab and pricing. Keep the three existing modes intact.

Extend the existing `/api/ai` path with `seller_call_coach` and `next_question` / `review_call` actions. Force existing paid access even if the general AI paywall flag is off. Share bounded JSON parsing, same-origin checks, rate limits, provider adapter, quota reservation and completion accounting. Never store content. Use a strict coach output schema, bounded server validation and safe text rendering.

Notes, coverage, recent questions and review live only in page memory, clear on reload, explicit reset and page exit. No local/session storage, analytics, recording, uploads or deal files. Send only on an explicit action; use `store:false` and existing curriculum File Search. Suppress analytics entirely on this page. Retain the existing provider-retention caveat.

## Tasks and acceptance

1. Establish clean baseline and add failing API tests for paid gates, exact accounting, invalid input, provider failures and coaching/review contracts.
2. Implement isolated coach policy/schema/validation and hook it into the shared API/provider path without changing existing mode behavior.
3. Add the focused workspace, clear session state, override coverage, explicit send/review/reset controls, safe output, access/error/timeout handling and responsive styling.
4. Add minimal AI workspace/pricing discovery and accurate Terms/Privacy updates. Document V2 design questions only.
5. Add behavioral prioritization fixtures and browser tests covering access, input, XSS, no storage/analytics/external AI, review, overrides, in-flight edits, reset and responsive axe/overflow checks.
6. Run full unit/build/Pagefind/link/privacy/browser/AI/paid/analytics/coach/credential/diff/Wrangler dry-run checks. Record actual outcomes and changed files in the review report. Do not deploy.

## Review focus

Fail closed when paid configuration is disabled; avoid serializing notes into diagnostics, D1, URLs or analytics; do not treat provider fixtures as proof of live model behavior. Preserve manual coverage overrides while requests are pending. Drop stale responses after reset/navigation. Keep existing authored corpus and infrastructure byte-for-byte unchanged.
