# AI Deal Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, curriculum-grounded AI Deal Lab to the current static Acquisition Companion site.

**Architecture:** Keep Astro static output and wrap `dist/` in a Cloudflare Worker Static Assets binding routed first only for `/api/*`. The Worker uses stateless OpenAI Responses + File Search, strict validation, rate-limit bindings, and default-off runtime configuration. Browser conversation text stays in memory; deterministic code owns case facts and arithmetic.

**Tech Stack:** Astro 7, TypeScript/JavaScript modules, Node's built-in test runner, Playwright/axe, Wrangler, Cloudflare Workers Static Assets and Rate Limiting bindings, OpenAI Responses API.

**Spec:** `docs/superpowers/specs/2026-09-30-ai-deal-lab-design.md`

## Global Constraints

- Keep Astro output static in `dist/`; do not migrate hosting.
- Keep `/api/ai` disabled unless `AI_ENABLED` is exactly `true` and every required server setting/binding exists.
- Use only `gpt-5.6-luna` by default, Responses API `store:false`, and File Search; never enable Web Search.
- Keep the authored corpus restricted to public lesson/topic/example prose, glossary/module definitions, and intentional public relationship metadata.
- Never include protected input, raw transcript, source-document text, credentials, or private workstation paths in generated/public output.
- Keep conversations out of server storage, localStorage, and GA; cap request input, history, retrieval results, and model output.
- Cap request bodies at 12 KiB, the active message at 1,500 characters, history at eight messages/four prior turns and 4,500 total characters (1,200 per entry), retrieval at four results, and model output at 640 tokens.
- Configure rate-limit bindings for 8 requests/minute/session, 30/minute/IP, and 120/minute/edge location; document that these are not a strict global spend cap.
- Keep case arithmetic deterministic and never let model output establish canonical numbers.

## Review Focus

- Missing/partial runtime configuration: `/api/ai/status` reports unavailable and `/api/ai` makes no model call.
- Spoofed origin, wrong content type, malformed/unknown fields, oversized body/history/message: rejected before rate-limit/model calls.
- Unknown File Search filename or model URL: never becomes a browser link.
- User-supplied HTML and hostile source instructions: text rendered literally; developer instruction remains separate and retrieval treated as untrusted data.
- Case-stage bypass, incomplete sources/uses, zero EBITDA, rounding, and downside arithmetic: constrained/covered by deterministic case tests.

---

### Task 1: Reproducible public curriculum corpus

**Files:** `scripts/generate-ai-corpus.mjs`, `scripts/publish-ai-corpus.mjs`, `src/data/ai-corpus-manifest.json`, `tests/ai-corpus.test.mjs`, `package.json`

**Interfaces:** `buildAiCorpus({root,siteOrigin}) -> {documents,manifest}`. Documents are safe per-page Markdown files with stable filenames; manifest maps each filename to title, route, page type, source-family labels, and allowlisted original URLs. `npm run generate:ai-corpus` writes documents only under ignored `artifacts/ai-corpus/` and regenerates the public metadata manifest.

- [x] Write tests proving only allowlisted authored/public files are consumed, filenames and URLs are stable, source relations resolve, and forbidden/private markers are absent.
- [x] Run the focused test and verify it fails because the generator is missing.
- [x] Implement the generator using only lessons/topics/examples, glossary, modules, video metadata, and Fund Launch guide identities/URLs; add a separate explicit publisher that creates or safely refreshes a vector store only when deliberately run with a key.
- [x] Run the focused corpus test and then the full unit suite.

### Task 2: Synthetic case engine and arithmetic

**Files:** `src/lib/ai-cases.mjs`, `tests/ai-cases.test.mjs`, `src/data/ai-case-cards.json`

**Interfaces:** `getCase(id)`, `listCaseCards()`, `calculateCase(id)`, `visibleFacts(id,stage)`, and `answerFor(id)`. Case definitions include private instructor rubric in the server-only module; cards contain only ID/title/difficulty/industry/description. Create original beginner, intermediate, and advanced cases with balanced uses/sources and staged facts.

