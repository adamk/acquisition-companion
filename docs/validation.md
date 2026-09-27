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
