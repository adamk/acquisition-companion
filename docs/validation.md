# Validation record

Reviewed on 27 September 2026. No public deployment or production domain configuration performed.

## Content and build

- 14 modules, 20 lessons, 44 topic guides, 44 glossary entries, 12 examples.
- 313 quantitative references, 28 provider/intermediary entries, 243 evidence references.
- 117 unique original video IDs and URLs: 57 native captions and 60 audio transcriptions.
- Production output: 236 HTML pages. Pagefind indexes the public content; browser search returns relevant results.
- 20 unit, importer, relationship, content and output-policy tests pass.
- Astro/TypeScript checks: zero errors and warnings.
- Built-output validation checks 10,078 internal links and fragments; no broken links or public source paths/private metadata detected.
- Configured-origin smoke test emits canonical tags, an allowed-crawl robots file and 234 absolute sitemap URLs. Unconfigured builds omit canonical tags, disallow crawling and emit an empty sitemap. The reserved test origin is not retained in the final build.

## Browser and accessibility checks

- 13 representative routes checked with axe: zero automated violations.
- No browser page errors in the checked routes.
- Search, filtering, reset, local completion persistence, denied storage and no-JavaScript reference access pass.
- No page overflow at 390, 768 and 1,440 pixels. Wide reference tables have their own scroll region.
- Desktop and mobile homepage and desktop search screenshots visually reviewed. Clear reading hierarchy and source links; no clipping in the checked layouts. Mobile navigation wraps so every destination is visible. Lesson contents remain compact without JavaScript.
- Automated accessibility checks supplement, rather than replace, a full manual assistive-technology review.

## Evidence and privacy

- 73 protected research/corpus input hashes unchanged.
- 64 raw transcript files compared with public educational copy: no normalized 50-word transcript passages found. Required original-video title links are excluded from this comparison.
- Full provenance is kept in private/provenance.json, outside the deployable output. No raw transcript is copied to public/ or dist/.
- Independent review identified missing qualifications in numerical topic previews. Fixed: low-confidence numbers are excluded from those previews; remaining previews show classification and caution. A regression test covers selection.

## Limits retained deliberately

Machine-transcript uncertainties remain qualified. Four unusable substantive recoveries and two incomplete recoveries remain represented in the source index. Reported completed transactions are source reports, not independently audited outcomes. The collection discusses LP-funded non-bank and institutional debt but establishes no named completed private-credit facility; Duke Royalty remains a prospective contact. No current lender pricing or full technical lending manual is implied.

Reproduce the checks using README.md. Machine-readable results and screenshots are generated under artifacts/ and are not committed. Only dist/ is deployable.

## Delivered-location verification

The build, browser checks and source-preservation audit were rerun successfully from acquisition-companion. The final build has no production origin configured and contains none of the reserved canonical-test origin. Preview runs locally at http://127.0.0.1:4321.

## Editorial review and rebrand

Brand updated to Acquisition Companion; working subtitle is “The free, source-linked guide to buying, financing, and building businesses.” Browser assertions verify the rendered brand and description. No old brand remains in source, public assets, documentation or the production output.

The complete production build and browser suite were rerun after editing. Additional regressions check the receivables label, unique topic definition, absence of topic self-links, source coverage filter label, failed-search fallback and compact mobile course navigation with JavaScript disabled. All passed. Re-import into a separate temporary directory reproduces the generated data and private provenance byte for byte.

All content source/evidence IDs and example statuses match the pre-edit versions. All 313 numerical values, classifications, confidence levels and source relationships are unchanged. N197 has a more precise public label and qualification; its original source row remains untouched in private provenance. The four generated evidence/provider/video/provenance datasets otherwise retain their validated source handling. See editorial-review.md for review coverage and decisions.

## Phase 2 Fund Launch validation

The 27 September 2026 enrichment adds four Fund Launch public guide identities, four topic guides and four separately labeled Fund Launch numeric references. The original 117 Yusufa video identities and 313 numeric records remain separate. The production build passes 21 tests and zero Astro/TypeScript errors, warnings or hints; Pagefind indexes 245 pages and the output audit resolves 10,455 internal links. Browser QA covers 19 routes with zero axe violations or page errors and passes search, filters, progress, no-JavaScript and 390/768/1440px checks. The source-preservation audit confirms all 73 protected input hashes unchanged and zero 50-word transcript overlaps. The four Fund Launch guide HTML pages were fetched only to a temporary directory for a separate visible-text scan; no site page contains a 12-word contiguous match, below the 24-word failure threshold. No raw guide or transcript is shipped in `dist/`. No deployment or domain change is part of this phase.

## AI Deal Lab implementation validation — 30 September 2026

- Generated and inspected the allowlisted AI corpus: 153 authored curriculum, glossary, module, and intentional public relationship documents. Corpus unit tests prove that research claim text, raw transcripts, and protected input fixtures are excluded. Corpus publishing was not run.
- Production-style Astro build completed with the public `SITE_URL` and consent-gated Measurement ID, with no OpenAI runtime values. All 55 unit, content, API, corpus, case, analytics, and output-policy tests pass. Astro reports zero errors, warnings, or hints. Pagefind indexes 247 pages. The public output check passes 11,240 internal links, privacy/path checks, private-runtime sentinel checks, case-rubric/staged-fact checks, and the no-source-map check.
- Chrome/Playwright checks pass: 19 representative site routes with zero browser errors or axe violations; the existing analytics consent flow; and all three mocked AI modes. AI browser QA covers eight requests, citations, literal model HTML, case progression and arithmetic, qualitative IC feedback, rate-limit and retry states, analytics parameter limits, session-only storage, zero direct OpenAI browser requests, mobile overflow, and zero axe violations or page errors at 390 and 768 pixels.
- Wrangler 4.145.0 dry run packages all 780 static assets with the Worker and the session/IP/edge rate-limit bindings. A local Worker check serves `/ai/`, reports AI unavailable, and returns 503 from `POST /api/ai` with no runtime settings. File Search is mandatory in each model request; the API rejects a response without a completed File Search call. No live OpenAI request, corpus upload, production configuration change, or deployment was performed.
- The current ignored `private/import-manifest.json` provides hashes for nine protected source files; all nine match. The separate 73-entry manifest described in the September 27 validation record is not present in this checkout, so that historical 73-file count was not independently reproduced in this run. The transcript scan compared all 64 available raw transcript files against the built educational pages and found zero normalized 50-word overlaps.
- The four current Fund Launch guide pages were downloaded only to `/private/tmp` for the visible-text overlap scan. Each reports zero matching contiguous words with built site pages, below the 24-word threshold. No source HTML was placed in the repository, `public/`, the AI corpus, or `dist/`.
- No actual OpenAI credential or environment-specific vector-store ID is in source or build output; `.dev.vars.example` contains placeholders only. This change is local and uncommitted, so the live site remains unchanged. Before any future push, inspect existing Worker runtime variables because `keep_vars: true` preserves dashboard settings; a deployed Worker must remain disabled until the approved settings are reviewed and `AI_ENABLED` is deliberately set to `true`.
