# Architecture Patterns

**Domain:** Positive-news variant of real-time global intelligence dashboard
**Researched:** 2026-02-22

## Recommended Architecture

HappyMonitor integrates as a fourth variant (`happy`) within the existing WorldMonitor codebase. It follows the same pattern as `tech` and `finance` variants: same codebase, different `VITE_VARIANT` env value, different subdomain, different panel/feed/layer configuration. The key architectural addition is a **sentiment filtering layer** that sits between data ingestion and panel rendering, plus new domain-specific panels and a warm theme.

### System Overview

```
                     EXISTING                                    NEW
                     -------                                    ---
  [150+ RSS Feeds] ----+
  [GDELT API]     ----+----> [Sebuf Handlers]                  [Positive News APIs]
  [USGS/FIRMS]    ----+         |                                    |
                                v                                    v
                      [Proto Response] --------> [Sentiment Filter Service] <-- NEW
                                                        |
                                          +-------------+-------------+
                                          |             |             |
                                    [Positive      [Humanity      [Good Deeds
                                     News Panel]   Metrics Panel]  Panel]   <-- NEW
                                          |             |             |
                                          +------+------+------+------+
                                                 |             |
                                          [Happy Map     [Nature &
                                           Layers]       Wildlife] <-- NEW
                                                 |
                                          [Warm Theme CSS] <-- NEW
```

### Component Boundaries

| Component | Responsibility | Communicates With | New/Existing |
|-----------|---------------|-------------------|--------------|
| `src/config/variants/happy.ts` | Happy variant config: panels, feeds, map layers | `src/config/panels.ts`, `src/config/variant.ts` | NEW |
| `src/config/happy-feeds.ts` | Positive news RSS feed definitions | `src/config/variants/happy.ts` | NEW |
| `src/config/happy-geo.ts` | Positive map layer data (conservation zones, UNESCO sites, renewable energy) | `src/config/variants/happy.ts` | NEW |
| `src/services/sentiment-filter.ts` | Filters news items by positive sentiment using existing ML worker | `src/services/ml-worker.ts`, `src/services/rss.ts` | NEW |
| `src/services/humanity-metrics.ts` | Fetches long-term progress data (World Bank, Our World in Data APIs) | Sebuf handler `server/worldmonitor/metrics/v1/` | NEW |
| `server/worldmonitor/metrics/v1/handler.ts` | Backend handler for humanity metrics data | External APIs (World Bank, OWID) | NEW |
| `src/components/HumanityMetricsPanel.ts` | Charts showing human progress trends | `src/services/humanity-metrics.ts`, D3 | NEW |
| `src/components/GoodDeedsPanel.ts` | Kindness/volunteering/donation events | `src/services/rss.ts` (positive feeds) | NEW |
| `src/components/NatureWinsPanel.ts` | Conservation victories, species recovery | `src/services/rss.ts` (nature feeds) | NEW |
| `src/components/ScienceBreakthroughPanel.ts` | Scientific discoveries ticker | `src/services/rss.ts` (science feeds) | NEW |
| `src/components/RenewableEnergyPanel.ts` | Clean energy growth tracker | `src/services/humanity-metrics.ts` | NEW |
| `src/styles/happy-theme.css` | Warm/bright CSS variables for happy variant | `src/styles/main.css` | NEW |
| `src/config/variant.ts` | Add `'happy'` to allowed variant values | All variant consumers | MODIFY |
| `src/config/panels.ts` | Add `HAPPY_PANELS`, `HAPPY_MAP_LAYERS` | `src/App.ts` | MODIFY |
| `src/App.ts` | Add happy variant branches for panel creation and data loading | All panels | MODIFY |
| `vite.config.ts` | Add happy variant to `VARIANT_META`, register new Sebuf handler | Build system | MODIFY |

### Data Flow

**Flow 1: Positive News from Existing Feeds (sentiment-filtered)**

This is the primary value-add. Existing RSS feeds already contain positive stories -- they just get drowned by negative ones. The sentiment filter extracts them.

