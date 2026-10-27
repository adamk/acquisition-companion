# Deal Workspace V1 local review

Status: READY FOR REVIEW, locally validated October 26, 2026. No deployment, push, production write, live paid AI request, or corpus publication occurred.

Worktree: `/private/tmp/acqcomp-deal-workspace-v1-20261026`, branch `feature/deal-workspace-v1-20261026`. Started clean from freshly fetched `origin/main` at `086ffc6bb48ab08ed3166590f9a9380d89f8eb08`. The original dirty checkout was left untouched. Implementation is an uncommitted local review diff.

## Implemented scope

A paid browser-local workspace for short sanitized deal summaries, optional economics, unverified claims, evidence status, questions and actions. Page memory is the default; IndexedDB saves are explicit, device-local and account-namespaced. Gap review reuses the existing entitlement and monthly request allowance. Call Coach integration requires explicit context and selected transfer approval.

Discovery links are added to AI Deal Lab, pricing and account pages. Privacy and Terms describe local storage, shared-browser limits, deletion, explicit AI requests and provider-retention caveats. Prices and the 100-request UTC-month allowance are unchanged. V2 remains a separate design note.

## Validation evidence

All results below are actual local checks. Browser/API fixtures are synthetic; model, billing and email calls are mocked.

| Check | Result |
| --- | --- |
| Full unit suite, including model/backend/bridge/auth/billing/AI/Coach | PASS: 200 tests, 199 passed, one inherited skip, zero failures |
| Astro check and static build | PASS: 113 files checked, zero errors/warnings, one inherited hint; 254 pages built |
| Pagefind, internal links and privacy scan | PASS: 153-document corpus unchanged; 11,756 internal links checked |
| Mocked Workspace browser and real IndexedDB tests | PASS on final built preview at port 4335 |
| Existing general browser suite | PASS: 39 routes; zero axe violations or browser errors |
| Existing AI browser suite | PASS: three modes/32 synthetic prompts, zero direct provider requests or browser errors |
| Existing Coach browser regression | PASS: standalone paid gates, next/review, safe rendering, coverage and session clearing |
| Paid/account browser and built auth-link regressions | PASS: mocked Checkout/email only; sign-in, replay, logout and diagnostics checks |
| Local workerd/D1 runtime | PASS: ephemeral local database and mocked providers only |
| Analytics browser suite | PASS: intentionally no configured measurement ID; zero requests/errors; Workspace separately suppresses analytics even with consent granted |
| Axe and overflow at 1440 / 1100 / 768 / 390 | PASS: zero violations/overflow, with screenshots |
| Keyboard and destructive-dialog behavior | PASS: tab arrows/Home/End, labelled inputs and deliberate safe-default deletion dialogs |
| Credential, privacy and diff scans | PASS: 553 text files scanned, zero credential-pattern findings; tracked diff and new-file whitespace clean |
| Canonical Wrangler production dry run | PASS: packaging only, no deployment or binding/data changes |
| Independent whole-change review | PASS: all concrete findings resolved and checked; no outstanding findings |

Commands: `npm run build` (includes the full unit suite, Astro check/build, sitemap, Pagefind and distribution validation); `npm run test:browser`; `npm run test:ai-browser`; `npm run test:paid-browser`; `npm run test:analytics-browser`; `npm run test:call-coach-browser`; `node scripts/browser-auth-link-check.mjs`; `npm run test:paid-d1-runtime`; `PREVIEW_URL=http://127.0.0.1:4335 npm run test:deal-workspace-browser`; `npx wrangler deploy --dry-run --config wrangler.jsonc`; `git diff --check`. Node used: 22.23.0.

The inherited skip is `private audit maps exact source rows without leaking supporting prose into public context`, because local-only private research audit files are absent from the public checkout. The inherited Astro hint is the async-function suggestion in unchanged `tests/paid-services.test.mjs:88`.

Evidence: `/tmp/acqcomp-workspace-{baseline,build,general,ai,paid,analytics,coach,auth-browser,local-d1,browser-final,dry-run}.log`; `artifacts/deal-workspace-security-scan.json`; `artifacts/deal-workspace-changed-files.json`; screenshots `artifacts/deal-workspace-{1440,1100,768,390}.png`. Screenshots use synthetic fixtures, including intentional hostile strings to demonstrate text-only rendering.

## Architecture and persistence

