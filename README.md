# Acquisition Companion

The free, source-linked guide to buying, financing, and building businesses.

Acquisition Companion is a free, independent Astro guide to buying, financing, and building businesses. It connects original teaching across public sources and links readers to the creators' full material. It is not affiliated with or endorsed by Yusufa Sey, Fund Launch, or other referenced creators. The site has no accounts, payments, advertising, affiliate links, trackers, server runtime, or public transcript corpus.

## Local development

Use Node **22.23.0** (the tested version; dependencies require at least 22.19):

```sh
git clone https://github.com/adamk/acquisition-companion.git
cd acquisition-companion
nvm use
npm ci
npm run dev
```

Development runs on `http://127.0.0.1:4321` unless the port is occupied. Pagefind is generated after a production build, so use production preview to review search:

```sh
npm run build
npm run preview
```

Astro 7 runs preview as a background local server. Use `npx astro preview status`, `npx astro preview logs`, and `npx astro preview stop` to inspect or stop it. This preview is not a public deployment.

## Production build

```sh
npm ci
npm run build
```

**Exact build command:** `npm run build`  
**Exact output directory:** `dist`

The command runs unit/content checks, Astro/TypeScript checks, the static build, sitemap generation, Pagefind indexing, and a built-output privacy/link audit. All required site content and sanitized structured data are committed. A normal build does **not** need the research corpus, Python, downloaded audio, or external content fetching.

## Cloudflare Pages

1. Review the local production preview and the editorial limitations below.
2. In Cloudflare, choose **Workers & Pages → Create → Pages**, then connect `adamk/acquisition-companion` through GitHub. Choose the **Astro** framework preset and production branch `main`.
4. Set **Build command** to `npm run build` and **Build output directory** to `dist`. Root directory is the repository root. No Cloudflare adapter or SSR functions are required.
5. Set `NODE_VERSION=22.23.0`, `SITE_URL=https://acquisitioncompanion.com`, and `PUBLIC_GA_MEASUREMENT_ID=G-L37H8G797Y` in the Pages production build environment. The GA Measurement ID is public. Omit it to disable analytics and the consent banner.
6. After domain ownership is confirmed, add `acquisitioncompanion.com` as a Pages custom domain. The apex domain requires a Cloudflare DNS zone and Cloudflare authoritative nameservers. Configure `www.acquisitioncompanion.com` to redirect permanently to the apex. Verify HTTPS, redirects, source links, search, headers, canonical tags, sitemap, robots file, and mobile layout on the live deployment.

With `SITE_URL` unset, the site omits canonical URLs, emits an empty sitemap, and marks preview pages `noindex`; robots disallows crawling. Public source links remain the creators' original URLs regardless of the site domain. Domain and DNS account changes should be made only after ownership and current records are verified.

The current GitHub check reports **Workers Builds: acquisition-companion**. For that integration, add `PUBLIC_GA_MEASUREMENT_ID` under **Workers & Pages → acquisition-companion → Settings → Build → Build Variables and Secrets**, then retry a production build. This is a build variable because Astro generates static HTML; adding a runtime Worker variable alone will not enable the banner. The value is public and should be stored as text, not a secret.