```
1. RSS feeds fetched via existing rss.ts service
   (same fetchFeed() / parseFeed() pipeline)

2. News items arrive as NewsItem[] with title, description, pubDate

3. Sentiment Filter Service intercepts:
   a. Keyword pre-filter (fast): check title against positive keyword list
      - Words like "breakthrough", "recovery", "record", "milestone", "saved"
      - Exclude false positives: "recovery from crash", "record losses"
   b. ML sentiment classification (existing):
      - mlWorker.classifySentiment(titles) already returns
        { label: 'positive' | 'negative' | 'neutral', score: number }
      - Filter: keep items where label === 'positive' AND score > 0.7
   c. Category tagging: tag items as 'science', 'health', 'environment',
      'community', 'technology', 'diplomacy'

4. Filtered positive items stored in same feedCache pattern as other variants

5. Panels render positive items using existing NewsPanel component
   (HappyMonitor reuses NewsPanel but with different feed keys)
```

**Flow 2: Dedicated Positive News Sources**

New feeds that are inherently positive, requiring no sentiment filtering.

```
1. Happy-specific FEEDS config (src/config/happy-feeds.ts) defines:
   - Good News Network RSS
   - Positive.News RSS
   - Reasons to be Cheerful RSS
   - Solutions Journalism Network RSS
   - UN SDG news RSS
   - WHO health milestones RSS
   - IUCN conservation news RSS

2. Fetched via same rss.ts pipeline (no changes needed)

3. Rendered in category-specific panels:
   - "Uplifting Stories" (general positive news)
   - "Nature Wins" (conservation, wildlife)
   - "Science Breakthroughs" (discoveries, innovations)
   - "Community Spirit" (volunteering, donations)
```

**Flow 3: Humanity Metrics (structured data, not news)**

Long-term trend data showing human progress. This needs a new Sebuf domain handler because it is structured data, not RSS.

```
1. New proto: proto/worldmonitor/metrics/v1/service.proto
   - RPC: ListProgressIndicators
   - Returns: time series of global metrics (poverty rate, literacy,
     life expectancy, child mortality, renewable energy %, etc.)

2. Handler: server/worldmonitor/metrics/v1/handler.ts
   - Fetches from World Bank API, Our World in Data API
   - Caches heavily (data changes monthly/annually, not hourly)
   - Returns proto-serialized response

3. Client: src/generated/client/worldmonitor/metrics/v1/service_client.ts
   (auto-generated by buf)

4. Service: src/services/humanity-metrics.ts
   - Wraps client calls
   - Computes deltas, trends, percentage improvements

5. Panel: HumanityMetricsPanel.ts
   - D3 sparkline charts showing upward trends
   - Key stat cards: "Extreme poverty: 9.2% (down from 36% in 1990)"
   - Updated: daily (data doesn't change faster)
```

**Flow 4: Map Layers (positive geography)**

Happy variant shows different map layers than geopolitical/tech/finance.

```
1. src/config/happy-geo.ts defines:
   - UNESCO World Heritage Sites (lat/lon, name, type)
   - National Parks & Protected Areas (top 100 globally)
   - Renewable Energy Installations (solar farms, wind farms)
   - Community Project Locations (from dedicated feeds)

2. DeckGLMap.ts renders happy-specific layers:
   - Green markers for conservation areas
   - Yellow/gold for renewable energy
   - Warm glow points for community events

3. Existing layer toggle pattern (MapLayers type) extended:
   - conservationAreas: boolean
   - renewableEnergy: boolean
   - communityProjects: boolean
   - worldHeritage: boolean
```

### Theme Integration

The warm theme is NOT a separate theme system -- it extends the existing `dark`/`light` theme mechanism with variant-specific CSS variable overrides.

```css
/* src/styles/happy-theme.css */

/* Happy variant overrides on TOP of dark theme */
:root[data-variant="happy"] {
  --bg: #1a1520;           /* warm dark purple instead of cold black */
  --bg-secondary: #221c28;
  --accent: #fbbf24;       /* warm amber instead of white */
  --accent-green: #34d399; /* softer green */
  --text-primary: #fef3c7; /* warm cream */
  --panel-bg: #1e1828;
  --panel-border: #3d3450;
  /* Override threat colors with positive sentiment colors */
  --semantic-positive: #34d399;
  --semantic-hopeful: #fbbf24;
  --semantic-inspiring: #a78bfa;
}

/* Happy variant + light theme */
:root[data-variant="happy"][data-theme="light"] {
  --bg: #fffbeb;           /* warm cream */
  --bg-secondary: #fef3c7;
  --accent: #d97706;       /* warm amber */
  --panel-bg: #ffffff;
  --panel-border: #fde68a;
}
```

