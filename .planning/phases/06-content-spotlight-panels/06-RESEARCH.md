# Phase 6: Content Spotlight Panels - Research

**Researched:** 2026-02-23
**Domain:** Content presentation panels — horizontal ticker, hero card, AI digest
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCI-01 | Horizontal scrolling ticker of recent scientific discoveries and medical advances | CSS `@keyframes` scroll animation already used in happy-theme.css. Pattern: `overflow: hidden` container + animated inner div using `translateX`. No JS needed for the scroll itself. |
| SCI-02 | RSS feeds from ScienceDaily, Nature, Science, Live Science filtered for breakthrough/positive content | All 4 RSS feed URLs verified. Science feed is via Google News proxy. Can use `rss()` helper in `feeds.ts`. Add to `HAPPY_FEEDS.science` array alongside existing `GNN Science`. |
| HERO-01 | Daily featured story card of an individual doing extraordinary good (hero, inventor, rescuer, volunteer) | `GNN Heroes` feed already configured at `https://www.goodnewsnetwork.org/category/news/inspiring/feed/` in `HAPPY_FEEDS.inspiring`. NewsItem already carries `imageUrl`, `link`, `title`, `source`, `lat`, `lon` when extractable. |
| HERO-02 | Full-width card with photo, story excerpt, and location shown on map | `NewsItem.imageUrl` already populated for happy variant. `MapContainer.setCenter(lat, lon)` and `MapContainer.flashLocation(lat, lon)` already exist. Hero panel triggers both on mount. |
| HERO-03 | Curated from GNN Heroes feed and editorial picks | `GNN Heroes` is already the only feed in `HAPPY_FEEDS.inspiring`. Rotation: pick top item (most recent) from `inspiring` feed daily, with fallback to `humanity-kindness` category items from `positive` feed. |
| DIGEST-01 | Summary panel showing 5 curated top positive stories of the day in 50 words or less each | `mlWorker.summarize(texts, modelId)` is the existing interface. `generateSummary()` in `src/services/summarization.ts` is the production path (cloud + browser T5 fallback chain). Input: top 5 stories by date from `happyAllItems`. |
| DIGEST-02 | AI summarization via existing Flan-T5 model in ML worker | Confirmed: `Xenova/flan-t5-base` (250MB) is `MODEL_CONFIGS` id `'summarization'`. Worker handles `summarize` message type. `mlWorker.summarize(texts, 'summarization')` is the direct interface. Cloud route (`generateSummary()`) is the preferred path for performance; T5 as fallback. |
</phase_requirements>

---

## Summary

Phase 6 adds three distinct content panels to the happy variant: a science breakthroughs ticker (SCI-01/02), a daily hero spotlight card (HERO-01/02/03), and a "5 Good Things" digest panel (DIGEST-01/02). All three are scoped to `SITE_VARIANT === 'happy'` and follow the established `Panel` base class lifecycle.

The core infrastructure is already in place. RSS feeds (including GNN Heroes) are configured in `src/config/feeds.ts`. The `NewsItem` type already carries `imageUrl`, `lat`, `lon`, `happyCategory`, `title`, `link`, and `pubDate`. The ML worker already supports Flan-T5 summarization via `mlWorker.summarize()`. The map already has `setCenter()` and `flashLocation()`. The happy variant CSS already has `@keyframes` animations in `happy-theme.css`. The content pipeline already accumulates items in `this.happyAllItems` in `App.ts`.

What is missing: (1) four new science RSS feeds in `HAPPY_FEEDS.science`, (2) three new panel classes (`BreakthroughsTickerPanel`, `HeroSpotlightPanel`, `GoodThingsDigestPanel`), (3) wiring in `App.ts` `createPanels()`, (4) CSS in `happy-theme.css`, and (5) panel keys in `DEFAULT_PANELS` in `src/config/variants/happy.ts` (already present as `spotlight` and `breakthroughs` stubs).