Official references: [Astro content collections](https://docs.astro.build/en/guides/content-collections/), [Cloudflare Pages build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Pagefind indexing](https://pagefind.app/docs/running-pagefind/).

## Configuration

Edit **`src/site-config.mjs`**. It is the central configuration for:

- Site name and subtitle.
- Canonical domain (`SITE_URL` can override it during a build).
- Contact email (blank until chosen; no invented contact address).
- Optional consent-gated Google Analytics (`PUBLIC_GA_MEASUREMENT_ID`).
- Source-collection display names and descriptions.

No permanent production domain is hardcoded. Analytics stay off when the public Measurement ID is absent or a visitor declines. The site loads direct `gtag.js` only after consent, disables Google advertising signals, and links to a short privacy explanation and a footer preference control. It loads no third-party fonts, ads, or embedded videos. The favicon is an original placeholder mark, replaceable in `public/favicon.svg`.

## Content and relationships

- `src/content/lessons/`: 20 original lessons in 14 modules.
- `src/content/topics/`: 48 original topic guides, including four focused Phase 2 financing and fund-adjacent references.
- `src/content/examples/`: 12 worked examples with explicit status.
- `src/data/modules.json`: curriculum order and module descriptions.
- `src/data/glossary.json`: plain-English acquisition and relevant capital-provider terms.
- `src/data/evidence.json`: 243 public-safe evidence references, without research claim text or supporting excerpts.
- `src/data/videos.json`: 117 exact original video identities, short concept descriptions, and useful-content flags.
- `src/data/numbers.json`: 313 quantitative records with original editorial context, classification, and caution.
- `src/data/fund-launch.json`: four public Fund Launch guide identities, original summaries, relationships and classified editorial notes. It is a separate source family, not an extension of Yusufa evidence IDs.
- `src/data/fund-launch-numbers.json`: separately labeled, dated Fund Launch illustrations and typical ranges with direct source URLs. They are not added to the 313 Yusufa records.
- `src/data/providers.json`: 28 provider/firm/intermediary records with roles and relationship status.
- `src/data/number-editorial.json` and `provider-editorial.json`: reviewed editorial overlays used by the importer.
The optional importer can generate detailed provenance and research-input hashes locally. Those outputs are ignored by Git and are not needed for public builds. Never place research inputs or importer audit outputs in `public/`.

Astro content collections validate frontmatter. Relationships are IDs and slugs, not duplicated video descriptions in UI components. Topic pages find related lessons, examples, numbers and sources at build time. Search runs over the public HTML. Its generated index contains no private transcript metadata.

New source collections need separate identities, provenance and routing. Fund Launch guides are indexed under `/sources/fund-launch/`; original Yusufa video IDs and evidence remain unchanged. See `docs/content-contract.json` for the core content schemas.

## Regenerating research data

This is a deliberate editorial workflow, separate from a normal build. It needs Python 3 and read access to the research directory:

```sh
python3 scripts/import-research.py \
  --input '/path/to/yusufa_analysis' \
  --output .
```

The importer parses the evidence/inventory CSVs and escaped-pipe Markdown tables. It preserves stable row-based IDs, applies the reviewed original context overlays, validates source identities, and writes public-safe JSON plus local-only provenance. It rejects output inside the input research directory. It never copies raw transcript files. All nine input files are hashed to verify read-only handling.

If the research changes, reconcile rows and editorial overlays deliberately; do not assume ordinal IDs still refer to the same claim. Review the generated diff, update authored content as needed, and run the full tests/build. Source creators and videos remain the primary evidence.

## Verification

```sh
npm test
npm run check
npm run build
npm run test:browser
```

Browser QA uses the locally installed Google Chrome through Playwright and requires a running preview. On another machine, install Chrome or change the browser channel in `scripts/browser-check.mjs`. Set `PREVIEW_URL` if using a different port. Browser QA checks representative routes with axe, desktop/tablet/mobile overflow, search results, filters, keyboard access, local progress, blocked storage and no-JavaScript access.

`artifacts/` contains local screenshots and machine-readable validation results and is Git-ignored. `docs/validation.md` records the reviewed result. The optional local source audit compares output against the read-only corpus and an initial hash manifest:

```sh
python3 scripts/check-source-preservation.py \
  --manifest /path/to/input-hash-manifest.json \
  --corpus-root /path/to/yt-bulk-subtitles-downloader
```

For the optional Fund Launch long-text check, fetch the four named guides into a temporary directory as `fund-independent-sponsor.html`, `fund-private-credit.html`, `fund-direct-lending.html`, and `fund-mezzanine.html`, then run `python3 scripts/check-fund-launch-similarity.py --sources /path/to/temporary-directory`. The script compares visible guide text with built pages using a 24-word overlap threshold. Source HTML belongs outside this repository and `dist/`.

This scan ignores required source-title links and checks normalized 50-word passages for direct transcript overlap. It supplements editorial review; it is not a legal test or proof that all paraphrases are ideal.

## Editorial boundaries

The course is a synthesis across practitioner sources, not a collection of transcript reproductions. Every lesson/topic/example retains evidence and video relationships, and every quantitative/provider entry has original viewing links. Numbers remain illustrations, reports, proposals, targets or rules of thumb as appropriate. Reported completed transactions are not independently verified transactions.

The Yusufa collection meaningfully discusses institutional and LP-funded non-bank private credit. It does not establish a named completed private-credit facility. Duke Royalty is a prospective contact. Fund Launch adds industry education on private-credit funds, direct lending and mezzanine structures; it does not prove any prospective transaction in the first collection. Government-backed lending and complete IRR/MOIC modeling remain limited.

There are four unusable substantive recoveries and two other incomplete recoveries in the source inventory. Low-confidence numbers remain qualified in the reference library and are excluded from topic teaching previews. This site has no current lender-price feed, formal accreditation or audited investment track record.

## Architecture and implementation record

- `docs/superpowers/specs/2026-09-27-site-design.md`
- `docs/superpowers/plans/2026-09-27-site.md`
- `docs/implementation-ledger.md`
- `docs/validation.md`
- `docs/editorial-review.md`

Only `dist/` is the deployable artifact. Keep research inputs, local provenance, scripts and repository metadata out of any manually configured static web root. No license has been selected for the repository's original content or code.
