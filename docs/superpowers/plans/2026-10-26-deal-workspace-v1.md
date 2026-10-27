# Deal Workspace V1 Implementation Plan

> **For agentic workers:** Follow this plan task by task, with test-first implementation and a whole-change independent review. The user explicitly chose to proceed directly from the supplied specification.

**Goal:** Keep sanitized acquisition facts, evidence gaps, questions and next actions together in one paid browser-local workspace.

**Architecture:** One static client-driven `/ai/deal-workspace/` route. Page memory is the default; IndexedDB saves are explicit, account-namespaced, and never synchronized. An authenticated additive account response supplies a domain-separated opaque namespace. A new structured review mode uses existing entitlement, quota, OpenAI and read-only curriculum. Explicit same-origin, account-checked window messaging connects a workspace tab to Call Coach without URLs or durable handoff storage.

**Tech stack:** Existing Astro/TypeScript/vanilla DOM, IndexedDB, Cloudflare Worker, Node test runner, Playwright/axe. No new dependencies, tables, flags, billing configuration or corpus.

**Spec:** User's 28-part Deal Workspace V1 specification in this session. User delegated remaining implementation choices on October 26, 2026.

## Global constraints

- No deploy/push, production paid request, remote deal persistence, document/transcript upload, audio, recording, OCR or external drive integration.
- Existing `ai_deal_lab`, $19/month and $190/year, 100 requests/UTC month, auth/billing/webhook/runtime/vector store/curriculum preserved.
- Short sanitized summaries only; no confidential, proprietary, personal or non-public material.
- No deal content in analytics, diagnostics, URLs/referrers or canonical curriculum.
- Optional fields; claims are unverified; user-reported evidence status is never AI verification.

## Review focus

1. Shared browser account changes or entitlement revocation while a tab is open: mask state and recheck account before loading or accepting transfers.
2. Pending local saves racing deletion or account switches: serialize writes, capture namespace, never resurrect deleted rows.
3. Malformed/future-version IndexedDB rows, denied storage or quota exhaustion: fail closed with a generic recoverable message, without exposing raw content.
4. Editing/selecting/deleting a deal during a review: cancel/ignore late output and mark unchanged-deal stale results clearly.
5. Closed or switched-account Call Coach opener, replayed transfer, malicious text: reject mismatched context, acknowledge once, require explicit selected transfer and render text safely.

## Shared interfaces and schema

`src/lib/deal-workspace.mjs` owns:

- `SCHEMA_VERSION=1`, `MAX_DEAL_BYTES=10000`, `MAX_ENTRIES=20` for each editable ledger/list, `MAX_ENTRY_TEXT=240`.
- `STAGES`, `EARNINGS_MEASURES`, `CLAIM_STATUSES`, `EVIDENCE_STATUSES`, `QUESTION_STATUSES`, `ACTION_STATUSES`, `CATEGORIES`: value-to-label objects.
- `FIELD_GROUPS`: array `{id,label,fields:[{path,label,type,max?,options?}]}` for progressive identity/economics/seller/business forms. `path` is dot-delimited. Types text/textarea/number/select. `options` is a value-to-label object.
- `newDeal(alias='Project Atlas', now=new Date().toISOString())` returns a complete version-1 deal with optional strings empty, optional numbers null.
- Deal keys exactly: `version,id,alias,sector,geography,stage,createdAt,updatedAt,economics,seller,business,claims,evidence,questions,actions`.
- Economics: `revenue,earnings,earningsMeasure,askingPrice,completionCash,sellerFinancing,buyerEquity,debt,otherConsideration`. Numbers nullable, measure defaults `unknown`.
- Seller: `motivation,timeline,transition,ownerDependence,stayingInvolved` (last unknown/yes/no).
- Business: `largestCustomerPercent,recurringRevenue,management,keyPerson,capex,workingCapital` (first nullable number 0..100).
- Claim `{id,statement,category,status,note}`; question `{id,text,status}`; action `{id,text,status,category}`; evidence `{id,label,category,status,note,asOf}`. Dates are optional YYYY-MM-DD. A default adaptable evidence list is created per new deal; maximum evidence rows 30.
- `validateDeal(raw)` returns sanitized cloned deal or null; unknown keys, versions, invalid dates/types/counts/UTF-8 size rejected. Errors never contain content.
- `deriveMetrics(deal)` returns `{ebitdaMultiple:number|null}` only for explicit EBITDA/adjusted_ebitda with positive earnings and entered asking price.
- `unknowns(deal)` returns short deterministic missing/ambiguous areas, without inferred facts.
- `coachSummary(deal)` returns at most 3,000 characters of visible sanitized context, including evidence/claim qualifications and unresolved questions; no implication of verification.