One static `/ai/deal-workspace/` route with a client-side selector for multiple local deals. Overview uses progressive sections; Facts & Claims, Evidence, Questions and Next Actions have explicit controls. Unknowns remain prominent. There is no dynamic per-deal URL, remote deal endpoint, new infrastructure, dependency or migration.

Page memory is the default and clears on reload/exit. Checking the per-deal save control explicitly enables IndexedDB persistence in this browser profile. Saved content is not synchronized, encrypted by this feature, or coupled to account deletion. Deleting one deal and globally deleting Workspace data require confirmation. Global deletion explicitly covers all account namespaces in this browser, with a content-free reset message clearing open workspace buffers. Other site/account storage is untouched.

Writes are serialized. Global epochs and per-record deletion generations prevent stale tab writes from restoring deleted records. Storage denial, malformed/future-version rows and quota failures produce generic recovery messages. Temporary account-service failures mask and retain unsaved work instead of erasing it. Failed updates and failed deletion confirmations do not claim that an older saved copy disappeared.

## Cross-account browser handling

The authenticated, same-origin account API adds `localWorkspaceNamespace`, a domain-separated SHA-256 digest of the existing random user ID. It contains no email or raw user ID and requires no table, secret or deal-data write. Normal UI loads, saves and transfers use that namespace only after checking the existing active `ai_deal_lab` entitlement. Local data never supplies entitlement.

Workspace masks during account rechecks and discards its active buffer on confirmed sign-out, revocation or account change. Late loads/reviews cannot populate another namespace. Connected Coach context is hidden during its account checks. The namespace is ordinary application separation, not cryptographic isolation; someone with browser/device access can inspect browser storage.

## Versioned schema and claim/evidence model

Version 1 contains a local random ID, project alias, sector, broad geography, stage, timestamps, optional economics, seller/transition details, business/risk details, claims, evidence rows, questions and actions. Alias/sector/geography are limited to 80 characters; ordinary text and selected entries to 240; short ledger notes to 160. Maximum: 20 deals, 20 claims/questions/actions per deal, 30 adaptable evidence rows and 10,000 UTF-8 JSON bytes per deal. Unknown fields and future versions fail closed. Optional numbers remain null and optional strings empty.

Economics includes every requested field and earnings measure. Reported negative earnings can be recorded. An EBITDA multiple is calculated only from explicit EBITDA/adjusted EBITDA, positive finite earnings and an entered finite asking price; it is labelled a calculation from user assumptions, never a valuation conclusion. Unknown, SDE, EBIT, pretax/net income, cash flow and other bases are not labelled EBITDA.

Claims retain Seller claim / Clarified / Evidence seen / Conflict-follow-up status and source/context notes. Evidence uses Not requested / Requested / Received / Reviewed / Needs follow-up, optional evidence dates, and an adaptable default 21-item tracker. Neither ledger implies inspection or verification by Acquisition Companion. Questions retain their explicit unanswered/partial/answered-for-now/evidence-needed status; actions remain open/completed. AI never silently changes either.

## AI gap review and shared metering

One explicit Review action sends only the current bounded structured deal to existing `/api/ai`, mode `deal_workspace`, action `review_gaps`. Same-origin/body-size/rate checks and active paid entitlement remain. The existing shared 100-request UTC-month reservation/completion path counts the action exactly once, including failed provider-backed calls. No new quota, subscription, product, price or entitlement exists.

The existing model and read-only curriculum/File Search return six strict bounded sections: qualified known entries, unclear points, evidence gaps, risks to investigate, at most five questions and at most five actions. Instructions distinguish claims from user-marked evidence, received from reviewed, unsupported add-backs, undefined profit, owner transferability and concentration investigation. The current UTC date supports evidence-date reasoning without universal freshness benchmarks. No deal score, offer conclusion, invented facts, universal benchmark or professional advice is requested. Suggestions enter lists only through explicit selection; they do not become facts or answered questions automatically.

## Seller Call Coach integration

The buyer chooses to preview and explicitly approve the selected deal summary, then opens a connected Coach tab. Same-origin window messaging carries a concise visible summary in memory, with source-window, opaque-account and nonce checks. No facts appear in URLs, referrers, localStorage/sessionStorage or durable handoff records. Merely opening Coach never calls the AI service.

The Coach remains usable standalone. The connected path loads approved context into visible notes and sends it only on an existing coaching/review action. Returning items requires editing/selecting short questions and approving short facts/actions in a separate dialog. No full call notes or complete model output is automatically copied or saved. Returned facts start as seller claims; questions unanswered; actions open. Browser-save status remains visible and separate. Replay, unconfirmed/cancelled previews, blocked popups, account switches and closed parent tabs are covered by browser tests.