**Primary recommendation:** Build all three panels as thin classes extending `Panel`, sourcing data from `this.happyAllItems` already accumulated by App.ts. Use the production `generateSummary()` path for digest (not raw mlWorker), matching how the rest of the app uses summarization.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla TypeScript | Project standard | Panel classes | No framework (project decision) |
| CSS `@keyframes` | Native | Ticker scroll animation | Already used in happy-theme.css for radar sweep and pulse |
| `mlWorker` singleton | Project | Flan-T5 summarization | Already wired into App.ts, no new worker setup needed |
| `Panel` base class | `src/components/Panel.ts` | Lifecycle, resize, header | Mandatory for all happy variant panels |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `generateSummary()` | `src/services/summarization.ts` | Production summarization with cloud+T5 fallback chain | Preferred over raw `mlWorker.summarize()` for DIGEST-01 |
| `classifyNewsItem()` | `src/services/positive-classifier.ts` | Category tagging | Already applied to items in `happyAllItems` |
| `fetchCategoryFeeds()` | `src/services/rss.ts` | RSS ingestion with caching and retry | Existing pattern for all feed fetching |
| `inferGeoHubsFromTitle()` | `src/services/geo-hub-index.ts` | Extract lat/lon from hero story title | Used by rss.ts already; needed when lat/lon not in feed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS animation ticker | JS `requestAnimationFrame` scroll | CSS is simpler, pauses with `animations-paused` body class (existing infra), no JS overhead |
| `generateSummary()` chain | Raw `mlWorker.summarize()` | `generateSummary()` gives Redis caching + cloud providers for speed; raw mlWorker is 250MB download before first summary |
| Daily rotation via RSS date sort | Server-side editorial API | RSS date sort is sufficient and avoids new backend infra; hero is "most recent from inspiring feed" |

**Installation:** No new npm packages required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── BreakthroughsTickerPanel.ts   # SCI-01, SCI-02
│   ├── HeroSpotlightPanel.ts         # HERO-01, HERO-02, HERO-03
│   └── GoodThingsDigestPanel.ts      # DIGEST-01, DIGEST-02
├── config/
│   └── feeds.ts                      # Add 4 science feeds to HAPPY_FEEDS.science
└── styles/
    └── happy-theme.css               # Add ticker, hero card, digest CSS
```

### Pattern 1: Panel Base Class Extension

All three panels MUST extend `Panel` from `src/components/Panel.ts`.

```typescript
// Source: src/components/CountersPanel.ts (established pattern)
import { Panel } from './Panel';

export class BreakthroughsTickerPanel extends Panel {
  constructor() {
    super({ id: 'breakthroughs', title: 'Breakthroughs', trackActivity: false });
    // Build DOM imperatively — no framework
  }

  public setItems(items: NewsItem[]): void {
    // Called by App.ts after happyAllItems accumulate
  }

  public destroy(): void {
    // Cancel animation, clear timers
    super.destroy();
  }
}
```

### Pattern 2: App.ts Panel Wiring

Add panels in `createPanels()` under the `SITE_VARIANT === 'happy'` guard. Follow the exact pattern used for `CountersPanel` and `ProgressChartsPanel` (lines 2419-2429 of App.ts).

```typescript
// Source: App.ts lines 2418-2429 (established pattern)
if (SITE_VARIANT === 'happy') {
  const breakthroughsPanel = new BreakthroughsTickerPanel();
  this.panels['breakthroughs'] = breakthroughsPanel;

  this.heroPanel = new HeroSpotlightPanel();
  this.panels['spotlight'] = this.heroPanel;

  this.digestPanel = new GoodThingsDigestPanel();
  this.panels['digest'] = this.digestPanel;
}
```

Panel keys `'spotlight'` and `'breakthroughs'` are already in `DEFAULT_PANELS` in `src/config/variants/happy.ts`. A new `'digest'` key must be added there.

### Pattern 3: Receiving Data from App.ts

App.ts already accumulates `this.happyAllItems: NewsItem[]`. After the content pipeline runs (`loadHappySupplementaryAndRender()`), call panel update methods. Follow how `positivePanel.renderPositiveNews(curated)` is called at line 3649.

```typescript
// In App.ts, after loading happy supplementary content:
this.breakthroughsPanel?.setItems(
  this.happyAllItems.filter(item =>
    item.happyCategory === 'science-health' || item.happyCategory === 'innovation-tech'
  )
);
this.heroPanel?.setHeroStory(this.happyAllItems.find(item => item.happyCategory === 'humanity-kindness'));
this.digestPanel?.setStories(this.happyAllItems.slice(0, 5));
```

### Pattern 4: Science RSS Feeds — Add to HAPPY_FEEDS

In `src/config/feeds.ts`, update the `HAPPY_FEEDS.science` array:

```typescript
// Source: src/config/feeds.ts lines 952-954 (current state)
science: [
  { name: 'GNN Science', url: rss('https://www.goodnewsnetwork.org/category/news/science/feed/') },
  // ADD:
  { name: 'ScienceDaily', url: rss('https://www.sciencedaily.com/rss/top.xml') },
  { name: 'Nature News', url: rss('https://feeds.nature.com/nature/rss/current') },
  { name: 'Live Science', url: rss('https://www.livescience.com/feeds/all') },
  { name: 'New Scientist', url: rss('https://www.newscientist.com/feed/home/') },
],
```

NOTE: Science.org (AAAS) and Nature both produce RSS items as journal tables-of-contents, not filtered news. Google News proxy (via the `rss()` helper) is the approach used for other specialty sources. If direct RSS fails CORS/proxy, use the Google News proxy pattern:

```typescript
{ name: 'Science News', url: rss('https://news.google.com/rss/search?q=science+breakthrough+discovery+when:3d&hl=en-US&gl=US&ceid=US:en') },
```

### Pattern 5: CSS Ticker Animation

The `animations-paused` class is already applied project-wide in `main.css` to stop animations when tab is hidden. Any ticker `@keyframes` defined in `happy-theme.css` will automatically pause.

```css
/* In src/styles/happy-theme.css */
@keyframes happy-ticker-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

