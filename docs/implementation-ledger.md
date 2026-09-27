# Implementation ledger — plan: docs/superpowers/plans/2026-09-27-site.md

- Design: static editorial curriculum and reference graph selected over a research-document archive or client-heavy application.
- User supplied comprehensive scope and explicitly requested uninterrupted completion; routine approval gates are waived by that instruction.
- Isolated new staging repository: temporary staging directory. The requested Desktop destination did not exist during inspection. No linked worktree is needed for this new independent repository.
- Source inspection: all nine research files parsed in full; inventory 117, evidence 243, finance cards164, quantitative313, core providers28. Prior source context and source limitations retained.
- Interfaces: importer publishes safe data; editorial collections reference stable evidence/video IDs; UI resolves references only at build time; tests enforce these contracts.

- Task 1 complete: read-only importer and editorial overlays produce 243 evidence references, 117 videos, 313 numbers and 28 providers. Import tests observed red, then five passing tests; separate regeneration byte-identical.
- Task 2 complete: 20 lessons (11,657 substantive words), 44 topics, 12 examples and 44 glossary entries. Source/evidence IDs and topic/lesson links checked.
- Task 3: 236 static pages generated; first privacy/link scan passed after correcting a scanner false positive that confused the topic slug private-credit with the private/ directory. Regression test added.
- Task 4: filtering/canonical/progress tests observed red then green. Optional localStorage failure is explicitly handled; production Pagefind assets generated.
- Environment ruling: the Mac's /usr/local/bin/node is 20.10 while the tested nvm version is 22.23.0. Dependencies were reinstalled under Node 22 after the older runtime skipped optional native bindings. Node selection is documented and engine-strict prevents silent incompatible installs.
- Review finding fixed: topic number previews omitted caution/classification and could expose low-confidence values without qualification. Previews now exclude low confidence and display type plus caution. Regression test observed red then green.
- Source audit: 73 protected inputs unchanged; 64 raw transcript files compared against built educational copy; no normalized 50-word matches. All source-title links are intentionally preserved and excluded from overlap comparison.

- Task 5 complete: delivered to acquisition-companion without overwriting an existing directory. Final-location production build passed 18 tests, zero Astro errors/warnings/hints, and 10,084 checked internal links across 236 pages.
- Final-location Chrome QA passed on 13 routes with zero automated axe violations or browser errors; search, filtering, optional progress, denied storage, no-JavaScript content and three viewport widths verified.
- Canonical-origin smoke test passed; final build restores an unset domain and noindex preview state. Desktop/mobile/search screenshots visually reviewed.
- All 73 protected source hashes remain unchanged. Final output scan again found zero normalized 50-word transcript matches. Local preview is available on 127.0.0.1:4321; nothing publicly deployed.

- Editorial refinement complete: Acquisition Companion brand/subtitle; course/reference copy, duplicated source presentation and navigation improved within the existing scope. See docs/editorial-review.md. Full validation rerun: 20 tests, 236 pages, 10,078 links, 13 browser routes, no automated accessibility violations. Protected inputs and private provenance unchanged.
