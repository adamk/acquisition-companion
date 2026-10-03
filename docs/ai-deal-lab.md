# AI Deal Lab operations

Integration/people questions use a targeted operational-realism lens across all three modes. The original fictional “Two companies, one management team” exercise tests stabilization, selection and timed synergy economics without changing model budgets. See [source coverage, gaps and calculation boundaries](operational-source-audit.md); its fictional facts are not source-reported transactions.

AI Deal Lab is an optional educational practice tool, not an autonomous acquisition adviser or general web-search chatbot. The static `/ai/` page has Ask the Course, Deal Lab, and IC Challenge modes. The only model endpoint is `POST /api/ai`; `GET /api/ai/status` returns only whether the runtime is ready.

The initial version stays unavailable unless the Worker has `AI_ENABLED=true`, an OpenAI API key, a vector-store ID, and the three Wrangler rate-limit bindings. Missing configuration fails closed and displays “AI Deal Lab is being configured.” A request also needs the same site origin and valid JSON.

## Local development and tests

The ordinary Astro server and preview serve the static site. They do not provide the Worker API. To develop the Worker with its static asset binding:

```sh
npm ci
npm run build
cp .dev.vars.example .dev.vars
npm run dev:worker
```

Keep `AI_ENABLED=false` in `.dev.vars` unless you deliberately need to test a live model request. The example file contains placeholders only. For a real local request, use an OpenAI development key and a separate test vector store, set them only in the ignored `.dev.vars`, and change `AI_ENABLED=true`. Never use the production key in source, build variables, browser code, or shell history. Local rate-limit state is for development and is separate from deployed limits.

The production static build does not require an OpenAI key or vector store:

```sh
npm test
npm run check
npm run build
npm run deploy:worker:dry-run
```

`npm test` regenerates the corpus manifest first. The dry run packages the Worker and current `dist/` assets without deploying them. To run the browser suites, start `npm run preview` in another terminal, then run:

```sh
npm run test:browser
npm run test:analytics-browser
npm run test:ai-browser
```

Browser AI tests mock `/api/ai`; they do not call OpenAI. `artifacts/ai-corpus/` and other build/test artifacts are ignored by Git. `npm run build` includes tests, Astro checks, Pagefind, internal-link validation, and public-output scans.

### Analytical responses and practice inputs

Ask the Course uses an evidence-first analytical policy: useful facts and calculations, their implications, validation needs, then specific next inputs. It does not infer purchasing power from an unrelated course capital stack or assume an offer must be below asking. Course claims still require File Search; user-reported facts, arithmetic and assumptions are labeled separately. There is no web search or universal lender-approval threshold.

The stateless server helper in `src/lib/deal-analysis.mjs` recognizes narrowly labeled practice figures from the current message and bounded **user** history. It never treats assistant examples as inputs or runs in synthetic-case modes. It computes valuation, add-back shares, funding gaps, level-payment debt service, cash bridges, coverage and downside scenarios where enough inputs exist. Liquidity is not deployed equity; absent cash deductions are not zero. Conflicting values need clarification; an explicitly `Corrected`/`Updated`/`Revised` labeled amount replaces the earlier amount. Starting a message with `New deal` clears prior deal context sent to the model. Mode/case changes retain their existing session resets. Facts outside the bounded history are not remembered.

Amounts use an explicit currency symbol with optional `k`, `thousand`, `m` or `million`. Ranges, question-form amounts, negated/quoted/example figures, mixed currency symbols and ambiguous wording are not promoted into deterministic facts. Extraction is a convenience, not a complete natural-language financial parser or verification of user assertions. The instructor can explain explicit arithmetic on other unequivocal supplied facts, or ask for a labeled worksheet. Enterprise value is not automatically treated as equity purchase consideration.

A fictional debt worksheet can use:

```text
Senior loan: $1m; senior rate: 6%; senior amortization: 10 years;
senior payments: monthly; seller note: $200k; seller rate: 5%;
seller payments: interest-only; cash flow before debt service: $200k.
```

