# Acquisition Companion: v1 design

## Purpose and authority
A free independent course and reference library about buying, financing and operating businesses. The first source collection is Yusufa Sey's 117-video corpus. Original educational synthesis links readers to videos; it never publishes transcript text. The user explicitly authorized the complete implementation without routine design approval stops. This written design records decisions before implementation.

## Architecture
Astro static HTML, TypeScript, build-time content collections, custom CSS, Pagefind after build. No server adapter, framework hydration, accounts, payments, ads or affiliate links. Config owns brand, subtitle, canonical domain, contact, analytics and source-collection display names. Blank canonical emits no invented permanent domain; deployment can supply SITE_URL. Local builds have relative sitemap URLs until a canonical is set and are marked noindex. Analytics defaults disabled.

A read-only importer creates an internal evidence/provenance layer from all nine research files. Internal provenance retains exact title, ID, original URL, source file, transcript source, confidence and classifications. Only explicitly selected public fields are rendered. Private inputs never enter public/ or a client bundle. Editorial lessons, topics, examples and numerical annotations provide original copy. Build-time relationships connect content to evidence and video IDs. Adding source collections does not change the brand or route model.

## Information architecture
Home, Start Here, Course, Topics, Financing, Examples, Numbers, Glossary, Sources, About, Search. Providers are reached through Financing and Sources. Methodology is in About and the footer.

Fourteen modules contain twenty substantive lessons. Each lesson has meaning, importance, mechanism, practical interpretation, corpus example, misconceptions, related topics and further viewing. Unsupported advanced subjects appear only as clearly labeled coverage boundaries, not thin authoritative lessons. Forty-four concepts form an alphabetic/topic reference and glossary. Twelve worthwhile examples preserve hypothetical/proposed/experience/completed status. All 313 quantitative records and 28 provider entries have source links, contextual classifications and uncertainties. All 117 video entries exist, including explicitly uninformative recoveries; no summary is inferred from a title.

## Design
Warm paper background, near-black ink, dark teal links, restrained orange annotations. Serif editorial headings with system sans-serif body; no external font requests. Compact masthead, horizontally scrolling mobile navigation, generous reading measure, numbered curriculum rows, bordered comparison tables and accessible disclosure panels. No oversized hero, stock photos, gradients, fake dashboards or decorative charts. Desktop lesson sidebar contains module navigation; mobile becomes a collapsible contents list. Breadcrumbs and previous/next lesson links support reading.

## Behavior
Static content works without JavaScript. Small scripts enhance number/provider/source filters and optional local lesson completion. Storage failures degrade gracefully; no personal data leaves the browser. Pagefind search loads on its dedicated page and searches main content, not navigation or source metadata. Search results distinguish content type. Filters have labels, clear/reset action, live result count and honest empty state.

## Evidence policy
No full transcripts, research Markdown dumps or supporting-context fields in public output. Rare short quotes only if exact, but v1 prefers no quotations. Source-derived claims carry lesson-section evidence IDs and original viewing links. Whisper uncertainty remains visible when material. Low-confidence findings are excluded from authoritative explanations; numerical/provider records may remain as explicitly uncertain references. Targets are not raised funds, proposals are not closed deals, family-office equity is not private credit. Duke Royalty is a prospective contact; no named completed private-credit facility is established. IRR/MOIC, SBA, mezzanine and unitranche gaps are explicit.

## Validation
Importer tests cover aligned multi-source CSV fields, escaped Markdown pipes, original URL identity and privacy projection. Content tests cover counts, required lesson sections, slugs, classifications and relationship integrity. Build checks crawl all internal URLs/fragments, scan output for local paths/transcript markers/private fields and compare long text windows against raw transcripts. Browser checks cover responsive overflow, keyboard navigation, filters, search, progress persistence and storage denial. Source hashes must remain unchanged. Production build must succeed from the independent repository without access to the source corpus.

## Delivery
Repository at acquisition-companion, initially assembled in an isolated /tmp staging directory because the active workspace grants write access there. No existing destination exists. Transfer only this new repository after validation, never overwrite unrelated work. Build: npm run build. Output: dist. Cloudflare Pages uses Node 22.23+ or a tested compatible version, no adapter. No deployment or domain setup.