Implementation: `src/main.ts` sets `document.documentElement.dataset.variant = SITE_VARIANT` alongside the existing `data-theme` attribute. This requires NO changes to the theme-manager.ts -- the CSS cascade handles it.

## Patterns to Follow

### Pattern 1: Variant Configuration File

Follow the exact same structure as `src/config/variants/tech.ts` and `src/config/variants/finance.ts`.

**What:** Create `src/config/variants/happy.ts` exporting `FEEDS`, `DEFAULT_PANELS`, `DEFAULT_MAP_LAYERS`, `MOBILE_DEFAULT_MAP_LAYERS`, and `VARIANT_CONFIG`.

**When:** First step of implementation. Everything else depends on this.

**Example:**
```typescript
// src/config/variants/happy.ts
import type { PanelConfig, MapLayers } from '@/types';
import type { VariantConfig } from './base';

export * from './base';

// Re-export feeds infrastructure
export {
  SOURCE_TIERS, getSourceTier,
  SOURCE_TYPES, getSourceType,
  getSourcePropagandaRisk,
  type SourceRiskProfile, type SourceType,
} from '../feeds';

import type { Feed } from '@/types';
const rss = (url: string) => `/api/rss-proxy?url=${encodeURIComponent(url)}`;

export const FEEDS: Record<string, Feed[]> = {
  positive: [
    { name: 'Good News Network', url: rss('https://www.goodnewsnetwork.org/feed/') },
    { name: 'Positive.News', url: rss('https://www.positive.news/feed/') },
    { name: 'Reasons to be Cheerful', url: rss('https://reasonstobecheerful.world/feed/') },
    // ... more feeds
  ],
  science: [
    { name: 'Science Daily', url: rss('https://www.sciencedaily.com/rss/all.xml') },
    { name: 'New Scientist', url: rss('https://www.newscientist.com/section/news/feed/') },
    // ... more feeds
  ],
  nature: [
    { name: 'IUCN News', url: rss('https://www.iucn.org/news/rss') },
    // ... more feeds
  ],
  // ... more categories
};

export const DEFAULT_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Happy World Map', enabled: true, priority: 1 },
  'live-news': { name: 'Uplifting Headlines', enabled: true, priority: 1 },
  'humanity-metrics': { name: 'Humanity Progress', enabled: true, priority: 1 },
  positive: { name: 'Good News', enabled: true, priority: 1 },
  science: { name: 'Science Breakthroughs', enabled: true, priority: 1 },
  nature: { name: 'Nature & Wildlife Wins', enabled: true, priority: 1 },
  community: { name: 'Community Spirit', enabled: true, priority: 1 },
  health: { name: 'Health Milestones', enabled: true, priority: 1 },
  renewable: { name: 'Clean Energy Tracker', enabled: true, priority: 1 },
  diplomacy: { name: 'Peace & Diplomacy', enabled: true, priority: 2 },
  education: { name: 'Education Progress', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 2 },
};

export const DEFAULT_MAP_LAYERS: MapLayers = {
  // All existing geopolitical/military layers OFF
  conflicts: false, bases: false, cables: false, pipelines: false,
  hotspots: false, ais: false, nuclear: false, irradiators: false,
  sanctions: false, weather: true, economic: false, waterways: false,
  outages: false, cyberThreats: false, datacenters: false,
  protests: false, flights: false, military: false, natural: true,
  spaceports: false, minerals: false, fires: false,
  ucdpEvents: false, displacement: false, climate: false,
  startupHubs: false, cloudRegions: false, accelerators: false,
  techHQs: false, techEvents: false,
  stockExchanges: false, financialCenters: false, centralBanks: false,
  commodityHubs: false, gulfInvestments: false,
  // Happy-specific layers
  conservationAreas: true,
  renewableEnergy: true,
  communityProjects: false,
  worldHeritage: true,
};
```

### Pattern 2: Sentiment Filter as Service Module