[data-variant="happy"] .ticker-track {
  display: flex;
  width: max-content;
  animation: happy-ticker-scroll 30s linear infinite;
}

[data-variant="happy"] .ticker-wrapper:hover .ticker-track {
  animation-play-state: paused;
}
```

The ticker DOM pattern: container (overflow:hidden) → `.ticker-track` (doubled content for seamless loop) → individual `.ticker-item` elements.

### Pattern 6: Hero Location on Map

`MapContainer.setCenter(lat, lon)` + `MapContainer.flashLocation(lat, lon)` are already public. Both DeckGL and SVG map fallback implement them. Trigger from `HeroSpotlightPanel` when a hero story with coordinates is shown.

```typescript
// In HeroSpotlightPanel, communicate back to App via callback pattern
this.onLocationClick = (lat, lon) => {
  this.mapRef?.setCenter(lat, lon);
  this.mapRef?.flashLocation(lat, lon, 3000);
};
```

Or App.ts can watch for hero panel events and drive the map. The existing pattern in App.ts is: `this.signalModal.setLocationClickHandler((lat, lon) => { this.map?.setCenter(lat, lon, 4); })` (line 362-364).

### Pattern 7: GoodThingsDigest Summarization

Use `generateSummary()` from `src/services/summarization.ts` — not raw `mlWorker.summarize()`. It provides: Redis cache hit (instant), cloud providers (Groq/OpenRouter, fast), and browser T5 fallback.

```typescript
import { generateSummary } from '@/services/summarization';