Alternatively provide normalized EBITDA plus explicit maintenance capex, annual working-capital investment, cash taxes, replacement compensation and other recurring obligations, including explicit zero where applicable. Payment frequency is required for amortizing loans. Level-payment math excludes fees and balloons; interest-only math excludes principal repayment at maturity. Coverage is mathematical, not approval for a financing program. Earnings stress holds supplied deductions fixed; directly supplied cash-flow stress reduces that cash-flow amount. Conflicting reported and calculated cash bridges suppress coverage until reconciled. Closing sources-and-uses totals require all component amounts and assume purchase consideration is payable at closing; contingent earnouts are not closing funding.

Private CIMs, financial packages and document uploads remain prohibited. For diligence practice, paste only permitted public, fictional or demo excerpts within the existing 1,500-character limit. Findings distinguish confirmed concerns, diligence questions and missing information, with excerpt/row evidence, implications and seller/broker questions. Nothing is added to the curriculum or vector store from a conversation.

Regression tests cover purchasing power, valuation/add-backs, debt underwriting, a fictional excerpt and offer structure. `tests/deal-analysis.test.mjs` tests numerical results; `tests/ai-api.test.mjs` checks the actual model request policy, context boundaries and unchanged safeguards. Mocked provider fixtures prove wiring, **not** live model compliance. For live review, use authorized ignored local runtime settings, run the Worker locally, and exercise those five workflows in `/ai/`, including a debt worksheet and a new-deal reset. Review the visible answer, citations and distinctions between facts, calculations and uncertainty. Never log prompts/responses or put credentials in terminal arguments, screenshots, tracked files or build variables. Live evaluation is a separate required check before declaring model behavior verified.

### Compact analytical answers and continuity

The server derives an internal response profile from the current question; the public mode/action contract is unchanged. Only the selected workflow guidance is added, with a compact answer shape and minimum useful sources. Retrieved course examples need not be repeated. File Search remains mandatory with four results, strict output and local citation allowlisting.

| Ask-the-Course message/explain profile | Output-token ceiling | Visible answer target |
| --- | ---: | --- |
| Debt capacity | 1,600 | 300 words; debt service and two earnings sensitivities, interpretation and exclusions |
| Diligence | 1,600 | 350 words; up to five material concerns and five unresolved items, tied questions |
| Offer/structure | 1,400 | 250 words; valuation basis, justified stack and 2–4 remaining decisions |
| Ordinary, purchasing power, valuation | 1,152 | 250 words; relevant analysis and next inputs |

These are conservative initial ceilings, not proof of live-model completion or hard word limits. All other action budgets are unchanged (hint 576, start 768, ordinary synthetic message 960, explain 1,152, review/challenge/reveal 896, show answer/complete 1,400). Output budgets include reasoning and visible output. There is one paid provider call per request: an incomplete `max_output_tokens` response is never presented as a completed answer and still produces the safe `response_too_long` error. No automatic recovery call is made because it could double cost and exceed the existing timeout.

Explicit `Assume…` financing scenarios and named loan terms can supply deterministic conditional debt sensitivities. Monthly senior payments, when unspecified, are an explicitly labeled illustration rather than a user fact. Coverage on stated/pre-add-back earnings is kept separate from validated normalized cash flow; unspecified taxes, working-capital changes and recurring obligations are visibly excluded. Confirm compensation is not already deducted and seller principal/later payment terms separately. Conflicting terms suppress these scenarios. The ordinary calculator still requires supplied deductions and payment frequency for validated cash bridges.

The browser retains each submitted user turn once, including failed or timed-out requests, without fabricating an assistant response. Retries reuse the captured request and do not append another user turn. History stays in memory and within the existing caps; older assistant explanations are trimmed before user facts when the payload exceeds its size cap. New session/mode/case boundaries still reset history, and `New deal` resets server context.

## AI curriculum corpus

The corpus generator reads only:

