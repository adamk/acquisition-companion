# Seller Call Coach V1: local review report

Prepared October 14, 2026. No deployment, push, corpus publication, remote migration or infrastructure mutation was performed.

Subsequent live-model validation is recorded in [the final live quality report](./seller-call-coach-live-quality.md). The initial validation limitations below describe the pre-live-gate state; the live gate passed after a narrow coaching-instruction correction.

## Base and scope

The native worktree was created clean from freshly fetched `origin/main`, commit `ab093489a3603d705890dae30bf6b738591a1e4c`, at `/Users/adamk/.codex/worktrees/5ca3/acquisition-companion`. The original `paid-access-staging` checkout and its unrelated edits were preserved. Changes remain uncommitted for review.

Public U.S. beta eligibility, $19/month and $190/year prices, 100-request UTC monthly allowance, account/auth code, Stripe, D1 schema and store, webhooks, production configuration, authored curriculum and citation manifest are unchanged. There are no new dependencies. Existing Ask the Course, Deal Lab and IC Challenge behavior remains covered by the original tests.

## Architecture and flow

`/ai/call-coach/` is a dedicated page under the paid AI Deal Lab workspace. A link in the existing mode rail remains visible on mobile; pricing includes one feature mention. A dedicated page keeps live notes, call coverage and the next question visible without putting call state into the existing conversation/case UI.

1. The page checks existing AI availability and account entitlement. A signed-out or non-entitled visitor can inspect the interface but cannot request coaching. The API independently enforces paid access.
2. The user types short, non-confidential summaries (up to 4,000 code points, also bounded by the existing 12 KiB request limit). No input event sends notes anywhere.
3. Nine conceptual call areas use Not discussed, Partially understood or Clear enough for now. The coach can recommend coverage; explicit user selections take precedence. Coverage is not verification.
4. “What should I ask next?” sends the current notes, coverage and up to three recent questions through `/api/ai` with mode `seller_call_coach` and action `next_question`. It returns one question, a short why and optional watch-for note.
5. “Review this call” uses action `review_call` on that same path. It returns what was learned, remaining uncertainties, potential risks to investigate, next-call agenda and follow-up questions. An email outline was omitted from V1.
6. Question and review retain independent sources and freshness warnings. Editing notes during an in-flight request does not apply stale coverage suggestions. Clear call confirms removal, aborts the client request and discards late responses. Reload/navigation clears call state.

Desktop/laptop use side-by-side notes and a prominent next-question card. At tablet/mobile widths the question appears first. Coverage and review follow below. Keyboard controls, labels, status/error announcements and a clear-call confirmation dialog are included.

## Coaching behavior

The narrow policy covers seller introductory/qualification calls only. It prioritizes ambiguous earnings, owner dependence, customer transfer/concentration, management depth, motivation, revenue quality, transition, economic expectations, working capital, capital expenditure and missing evidence. It distinguishes revenue, gross profit, EBITDA, SDE, adjusted earnings, net income and cash flow. It prohibits premature offers/valuation from undefined profit, deceptive financing statements, invented facts and legal/tax/accounting advice. Verbal claims remain seller-reported and unverified. Creator heuristics and examples are not universal benchmarks.

Small deterministic attention cues identify the five required fixture situations; the model chooses the actual question. Exact question wording is not hard-coded. Strict output schemas and bounded server-side validation reject malformed or excessive outputs. Model prose is rendered with text nodes only. Retrieved curriculum citations are allowlisted by the existing server mapper and validated again in the browser.

## Privacy and security

All call content lives only in page memory: no localStorage, sessionStorage, IndexedDB or server-side deal record. There is no audio, recording, speech-to-text, uploaded transcript, file/document input or dormant capture code. The page disables analytics entirely, even if consent was previously granted.