// For each of the 5 stories, run independently and show progressively
for (const item of top5Items) {
  const result = await generateSummary([item.title], undefined, item.locationName);
  if (result) {
    this.renderSummary(item, result.summary);
  } else {
    // Fallback: display truncated title
    this.renderSummary(item, item.title.slice(0, 200));
  }
}
```

**Important:** `generateSummary()` input is an array of headline strings, not full article text. Use `item.title` or `[item.title, item.source]`. The 50-word limit is enforced by `max_new_tokens: 64` already in the worker.

### Anti-Patterns to Avoid

- **Loading summarization synchronously on render:** generateSummary can take 2-10 seconds. Always render titles first, then update async. Do not block panel display.
- **Fetching science RSS feeds independently:** Do not create a separate fetch in the panel constructor. Science feeds are already loaded by `fetchCategoryFeeds(FEEDS.science)` called by App.ts. Pass results via a `setItems()` method.
- **Using `innerHTML` with unsanitized RSS content:** The codebase already uses `escapeHtml()` and `sanitizeUrl()` from `src/utils/sanitize.ts`. Use these for all ticker items and hero card content (RSS titles can contain HTML entities or injection attempts).
- **Direct `mlWorker.summarize()` calls for digest:** This bypasses the Redis cache and cloud provider chain. Always use `generateSummary()`.
- **Adding panels outside the `SITE_VARIANT === 'happy'` guard:** Other variants must not instantiate or receive these panels.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS fetch + parse + cache | Custom fetch logic in panel | `fetchCategoryFeeds(FEEDS.science)` in `src/services/rss.ts` | Already has circuit breaker, CACHE_TTL, persistent cache, per-language support |
| 50-word summarization | Truncation by character/word count | `generateSummary()` from `src/services/summarization.ts` | Has Redis cache, Groq/OpenRouter/T5 fallback chain already wired |
| Geo coordinates for hero | Geocoding API calls | `inferGeoHubsFromTitle(item.title)` in `src/services/geo-hub-index.ts` | Already used by `rss.ts` at parse time; coordinates are in `NewsItem.lat/lon` when available |
| Ticker animation | JavaScript `requestAnimationFrame` scroll | CSS `@keyframes translateX` | Simpler, auto-pauses with existing `animations-paused` infra |
| Category filtering for ticker | Custom filter logic | `item.happyCategory === 'science-health'` | `happyAllItems` already has `happyCategory` set by `classifyNewsItem()` |

---

## Common Pitfalls

### Pitfall 1: Science RSS Feeds May Have CORS or Proxy Issues

**What goes wrong:** Direct RSS URLs for Nature, ScienceDaily, etc. may fail when fetched via the Vercel rss-proxy if the target server blocks Vercel IPs (same issue documented for UN News, CISA in feeds.ts).
**Why it happens:** Some academic/science publishers block cloud provider IP ranges.
**How to avoid:** Use the Railway proxy (`railwayRss()`) for feeds that fail via `rss()`. The project already has `railwayRss` configured in feeds.ts as a fallback. Test each URL at integration time. As a last resort, use Google News search proxy: `rss('https://news.google.com/rss/search?q=sciencedaily+breakthrough+when:3d...')`.
**Warning signs:** Items array returns empty from `fetchCategoryFeeds()` for science feeds while GNN Science returns data fine.

### Pitfall 2: Hero Story Has No Location (No lat/lon)

**What goes wrong:** `NewsItem.lat` and `NewsItem.lon` are optional. GNN Heroes stories may not mention a geographic location in the title, so `inferGeoHubsFromTitle()` returns no match.
**Why it happens:** Human interest stories ("firefighter rescues cat") may not name a location recognizable by the geo-hub keyword index.
**How to avoid:** Hero panel must handle the no-location case gracefully: show the card without map interaction. Only call `map.setCenter()` and `map.flashLocation()` when `item.lat` and `item.lon` are defined. Do not show a map section in the hero card if coordinates are absent.
**Warning signs:** `setCenter(undefined, undefined)` being called, which would produce NaN pan values.

### Pitfall 3: Ticker Content Duplicates Items from PositiveNewsFeedPanel

**What goes wrong:** If the ticker sources from `happyAllItems` filtered by `science-health`, users see the same stories in both the feed panel and the ticker.
**Why it happens:** Both panels receive data from the same `happyAllItems` accumulator.
**How to avoid:** The ticker should prioritize the dedicated science RSS feeds (ScienceDaily, Nature, etc.) rather than the general `happyAllItems`. In `App.ts`, pass the science-specific feed results to `breakthroughsPanel.setItems()`, separate from `happyAllItems`. Alternatively, dedupe by `item.source` — only show items from the science feed sources in the ticker.
**Warning signs:** Users reporting they see the same story in two places.

### Pitfall 4: Digest Summarization Takes Too Long on First Load

**What goes wrong:** If `generateSummary()` calls are made for all 5 stories sequentially at page load, the digest panel can take 10-30+ seconds to populate if cloud providers are slow.
**Why it happens:** Sequential summarization + model loading latency.
**How to avoid:** (1) Show titles immediately in the digest panel before summarization. (2) Run the 5 summaries in parallel with `Promise.allSettled()`. (3) Update each card as its summary resolves (progressive rendering). (4) Cap total wait time — if a summary doesn't resolve in 5 seconds, show a 50-word excerpt from the title instead.
**Warning signs:** Digest panel sits in loading state for >5 seconds.

### Pitfall 5: Ticker Doesn't Stop When Panel is Destroyed

**What goes wrong:** CSS animation continues even after the panel DOM element is removed, if the `@keyframes` animation is still running on elements that were moved to a detached tree.
**Why it happens:** CSS animations on detached DOM are browser-dependent.
**How to avoid:** In `destroy()`, set `tickerTrack.style.animationPlayState = 'paused'` and clear the DOM. The `super.destroy()` call in Panel already cancels the abort controller; just ensure no lingering DOM references. This is a minor risk since panels are typically not removed mid-session.

---

## Code Examples

### Ticker DOM Structure

```typescript
// Source: pattern inspired by CountersPanel.ts createCounterGrid()
private createTickerDOM(): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'breakthroughs-ticker-wrapper';

  this.tickerTrack = document.createElement('div');
  this.tickerTrack.className = 'breakthroughs-ticker-track';

  wrapper.appendChild(this.tickerTrack);
  this.content.innerHTML = '';
  this.content.appendChild(wrapper);
}

