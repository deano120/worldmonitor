# Stack Research: HappyMonitor

**Domain:** Positive news aggregation and uplifting data dashboard
**Researched:** 2026-02-22
**Confidence:** MEDIUM-HIGH (core stack is proven; some data source APIs need runtime validation)

> **Scope note:** This document covers ONLY what is NEW beyond the existing WorldMonitor
> stack (React/TS, Vite, MapLibre, Deck.gl, D3, Sebuf, Transformers.js/ONNX, Vercel,
> variant architecture). See `package.json` for current dependencies.

---

## Recommended Stack

### Sentiment Analysis & ML (Browser-side)

The existing ML worker already handles sentiment classification via `@xenova/transformers`
with `Xenova/distilbert-base-uncased-finetuned-sst-2-english`. This is the foundation --
no new ML library is needed. However, the package should be migrated and the sentiment
model should be upgraded.

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `@huggingface/transformers` | `3.8.1` | Browser-side ML inference (sentiment, embeddings, summarization) | Direct successor to `@xenova/transformers` (v2.x). Same API, same ONNX backend, but maintained under official HuggingFace namespace. v3 adds WebGPU support. The existing `@xenova/transformers@2.17.2` in package.json is the legacy name. Migration is a package rename + minor import path changes. | HIGH |
| `onnxruntime-web` | `1.23.x` (keep current) | ONNX Runtime for WASM/WebGPU model execution | Already in the project. No change needed. | HIGH |

**Migration note:** `@xenova/transformers` -> `@huggingface/transformers` is a drop-in rename
for v3. The API surface is almost identical. Model names change from `Xenova/*` to
`onnx-community/*` or `Xenova/*` (both still work). This migration is optional for the
HappyMonitor milestone -- it can be done as a separate chore.

**Sentiment model considerations for positive news filtering:**
- The current `distilbert-base-uncased-finetuned-sst-2-english` outputs binary
  `POSITIVE`/`NEGATIVE` with confidence scores. For HappyMonitor, this is sufficient:
  filter where `label === 'positive' && score >= 0.85`.
- No need for a multi-class sentiment model. Binary positive/negative is the right
  granularity for "show only good news" filtering.
- Consider adding a second-pass topic classifier later (not MVP) for categorizing positive
  news into themes (health, environment, science, community).

### Positive News Data Sources (RSS Feeds)

The existing RSS proxy infrastructure (`/api/rss-proxy`, Railway relay for blocked feeds)
handles all of these. No new libraries needed -- just new feed configurations.

| Source | Feed URL | Content Focus | Confidence |
|--------|----------|---------------|------------|
| Good News Network | `https://www.goodnewsnetwork.org/feed/` | General positive news since 1997, large archive | HIGH |
| Positive.News | `https://www.positive.news/feed/` | Solutions journalism, longest-running positive outlet | HIGH |
| The Optimist Daily | `https://www.optimistdaily.com/feed/` | Solutions-focused daily curation | MEDIUM |
| Sunny Skyz | `https://feeds.feedburner.com/SunnySkyz` | Uplifting, feel-good stories | MEDIUM |
| Reasons to be Cheerful | `https://reasonstobecheerful.world/feed/` | David Byrne's solutions journalism project | MEDIUM |
| Good Good Good | `https://www.goodgoodgood.co/feed` | Independent positive media | LOW (needs URL verification) |
| The Better India | `https://www.thebetterindia.com/feed/` | Solutions-based stories (India focus, global reach) | MEDIUM |
| Future Crunch | `https://futurecrunch.com/feed/` | Science/tech progress, "good news" newsletter | LOW (needs URL verification) |
| YES! Magazine | `https://www.yesmagazine.org/feed` | Solutions journalism nonprofit | MEDIUM |

**Strategy:** These are ALL RSS feeds parseable by the existing `fast-xml-parser` +
`DOMParser` pipeline. No new parsing libraries needed. The variant config for `happy`
will define these feeds in the same `FEEDS` record structure used by tech/finance/full
variants.

### GDELT Positive Tone Filtering

The existing GDELT integration (`src/services/gdelt-intel.ts`) already queries the GDELT
DOC API via Sebuf. For HappyMonitor, add `tone>5` to GDELT queries to filter for
positive-tone articles.

| Technology | Change Needed | Purpose | Confidence |
|------------|---------------|---------|------------|
| GDELT DOC 2.0 API | Add `tone>5` parameter to existing queries | Filter global news for positive tone (scale: -100 to +100, practical range -10 to +10, >5 = "fairly positive") | HIGH |
| Existing Sebuf handler | New RPC or parameter on `SearchGdeltDocuments` | Expose tone filter to client | HIGH |

**API example:**
```
https://api.gdeltproject.org/api/v2/doc/doc?query="climate change" tone>5&mode=artlist&format=json&sort=ToneDesc
```

