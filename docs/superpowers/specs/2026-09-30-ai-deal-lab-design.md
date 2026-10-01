# AI Deal Lab Design

## Outcome and boundaries

AI Deal Lab adds three curriculum-led practice modes to the public Acquisition Companion site: Ask the Course, Deal Lab, and IC Challenge. It is an educational instructor, not a web-search service or autonomous deal advisor. V1 has no accounts, payments, uploads, confidential-document processing, or server-side conversation history.

All cases are original synthetic scenarios. Their public facts, staged disclosures, arithmetic, hidden teaching rubric, and curriculum links are defined in code. Deterministic helpers establish canonical numbers; the model explains and challenges them.

## Audit findings

- The site uses Astro 7 with static output to `dist/`; the build runs Node tests, Astro checks, Astro build, sitemap generation, Pagefind, and `scripts/validate-dist.mjs`.
- Public curriculum prose is in `src/content/lessons`, `src/content/topics`, and `src/content/examples`; glossary and module descriptions are public structured data. Source IDs in frontmatter link to intentionally published source pages and original URLs.
- The public site is served from Cloudflare and its response security headers match `public/_headers`. The current GitHub integration is Cloudflare Workers Builds. The repository has no Worker entry point or Wrangler configuration; the README still contains an older Pages setup section.
- Google Analytics is opt-in and initialized by `src/components/AnalyticsConsent.astro` through `src/lib/analytics.mjs`. Pagefind indexes built public HTML. Neither system should receive AI conversation data.
- Existing output and source-protection checks are retained. AI corpus generation reads only authored Markdown and the small public relationships needed to cite pages. It excludes evidence/numbers/provider datasets and all research, transcript, and protected inputs.

## Runtime and hosting

Add a Wrangler-configured Cloudflare Worker with a Static Assets binding to the existing `dist/` folder. Route only `/api/*` through Worker code; all other routes and files continue through Cloudflare's static asset serving and existing `_headers` policy. Keep the Worker name aligned with the existing `acquisition-companion` Workers Builds project. The Workers Builds build command remains `npm run build`; its deploy command is `npx wrangler deploy`.

`GET /api/ai/status` returns only whether AI is ready. Readiness requires `AI_ENABLED=true`, the server-side OpenAI key and vector-store ID, and all configured rate-limit bindings. Missing configuration or any other value for `AI_ENABLED` means disabled. `POST /api/ai` is the only model endpoint. It rejects cross-origin, non-JSON, malformed, unexpected, oversized, and invalid-mode requests before contacting OpenAI.

Use Cloudflare rate-limit bindings for an ephemeral browser-session identifier (8 calls/minute), a connecting-IP ceiling (30 calls/minute), and an edge-local global ceiling (120 calls/minute). Missing bindings fail closed. The session ID is a random opaque value kept in `sessionStorage`; user text and conversation history stay in page memory. Limits are defense in depth, not a strict global spend cap; the OpenAI project should also have an operator-set hard spend limit.

## OpenAI and retrieval

Call `POST https://api.openai.com/v1/responses` from the Worker with `store: false`, `gpt-5.6-luna` by default, `max_output_tokens: 640`, and only the File Search tool pointed at `OPENAI_VECTOR_STORE_ID` with at most four results. Do not enable Web Search or other model tools. The Worker sends only a capped recent conversation and the current case's trusted facts/rubric where applicable. Limit request bodies to 12 KiB, the current message to 1,500 characters, history to eight messages/four prior turns and 4,500 total characters, with 1,200 characters per history entry. OpenAI errors and timeouts become generic service responses; prompts, responses, credentials, and session identifiers are never logged.

`scripts/generate-ai-corpus.mjs` builds reviewable local documents and a citation manifest from authored lesson/topic/example Markdown, public glossary definitions, module descriptions, and source relationships that are already rendered by the site. Every corpus item has a stable filename and page metadata. Original source URLs come only from `sources`/`fundSources` IDs resolved against `videos.json` and `fund-launch.json`; raw source text is never copied. Corpus output stays under ignored `artifacts/ai-corpus/`, outside `dist/`.

File Search's returned file-citation annotations are mapped through the generated filename allowlist. Unknown filenames are omitted; model-supplied URLs never become links. Approved course-page citations may also link to original source URLs already published by those pages.

## API and UI contract

`POST /api/ai` accepts `{mode, message, history, caseId?, caseStage?, action?}`. Modes are exactly `ask_course`, `deal_lab`, and `ic_challenge`. Only `user` and `assistant` messages are accepted in capped history. The Worker returns JSON with `responseText`, approved `citations`, safe `suggestedActions`, optional `caseStage`/`caseFacts`, optional deterministic `calculations`, and optional qualitative IC feedback.

The `/ai/` page provides mode selection, case cards, a non-persistent conversation, staged case facts, explicit hint/explanation/answer/challenge actions, visible loading and retry/error states, and course/source links. It renders model text through DOM text nodes; no model output is interpreted as HTML. The first-use notice warns against confidential or non-public information and links to `/privacy/`. When disabled, it clearly says AI Deal Lab is being configured.

The course assistant must ground answers in retrieved pages and state when the corpus does not support a claim. Case responses distinguish synthetic facts from curriculum references. IC Challenge asks one focused committee question at a time and returns strengths, risks identified/missed, assumptions needing evidence, and lessons to review. It never emits a numeric deal score or real-company buy/sell recommendation.

## Privacy and analytics

The existing consent controller remains the only analytics entry point. New events contain only an allowlisted mode, synthetic case ID, difficulty, or completion state. Prompt text, response text, arbitrary labels, company names, and financial values are dropped.

The privacy page explains that optional AI prompts are sent to OpenAI for generation, requests set `store: false`, Acquisition Companion does not intentionally retain a server-side chat history, users must not submit confidential information, v1 has no private deal-document upload, and prompts/responses are not sent to analytics. It makes no zero-retention or legal-guarantee claim.

## Validation

Tests cover corpus allowlisting and citation mapping, all case arithmetic and curriculum links, strict request validation and limits, disabled/method/origin/content-type behavior, mocked Responses API requests and errors, missing/unknown citation filtering, safe client rendering, analytics data minimization, output-secret scans, and existing project checks. Browser QA covers keyboard use, mode changes, status announcements, API mock success/429/5xx, responsive layout, and absence of prompt/response analytics. No live OpenAI call is required for tests.