`src/lib/deal-workspace-storage.mjs` exports `createDealStorage(namespace, idb=globalThis.indexedDB)` returning `{list,save,remove,clearAll,close}`. Async operations serialize, clone inputs, validate reads, namespace all keys/queries. `clearAll` deliberately clears all Deal Workspace saved data in this browser, across accounts, with that scope explicitly confirmed in the UI. No other site/account data touched.

Account API adds `localWorkspaceNamespace` (SHA-256 domain-separated existing random user ID; no email/raw account ID/new table/secret). UI treats it as opaque, not encryption. Namespace retrieval retains existing same-origin headers and entitlement is independently checked.

Review request: `{mode:'deal_workspace',action:'review_gaps',deal}`. Response `{workspaceReview:{known,unclear,evidenceGaps,risks,questions,actions},citations}`; each section 1..5 strings of at most 320 characters. Both browser/server validate. No auto-insertion/answering from AI.

## Tasks

### 1. Model and local persistence

- [x] Write failing model/storage tests: optional data, validation limits, earnings calculations, namespace isolation, invalid records and deletion/save ordering.
- [x] Implement the schema, default tracker, safe calculations and serialized IndexedDB adapter.
- [x] Run focused tests, then real IndexedDB browser persistence tests.

### 2. Existing backend integration

- [x] Write failing tests for account namespace and review access, exact-once quota, no deal content in D1/logs, same-origin/rate/body limits, bounded provider response, instructional fixtures.
- [x] Add opaque namespace to account response. Add strict review validator/instructions/schema/parser and integrate with existing AI/OpenAI adapter.
- [x] Keep general modes and Coach semantics unchanged; use content-free provider diagnostics for the new mode.
- [x] Run backend/auth/AI regression tests.

### 3. Workspace UI

- [x] Implement single route, progressive overview, ledger/evidence/questions/actions, unknowns panel and new/select/delete controls.
- [x] Require paid account namespace before any local record read; disable controls otherwise. Mask and recheck on account visibility/focus boundaries.
- [x] Explicit save checkbox, actionable storage errors, deliberate delete confirmations, global local-data delete warning, no analytics.
- [x] Add explicit review with busy/stale state, safe section rendering, manual selection of AI suggestions, bounded payload and no retries.

### 4. Call Coach bridge and discovery

- [x] Test explicit-only same-origin same-account tab handoff and selected return payloads, closed tabs, replay and account changes.
- [x] Show context before requests. No provider request on opening Coach. Keep standalone path intact; fix missing existing X-Account-Request header as required for authenticated access.
- [x] Manually approve selected questions, short facts and actions; never transfer complete notes/output automatically.
- [x] Link from AI Deal Lab, Call Coach, pricing/account where natural. Minimal precise Terms/Privacy additions.

### 5. Validation and review artifacts

- [x] Add mocked/synthetic browser checks for access, real IndexedDB, multiple accounts, no remote persistence/analytics/logs/URLs/provider calls, review/bridge and keyboard/destructive actions.
- [x] Run all unit/auth/billing/AI/Coach/Workspace suites, Astro/build/Pagefind/links/privacy, browser/analytics/axe/overflow at 1440/1100/768/390, credential/diff scans and canonical Wrangler dry run.
- [x] Produce screenshots, V1 review report and V2 private-document design note including conceptual organized-evidence/repeatable-workflow inspiration without affiliation or copied skills.
- [x] Independent whole-change review; fix concrete issues, rerun affected checks, stop locally. No automatic deployment or real paid request.
