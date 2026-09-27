# Acquisition Companion: v1 editorial review

## Scope and decisions

This pass refines the existing free educational site. No new source material, routes, curriculum units, dependencies, commercial features, or deployment were added. Site name, working subtitle and monogram now use Acquisition Companion. The project directory and stable content URLs remain unchanged.

The review read all 20 lessons, 44 topics, 12 examples, 44 glossary entries, 313 quantitative records, 28 provider entries and 117 source summaries, as well as all page templates, layouts, components, styles and browser scripts. The course already contained useful distinctions and source qualifications; those were retained rather than flattening the material into confident general advice.

## Material improvements

- Lesson explanations now state the direction of buyer calls and seller puts, define EBITDA directly, and put the debt-service arithmetic in a table. Existing pipeline, liquidity, diligence and integration exercises now identify the decision or calculation the reader should make.
- Private-credit and other topic copy begins with the concept rather than an assessment of the research. Existing limits on institutional credit, government-backed lending, product detail and returns remain explicit.
- Topic definitions appear once. Worked-example descriptions now explain what each example teaches instead of repeating its title and a generic sentence. A small set of glossary definitions and acronym labels were clarified.
- Internal evidence IDs no longer interrupt paragraph link labels. Evidence IDs and exact original URLs remain intact. Duplicate lesson-end video lists were removed; the existing Sources panel still presents every original title and viewing URL from the unchanged source relationships. Further-viewing guidance remains.
- The course sidebar shows the current module, with the full course list behind a native disclosure. Mobile main navigation wraps; every destination is visible. Both work without JavaScript.
- Related concepts omit the current topic while retaining it for matching course lessons. Source filtering is labeled Coverage; numerical classification filtering retains Evidence type. Failed search offers reader-facing links instead of developer commands.
- Homepage repetition, generic headings and unconfigured-contact placeholder copy were cut. Independence, free access, attribution, creator rights and no-transcript disclosures remain visible.

## Evidence correction within the existing research

N197 now reads “Trade debtors identified,” rather than “Eligible trade debtors.” Identification in accounts does not establish lender approval. An editorial metric override makes this correction survive re-import; the original research row is preserved. The existing pounds/euros uncertainty is now also visible in the Irish debtor example and its two relevant topics. No numerical value, transaction classification, confidence rating or source relationship was changed.

Final review caught 13 missing inline links in rewritten passages. They were restored before the final build. A comparison across all 76 authored Markdown files confirms that inline original-video URL occurrences before Further viewing match the pre-edit versions. A regression check now covers source links beside the private-credit explanation and the worked repayment table.

## Validation

Production build: 20 tests passed; zero Astro/TypeScript errors, warnings or hints; 236 pages and 117 unique source videos; 10,078 internal links checked. Browser QA: 13 routes, zero automated accessibility violations or browser errors; search, filters, reset, progress, denied storage, no-JavaScript access and 390/768/1440px layouts passed. Updated mobile homepage and no-JavaScript lesson screenshots were visually reviewed.

All 73 protected research/corpus hashes remain unchanged. The output audit found no private-path/transcript leakage and no normalized 50-word transcript matches. Re-import reproduced generated files exactly. Automated checks are not a substitute for a complete assistive-technology audit or independent verification of the speakers’ transaction claims.

Nothing was deployed. Domain and analytics configuration remain unchanged.

## Phase 2 Fund Launch enrichment

Four public Fund Launch guides were read as a separate source family. The first collection remains the buyer/operator evidence base; Fund Launch supplies fund-manager and lender explanations. No original Yusufa source, evidence, number, provider or private provenance record was rewritten. The site retains the central conclusion that the first collection establishes no named completed private-credit facility.

The 20-lesson beginner course remains in its original order. Three existing lessons gain short connections where the new material clarifies funding or investor choice. Four durable topic guides address direct lending, mezzanine, independent sponsorship and committed funds; the private-credit, bank-debt, capital-stack and subordination topics were revised in place. An optional advanced path appears after the course and an optional credit sequence appears on the financing page. The source index links all four originals, and the numbers table labels four Fund Launch records separately from the 313 Yusufa-derived records.

Editorial checks: borrower and lender questions are distinguished; cash-flow underwriting is not equated with an unsecured loan; unitranche is shown as an alternative facility design rather than a required stack rung; seller subordination is not relabeled as institutional mezzanine; PIK is illustrated as future balance growth rather than free cash; and fund formation remains an advanced topic. Legal rules, exemptions, launch costs and current pricing were omitted from teaching copy. Fund terms retained in the numbers reference carry a source, audience and date caution. No guide table or long passage is reproduced.
