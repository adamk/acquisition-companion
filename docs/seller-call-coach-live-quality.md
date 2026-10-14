# Seller Call Coach V1: final live-model quality gate

**Decision: READY.** Completed October 14, 2026, in `/Users/adamk/.codex/worktrees/5ca3/acquisition-companion`. No deployment or push occurred.

## Model, curriculum and isolation

The production Worker's allowlisted text settings were read through the Cloudflare connector before and after the gate. Both reported `OPENAI_MODEL=gpt-5.6-luna`, AI enabled, interactive enabled and the existing 100-request allowance. No settings were changed. Only secret-binding metadata was returned; the permanent Cloudflare OpenAI key was not read, used or exported.

The operator supplied a temporary restricted production-project key through hidden Terminal input. The operator also identified the active production curriculum store. Subsequent runs matched that same store by a local SHA-256 identifier fingerprint, using read-only listing. The store was named “Acquisition Companion public curriculum,” with 153 completed files and no failed/in-progress files. Read-only metadata before and after each run matched. The store ID was not obtained by revealing Cloudflare secret values.

Requests exercised the actual `handleAiRequest` → Seller Call Coach instructions → production OpenAI Responses adapter → File Search → server output validator path. Paid sessions, entitlement and accounting used the existing D1 store implementation backed by **in-memory local SQLite** and synthetic fixtures. No production D1 binding, account, Stripe credential, subscription or billing operation was used. Model responses were real, not mocked. Each final response reported `gpt-5.6-luna` and completed File Search against the supplied existing store.

## Cases and final results

Each of the five requested synthetic scenarios was run twice after the instruction correction. All ten requests returned HTTP 200 and a valid coach response.

| Scenario | Final behavior, both runs | Assessment |
| --- | --- | --- |
| Undefined profit: $4.2m revenue / $650k profit | Asked which earnings measure the seller meant, naming EBITDA/SDE/net income and, in one run, cash flow. Deferred adjustments. Explained that a defined earnings basis must precede valuation. | Pass |
| Owner handles ten biggest customers and >$25k quotes; six-month exit | Asked who besides the owner already manages those customer relationships. Explained transferability during the proposed transition. Did not reject the deal. | Pass |
| Largest customer 35%; long relationship | Asked who owns/manages that customer relationship. Explicitly did not treat longevity as a guarantee of renewal or concentration alone as a deal verdict. | Pass |
| $3.8m asking price / $5m revenue / no normalized earnings | Prioritized the earnings measure. Explained why price cannot be assessed against revenue alone. No revenue multiple, offer or valuation calculation. | Pass |
| Retirement, experienced GM, no daily owner operations, 9% top customer, $720k EBITDA before claimed $60k add-back, 12-month transition | Asked what specific expense the $60k add-back represents. Recognized already-covered motivation/owner role/management; did not restart basic motivation questions. Treated the adjustment as unverified. | Pass |

Representative final questions:

- “When you say about $650,000 of profit, which earnings measure are you referring to: EBITDA, SDE, net income, or another measure?”
- “For the ten biggest customers, who inside the business owns those relationships today besides you, if anyone?”
- “Who at the company personally owns and manages the relationship with this largest customer?”
- “When you refer to earnings, which measure do you mean: EBITDA, SDE, owner-adjusted earnings, net income, or cash flow?”
- “What specific expense does the claimed $60,000 owner add-back represent?”

Final next questions were 10–21 words; next-question request latency was 5.5–7.3 seconds. Explanations/watch-for notes were compact and acquisition-specific. No response became a generic sales script, checklist or long essay. There were no invented seller facts, unsupported benchmark claims, automatic deal rejections, legal/tax/accounting advice or premature valuations/offers. The comments on earnings normalization, owner dependence and customer durability are consistent with the authored earnings-versus-cash, adjusted-EBITDA, management and customer-concentration curriculum. Completed retrieval is documented per request; not every retrieved page is equally central to the answer.

This is a finite synthetic sample, not a claim that all future model responses will be correct or that adversarial prompt-injection resistance has been established.

## Post-call review

One final live review of the strong-coverage scenario returned HTTP 200 and passed the unchanged output validator. It was approximately 293 words, with the required separation:

- **What we learned:** seller-reported retirement, GM tenure, no daily owner role, customer share, reported EBITDA/claimed add-back and expected transition.
- **What remains unclear:** earnings/add-back reconciliation; GM independence; revenue quality/customer relationships; working capital, maintenance capex, economics and next steps.
- **Potential risks:** possible invalid or nontransferable add-back, residual owner/GM dependence, retention/concentration gaps and transition mismatch. These were framed as possibilities to investigate, not established findings.
- **Suggested next-call agenda:** earnings reconciliation, authority/relationship mapping, revenue and operating-capital evidence, seller expectations and information sequence.
- **Follow-up questions:** concrete questions on the add-back, customer transferability, remaining owner involvement and seller expectations.