The `sort=ToneDesc` parameter returns the most positive articles first. This is free,
no API key required, and the existing codebase already integrates GDELT.

### Humanity Progress Data Sources (REST APIs)

These are new external data sources for the "progress metrics" panels. All are free,
open, and return JSON or CSV.

| Source | Base URL | Key Indicators | Auth | Confidence |
|--------|----------|----------------|------|------------|
| **Our World in Data** (Charts API) | `https://ourworldindata.org/grapher/{slug}.csv` | Life expectancy, poverty rate, literacy, child mortality, renewable energy, internet access | None | HIGH |
| **World Bank Indicators API v2** | `https://api.worldbank.org/v2/country/all/indicator/{code}?format=json` | GDP per capita, school enrollment, access to electricity, CO2 emissions reduction | None | HIGH |
| **WHO GHO OData API** | `https://ghoapi.azureedge.net/api/{indicator}` | Life expectancy, disease eradication progress, vaccination coverage | None | MEDIUM (API being deprecated late 2025, replacement OData endpoint coming -- monitor this) |
| **UNDP HDI Data API 2.0** | `https://hdrdata.org` | Human Development Index, education index, inequality-adjusted HDI | API key (free) | MEDIUM |
| **Gapminder** (GitHub CSV) | `https://raw.githubusercontent.com/Gapminder-Indicators/...` | Historical progress (life expectancy, income, child survival) | None | HIGH |

**Our World in Data is the primary recommendation.** It is the richest single source for
"humanity is getting better" data. The chart slug pattern is clean:
- `https://ourworldindata.org/grapher/life-expectancy.csv`
- `https://ourworldindata.org/grapher/share-of-population-in-extreme-poverty.csv`
- `https://ourworldindata.org/grapher/literacy-rate-adults.csv`
- `https://ourworldindata.org/grapher/share-electricity-renewables.csv`
- `https://ourworldindata.org/grapher/child-mortality.csv`

These return clean CSV that can be parsed with a simple `fetch` + string split (no library
needed) or a lightweight CSV parser.

**World Bank API is the backup/complement.** Good for real-time updated indicators. Example:
```
https://api.worldbank.org/v2/country/WLD/indicator/SP.DYN.LE00.IN?format=json&date=2000:2024
```
Returns JSON array, no auth needed, 16,000+ indicators available.

### CSV Parsing

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| `papaparse` | `5.5.2` | Parse OWID/Gapminder CSV data | Streaming parser, handles large CSVs, 0 dependencies, 50KB. The only CSV parser worth using in the browser. | HIGH |

**Alternative considered:** Manual `text.split('\n').map(...)` -- fine for small CSVs but
brittle with quoted fields, BOM marks, etc. PapaParse handles all edge cases. Worth the 50KB.

### News API (Optional Enhancement)

For richer sentiment-filtered positive news beyond RSS, one commercial API stands out:

| Service | Pricing | Key Feature | When to Use | Confidence |
|---------|---------|-------------|-------------|------------|
| **NewsAPI.ai** (Event Registry) | Free: 2,000 tokens/month (no CC). Paid from $90/month. | Native sentiment range filter (-1 to +1), set to `0.2..1.0` for positive news. Returns structured JSON with sentiment scores. | If RSS feeds alone don't provide enough volume or you want pre-scored sentiment without browser-side ML inference | MEDIUM |

**Recommendation: Start with RSS + browser-side sentiment. Add NewsAPI.ai only if volume
is insufficient.** The free tier is generous enough for prototyping.

Do NOT use `newsapi.org` -- it does not support sentiment filtering and its free tier
is restricted to development only (no production use).

### Map Basemap (Light/Warm Theme)

The existing MapLibre setup can switch basemap styles via the style spec. For the warm/bright
HappyMonitor aesthetic:

| Style | Source | Why | Confidence |
|-------|--------|-----|------------|
| **OSM Bright** | `https://demotiles.maplibre.org/styles/osm-bright-gl-style/` (free demo) or Protomaps/MapTiler hosted | Clean, light, warm basemap. Official MapLibre demo style. Pastel tones complement uplifting content. | HIGH |
| **Protomaps Light** | Self-hosted via PMTiles or `maps.protomaps.com` | Single-file tile hosting, no API key, light theme available. Already compatible with MapLibre. | MEDIUM |

**The variant config should switch `--map-bg`, `--map-country`, `--map-stroke` CSS variables
to warm tones.** The existing `data-theme="light"` already provides the foundation -- the
`happy` variant extends it with warmer palette overrides.

### Visual Theme (CSS Custom Properties)

No new libraries needed. The existing CSS variable system (`--bg`, `--surface`, `--text`,
`--border`, etc.) is designed for variant-based theming. For HappyMonitor:

| Variable | Current (dark) | Happy Variant Value | Rationale |
|----------|---------------|---------------------|-----------|
| `--bg` | `#0a0a0a` | `#fef9f0` | Warm cream instead of black |
| `--surface` | `#141414` | `#ffffff` | Clean white cards |
| `--border` | `#2a2a2a` | `#e8ddd0` | Warm taupe borders |
| `--text` | `#e8e8e8` | `#2d2a26` | Warm dark brown text |
| `--accent` | `#fff` | `#f59e0b` | Amber accent (optimistic/warm) |
| `--semantic-normal` | `#44aa44` | `#22c55e` | Brighter green for "good" |
| `--status-live` | `#44ff88` | `#10b981` | Emerald green pulse |
| `--font-body` | `SF Mono, monospace` | `'Inter', 'SF Pro', system-ui, sans-serif` | Proportional font for readability, not military aesthetic |

**D3 color palette for progress charts:** Use `d3.interpolateYlGn` (Yellow-Green sequential)
or `d3.interpolateWarm` for positive-trend time series. Both are built into `d3-scale-chromatic`
which is already bundled with the existing `d3@7.9.0` dependency.

### Micro-Interactions & Celebration

| Library | Version | Size | Purpose | Confidence |
|---------|---------|------|---------|------------|
| `canvas-confetti` | `1.9.3` | ~6KB gzipped | Celebration animations for milestones (e.g., "Child mortality dropped below X!"). Performant, uses web workers, respects `prefers-reduced-motion`. | HIGH |

This is the only new dependency beyond `papaparse`. Use sparingly -- when showing major
progress milestones or positive streaks.

---

## Installation