Only an explicit coaching/review action sends notes to the server and OpenAI. The existing Responses adapter uses `store:false` and existing curriculum File Search. No notes enter the vector store. `store:false` is not a guarantee of provider zero retention; the original caveat and information restrictions remain in place. See the official [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) and [structured output documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

The shared API retains same-origin/content-type/body-size/rate limits, authenticated paid access, private no-store responses and server-side OpenAI calls. Coach provider diagnostics contain only fixed workflow/action labels, HTTP status and empty provider-text fields, preventing a provider error that echoes notes from entering application logs. Usage writes contain only existing accounting metadata. Browser error messages do not display raw server/provider errors. No automatic retry can silently spend another request.

## Metering

Both actions require the existing active `ai_deal_lab` grant, even when the general AI paywall flag is disabled. Both reserve once and complete accounting once through the current usage store. The existing 100-request quota is shared with all other modes. Invalid, denied and rate/quota-limited attempts do not reserve usage; calls that reach the AI path count even if the model times out or returns invalid output. No new plan or subscription exists.

## Validation

Final build used Node 22.23.0, `SITE_URL=https://acquisitioncompanion.com` and a public test analytics ID (`G-COACHTEST1`). These were local build environment values only, not production setting changes. Browser provider/billing endpoints are mocked; the analytics test intercepts Google traffic. No production paid account, Stripe operation or live OpenAI generation was used.

| Check | Result |
| --- | --- |
| Baseline `npm test` | 172 passed, 0 failed, 1 existing skip |
| Final full unit suite (also part of `npm run build`) | 185 passed, 0 failed, 1 existing skip; 186 total |
| Paid/auth/AI/coach focused unit run | 58 passed, including real SQL coach accounting and 100-request quota |
| Five behavioral attention fixtures | All passed: undefined profit, owner-held customer relationships, concentration, price before earnings, adequate coverage |
| Astro check/build | Passed; 0 errors, 0 warnings, 1 existing hint in unchanged `tests/paid-services.test.mjs` |
| Pagefind | Passed, 253 indexed pages |
| Links/privacy/static-output checks | Passed, 11,968 internal links, 253 pages, 547 files |
| General browser suite | Passed, 39 routes, zero axe violations or browser errors; 390/768/1440 responsive checks |
| Existing AI browser suite | Passed, all three original modes, 32 mocked questions, zero axe violations/browser errors/direct OpenAI requests |
| Paid-access browser suite | Passed, 390/768/1440, zero axe violations/errors/external requests |
| Analytics browser suite | Passed with a configured test measurement ID: denial, consent, persistence, preferences and existing events; also passed without an ID |
| Seller Call Coach browser suite | Passed at 1440/1100/768/390; zero axe violations/overflow/browser errors/external requests with analytics consent granted |
| Coach browser contracts | Paid gates, single next question/review, plain-text XSS safety, citation URL safety, manual overrides, edits during requests, independent freshness/provenance, clearing/reload, no browser storage/analytics/provider calls passed |
| Local workerd/D1 runtime suite | Passed, existing account, billing/webhook mocks, atomic quotas, expiry and accounting |
| Credential scan | 282 changed/static text files scanned for key/token/private-key patterns; no findings. Static validator also rejects server-only AI endpoint/key markers |
| `git diff --check` | Passed |
| `npm run deploy:worker:dry-run` | Passed; no deployment |
| Preservation diff | Curriculum, corpus manifest, Wrangler configuration, migrations, lockfile, paid-product/auth/access/store/Stripe files unchanged from origin/main |

The existing skipped test needs local-only private research audit files absent from a clean public checkout. The single inherited Astro hint suggests an async-function style change in an unchanged test. The initial no-`SITE_URL` browser run correctly detected local noindex output; the production-like rebuild passed. The initial privacy regex false positive was resolved without weakening the retention warning.

A fresh reviewer found two P2 issues: cross-action freshness warnings and source attribution. Both were reproduced with a failing browser regression, fixed, and verified green with the full build and final browser suites. No review findings remain open. No separate second review was requested after the regression-backed fixes.

## Limits of this evidence

The attention fixtures verify prioritization cues and request policy, and mocked provider outputs verify application contracts. They do not establish live-model coaching quality, prompt-injection resistance or production provider behavior. A synthetic live-model evaluation is a sensible separately authorized pre-release check. The new UI has not been deployed or tested on the production provider/account.

Locked dependency installation reported five high-severity dependency audit findings already present in the unchanged lockfile. No dependency remediation or upgrade was included in this feature.

## Terms, Privacy, RAG and V2

Terms and Privacy have minimal accurate updates for session-only coaching and shared metering; deploy these pages together with the feature if approved. Pricing and the AI workspace also need their prepared static assets. The Worker bundle changes for coach handling, but no new binding, secret, route configuration, migration or infrastructure resource is needed.

RAG uses the current vector store and authored curriculum unchanged. The build regenerates the existing local corpus as its normal check but produces no tracked corpus diff. No corpus publication occurred or is required for V1.

V2 is documented in `docs/seller-call-coach-v2.md` only: explicit user-controlled ephemeral transcription, preferably on-device where practical, with server-mediated streaming otherwise, short-lived scoped authorization, bounded memory buffers and no audio retention. Consent/jurisdiction/legal review, capture support, provider retention, security, transcript uncertainty, cost/minute limits and reconnection behavior must be resolved before implementation. V1 contains none of this capture code.

## Exact files changed

Modified:

- `package.json`
- `src/pages/ai/index.astro`
- `src/pages/pricing.astro`
- `src/pages/privacy.astro`
- `src/pages/terms.astro`
- `src/styles/ai-lab.css`
- `src/worker/ai-api.mjs`
- `src/worker/openai.mjs`

Added:

- `docs/seller-call-coach-v1-review.md` (this report)
- `docs/seller-call-coach-v2.md`
- `docs/superpowers/plans/2026-10-14-seller-call-coach.md`
- `scripts/browser-call-coach-check.mjs`
- `src/lib/seller-call-coach.mjs`
- `src/pages/ai/call-coach/index.astro`
- `src/scripts/call-coach.ts`
- `src/styles/call-coach.css`
- `src/worker/seller-call-coach.mjs`
- `tests/fixtures/seller-call-scenarios.mjs`
- `tests/seller-call-behavior.test.mjs`
- `tests/seller-call-coach.test.mjs`

Ignored, local-only screenshots: `artifacts/call-coach-{1440,1100,768,390}.png`. Build and runtime artifacts remain ignored.

SELLER CALL COACH V1 READY FOR REVIEW
