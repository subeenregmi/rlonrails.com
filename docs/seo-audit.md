# SEO and Core Web Vitals audit

Audited 13 September 2026. Research used a cheaper GPT-5.6 Luna sub-agent, primary Google/Chrome/Next.js documentation, repository inspection, and Lighthouse 13.4.1. Implementation follows the documentation shipped with this repository's Next.js 16.3.4.

UI follow-up: the separate homepage heading strip was replaced by a **Help** link inside the existing blue map bar. A visible Help link remains in the server-rendered loading bar, so readers can still reach the curriculum without JavaScript. The accessible page heading and metadata remain. Article headers, station cards and resource panels now use each topic's map-line colour. The comparison table below describes the original SEO implementation. A fresh homepage check after this visual follow-up measured performance 96, LCP 2.61 s, FCP 1.37 s, blocking time 18 ms and CLS 0; SEO and accessibility scored 100. The `help-followup` run is saved in the measurements file.

Live indexing check after merge: `rlonrails.com` had no blocking `X-Robots-Tag`; `dev.rlonrails.com` correctly returned `noindex, nofollow`. Production still returned 404 for the new curriculum and robots routes because merging updates development while production follows stable releases. Development remains excluded from search by explicit preference; publishing a release is the remaining step to make the new public URLs available on production.

## Findings and implementation