The existing Coach account fetch now supplies the required `X-Account-Request` header, needed for the authenticated account API. Normal Deal Lab modes receive no Workspace data; their analysis and synthetic workflows remain unchanged.

## Privacy, policy and unchanged production boundaries

Workspace and Coach suppress ordinary analytics entirely. Application diagnostics/accounting do not record deal contents or provider-echoed inputs. DOM output is text-only, with allowlisted course citations. No uploads, microphone/system audio, recording, transcription, OCR, external-drive connections, data-room ingestion, server-side deal records or deal chat history were introduced.

Minimal Terms/Privacy additions disclose optional IndexedDB saving, session defaults, shared-browser/no-encryption/no-sync limits, local deletion and account-deletion independence, explicit AI actions/selected Coach transfers, and no intentional server-side deal record. The existing prohibited-information warning and provider-retention caveat remain. They would need to ship with a later explicitly authorized release; production policy is unchanged by this local task.

Protected source/configuration checks found no differences in canonical Wrangler configuration, pricing constants, auth/billing/Stripe logic, D1 schema/store, retention, existing curriculum, corpus manifest, published authored corpus or lockfile. No production read/write, deployment, customer/subscription mutation, mail, Checkout/payment, live model request, or vector-store publication was performed.

## RAG and future V2

Zero curriculum/corpus changes: all 153 existing authored documents and the current vector-store configuration remain unchanged. No deal facts are ingested, no per-customer vector store is created, and no corpus publisher ran.

`docs/deal-workspace-v2.md` recommends a separately reviewed private-document architecture: private per-deal objects, explicit authorization/isolation, approved encryption/key management and retention/deletion, validated/quarantined files, source-linked findings/exact citations, financial extraction/reconciliation, contradiction/staleness handling, processor review and bounded cost. Privacy/security/legal approval is required before development. Oscar is mentioned only as conceptual inspiration for organized evidence and repeatable workflows, without affiliation or copied skills.

## Exact changed files (27)

- `docs/deal-workspace-v1-review.md`
- `docs/deal-workspace-v2.md`
- `docs/superpowers/plans/2026-10-26-deal-workspace-v1.md`
- `package.json`
- `scripts/browser-deal-workspace-check.mjs`
- `src/lib/deal-workspace-bridge.mjs`
- `src/lib/deal-workspace-storage.mjs`
- `src/lib/deal-workspace.mjs`
- `src/pages/account.astro`
- `src/pages/ai/call-coach/index.astro`
- `src/pages/ai/deal-workspace/index.astro`
- `src/pages/ai/index.astro`
- `src/pages/pricing.astro`
- `src/pages/privacy.astro`
- `src/pages/terms.astro`
- `src/scripts/call-coach.ts`
- `src/scripts/deal-workspace.ts`
- `src/styles/call-coach.css`
- `src/styles/deal-workspace.css`
- `src/worker/ai-api.mjs`
- `src/worker/deal-workspace.mjs`
- `src/worker/openai.mjs`
- `src/worker/paid-api.mjs`
- `tests/ai-ui.test.mjs` (correct negative-retention-caveat assertion)
- `tests/deal-workspace-api.test.mjs`
- `tests/deal-workspace-bridge.test.mjs`
- `tests/deal-workspace-model.test.mjs`

## Privacy and integrity assertions to verify

- No account namespace is interpreted as encryption, and local saves are not synchronized or coupled to account deletion.
- Unsaved state clears on reload; account changes and entitlement revocation mask state before any local load or transfer.
- Unknown earnings produce no EBITDA multiple. Explicit EBITDA or adjusted EBITDA is required, with positive earnings and an asking price.
- Claims and evidence retain user-reported status; no review automatically inserts facts or marks questions answered.
- Explicit AI actions make one request without automatic retries; arbitrary response text is rendered as text.
- Selected cross-tab transfers are same-origin and same-account, replay-resistant and approved. Opening Coach makes no AI request.
- No deal content enters URLs, analytics, diagnostics, durable handoff storage, the public curriculum or remote deal records.
- Delete-one and global local-data deletion require deliberate confirmation; global scope includes every Workspace account namespace in this browser only.

## Limits

Browser tests use synthetic fixtures and mocked account/model endpoints. They can verify UI behavior, real local IndexedDB behavior and request boundaries, but do not establish production wiring, real provider response quality, legal sufficiency, or a production security audit. No confidential or real customer data is used.