Follow the existing service module pattern: export pure functions, use circuit breakers, return empty on failure.

**What:** `src/services/sentiment-filter.ts` wraps the existing `mlWorker.classifySentiment()` with positive-specific logic.

**When:** After variant config exists, before panel wiring.

**Example:**
```typescript
// src/services/sentiment-filter.ts
import { mlWorker } from './ml-worker';
import type { NewsItem } from '@/types';

const POSITIVE_KEYWORDS = [
  'breakthrough', 'milestone', 'record high', 'saved', 'rescued',
  'recovery', 'restored', 'volunteers', 'donated', 'peace',
  'discovered', 'cure', 'renewable', 'solar', 'rebound',
];

const FALSE_POSITIVE_PATTERNS = [
  /record.*loss/i, /recovery.*crash/i, /saved.*from.*collapse/i,
  /peace.*shattered/i, /breakthrough.*covid/i,
];

export async function filterPositiveNews(
  items: NewsItem[],
  options?: { threshold?: number; maxBatch?: number }
): Promise<NewsItem[]> {
  const threshold = options?.threshold ?? 0.7;
  const maxBatch = options?.maxBatch ?? 20;

  // Stage 1: keyword pre-filter (fast, no ML needed)
  const candidates = items.filter(item => {
    const text = `${item.title} ${item.description || ''}`.toLowerCase();
    const hasPositive = POSITIVE_KEYWORDS.some(kw => text.includes(kw));
    const isFalsePositive = FALSE_POSITIVE_PATTERNS.some(p => p.test(text));
    return hasPositive && !isFalsePositive;
  });

  // Stage 2: ML sentiment (slower, more accurate)
  if (!mlWorker.isAvailable || candidates.length === 0) return candidates;

  const batches = chunkArray(candidates, maxBatch);
  const results: NewsItem[] = [];

  for (const batch of batches) {
    try {
      const sentiments = await mlWorker.classifySentiment(
        batch.map(item => item.title)
      );
      for (let i = 0; i < batch.length; i++) {
        if (sentiments[i]?.label === 'positive' && sentiments[i]?.score >= threshold) {
          results.push(batch[i]!);
        }
      }
    } catch {
      // ML failed -- fall back to keyword-only results
      results.push(...batch);
    }
  }

  return results;
}
```

### Pattern 3: New Sebuf Domain Handler

Follow the exact handler pattern from existing domains. One proto, one handler, one client service module.

**What:** `metrics` domain for structured humanity progress data.

**When:** After variant config and basic panels exist. This is NOT a day-1 requirement -- RSS panels work without it.

**Example:**
```protobuf
// proto/worldmonitor/metrics/v1/service.proto
syntax = "proto3";
package worldmonitor.metrics.v1;

service MetricsService {
  rpc ListProgressIndicators(ListProgressIndicatorsRequest)
    returns (ListProgressIndicatorsResponse);
}

message ProgressIndicator {
  string id = 1;
  string name = 2;
  string category = 3;    // "poverty", "health", "education", "environment"
  double current_value = 4;
  double baseline_value = 5;  // historical comparison point
  int64 baseline_year = 6;
  int64 current_year = 7;
  string unit = 8;         // "%", "years", "per 1000"
  string direction = 9;    // "improving" or "declining"
  double improvement_pct = 10;
  repeated DataPoint history = 11;
}

message DataPoint {
  int64 year = 1;
  double value = 2;
}

message ListProgressIndicatorsRequest {
  string category = 1;  // optional filter
}

message ListProgressIndicatorsResponse {
  repeated ProgressIndicator indicators = 1;
  int64 last_updated = 2;
}
```

### Pattern 4: Panel Registration in App.ts

Follow the exact same pattern as tech/finance variant panel registration.

**What:** Add `if (SITE_VARIANT === 'happy')` blocks in `setupPanels()` and data loading.

**When:** After panels are implemented.