The main search visibility problem was content discovery. The homepage returned an empty map shell until hydration read browser storage. The 19 topic lines, 151 stations, explanations and resource links were available through an interactive SVG and panels, with no public reading URLs. Google can render JavaScript, but recommends meaningful HTML and crawlable links. A perfect Lighthouse SEO score does not establish that a site's content is discoverable or that it will rank. [Google's developer SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers), [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

| Priority | Finding | Implemented |
| --- | --- | --- |
| P0 | Empty initial homepage and no public reading routes | Persistent server-rendered homepage heading and curriculum link; `/curriculum` plus 19 statically generated topic pages |
| P0 | Reading resources and prerequisites depended on map interaction | Visible HTML explanations, outcomes, resource links, prerequisite links, station anchors, and adjacent topic navigation, all usable without JavaScript |
| P1 | Generic title/description and no canonical URLs | Unique metadata for every public page, production canonical URLs, title template and metadata base |
| P1 | Missing discovery files | `/robots.txt` and `/sitemap.xml` with 21 public URLs; no invented modification dates |
| P1 | Development duplicate and personal progress page could be indexed | Host-matched `X-Robots-Tag: noindex, nofollow` on `dev.rlonrails.com`; `noindex, follow` on `/journey`, excluded from sitemap |
| P1 | Missing social previews | Generated 1200 × 630 branded PNG with explicit Open Graph and Twitter image metadata on public pages |
| P1 | Excess startup JavaScript | Journey and specialisation modals load when opened; session recorder uses `lazyOnload` |
| P1 | No enabled field performance reporting | Enabled the existing Umami tracker's `data-performance="true"` option |
| P2 | Search engines lacked site and breadcrumb semantics | Homepage `WebSite` JSON-LD and topic `BreadcrumbList`, matching visible content and navigation |

Topic pages use explicit, stable slugs, such as `/curriculum/foundations` and `/curriculum/rlhf-llm-reasoning`. The copy comes from the same curriculum data as the map. Separate station pages would add many URLs with little additional content, so the implementation groups reading material into substantial topics. Canonicals are defined per public page rather than inherited from the homepage. Next's metadata objects merge shallowly: specifying Open Graph fields on a child page required explicitly including the shared image. [Next metadata reference](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).

The sitemap omits `/journey`, errors, and image/manifest endpoints. Crawling remains allowed for personal and development pages so crawlers can read their noindex directives. The development hostname is the one documented in README; any future preview hostname needs an equivalent header rule or infrastructure setting. No production environment flag is required by the current deployment. [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Structured data uses site identity and visible breadcrumbs. No reviews, ratings, course credentials or search action were invented. Structured data can help interpretation and presentation but does not guarantee a rich result. JSON-LD escapes HTML delimiters. [Google breadcrumb requirements](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), [structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), [Next JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld).

## Performance evidence

The public homepage's initial mobile Lighthouse run measured performance 91/100, FCP 1.8 s, LCP 3.2 s, total blocking time 70 ms, and CLS 0. Its LCP element was an SVG zone watermark. Lighthouse identified about 101 KiB of unused JavaScript; approximately 51 KiB came from the session recorder. The live server was already returning static Next.js responses and cache headers, and the font was already self-hosted by `next/font` with `display: swap`. No hero-image download was involved.

The controlled local comparison used production builds, the same machine, Lighthouse's default mobile simulation, and fresh browser profiles. These are individual lab runs with ordinary measurement variability, not statistical estimates or proof of field improvement.

| Homepage lab metric | Before | After initial implementation |
| --- | ---: | ---: |
| Lighthouse performance | 89 | 97 |
| FCP | 1.7 s | 0.8 s |
| LCP | 2.9 s | 2.6 s |
| Total blocking time | 260 ms | 10 ms |
| CLS | 0 | 0 |
| Speed Index | 2.4 s | 2.1 s |
| Lighthouse SEO / accessibility / best practices | 100 / 100 / 100 | 100 / 100 / 100 |

A final homepage rerun reproduced performance 97, LCP 2.60 s, FCP 0.75 s, blocking time 11.5 ms and CLS 0. The curriculum index measured performance 99 / LCP 2.16 s; the longer RLHF/LLM topic measured performance 97 / LCP 2.45 s. Both reading pages had zero blocking time and CLS, and scored 100 for SEO, accessibility and best practices. Exact values, timestamps and throttling settings are saved in [performance-measurements.json](performance-measurements.json).

The heading makes useful content paint earlier while the map hydrates. Deferring unused modals and the recorder reduces initial work. The map retains its camera, animations, touch gestures, train rendering and local progress behavior. `lazyOnload` delays the recorder until load and browser idle; it still eventually loads and records, so it is not a reduction in total session bytes. [Next lazy loading](https://nextjs.org/docs/app/guides/lazy-loading), [script strategies](https://nextjs.org/docs/app/api-reference/components/script), [Chrome LCP optimization](https://web.dev/articles/optimize-lcp).

LCP remained slightly above the good threshold in the initial local measurement. The remaining candidate depends on JavaScript and SVG rendering. If field data confirms a problem, profile the map on representative phones, then consider a shorter opening animation, rendering fewer offscreen SVG elements, or separating resource detail data from the initial map bundle. These are larger changes with visual and interaction tradeoffs and should be guided by traces. For INP, profile station selection, resource ticks, menu opening and train-heavy saved progress. [INP optimization](https://web.dev/articles/optimize-inp), [long-task guidance](https://web.dev/articles/optimize-long-tasks), [CLS guidance](https://web.dev/articles/optimize-cls).

## Real-user measurement

The deployed Umami script was inspected and confirmed to support its performance option. The app now enables native collection of **LCP, INP, CLS, FCP and TTFB** without adding another reporter or custom events. In Umami, open this website's **Performance** tab, select **p75**, and compare pages, devices and browsers. Recording starts after this change is deployed; this audit did not access the analytics dashboard or establish historical field values. [Umami Performance documentation](https://docs.umami.is/docs/performance).

Google's good Core Web Vitals targets, assessed at the 75th percentile separately for mobile and desktop, are **LCP ≤ 2.5 s, INP ≤ 200 ms, and CLS ≤ 0.1**. Lighthouse's total blocking time is a lab diagnostic, not an INP measurement. INP needs real interactions. Use Search Console/CrUX for Google's field assessment when sufficient traffic is available; do not interpret missing field data as a pass. [Core Web Vitals](https://web.dev/articles/vitals).

## Verification and release follow-up

The production build generates all 19 topic pages statically. Browser tests cover every sitemap route and station anchor, production/development index controls, unknown-topic 404s, metadata and PNG availability, and a complete mobile reading journey with JavaScript disabled. Existing Chromium/WebKit tests exercise camera anchoring, zoom, panning, selection, marker return and supported touch behavior. An existing marker-return assertion was made animation-aware after it read geometry before the first flight frame.

Validation completed: production build/type-check, full pinned Biome CI check, the existing browser suite, and a passing rerun of all 12 affected SEO/marker tests after fixes. Across the suite, all 22 applicable cases passed; two existing WebKit cases are intentionally skipped. Additional Chromium checks opened and closed both deferred modals and inspected desktop/mobile screenshots. Biome was absent from the local install, so the CI command was run through `npx --yes --package=@biomejs/biome@2.5.13 biome ci --error-on-warnings` using the version already declared in package.json.

After deployment:

1. Submit `https://rlonrails.com/sitemap.xml` in Google Search Console. Inspect the homepage, curriculum index and a topic page to confirm the rendered content and selected canonical.
2. Verify production URLs return 200, unknown topics return 404, `/journey` is noindex, and the development hostname returns its noindex header through the reverse proxy. Check HTTP and `www` variants redirect consistently at the proxy; this audit did not change infrastructure.
3. Validate a topic page in Google's Rich Results Test and check the social preview on a shared URL.
4. Run PageSpeed Insights on the deployed homepage and reading pages. Compare Umami p75 values after enough representative visits, and watch Search Console's Core Web Vitals and indexing reports.
5. Use Search Console queries and impressions to decide where to expand explanations. Likely relevant intents include “reinforcement learning roadmap”, “reinforcement learning curriculum”, “policy gradient reading list” and “RLHF learning resources”; these are hypotheses, not researched search-volume estimates. Add original worked examples and maintained resource notes where visitors need them. Continue linking useful topic pages from relevant project documentation and educational communities.

No deployment, Search Console submission, or external account configuration was performed as part of this local implementation.
