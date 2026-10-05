# Post-remediation editorial review

Date: 2026-10-04

Baseline: `origin/main` at `144acd5341ce965b8bb37b80dac33b61598c1d3e`

Status: editorial review prepared locally before release. It is included in the final source release; the audit report itself is not part of the public site or AI corpus.

This is an editorial comparison, not a legal clearance. The clean current-main checkout did not contain earlier audit files at this path; this is a new companion review, and no prior audit files were copied or modified.

## Reconciled counts and current source

The current data files define the counts as follows:

- `src/data/videos.json`: 118 Yusufa Sey videos, including `nYNfdSQqk3o`, “PE entrepreneur on running a €60M group in UK” (published 2026-10-04).
- `src/data/fund-launch.json`: 4 Fund Launch guides. Combining those registries gives 122 public source records: 118 videos plus 4 guides.
- `src/data/numbers.json`: 313 Yusufa-linked quantitative records.
- `src/data/fund-launch-numbers.json`: 4 Fund Launch quantitative records; the combined identifiers are 317 unique records.
- AI corpus: 153 documents: 20 lessons, 48 topics, 12 examples, 59 glossary entries and 14 modules.

The reports saying “118 sources” and “313 quantitative references” appear to count the Yusufa video and number registries only. The stale checkout’s 117 Yusufa records omitted the October 4 video. Its 317 quantitative-record count includes the 4 Fund Launch records as well as the 313 Yusufa records. The definitions differ; the source and reference records were not altered to force a match.

The October 4 source remains in canonical metadata with its title, creator, date and canonical YouTube URL. Its transcript is classified as Whisper audio recovery; the source caution still says wording and numerical claims have not been independently verified, and practitioner statements are not independently substantiated. The six reviewed transcript ranges remain in the source record. The new video remains associated with 16 intended AI corpus documents, including the three lessons below, and its provenance/caution appears in each associated document.

## Six worked examples

Each page now identifies itself as a fictional Acquisition Companion example. Its source/evidence/quantitative-reference associations are empty, so the invented inputs are not credited to a creator and do not become source-derived defaults in the corpus. The old creator-specific transaction narratives and numerical sequences were removed from these six pages.

| Example | Fictional inputs and checked outputs |
| --- | --- |
| `earnings-after-debt-service` | £330,000 cash available; £1.2m senior loan, 8-year equal principal and an assumed 8% opening-balance interest method; £48,000 seller-note payment. Senior debt service £246,000; combined payments £294,000; remainder £36,000; coverage 1.12×. |
| `exceptional-deferred-purchase` | £2.1m price: £1.65m at completion and £450,000 after 18 months; £380,000 forecast cash then; potential gap £70,000. |
| `machinery-borrowing-base` | £520,000 book value; £355,000 appraisal; £55,000 ineligible; £300,000 eligible; assumed 62% advance rate produces £186,000 gross base, or 35.8% of book value. |
| `marketing-addback` | £420,000 reported EBITDA; £120,000 proposed adjustment, of which fictional records support £36,000 as one-time and £84,000 as ongoing; candidate adjusted EBITDA £456,000. |
| `preference-before-common` | $2m investment; 1.4× nonparticipating preference or 25% conversion. At $3.6m proceeds, preference is $2.8m, conversion is $0.9m and $0.8m remains for common. At $2.4m proceeds, preference is capped at $2.4m and common receives zero. |
| `seller-rollover-price-bridge` | £960,000 for 60% implies £1.6m total equity value and a proportional £640,000 for 40%, subject to the stated identical-rights assumption. The retained amount is not represented as cash or a guaranteed payment. |

An independent arithmetic check asserted all 18 derived values. The examples label all terms as fictional assumptions; none was added to the quantitative-reference registries or presented as a typical market term.

Before/after similarity checks compared each rewrite against its associated current transcript. No exact 5-, 8- or 12-word sequence was shared. The longest common run was four words; maximum sentence-level lexical Jaccard similarity was 0.185. The paragraph-order screen found fewer than three monotonic paragraph matches at its 0.25 similarity threshold. Headings and explanatory sequence were newly organized around the existing Acquisition Companion learning objectives. These metrics are screening signals, not legal conclusions.

## The three source-concentrated lessons

All three pages were reviewed against their current text and all linked transcripts. Each has no exact 5-, 8- or 12-word overlap with its associated transcripts. Maximum common runs were three to four words; maximum sentence-level lexical similarity was below 0.19. The three October 4 additions remain in their existing lesson structures.