public setItems(items: NewsItem[]): void {
  if (items.length === 0) return;
  // Double content for seamless infinite scroll
  const html = [...items, ...items].map(item =>
    `<a class="ticker-item" href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener">
      <span class="ticker-item-source">${escapeHtml(item.source)}</span>
      <span class="ticker-item-title">${escapeHtml(item.title)}</span>
    </a>`
  ).join('');
  this.tickerTrack.innerHTML = html;
}
```

### Hero Card Rendering

```typescript
// Source: pattern from PositiveNewsFeedPanel.ts renderCard()
public setHeroStory(item: NewsItem): void {
  const imageHtml = item.imageUrl
    ? `<div class="hero-card-image"><img src="${sanitizeUrl(item.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
    : '';

  const locationHtml = (item.lat !== undefined && item.lon !== undefined)
    ? `<button class="hero-card-location-btn" data-lat="${item.lat}" data-lon="${item.lon}">
         Show on map
       </button>`
    : '';

  this.content.innerHTML = `
    <div class="hero-card">
      ${imageHtml}
      <div class="hero-card-body">
        <span class="hero-card-source">${escapeHtml(item.source)}</span>
        <h3 class="hero-card-title">${escapeHtml(item.title)}</h3>
        <span class="hero-card-time">${formatTime(item.pubDate)}</span>
        ${locationHtml}
      </div>
    </div>`;

  // Wire map button
  const btn = this.content.querySelector('.hero-card-location-btn') as HTMLButtonElement | null;
  if (btn && item.lat !== undefined && item.lon !== undefined) {
    btn.addEventListener('click', () => {
      this.onLocationRequest?.(item.lat!, item.lon!);
    });
  }
}
```

### Digest Panel with Progressive Summarization

```typescript
// Source: pattern from summarization.ts generateSummary()
public async setStories(items: NewsItem[]): Promise<void> {
  const top5 = items.slice(0, 5);
  // Render titles immediately
  this.renderStubCards(top5);

  // Summarize in parallel, update as each resolves
  await Promise.allSettled(top5.map(async (item, idx) => {
    try {
      const result = await generateSummary([item.title], undefined, item.locationName);
      const summary = result?.summary ?? item.title.slice(0, 200);
      this.updateCardSummary(idx, summary);
    } catch {
      // fallback already handled by generateSummary returning null
    }
  }));
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<marquee>` HTML element | CSS `@keyframes translateX` on a doubled content div | ~2015 (marquee deprecated) | Fully controlled via CSS, respects `prefers-reduced-motion`, pauses with body class |
| Direct `mlWorker.summarize()` call | `generateSummary()` with Redis cache + cloud chain | Phase 3 migration | First call uses Redis cache (instant) if another user already summarized today |
| Fetching all RSS in one batch | `fetchCategoryFeeds()` with circuit breaker per feed | Phase 2 | Individual feed failures don't cascade; 5-minute cooldown per failed feed |

**Deprecated/outdated:**
- `<marquee>`: Not used; use CSS animation.
- Hardcoded article text in summarize prompt: The worker already prepends `summarize:` prefix to input (line 163 of `ml.worker.ts`) — do not double-prefix.

---

## Open Questions

1. **Should `BreakthroughsTickerPanel` source from a separate fetch, or from `happyAllItems` already loaded?**
   - What we know: `App.ts` already fetches `FEEDS.science` (which currently only has `GNN Science`) as part of the happy pipeline. If we add ScienceDaily/Nature to `HAPPY_FEEDS.science`, they will flow into `happyAllItems` automatically.
   - What's unclear: Whether the planner prefers a dedicated panel-level fetch vs. relying on App.ts accumulation.
   - Recommendation: Use the existing accumulation path. Add feeds to `HAPPY_FEEDS.science` in `feeds.ts`. Filter `happyAllItems` by `source` matching science sources when passing to `breakthroughsPanel.setItems()`. This is zero new fetch infrastructure.

2. **What is the "daily" rotation mechanism for the hero story?**
   - What we know: GNN Heroes feed has ~5 most recent articles. `pubDate` is available. There is no server-side "daily pick" mechanism.
   - What's unclear: Whether "updating daily" means: (a) picking most recent at page load, or (b) persisting a picked story across refreshes for 24h.
   - Recommendation: Option (a) — pick the most recent item from `HAPPY_FEEDS.inspiring` at each load. This is simple, matches the "daily" spirit, and requires no storage. If the same story appears twice across refreshes within a day, that is acceptable behavior.

3. **Does the ticker need to show stories NOT in `happyAllItems` (i.e., direct from raw science RSS unfiltered by the positive quality gate)?**
   - What we know: The current pipeline passes all items from happy feeds through sentiment filtering (Stage 3 in `loadHappySupplementaryAndRender`). Science RSS items that fail sentiment may be dropped.
   - What's unclear: Whether science breakthroughs should bypass the sentiment filter (since "scientific discovery" headlines read neutrally even if positive content).
   - Recommendation: Add science sources to `HAPPY_FEEDS.science` array. These items will be tagged with `happyCategory === 'science-health'` via `classifyNewsItem()` and will NOT be dropped by the sentiment gate (sentiment gate only applies to GDELT supplementary, not curated RSS). Curated RSS from `HAPPY_FEEDS.*` is always included regardless of sentiment score. So no issue — science items from curated feeds bypass sentiment filtering.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/config/feeds.ts` — HAPPY_FEEDS configuration, rss() and railwayRss() helpers
- Codebase: `src/components/Panel.ts` — Panel base class, lifecycle pattern
- Codebase: `src/components/PositiveNewsFeedPanel.ts` — Happy variant panel pattern
- Codebase: `src/components/CountersPanel.ts` — Panel-without-API pattern
- Codebase: `src/components/ProgressChartsPanel.ts` — Panel-with-data pattern
- Codebase: `src/workers/ml.worker.ts` — Flan-T5 summarize message handler
- Codebase: `src/services/ml-worker.ts` — MLWorkerManager.summarize() interface
- Codebase: `src/services/summarization.ts` — generateSummary() production chain
- Codebase: `src/config/ml-config.ts` — MODEL_CONFIGS, summarization = Xenova/flan-t5-base
- Codebase: `src/App.ts` — createPanels(), loadHappySupplementaryAndRender(), happyAllItems
- Codebase: `src/config/variants/happy.ts` — DEFAULT_PANELS (spotlight, breakthroughs already stubbed)
- Codebase: `src/styles/happy-theme.css` — Existing @keyframes, CSS variable system, all panel styles
- Codebase: `src/components/DeckGLMap.ts` — flashLocation(), setCenter() implementations
- Codebase: `src/components/MapContainer.ts` — Public map interface used by App.ts
- Codebase: `src/types/index.ts` — NewsItem type with imageUrl, lat, lon, happyCategory
- ScienceDaily official newsfeeds page: https://www.sciencedaily.com/newsfeeds.htm — RSS URL `https://www.sciencedaily.com/rss/top.xml` confirmed
- Nature Communications RSS: `http://feeds.nature.com/ncomms/rss/current` (MEDIUM — verified from multiple WebSearch results)

### Secondary (MEDIUM confidence)

- WebSearch: Live Science RSS at `https://www.livescience.com/feeds/all` — multiple sources agree
- WebSearch: New Scientist RSS at `https://www.newscientist.com/feed/home/` — multiple sources agree
- WebSearch: Nature main news feed — no single authoritative URL confirmed; `feeds.nature.com/nature/rss/current` cited in multiple sources

### Tertiary (LOW confidence)

- Google News proxy pattern for science: `https://news.google.com/rss/search?q=science+breakthrough+discovery+when:3d` — reliable fallback but results are less curated than direct publisher feeds

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all core libraries and patterns directly read from codebase
- Architecture: HIGH — exact wiring points identified in App.ts, correct panel IDs confirmed in config
- RSS feed URLs: MEDIUM — ScienceDaily confirmed from official page; others from WebSearch cross-referenced
- Pitfalls: HIGH — derived from reading actual code paths and identified edge cases
- ML/summarization: HIGH — entire stack read from ml.worker.ts, ml-worker.ts, summarization.ts, ml-config.ts

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable architecture; RSS URLs may change if publishers restructure)