**Example:**
```typescript
// In App.ts setupPanels():
if (SITE_VARIANT === 'happy') {
  const humanityPanel = new HumanityMetricsPanel();
  this.panels['humanity-metrics'] = humanityPanel;

  const renewablePanel = new RenewableEnergyPanel();
  this.panels['renewable'] = renewablePanel;
}

// In App.ts loadData():
if (SITE_VARIANT === 'happy') {
  tasks.push({
    name: 'humanityMetrics',
    task: runGuarded('humanityMetrics', () => this.loadHumanityMetrics()),
  });
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Codebase

**What:** Creating a separate repository or separate build pipeline for HappyMonitor.

**Why bad:** The entire value of the variant architecture is shared infrastructure. A separate repo means duplicate maintenance, deployment complexity, diverging feature sets.

**Instead:** Use the established `VITE_VARIANT=happy` pattern. One codebase, one build, one deploy pipeline per variant.

### Anti-Pattern 2: Server-Side Sentiment Filtering

**What:** Moving sentiment classification to Vercel edge functions.

**Why bad:** The DistilBERT-SST2 model is already loaded in the browser via the ML worker. Running it server-side would require a separate ML runtime, increase serverless function cold starts (ONNX models are 65MB+), and duplicate infrastructure.

**Instead:** Keep sentiment classification in the browser ML worker (existing `mlWorker.classifySentiment()`). The browser already has the model loaded for threat classification. Apply a keyword pre-filter server-side in the RSS handler if volume becomes a problem.

### Anti-Pattern 3: Filtering in the Sebuf Handler

**What:** Adding sentiment filtering logic to `server/worldmonitor/news/v1/handler.ts`.

**Why bad:** The handler serves all variants. Adding variant-specific filtering logic there creates coupling between variants and makes the already-large handler even bigger.

**Instead:** Filter on the client side in a dedicated `sentiment-filter.ts` service module. The handler returns all news; the happy variant's client-side service filters to positive items only.

### Anti-Pattern 4: New Theme System

**What:** Building a separate theme engine for the happy variant's warm aesthetic.

**Why bad:** The existing `data-theme` attribute system with CSS variable overrides is well-established. The theme-manager.ts, theme-colors.ts, and the CSS cascade already handle dark/light switching.

**Instead:** Add a `data-variant` attribute to the document root and use CSS selector specificity: `[data-variant="happy"]` overrides base colors while `[data-variant="happy"][data-theme="light"]` handles the light variant. Zero changes to theme-manager.ts.

### Anti-Pattern 5: Over-Engineering the Map

**What:** Building entirely new map layer types with custom WebGL shaders for "warm glow" effects.

**Why bad:** Deck.gl already supports icon layers, scatterplot layers with custom colors, and heatmap layers. Custom WebGL work is fragile and hard to maintain.

**Instead:** Use existing Deck.gl layer types (IconLayer for conservation sites, ScatterplotLayer with warm colors for community events, HeatmapLayer with warm color ramp for positive event density).

## Suggested Build Order

Build order is dictated by dependency chains. Earlier items are prerequisites for later items.

```
Phase 1: Foundation (no user-visible changes yet)
  1. src/config/variant.ts — add 'happy' to allowed values
  2. src/config/variants/happy.ts — variant config file
  3. src/config/panels.ts — add HAPPY_PANELS, HAPPY_MAP_LAYERS
  4. vite.config.ts — add happy to VARIANT_META
  5. vercel.json — no changes needed (subdomain config is in Vercel dashboard)
     ↓ depends on nothing

Phase 2: Theme (visual identity)
  6. src/styles/happy-theme.css — warm CSS variables
  7. src/main.ts — set data-variant attribute from SITE_VARIANT
  8. index.html — import happy-theme.css
     ↓ depends on Phase 1

Phase 3: Positive News Feeds (core content)
  9. src/config/happy-feeds.ts — positive news RSS sources
  10. src/services/sentiment-filter.ts — positive sentiment filtering
  11. Wire sentiment filter into RSS pipeline for happy variant
  12. Existing NewsPanel instances render positive-only feeds
      ↓ depends on Phase 1, partially on Phase 2

Phase 4: Custom Panels (unique happy content)
  13. HumanityMetricsPanel — D3 charts of progress data
  14. NatureWinsPanel — conservation/wildlife news
  15. ScienceBreakthroughPanel — discoveries ticker
  16. GoodDeedsPanel — community kindness events
  17. RenewableEnergyPanel — clean energy tracker
      ↓ depends on Phase 3

