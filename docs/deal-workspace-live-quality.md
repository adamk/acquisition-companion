# Deal Workspace V1 — final live-model quality gate

Decision: **PASSED — READY TO DEPLOY through a separately authorized release.** Completed October 27, 2026. No deployment, push, production paid-account request, production D1/Stripe/customer mutation or vector-store publication occurred.

## Model, credential and curriculum

Read-only Cloudflare Worker settings before and after the gate reported `OPENAI_MODEL=gpt-5.6-luna`, AI/interactive/paywall enabled and the existing 100-request allowance. Active Worker version remained `54b08152-47ec-4117-88af-0bb02693f12c`. The read returned allowlisted plaintext settings and secret-binding names only; the permanent Cloudflare OpenAI key was never retrieved, read, exported or used.

The operator entered a temporary restricted production-project key in a hidden Terminal prompt. It was held only in the launcher process and a private stdin pipe, never in chat, arguments, environment variables or credential files. The operator confirmed the matched existing production curriculum store. Its name was Acquisition Companion public curriculum, with 153 completed files and no failed/in-progress files. The previously confirmed store was matched by a SHA-256 ID fingerprint; the store ID is omitted from this report. Selected store metadata was unchanged before/after every run. Only Responses requests and existing-store metadata reads were permitted by the harness. No corpus upload, ingestion, publication or per-deal store creation occurred. The credential was released from the gate process when testing finished.

Every live request used the actual `handleAiRequest` → workspace instructions → OpenAI Responses/File Search adapter → strict result validator. Authenticated session, entitlement and accounting used the production D1 store implementation over **in-memory SQLite with synthetic users/subscriptions**. No production D1 binding or paid account was involved. All 46 provider responses reported `gpt-5.6-luna`, completed File Search and returned valid HTTP-200 structured output.

## Final accepted cases — two runs each

The accepted sample consists of the twelve non-funding responses from the final full seven-case pass plus two funding responses after the targeted funding-only correction. The last correction is conditional on entered financing amounts; cases 1–6 contain none, so only case 7 was rerun after it. Provenance and source hashes are retained per run.

| Case | Both accepted results | Decision |
| --- | --- | --- |
| 1. Undefined earnings: $4.2m revenue, $650k profit claim, unknown measure, $3.4m price; annual statements Received | Kept $650k as an undefined seller claim, asked which earnings measure it represents, and recommended reviewing/reconciling received accounts. Neither result called it EBITDA or used a multiple. Receipt was not equated with review. | Pass |
| 2. Unsupported $60k owner add-back: $720k adjusted EBITDA, $5m revenue, $3.1m price; statements Reviewed/support Requested | Preserved the reported adjusted-EBITDA basis and unsupported seller claim, asked about expense nature/recurrence/replacement and supporting reconciliation. Neither result silently increased earnings to $780k. Reviewed statements were qualified as user-reported. | Pass |
| 3. Customer concentration: 35% of revenue, 12-year relationship Clarified; concentration report Reviewed/contracts Not requested | Respected revenue as the known concentration denominator. Asked about relationship ownership, contracts, renewal/termination/transfer or retention. Did not treat longevity as protection or concentration as an automatic rejection. | Pass |
| 4. Owner dependence: retirement, six-month transition; owner manages five largest customers Clarified, GM operations Seller claim; org chart Received | Distinguished owner-held customer responsibilities from the GM's claimed operating role. Prioritized transferability and actual management authority; recommended reviewing received org information and clarifying roles. No automatic deal verdict. | Pass |
| 5. Conflicting revenue: $4.8m Seller claim / $4.45m Evidence seen / conflict Follow-up | Named both figures and their different reported sources, kept reconciliation open, and asked about periods/accounting basis/source accounts. Neither figure was selected as true. | Pass |
| 6. Good initial coverage: $6m revenue, $850k explicit EBITDA, $3.4m price, 9% customer, retiring seller, experienced GM, 12-month transition; key financial/customer evidence Reviewed, capex Received/WC Requested | Acknowledged existing initial coverage, retained the defined but unverified EBITDA basis, and pursued working-capital evidence, capex review or earnings reconciliation. Did not restart basic seller-motivation or concentration questions. No valuation conclusion was produced. Local deterministic utility safely calculated 4× from explicit inputs, but the model did not need to cite it. | Pass |
| 7. Price/structure without funding proof: $4m price, $2m debt, $500k equity, $500k seller financing | Both final responses explicitly totalled proposed sources at $3m, identified the $1m apparent price gap before fees/operating needs, and stated that numbers were not commitments or available funds. Requested source-specific status/availability evidence. | Pass |