- authored Markdown in `src/content/lessons/`, `src/content/topics/`, and `src/content/examples/`;
- the public glossary in `src/data/glossary.json` and curriculum module descriptions in `src/data/modules.json`;
- public Yusufa and Fund Launch source identities/URLs intentionally exposed through `src/data/videos.json`, `src/data/fund-launch.json`, and the curriculum frontmatter relationships.

It does not read `src/data/evidence.json`, numbers or provider datasets, research files, raw YouTube/MLX/Whisper transcripts, source PDFs, Fund Launch guide text, protected inputs, or local provenance. Generated Markdown documents preserve page title, canonical URL, slug, page type, module/topic labels, editorial lineage, intentional public source IDs and source URLs. Current corpus generation produces about 153 curriculum and metadata documents; the exact count follows the content.

Generate and review the files before publishing:

```sh
npm run generate:ai-corpus
```

Inspect `artifacts/ai-corpus/` and `src/data/ai-corpus-manifest.json`. Confirm each Markdown file is authored course material, the source-family label is correct, and original links are already public on the corresponding page. The corpus files stay outside both `public/` and `dist/`.

Publishing is a separate, explicit operation. First create a dedicated OpenAI project for this service, scope its key to that project, and set model access and enforced spend controls. Supply the key to the current local shell through a password manager or another method that does not place it in command history, then run:

```sh
npm run publish:ai-corpus
```

The publisher uploads only the generated `ac-*` Markdown documents, attaches page metadata, applies bounded 500-token chunks with 80-token overlap, and waits for the vector-store batch to finish. It prints the new vector-store ID locally; do not add that value to Git, Astro variables, public output, issues, or analytics. Inspect the store in the OpenAI project and verify its file count, titles, canonical URLs, and source-family metadata before connecting it to the Worker.

For an update, generate and review a new corpus snapshot, publish a new store, wait for complete indexing, then change the Worker’s `OPENAI_VECTOR_STORE_ID` to the new value. Verify `/api/ai/status` and test representative questions before deleting the old store. Do not delete the active store before the cutover has been checked.

## Cloudflare Worker runtime settings

The existing GitHub → **Workers Builds** project remains the deployment path. Keep the repository root, build command `npm run build`, and deploy command `npx wrangler deploy`. `wrangler.jsonc` attaches the Worker to the existing static `dist/` output and routes only `/api/*` through Worker code. It declares session, IP, and edge-local rate limits. Other site paths and assets remain static.

Runtime settings are separate from Workers Builds **Build Variables and Secrets**:

1. In Cloudflare, open **Workers & Pages → `acquisition-companion` → Settings → Variables and Secrets**. Use the production Worker’s runtime settings.
2. Add `OPENAI_API_KEY` as a **Secret**. Use the dedicated project key.
3. Add `OPENAI_VECTOR_STORE_ID` as a **Secret** containing the approved public-curriculum store ID. It is environment-specific and must stay server-side.
4. Add `OPENAI_MODEL` as a **Text** variable only if you want an explicit override. The default is `gpt-5.6-luna`.
5. Add `AI_ENABLED` as a **Text** variable and keep it `false` until the corpus, key, rate-limit bindings, cost controls, and privacy notice have been reviewed. Set it to exactly `true` only when ready to enable the feature.
6. Save and deploy the Worker variables, then verify `GET https://acquisitioncompanion.com/api/ai/status` returns `{"status":"ready","available":true}`. This response contains no secret values.

The Wrangler config sets `keep_vars: true` to retain dashboard-managed Worker variables on later Wrangler deployments. Review this behavior as part of each deployment. The rate-limit namespace IDs are non-secret stable identifiers in `wrangler.jsonc`; Wrangler provisions the bindings. If an ID conflicts with an existing namespace in the Cloudflare account, change only the conflicting ID to a unique positive integer and keep it stable after creation.

Workers Builds build-time values remain distinct: `SITE_URL` and optional public `PUBLIC_GA_MEASUREMENT_ID` belong in **Settings → Build → Build Variables and Secrets**. Never prefix any AI setting with `PUBLIC_`. The Worker’s own responses repeat the existing security headers and use `Cache-Control: no-store, private`.

## Runtime request and privacy limits

