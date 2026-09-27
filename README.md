# The M&A Companion

A free, independent, source-linked guide to buying, financing, and building businesses.

Static Astro website, ready for local review and Cloudflare Pages. No accounts, payments, advertising, affiliate links, server runtime, or public transcript corpus. Nothing is deployed automatically.

## Local development

Use Node **22.23.0** (the tested version; dependencies require at least 22.19). This Mac also has an older Node on its default path, so select the project version before installing or running commands:

```sh
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
2. Place this repository in a private Git repository you control, or use Cloudflare's direct-upload workflow for the built `dist` directory. No remote repository has been created by this task.
3. In Cloudflare, choose **Workers & Pages → Create → Pages**, then connect the repository. Choose the **Astro** framework preset.
4. Set **Build command** to `npm run build` and **Build output directory** to `dist`. Root directory is the repository root. No Cloudflare adapter or SSR functions are required.
5. Set `NODE_VERSION=22.23.0`. Set `SITE_URL` to the chosen public HTTPS origin, including the eventual `pages.dev` origin if that is your initial published address. Do not include a subdirectory, query, or fragment.
6. Deploy only after you authorize publication. Inspect the source links, search, headers, canonical tags, sitemap, robots file, and mobile layout on the resulting deployment.

No domain has been purchased or configured. With `SITE_URL` unset, the site omits canonical URLs, emits an empty sitemap, and marks preview pages `noindex`; robots disallows crawling. Set the real origin and rebuild before an indexed launch. For an unindexed preview deployment, leave it unset. Public source links remain the original YouTube URLs regardless of the site domain.

Official references: [Astro content collections](https://docs.astro.build/en/guides/content-collections/), [Cloudflare Pages build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Pagefind indexing](https://pagefind.app/docs/running-pagefind/).

## Configuration

Edit **`src/site-config.mjs`**. It is the central configuration for:

- Site name and subtitle.
- Canonical domain (`SITE_URL` can override it during a build).
- Contact email (blank until chosen; no invented contact address).
- Analytics configuration (disabled by default).
- Source-collection display names and descriptions.

No permanent production domain is hardcoded. Analytics are optional and off. If enabling analytics, review the associated privacy disclosure. The site loads no third-party fonts, ads, or embedded videos. The favicon is an original placeholder mark, replaceable in `public/favicon.svg`.

## Content and relationships

- `src/content/lessons/`: 20 original lessons in 14 modules.
- `src/content/topics/`: 44 original topic guides.
- `src/content/examples/`: 12 worked examples with explicit status.
- `src/data/modules.json`: curriculum order and module descriptions.
- `src/data/glossary.json`: 44 plain-English glossary entries.
- `src/data/evidence.json`: 243 public-safe evidence references, without research claim text or supporting excerpts.
- `src/data/videos.json`: 117 exact original video identities, short concept descriptions, and useful-content flags.
- `src/data/numbers.json`: 313 quantitative records with original editorial context, classification, and caution.
- `src/data/providers.json`: 28 provider/firm/intermediary records with roles and relationship status.
- `src/data/number-editorial.json` and `provider-editorial.json`: reviewed editorial overlays used by the importer.
- `private/provenance.json`: full research traceability, including exact source file, transcript source, confidence, original evidence row and supporting context. Build-time audit material only; **never move it into `public/` or import it into a client script**.
- `private/import-manifest.json`: hashes of the nine research inputs.

Astro content collections validate frontmatter. Relationships are IDs and slugs, not duplicated video descriptions in UI components. Topic pages find related lessons, examples, numbers and sources at build time. Search runs over the public HTML. Its generated index contains no private transcript metadata.

Add a future source collection by adding its display configuration, video/evidence data, and routing support. The editorial brand and curriculum do not depend on the first creator's name. See `docs/content-contract.json` for the exact current schemas.

## Regenerating research data

This is a deliberate editorial workflow, separate from a normal build. It needs Python 3 and read access to the research directory:

```sh
python3 scripts/import-research.py \
  --input '/path/to/yusufa_analysis' \
  --output .
```

The importer parses the evidence/inventory CSVs and escaped-pipe Markdown tables. It preserves stable row-based IDs, applies the reviewed original context overlays, validates source identities, and writes public-safe JSON plus private provenance. It rejects output inside the input research directory. It never copies raw transcript files. All nine input files are hashed to verify read-only handling.

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

This scan ignores required source-title links and checks normalized 50-word passages for direct transcript overlap. It supplements editorial review; it is not a legal test or proof that all paraphrases are ideal.

## Editorial boundaries

The course is a synthesis across practitioner sources, not a collection of transcript reproductions. Every lesson/topic/example retains evidence and video relationships, and every quantitative/provider entry has original viewing links. Numbers remain illustrations, reports, proposals, targets or rules of thumb as appropriate. Reported completed transactions are not independently verified transactions.

The first collection meaningfully discusses institutional and LP-funded non-bank private credit. It does not establish a named completed private-credit facility. Duke Royalty is a prospective contact. Institutional private-credit teaching is less developed than the acquisition material. Coverage gaps in government-backed lending, mezzanine products and complete IRR/MOIC modeling are explicitly labeled.

There are four unusable substantive recoveries and two other incomplete recoveries in the source inventory. Low-confidence numbers remain qualified in the reference library and are excluded from topic teaching previews. This site has no current lender-price feed, formal accreditation or audited investment track record.

## Architecture and implementation record

- `docs/superpowers/specs/2026-09-27-site-design.md`
- `docs/superpowers/plans/2026-09-27-site.md`
- `docs/implementation-ledger.md`
- `docs/validation.md`

Only `dist/` is the deployable artifact. Keep the research inputs, `private/`, scripts and repository metadata out of any manually configured static web root.