| Page | Source concentration | Expression and structure | Independent curriculum contribution | Disposition |
| --- | --- | --- | --- | --- |
| `/course/building-a-group/` | 8 linked Yusufa videos. | No significant exact or sentence-level match. The lesson does not track one video's progression; its sections combine group strategy, integration, financing and downside. | It gives buyers an Acquisition Companion checklist for integration responsibilities, funding and connected obligations. The October 4 shared-CFO example is brief, attributed as practitioner experience and expressly does not promise synergy. | **NO EDIT NEEDED** |
| `/course/building-the-capital-stack/` | 12 linked Yusufa videos plus 2 Fund Launch guides. | No significant exact or sentence-level match. The current source illustration retains one attributed factual £3.5m funding split; it is clearly labeled as a source illustration and is not expanded into a source narrative. | The lesson independently organizes sources and uses, post-close cash demands, security, risk allocation and Fund Launch financing material. The October 4 lender/equity comparison is conceptual and explicitly uses one set of facts. | **NO EDIT NEEDED** |
| `/course/management-after-acquisition/` | 14 linked Yusufa videos. | No significant exact or sentence-level match. The page combines multiple videos under the existing course structure instead of reconstructing a single video. A short attributed incentive illustration retains source-reported terms. | It adds an Acquisition Companion accountability framework for hiring, reporting, authority, escalation and post-close review. The October 4 governance model is labeled Sey’s preference, while management capacity is stated as the broader principle. | **NO EDIT NEEDED** |

The high concentration is documented separately from expression and structure. It did not, by itself, trigger a rewrite. No lesson was edited in this pass.

## Broader text comparison

A screening comparison covered all 80 authored lesson, topic and example pages and their 412 linked source associations. All 412 associations mapped to locally available transcripts. It found one exact five-word match in `/topics/government-backed-lending/`; it is ordinary share-purchase-agreement terminology, with no longer phrase, elevated sentence similarity or ordered-paragraph signal. It is not a concrete close-expression or condensation finding. No other page met the screening thresholds.

A separate 50-word verbatim-window scan compared the built site with 64 local caption/Whisper transcript files. It found zero matching windows, and source-file hashes were unchanged during the scan. No full transcript, audio, caption or subtitle files appear in the generated AI corpus; its 153 files use the `ac-` authored-curriculum naming scheme.

## Runtime, corpus and product boundaries

- Deal Lab runtime instructions now constrain complete transcripts, whole-video substitutes, creator-catalog reconstructions and long source-specific paraphrases. Those requests are directed to a brief answer from returned Acquisition Companion-authored curriculum and the original linked source. The instruction also says ordinary acquisition questions should be answered normally. Mocked tests confirm the policy reaches model instructions while normal questions still use required File Search.
- Corpus generation continues to read curated authored lesson/topic/example Markdown, glossary data and module data. Regression fixtures put raw Markdown, SRT, VTT and audio files in unapproved locations and confirm they do not enter generated corpus documents. Public-output validation now rejects caption/subtitle/transcript/audio directories and raw-text/media formats.
- The generated manifest still contains 153 documents. Exactly six document metadata records changed, corresponding to the six rewritten examples; no documents were added or removed. The changed example documents now use `Acquisition Companion original synthesis` and contain no creator/video source reference. The reconstruction policy stays in runtime instructions, not educational corpus copy.
- Pricing now states that the course, topics, examples and source-linked educational material remain free, and that subscriptions support interactive AI analysis, deterministic calculations, deal-reasoning and practice workflows, and model/compute costs. About copy was corrected because it previously said there were no subscriptions. Deal Lab and homepage wording clarify independent authorship and that source attribution does not imply creator involvement or endorsement. Existing footer/About non-affiliation disclosure remains.
- Methodology now records the source-closed editorial sequence: source → concept/fact ledger → remove raw source from drafting context → draft from the existing Acquisition Companion outline → add original analysis/examples/counterpoints → source fact-check → wording/structure comparison → publish.

## Validation

- `npm run build`: 155 tests passed, 1 skipped, 0 failed; Astro check reported 0 errors, warnings or hints; static build produced 251 pages; Pagefind indexed 251 pages and 4,459 words; distribution checks passed with 11,123 internal links checked, 118 videos, 4 Fund Launch guides, and privacy/link scans passed.
- Browser smoke: 29 routes; desktop accessibility audit had 0 violations and 0 browser errors. Changed lessons and all six rewritten examples were checked at 390px and 768px for horizontal overflow; the suite also covers 1440px rendering.
- Mocked AI browser suite: 32 questions, citations and normal interactions passed; 0 accessibility violations, 0 browser errors and 0 direct OpenAI requests; 390px and 768px checks passed.
- Mocked paid/account browser suite: 390px, 768px and 1440px; 0 accessibility violations/errors/external requests. Checkout was a local fixture; no Stripe request occurred.
- Corpus: 153 documents generated; only the six reviewed example records changed in the manifest; October 4 source metadata and all 16 associations retained.
- Similarity: all 80 authored pages compared; no material match finding. The six rewrites had no exact 5/8/12-word overlap. The 50-word scan found 0 verbatim windows across 64 protected transcript files.
- `git diff --check`: passed.

No production vector store, runtime configuration, account/billing setting or Stripe integration was changed. These results describe the local checkout only and do not resolve any legal question.