- `AI_ENABLED` must equal `true`; absent or different values disable model calls.
- `POST /api/ai` accepts only `ask_course`, `deal_lab`, or `ic_challenge`, JSON, same-origin browser requests, and known fields.
- Body maximum is 12 KiB; the current message is at most 1,500 Unicode characters.
- The browser keeps text in memory for the active page only. It sends no more than eight history messages (failed user turns may have no assistant pair), 4,500 history characters total, and 1,200 characters per entry, with its existing 3,000-byte serialized-history cap. Its random rate-limit token is kept in `sessionStorage`; prompts and responses are not persisted by this site.
- The Worker adds a 20-second OpenAI timeout, a 1 MB provider-response body limit, a 6,000-character response-text limit, at most four File Search results, and bounded action/profile output ceilings shown above (maximum 1,600).
- OpenAI receives `store: false` and only the required File Search tool pointed at the approved course vector store. The Worker rejects responses without a completed File Search call. No web-search tool, arbitrary file inputs, document uploads, or data-room retrieval are enabled.
- The Worker does not log prompts, responses, session IDs, API keys, or Turnstile secrets. Unknown returned filenames are omitted; course and original-source links are built from the local metadata allowlist.
- Responses can still contain inaccurate explanation. Citations identify public retrieved pages, not independent validation of a transaction claim. Synthetic case arithmetic is calculated in code and returned as case truth only from that code.

Three Cloudflare Rate Limiting bindings protect each request: 8 calls per minute per opaque browser session, 30 per minute per connecting IP, and 120 per minute per Worker edge location. The session bound reduces casual cross-tab abuse, while IP and edge ceilings remain if a caller rotates the session ID. Cloudflare limits are defense-in-depth and not a single global spend quota; they can be permissive and eventually consistent. Turnstile is not enabled in v1, so there is no additional challenge UX or secret to configure.

Create a separate OpenAI project for AI Deal Lab. In its **Limits** settings, set a low monthly project spend limit and, where available, choose an enforced hard limit rather than alerts alone. Restrict the project to `gpt-5.6-luna` and review the platform’s current model/token and storage limits. Check the OpenAI Usage dashboard and Worker request/429/error metrics frequently after activation. OpenAI documents that project and organization spend limits can be enforced as hard caps, while alert-only limits do not stop usage; verify which mode is active in the project. Cloudflare rate limits remain useful if the key is disabled or OpenAI billing controls are misconfigured.

## Disable, rotate, change model

- **Emergency disable:** in the Worker’s runtime **Variables and Secrets**, set `AI_ENABLED=false` and save/deploy. The endpoint refuses model calls and the page shows that AI is being configured. For urgent containment, also revoke the OpenAI project key in OpenAI.
- **Rotate key:** create a replacement key for the dedicated project, update the `OPENAI_API_KEY` Worker Secret, save/deploy, verify status and one controlled request, then revoke the old key. Do not paste keys into chat or commit them.
- **Change model:** set the Worker runtime text variable `OPENAI_MODEL`. The value is validated and sent only by the Worker. Confirm that the chosen model still supports Responses API structured output and File Search before enabling it. Omitting the variable selects `gpt-5.6-luna`.
- **Inspect cost:** use the dedicated OpenAI project’s Usage/Costs views and limits. Review rate-limit and error metrics in the Cloudflare Worker dashboard; no prompts or answer text are emitted in the Worker’s application logs.

## Current manual setup status

No OpenAI key, environment-specific vector-store ID, or Turnstile secret is committed. The first Worker plus assets deployment is live, but no OpenAI credentials, vector store, or AI runtime variables were added. Production `/api/ai/status` reports unavailable and `POST /api/ai` fails closed. Adam’s predeployment dashboard inspection found no existing AI runtime values; `keep_vars: true` preserves dashboard variables on later deployments. The dashboard Variables and Secrets screen was not directly inspected after deployment from this session, so confirm it is available before manual configuration. Keep `AI_ENABLED=false` until the reviewed corpus, key, rate limits, and spend controls are ready.