The contradiction fixture preserves two separate statements/statuses and adds a third explicit follow-up ledger item documenting the unresolved discrepancy; no contradictory number is preselected as correct.

## Evidence-state fidelity and operational quality

The accepted responses maintained seller claims as unverified, clarified statements as conversational rather than documentary support, and evidence-seen/reviewed statuses as user reports. They did not say Acquisition Companion inspected or verified documents. Received information drove review actions; user-reviewed information drove specific reconciliation/scope/date questions. Undefined earnings blocked valuation reasoning, unsupported add-backs stayed unsupported, and concentration/owner dependence became investigation questions rather than deal verdicts.

Across the fourteen accepted reviews: **151–206 words**, **two questions and two actions maximum**, latency **6.55–10.07 seconds**. Questions and actions were acquisition-specific and usable for the next investigation step. No accepted response invented a missing numerical deal fact, financing commitment, valuation input, market benchmark or final buy/pass recommendation. There was no generic twenty-item diligence checklist or long essay in the accepted sample.

Completed retrieval and allowlisted course citations are retained in evidence. The substance is consistent with the existing earnings-versus-cash, adjusted-earnings, customer-dependence, management/transition, working-capital and funding-gap curriculum. Retrieval does not verify deal facts. One accepted response included a raw inline File Search citation marker despite the request to omit prose citation syntax; this is a non-blocking formatting imperfection, rendered as text, and no product/parser change was made merely for style.

This finite synthetic sample is not a guarantee of all future model outputs, adversarial-prompt resistance, legal sufficiency or independent document verification.

## Concrete instruction defects and exact scope of correction

Only **`src/worker/deal-workspace.mjs`, inside `workspaceInstructions()`**, changed among the completed feature files. The exact before/after diff is `artifacts/deal-workspace-live-instruction.diff`, reconstructed and checked against the pre-gate source hash. Validator, response schema, token budget, model, access/metering, UI, storage, integrations, curriculum and production settings did not change.

Observed baseline defects:

1. Reviews treated the concentration denominator as undefined even though the structured field means percent of revenue; some reopened an explicitly selected earnings-measure definition.
2. Reviews expanded the default evidence tracker into broad 377–600-word diligence lists, and sometimes requested material already marked received/reviewed instead of advancing its workflow.
3. A soft concision instruction still produced 350–450-word lists. A short final triage budget was needed for reliable operational output.
4. Targeted funding testing exposed one response that mentioned the numerical gap without explicit commitment proof, and another that addressed commitments but omitted the calculable gap.

Corrections are confined to instruction text:

- Define `largestCustomerPercent` as revenue share and preserve the selected earnings measure while separating it from verified earnings.
- Respect recorded evidence progress: review received material; ask specific unresolved questions about user-reviewed material rather than automatically requesting it again.
- Prioritize entered deal-specific gaps instead of enumerating every default Not requested item. Limit the short review to 1–2 brief entries per section, at most two questions/actions, with a 240-word target ceiling. The schema's existing maximum of five remains unchanged.
- For entered debt/equity/seller-financing amounts, distinguish proposals from committed/available funds. Where all three and asking price are supplied, explicitly state the numerical sources total and headline difference before unknown fees/working capital; unknown completion cash does not erase that arithmetic.

Runs: 14 baseline calls, 14 after the semantic/prioritization correction, 14 after strict triage wording, and two funding-only passes of two calls each. All 46 calls are included in cost/accounting evidence; failed quality judgements were not omitted from cost totals. No alternative model, changed output validator, new feature or added provider was used.

## Integration, privacy and local persistence audit

The existing built-preview browser suite passed again with synthetic data and mocked account/model endpoints. A separate focused integration audit additionally demonstrated:

- Gap review sends exactly the current selected deal. A separate unsent deal and a deleted claim were absent from the body; no hidden/extra request fields were included.
- Opening Coach sent no AI request; approved context was visible in its notes first. One explicit coaching click created exactly one mocked request.
- No facts/questions/actions were transferred by default. Only a manually entered approved fact/action returned when confirmed; full call notes and the model answer stayed out of the deal. Unchecked questions were not copied.
- Default page-memory work left no IndexedDB deal row. Explicit saves persisted under their opaque account namespace. Account switching masked/separated namespaces; transient access failures retained masked unsaved work.
- Delete-one removed its saved deal and protected against stale-tab resurrection. The deliberately global Delete all control removed Workspace records across browser account namespaces, including the current namespace, after its explicit all-accounts warning. This is the existing designed behavior; no deletion scope was changed by the gate.
- Real IndexedDB tests covered malformed/future-version rows, denied access, quota failure, deletion generations, global reset epochs, and safe storage-error recovery. No encryption or strong shared-device isolation is claimed.
- Observed browser requests contained no synthetic deal values in URL/query/hash/referrer and no external provider/analytics requests. Captured browser/application logs contained no deal-content markers. Workspace/Coach analytics suppression remained intact.

All live runs used the real D1 accounting adapter over in-memory SQLite. Each handler request made **one** reservation, **one** provider request and **one** usage increment. Across all runs: 46 local usage events/requests, zero deal or model-output content detected in SQL writes, zero application log entries and zero diagnostic entries. Existing failure-path tests also confirmed exactly-once charging with generic content-free errors. No production customer/subscription, mail, Checkout/payment, retention or billing operation was invoked.

The application boundary is distinct from provider processing. Requests retain `store: false`; this report makes no zero-retention or broader provider-retention claim beyond the current Privacy Policy.

## Model usage and cost

Model: **gpt-5.6-luna**. Calls: **46**. Completed File Search calls: **46**.

- Input: **248,876 tokens**, including **112,471 cached reads** and **32,779 cache writes**; uncached non-write input **103,626**.
- Output: **30,146 tokens**, including **6,535 reasoning tokens**. Reasoning was not charged twice.
- Estimated token cost: **$0.06734457**.
- Estimated File Search calls: **$0.115**.
- Estimated total: **$0.18234457, approximately $0.18**.

Estimate uses current official [GPT-5.6 Luna rates](https://developers.openai.com/api/docs/models/gpt-5.6-luna): $0.20/M ordinary input, $0.02/M cached input and $1.20/M output; [prompt-cache documentation](https://developers.openai.com/api/docs/guides/prompt-caching) specifies 1.25× ordinary input for default-lifetime cache writes ($0.25/M here). [File Search pricing](https://developers.openai.com/api/docs/pricing) is $2.50/1,000 calls. This is a standard-rate estimate from returned usage, excluding existing storage, taxes and project-specific billing adjustments, not an invoice reconciliation.

## Tests rerun and recommendation

- Full `npm test` after the final change: **199 passed, zero failed, one inherited skip** (200 total).
- Focused workspace/model/bridge/Coach tests: **27 passed**; the full final suite includes these tests.
- Existing built Workspace browser/real IndexedDB/axe/overflow suite: passed at 1440/1100/768/390.
- Additional current/deleted-state, Coach and URL/referrer/log audit: passed, zero page errors.
- `git diff --check`: passed. Prepared-feature source fingerprints changed only for `src/worker/deal-workspace.mjs`, and only its instruction function changed.
- Production allowlisted settings/version unchanged before/after; store metadata unchanged across all runs. No production paid request or infrastructure/data mutation.

Recommend releasing the completed feature, including its already-prepared Terms/Privacy additions, through a separately authorized deployment. No deployment occurred in this task. No unresolved semantic quality blocker remains from the tested sample.

Evidence: `artifacts/deal-workspace-live-{initial,first-fix,final,funding-proof-first,funding-proof,accepted,metrics,integration-audit}.json`, `artifacts/deal-workspace-live-instruction.diff`, and `/tmp/acqcomp-workspace-live-{unit,final-unit,focused,browser,integration}.log`. All model evidence is synthetic and local; hidden-input harness/control files are ignored under `.wrangler/live-workspace-gate/` and contain no key.

DEAL WORKSPACE LIVE QUALITY PASSED — READY TO DEPLOY