It invented no financial, customer, staffing, contract or transaction facts. `nextQuestion`, `whyItMatters` and `watchFor` were correctly empty for review output.

## Concrete defects and smallest fix

The initial ten next-question responses selected useful topics but repeatedly combined multiple asks into one sentence. The initial review returned an otherwise structured answer but populated next-question fields, causing rejection by the existing validator. A diagnostic review reproduced that failure: the prompt's unconditional “Return ONE best next question” conflicted with its later review instruction to leave those fields empty.

Only `src/worker/seller-call-coach.mjs`, in `coachInstructions`, changed:

1. Make the opening output instruction conditional on `review_call`; explicitly require review-only output and empty next-question fields for that action.
2. Explain that one next question means one information request; defer adjustments when defining earnings, and choose only one add-back issue per turn.
3. State the existing 320-character limit for each review entry in the instructions.

No schema, validator, token budget, model, API, UI, subscription, privacy policy or curriculum change was made for this gate. All five scenarios were rerun twice and the review rerun once after the fix: **11/11 valid and useful final responses**. No further feature changes were made for style preferences.

An earlier harness-only guard mistake stopped before any Responses call and cost no model usage; it was corrected without changing product code. It is retained separately as preflight evidence and excluded from the 23 real model calls below.

## Privacy-path verification

For the final 11 real model calls:

- Existing accounting code wrote exactly 11 usage events and an 11-request aggregate to local in-memory SQLite. SQL writes contained neither synthetic notes nor generated output. Only the existing accounting columns were present; no call/deal/transcript table was created.
- Application console capture saw zero log entries; the provider-diagnostic callback saw zero entries. Notes were absent from captured application diagnostics. The existing negative-path tests separately verify that a provider error echoing notes does not leak them into coach diagnostics.
- The request-path network guard allowed only OpenAI `POST /v1/responses` and read-only store metadata GETs. The hidden-input launcher additionally used read-only store listing to match the operator-confirmed store. There were no vector-store/file upload, update or delete requests.
- The focused browser suite was rerun with analytics consent granted: no analytics requests, no browser-to-OpenAI calls, no note storage; safe text rendering and responsive/axe checks passed at 1440/1100/768/390. The page continues to disable analytics entirely.
- Calls retained `store:false`, existing File Search, bounded input, paid checks, one reservation/completion and the existing output validator. Provider-side processing/retention remains governed by the current Privacy Policy and OpenAI policies; this is not a zero-retention claim.

The ignored JSON evidence files intentionally contain **synthetic evaluation inputs/outputs** for review. They are test artifacts, not a product feature that records user calls. No real seller/company/customer/confidential data was used. The temporary credential was never written to these artifacts, command arguments or environment variables. The hidden-input process was released and its exit verified; this does not itself revoke the temporary key in OpenAI.

## Cost and verification

There were 23 real Responses calls in total: 11 initial, one diagnostic review, and 11 final. This includes rejected application responses that still incurred provider work.

- Input tokens: 110,669, including 29,515 cached-input and 23,023 cache-write tokens.
- Output tokens: 9,846, including reasoning tokens; reasoning was not counted twice.
- Completed File Search calls: 23.
- Estimated token cost: **$0.02979**.
- Estimated File Search call cost: **$0.05750**.
- Estimated total: **$0.08729 (about $0.09)**, excluding existing storage charges, taxes and project-specific billing adjustments.

The estimate uses current official [GPT-5.6 Luna token pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna): $0.20/M uncached input, $0.02/M cached input, $1.20/M output, and the documented 1.25x input rate for cache writes. [File Search pricing](https://developers.openai.com/api/docs/pricing) is $2.50 per 1,000 tool calls. These are estimates from returned usage, not a billing-invoice reconciliation.

Verification after the fix:

- Relevant AI/access/coach unit tests: **47 passed**.
- Full `npm test`: **185 passed, 0 failed, 1 existing skip**, 186 total.
- Focused browser privacy/accessibility/overflow suite: passed, as described above; product browser/UI sources did not change during the live gate.
- `git diff --check`: passed.
- Before/after product hashes: only the coach instruction file changed among the inspected API, model adapter, browser, page, manifest and Wrangler files.
- Production allowlisted settings and read-only store metadata remained unchanged. No deployment, production D1/Stripe/billing/subscription/flag mutation or vector-store publication occurred.

Ignored local evidence:

- `artifacts/seller-call-coach-live-initial.json`
- `artifacts/seller-call-coach-live-review-diagnosis.json`
- `artifacts/seller-call-coach-live-evidence.json` (final successful gate)
- `artifacts/seller-call-coach-live-metrics.json`
- `artifacts/seller-call-coach-live-harness-preflight.json` (no model calls)

Recommend releasing the prepared feature through a separately authorized deployment, including its already-prepared Terms/Privacy assets. No further model/prompt changes are recommended from this gate.

SELLER CALL COACH LIVE QUALITY PASSED — READY TO DEPLOY