- [x] Write hand-checked tests for each case's EBITDA bridge, EV multiple, working-capital shortfall, sources/uses, leverage, debt service/coverage, rollover ownership, downside, unique IDs, stage contents, and existing course/topic routes.
- [x] Run the case test and verify it fails because the module is missing.
- [x] Implement helpers and case definitions; expose canonical calculations only through explicit `show_answer`.
- [x] Run the focused case test and full unit suite.

### Task 3: Cloudflare Worker API and OpenAI adapter

**Files:** `wrangler.jsonc`, `src/worker/index.mjs`, `src/worker/ai-api.mjs`, `src/worker/openai.mjs`, `tests/ai-api.test.mjs`, `package.json`, `.gitignore`, `.dev.vars.example`

**Interfaces:** `handleAiRequest(request,env,deps) -> Response`, with injected `fetch`, timeout, and logger boundary for tests. `GET /api/ai/status` reveals only readiness. `POST /api/ai` enforces same-origin JSON and strict size/schema/mode/action limits, applies session/IP/global rate bindings, sends bounded input to Responses, and returns validated structured JSON. Wrangler routes only `/api/*` through `src/worker/index.mjs` and serves the existing `dist/` directory via `ASSETS`.

- [x] Add failing tests for disabled mode/no OpenAI call, method/JSON/origin/body/schema/history/mode/case validation, limit behavior, mocked successful Responses citations, unknown citation removal, provider 429/5xx, timeout, and required `store:false`/File Search-only request.
- [x] Run the focused API test and verify it fails because the API is missing.
- [x] Implement request validation, generic error responses, `store:false`, `gpt-5.6-luna` default, 640 output-token cap, 4 retrieval-result cap, and no logging of user content.
- [x] Add Wrangler static assets and rate-limit binding configuration for 8/session/minute, 30/IP/minute, and 120/edge-location/minute; do not include OpenAI environment IDs or credentials.
- [x] Run focused API tests and Wrangler dry-run/bundle validation.

### Task 4: `/ai/` learning workspace and analytics/privacy integration

**Files:** `src/pages/ai.astro`, `src/scripts/ai-lab.ts`, `src/layouts/Base.astro`, `src/lib/analytics.mjs`, `src/pages/privacy.astro`, `src/styles/global.css`, `tests/analytics.test.mjs`, `tests/ai-ui.test.mjs`, `scripts/browser-ai-check.mjs`, `package.json`

**Interfaces:** Static `/ai/` contains the three mode panels and synthetic case cards. The client retains at most eight conversation entries in memory and a random session token in `sessionStorage`; status and API requests are same-origin. New GA events pass a mode/case/difficulty/completion allowlist through the existing controller.

- [x] Write failing tests for event redaction, rendering literal model HTML, status/429/5xx/loading/retry states, citations/follow-up buttons, and no conversation persistence.
- [x] Run focused tests and verify the new behaviors are missing.
- [x] Implement responsive accessible controls, status announcements, keyboard flow, text-node rendering, safe citation rendering, mode switching, and actions for hint/explain/answer/missed risks/challenge/next stage.
- [x] Update navigation and privacy copy without changing consent behavior or CSP destinations.
- [x] Run focused tests and browser AI QA with mocked API responses.

### Task 5: Documentation, output audits, and full verification

**Files:** `README.md`, `scripts/validate-dist.mjs`, `tests/output-policy.test.mjs`, `docs/ai-deal-lab.md`, `package.json`

- [x] Write output-policy assertions for private runtime values, prompts, excluded corpus paths, case rubric, and source-overlap marker absence.
- [x] Document local Worker development, corpus inspection/publishing, Cloudflare runtime variables/secrets, rate-limit setup, key rotation, kill switch, model choice, cost limits, and tests.
- [x] Run `npm test`, `npm run check`, `npm run build`, `npm run test:browser`, and `npm run test:analytics-browser`; run available source-preservation and Fund Launch overlap checks without publishing source material.
- [x] Review final `git diff`, generated `dist/`, Worker dry-run bundle, and environment-variable output scans. Do not push or deploy during this implementation run.