```bash
# New dependencies (only 2 new packages!)
npm install papaparse canvas-confetti

# Type definitions
npm install -D @types/papaparse

# Optional: Migrate transformers.js (separate chore, not required for HappyMonitor)
# npm uninstall @xenova/transformers
# npm install @huggingface/transformers@3.8.1
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Sentiment model | DistilBERT-SST2 (existing) | RoBERTa-sentiment, VADER, TextBlob | DistilBERT already loaded in ML worker. Adding another model increases memory. Binary pos/neg is sufficient for "show only good news." |
| CSV parser | PapaParse | d3-dsv (already bundled) | d3-dsv is fine but PapaParse handles streaming, web workers, and edge cases better for large OWID datasets. d3-dsv is good for small inline CSVs. |
| Progress data | Our World in Data | Gapminder API, UN Stats | OWID is the most comprehensive, best documented, and already aggregates from World Bank/WHO/Gapminder. Use OWID as primary, World Bank as fallback. |
| News API | RSS + browser sentiment | NewsAPI.ai ($90/mo paid) | RSS is free and the existing infrastructure supports it. Commercial API is overkill for MVP. Can add later if volume is insufficient. |
| Confetti | canvas-confetti | tsparticles, react-confetti | canvas-confetti is framework-agnostic (no React in this codebase), smallest bundle, best perf. |
| Map theme | OSM Bright / Protomaps Light | MapTiler Positron, Stamen Watercolor | OSM Bright is free, no API key. MapTiler requires key. Stamen Watercolor is beautiful but too informal for a data dashboard. |
| Font | Inter (system/CDN) | Poppins, Nunito, DM Sans | Inter is the most readable proportional font at small sizes, excellent for data-heavy dashboards. Widely used in modern apps. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `newsapi.org` free tier | Production use prohibited on free plan. No sentiment filtering. | RSS feeds + browser-side sentiment classification |
| Multi-class sentiment models (e.g., 5-star) | Adds complexity, larger model, slower inference. Binary pos/neg is the right abstraction for "filter to positive." | Existing `distilbert-base-uncased-finetuned-sst-2-english` |
| Server-side sentiment APIs (AWS Comprehend, Google NL, Azure Text Analytics) | Adds cost, latency, API key management, server dependency. The whole point of Transformers.js is browser-side inference with zero API costs. | Existing browser-side ML worker |
| Tailwind CSS | The codebase uses vanilla CSS with custom properties. Adding Tailwind would be a massive refactor for no gain. | Existing CSS variable system with `[data-variant="happy"]` overrides |
| React / framework migration | The codebase is vanilla TypeScript with custom component patterns. Adding React for one variant is architectural debt. | Existing component patterns |
| Heavyweight chart libraries (Chart.js, Recharts, Victory) | D3 is already in the project and is more flexible. Adding another chart lib creates bundle bloat and inconsistent visual style. | D3 with warm color schemes from d3-scale-chromatic |
| `node-fetch` / server-side RSS parsing | RSS parsing uses DOMParser (browser-only), which is the right architecture for a client-side app. Server-side parsing would require edge function changes. | Keep client-side RSS parsing via existing `fetchWithProxy` |

---

## Stack Patterns by Variant

**If building HappyMonitor as a new variant (`happy`):**
- Add `src/config/variants/happy.ts` following `tech.ts` / `finance.ts` pattern
- Define `FEEDS` record with positive news sources
- Define `PANELS` with progress-specific panels (Progress Metrics, Good News Feed, etc.)
- Define `MAP_LAYERS` (lighter set -- no conflicts, no nuclear, yes weather)
- Set `data-variant="happy"` on root for CSS theming
- Add `VITE_VARIANT=happy` build target

**If adding GDELT positive tone queries:**
- Reuse existing `IntelligenceServiceClient` and `SearchGdeltDocuments` RPC
- Add `toneFilter` parameter to the proto/handler
- Client-side: pass `tone>5` for HappyMonitor, no filter for WorldMonitor

**If fetching OWID/World Bank progress data:**
- Create new service module: `src/services/progress/index.ts`
- New Sebuf domain: `worldmonitor/progress/v1` with `GetProgressIndicators` RPC
- Edge function fetches from OWID/World Bank, caches in Upstash Redis (same pattern as other data services)
- Client renders with D3 time-series charts using warm color palette

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `papaparse@5.5.x` | Vite 6.x, TypeScript 5.x | ESM-compatible. `@types/papaparse` provides types. |
| `canvas-confetti@1.9.x` | Any bundler, no framework deps | Ships as UMD + ESM. Tree-shakeable. |
| `@huggingface/transformers@3.8.x` | `onnxruntime-web@1.23.x` | Direct replacement for `@xenova/transformers@2.x`. Same ONNX models work. |
| OWID Chart API | Any HTTP client | Returns CSV/JSON. No SDK needed. Stable since Nov 2024. |
| World Bank API v2 | Any HTTP client | Returns JSON. No auth. Stable for years. |
| WHO GHO API | Any HTTP client | **Warning:** Being deprecated late 2025. New OData endpoint coming. Use World Bank as primary fallback for health indicators. |

---

## Sources

### Verified (HIGH confidence)
- [GDELT DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) -- Tone filtering documented with `tone>5` parameter
- [GDELT Positive News Filtering](https://blog.gdeltproject.org/finding-good-news-in-the-midst-of-the-pandemic-using-tone-filtering/) -- Official blog post on finding good news
- [OWID Chart API](https://docs.owid.io/projects/etl/api/chart-api/) -- `/{slug}.csv` and `/{slug}.metadata.json` endpoints verified
- [World Bank API v2](https://datahelpdesk.worldbank.org/knowledgebase/articles/898599-indicator-api-queries) -- 16,000 indicators, no auth, JSON format
- [Good News Network RSS](https://www.goodnewsnetwork.org/more/rss-feeds/) -- RSS at `goodnewsnetwork.org/feed`
- [Feedspot Good News Feeds](https://rss.feedspot.com/good_news_rss_feeds/) -- 35 curated positive news RSS feeds
- [Transformers.js docs](https://huggingface.co/docs/transformers.js/en/index) -- `@huggingface/transformers@3.8.1` is latest stable
- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti) -- 6KB, web worker support, reduced-motion respect
- [D3 Scale Chromatic](https://d3js.org/d3-scale-chromatic) -- `interpolateYlGn`, `interpolateWarm` built in
- [OSM Bright style](https://demotiles.maplibre.org/styles/osm-bright-gl-style/) -- Free MapLibre light basemap

### Verified (MEDIUM confidence)
- [WHO GHO OData API](https://www.who.int/data/gho/info/gho-odata-api) -- Works today but deprecation planned for late 2025; replacement API status unknown
- [UNDP HDI API 2.0](https://hdrdata.org) -- Exists but requires API key registration; untested from JS
- [NewsAPI.ai pricing](https://newsapi.ai/plans) -- Free tier confirmed at 2,000 tokens; sentiment filter available
- [Positive.News](https://www.positive.news/) -- RSS feed likely at `/feed/` but not confirmed programmatically
- [Protomaps basemaps](https://docs.protomaps.com/basemaps/maplibre) -- Light theme documented, PMTiles approach verified

### Unverified (LOW confidence -- validate before implementing)
- Good Good Good RSS URL (`goodgoodgood.co/feed`) -- from Feedspot listing, not directly verified
- Future Crunch RSS URL (`futurecrunch.com/feed/`) -- from aggregator listing, not directly verified
- Exact `@huggingface/transformers` v4 preview stability -- v4 is in preview as of Feb 2026, NOT recommended for production yet

---
*Stack research for: HappyMonitor (happy.worldmonitor.app)*
*Researched: 2026-02-22*