Phase 5: Metrics Domain (structured data backend)
  18. proto/worldmonitor/metrics/v1/service.proto
  19. buf generate
  20. server/worldmonitor/metrics/v1/handler.ts
  21. src/services/humanity-metrics.ts
  22. Wire into HumanityMetricsPanel and RenewableEnergyPanel
      ↓ depends on Phase 4 panels existing

Phase 6: Map Layers (geographic visualization)
  23. src/config/happy-geo.ts — positive location data
  24. Extend MapLayers type with happy-specific layers
  25. Add happy layers to DeckGLMap.ts
  26. Wire layer toggles in App.ts
      ↓ depends on Phase 1, can parallelize with Phase 4-5

Phase 7: Polish & Integration
  27. Variant switcher UI — add happy link to header
  28. Search modal — register happy-specific search sources
  29. App.ts — wire data loading for happy variant
  30. i18n — add happy variant strings to locale files
  31. Analytics — track happy variant events
      ↓ depends on all previous phases
```

### Dependency Graph

```
variant.ts ─── variants/happy.ts ─── panels.ts ─── App.ts panel setup
     |                |                               |
     |          happy-feeds.ts ── sentiment-filter.ts ── RSS pipeline
     |                |
     |          happy-geo.ts ── DeckGLMap.ts layers
     |
vite.config.ts (VARIANT_META)
     |
happy-theme.css ── main.ts (data-variant attr)
     |
metrics.proto ── buf generate ── handler.ts ── humanity-metrics.ts
                                                    |
                                          HumanityMetricsPanel.ts
```

### Integration Points with Existing Code

| Existing File | Change Required | Scope |
|---------------|----------------|-------|
| `src/config/variant.ts` | Add `'happy'` to allowed values | 1 line |
| `src/config/panels.ts` | Add `HAPPY_PANELS`, `HAPPY_MAP_LAYERS`, update ternary export | ~100 lines |
| `src/App.ts` | Add `SITE_VARIANT === 'happy'` branches in ~8 locations | ~150 lines scattered |
| `vite.config.ts` | Add `happy` entry to `VARIANT_META` | ~20 lines |
| `src/main.ts` | Set `data-variant` attribute | 1 line |
| `src/types/index.ts` | Extend `MapLayers` with happy-specific layer keys | ~5 lines |
| `src/components/DeckGLMap.ts` | Add rendering for happy-specific layers | ~100 lines |
| `src/styles/main.css` | Import `happy-theme.css` | 1 line |
| `api/[[...path]].js` (via vite build) | Automatically includes new handler from route table | 0 lines (auto) |
| `vercel.json` | No change (subdomain routing is in Vercel dashboard settings) | 0 lines |

## Scalability Considerations

| Concern | At Launch | At 10K daily users | At 100K daily users |
|---------|-----------|--------------------|--------------------|
| Sentiment filtering load | Browser-side ML, 20-50 items/batch, negligible | Same (per-user browser compute) | Same (no server load) |
| Positive news volume | ~200 items/day from dedicated sources | Same sources, same volume | Consider server-side pre-filtering |
| Humanity metrics API | Cacheable for 24h (data changes monthly) | Cache hit rate >99% | Same -- data changes annually |
| Map layer data | Static geo data, ~500 points | Same | Same |
| RSS proxy load | Shared with other variants, already scaled | Vercel edge handles it | Same |

The happy variant is lighter than the full variant by design. No military flight tracking, no AIS vessel streams, no real-time conflict data. The heaviest operation is sentiment classification, which runs entirely in the browser.

## Sources

- Existing codebase analysis (HIGH confidence):
  - `src/config/variants/tech.ts`, `src/config/variants/finance.ts` -- established variant patterns
  - `src/config/panels.ts` -- panel configuration and variant-aware exports
  - `src/services/ml-worker.ts`, `src/config/ml-config.ts` -- existing sentiment analysis capability
  - `src/utils/theme-manager.ts`, `src/styles/main.css` -- theme system
  - `src/App.ts` -- variant branching patterns, panel registration, data loading
  - `vite.config.ts` -- build-time variant metadata
  - `.planning/codebase/ARCHITECTURE.md` -- system architecture documentation

---

*Architecture analysis: 2026-02-22*
