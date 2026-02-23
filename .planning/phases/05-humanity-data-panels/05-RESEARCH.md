# Phase 5: Humanity Data Panels - Research

**Researched:** 2026-02-23
**Domain:** Data visualization (ticking counters + D3.js time-series charts), external API integration (World Bank, OWID)
**Confidence:** HIGH

## Summary

Phase 5 delivers two new panels for the happy variant: a **Live Counters Panel** (Worldometer-style ticking numbers) and a **Progress Charts Panel** (D3.js area charts showing humanity improving over decades). Both panels are client-side rendering intensive but data-light -- counters use hardcoded annual rates with per-second interpolation, and progress charts fetch a small volume of historical data from World Bank and Our World in Data APIs.

The architecture is straightforward: counters require no API at all (rates are derived from published UN/WHO/World Bank annual totals baked into the code), while progress charts reuse the existing World Bank API proxy already built in `server/worldmonitor/economic/v1/list-world-bank-indicators.ts`. OWID data can be fetched client-side as CSV (public, no auth, no CORS issues). D3.js v7 is already installed and extensively used in `Map.ts` and `CountryTimeline.ts`.

**Primary recommendation:** Build counters as a pure client-side animation module (no API calls), and progress charts using the existing World Bank sebuf RPC for 3 indicators plus a direct OWID CSV fetch for the 4th (extreme poverty). Use `requestAnimationFrame` for smooth counter ticking and D3 `d3.area()` for progress charts. Use `papaparse` (new dep) for CSV parsing of OWID data.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COUNT-01 | Worldometer-style ticking counters for positive metrics: babies born today, trees planted, vaccines administered, students graduated, books published, renewable MW installed | Hardcoded annual rates from UN/WHO/World Bank data, per-second interpolation, rendered in a new `CountersPanel` component extending `Panel` base class |
| COUNT-02 | Per-second rate calculation from latest annual UN/WHO/World Bank data (no live API needed) | Annual totals divided by seconds-in-year (31,536,000) gives per-second rate; multiply by elapsed seconds since midnight UTC for "today" counter; no API calls needed -- rates are constants |
| COUNT-03 | Smooth animated number transitions (always-moving, hypnotic feel) | `requestAnimationFrame` loop with fractional accumulation; CSS transitions for digit changes; number formatting with `Intl.NumberFormat` |
| PROG-01 | Long-term trend charts showing human progress: extreme poverty declining, literacy rising, child mortality dropping, life expectancy increasing | World Bank API returns world-level data for all 4 indicators (1W country code); OWID provides alternative/supplementary source |
| PROG-02 | Data sourced from Our World in Data REST API and World Bank Indicators API | World Bank via existing sebuf RPC (`listWorldBankIndicators`); OWID via direct CSV fetch from `ourworldindata.org/grapher/{slug}.csv` -- public, no auth, CC BY 4.0 |
| PROG-03 | D3.js sparkline/area chart visualizations with warm color palette | D3 v7.9.0 already installed; use `d3.area()`, `d3.scaleLinear()`, `d3.scaleTime()`, CSS custom properties from happy theme for colors |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| d3 | ^7.9.0 | Area charts, scales, axes for progress charts | Already installed, extensively used in Map.ts and CountryTimeline.ts |
| papaparse | ^5.4.x | Parse OWID CSV responses client-side | Roadmap prior decision; 3.8M weekly npm downloads; no-dependency CSV parser |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.NumberFormat | Browser built-in | Format large numbers with locale-appropriate separators | Counter display formatting |
| requestAnimationFrame | Browser built-in | 60fps smooth counter ticking | Counter animation loop |
| CSS @property | Browser built-in | Animate CSS custom property integers | Alternative counter animation (if CSS-only approach desired) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| papaparse | Manual CSV split | papaparse handles edge cases (quoted fields, newlines in values); minimal size (~14KB min) |
| requestAnimationFrame | setInterval(16) | rAF syncs with display refresh, pauses when tab hidden (saves battery), more efficient |
| D3 area charts | SVG polyline sparklines (like MacroSignalsPanel) | D3 provides axes, tooltips, responsive scaling; sparklines are simpler but less informative for long-term trends |
| Client-side OWID fetch | Server-side sebuf proxy | OWID is public/free/no-auth; no need for server proxy; reduces server load |

**Installation:**
```bash
npm install papaparse
npm install -D @types/papaparse
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    CountersPanel.ts          # Ticking counters panel (extends Panel)
    ProgressChartsPanel.ts    # D3 area charts panel (extends Panel)
  services/
    humanity-counters.ts      # Counter rate definitions & per-second calculation
    progress-data.ts          # World Bank + OWID data fetching & normalization
src/styles/
    happy-theme.css           # Add counter & progress chart styles (existing file)
```

### Pattern 1: Panel Component (existing pattern)
**What:** All panels extend `Panel` base class from `src/components/Panel.ts`
**When to use:** Every new panel
**Example:**
```typescript
// Source: src/components/PositiveNewsFeedPanel.ts (existing)
import { Panel } from './Panel';

export class CountersPanel extends Panel {
  constructor() {
    super({ id: 'counters', title: 'Live Counters', trackActivity: false });
    // No showCount -- counters panel doesn't need a count badge
  }

  public startTicking(): void {
    // Start requestAnimationFrame loop
  }

  public destroy(): void {
    // Cancel animation frame, clean up
    super.destroy();
  }
}
```

### Pattern 2: Counter Rate Calculation (Worldometer-style)
**What:** Derive per-second rates from annual totals, accumulate since midnight UTC
**When to use:** All 6 counter metrics
**Example:**
```typescript
// Source: Worldometer methodology (https://www.worldometers.info/faq/)
interface CounterMetric {
  id: string;
  label: string;
  annualTotal: number;        // Latest annual figure from UN/WHO/World Bank
  source: string;             // Attribution
  perSecondRate: number;       // annualTotal / 31_536_000
  icon: string;                // Emoji or SVG icon
  formatPrecision: number;     // Decimal places for display
}

function getCounterValue(metric: CounterMetric): number {
  const now = new Date();
  const midnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const elapsedSeconds = (now.getTime() - midnightUTC.getTime()) / 1000;
  return metric.perSecondRate * elapsedSeconds;
}
```

### Pattern 3: requestAnimationFrame Animation Loop
**What:** Smooth 60fps counter updates with fractional accumulation
**When to use:** Counter ticking animation
**Example:**
```typescript
// Source: MDN requestAnimationFrame documentation
private animFrameId: number | null = null;
private lastTimestamp = 0;

private tick = (timestamp: number): void => {
  if (!this.lastTimestamp) this.lastTimestamp = timestamp;
  const deltaMs = timestamp - this.lastTimestamp;
  this.lastTimestamp = timestamp;

  // Update each counter's displayed value
  for (const counter of this.counters) {
    counter.accumulated += counter.perSecondRate * (deltaMs / 1000);
    this.updateCounterDOM(counter);
  }

  this.animFrameId = requestAnimationFrame(this.tick);
};

public startTicking(): void {
  this.animFrameId = requestAnimationFrame(this.tick);
}

public destroy(): void {
  if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  super.destroy();
}
```

### Pattern 4: D3 Area Chart for Progress Data
**What:** Filled area chart showing long-term trends with warm colors
**When to use:** All 4 progress metrics
**Example:**
```typescript
// Source: d3 v7 documentation, existing CountryTimeline.ts patterns
import * as d3 from 'd3';

function renderAreaChart(
  container: HTMLElement,
  data: Array<{ year: number; value: number }>,
  color: string,
  label: string,
): void {
  const margin = { top: 8, right: 8, bottom: 20, left: 36 };
  const width = container.clientWidth - margin.left - margin.right;
  const height = 80;

  const svg = d3.select(container).append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain(d3.extent(data, d => d.year) as [number, number]).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)!]).range([height, 0]);

  const area = d3.area<{ year: number; value: number }>()
    .x(d => x(d.year))
    .y0(height)
    .y1(d => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append('path').datum(data).attr('d', area).attr('fill', color).attr('opacity', 0.3);
  g.append('path').datum(data).attr('d', d3.line<{ year: number; value: number }>()
    .x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX))
    .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2);
}
```

### Pattern 5: Existing World Bank RPC Reuse
**What:** Leverage the existing `listWorldBankIndicators` RPC for progress chart data
**When to use:** Life expectancy, literacy, child mortality data
**Example:**
```typescript
// Source: src/services/economic/index.ts (existing pattern)
import { getIndicatorData } from '@/services/economic';

// World Bank indicator codes for progress charts:
// SP.DYN.LE00.IN  - Life expectancy at birth (years) -- World: 46.4 (1960) -> 73.3 (2023)
// SE.ADT.LITR.ZS  - Literacy rate, adult total (%) -- World: 65.4 (1975) -> 87.6 (2023)
// SH.DYN.MORT     - Under-5 mortality rate (per 1,000) -- World: 226.8 (1960) -> 36.7 (2023)
// SI.POV.DDAY     - Poverty headcount $3/day (%) -- World: 52.2 (1981) -> 10.5 (2023)

const lifeExpData = await getIndicatorData('SP.DYN.LE00.IN', { countries: ['1W'], years: 65 });
```

### Pattern 6: OWID CSV Direct Fetch
**What:** Fetch CSV data directly from OWID for supplementary/alternative data
**When to use:** When OWID has better/longer time series than World Bank
**Example:**
```typescript
// Source: OWID API documentation (https://docs.owid.io/projects/etl/api/chart-api/)
import Papa from 'papaparse';

async function fetchOwidData(slug: string, entity: string = 'OWID_WRL'): Promise<Array<{ year: number; value: number }>> {
  const url = `https://ourworldindata.org/grapher/${slug}.csv?csvType=filtered&useColumnShortNames=true&country=~${entity}`;
  const resp = await fetch(url);
  const text = await resp.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  return parsed.data
    .filter((row: any) => row.year && row[Object.keys(row)[3]])
    .map((row: any) => ({
      year: parseInt(row.year),
      value: parseFloat(row[Object.keys(row)[3]]),
    }));
}
```

### Anti-Patterns to Avoid
- **Calling APIs on every animation frame:** Counter values are computed from hardcoded rates, never fetched per-tick
- **Using setInterval for counter animation:** rAF is more efficient, syncs with display, pauses when tab hidden
- **Fetching OWID data through a server proxy:** OWID is public, free, CC BY 4.0, no auth needed -- direct fetch is simpler
- **Building custom CSV parser:** papaparse handles all edge cases (quoted fields, embedded newlines, BOM)
- **Using innerHTML for counter updates:** Counters update 60fps -- use direct DOM property updates (`textContent`) to avoid layout thrashing

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Manual `split(',')` | `papaparse` | Handles quoted fields, embedded commas/newlines, BOM, type coercion |
| Number formatting | Custom thousands separator | `Intl.NumberFormat` | Locale-aware, handles edge cases, zero dependencies |
| Animation timing | `setInterval(16)` | `requestAnimationFrame` | Syncs with display, pauses when tab hidden, better battery life |
| Area chart rendering | Custom SVG path builder | `d3.area()` + `d3.curveMonotoneX()` | Handles edge cases, smooth curves, scales automatically |
| World Bank API access | New fetch handler | Existing `getIndicatorData()` from `@/services/economic` | Already built with circuit breaker, error handling, response mapping |

**Key insight:** The counters are the most animation-heavy component but require zero network requests. The progress charts require network data but render once and rarely update. This separation makes the architecture clean.

## Common Pitfalls

### Pitfall 1: Counter Drift Over Time
**What goes wrong:** Using `setInterval` accumulation causes counters to drift from real values due to timer imprecision and tab throttling
**Why it happens:** `setInterval(1000)` doesn't guarantee 1000ms intervals; browsers throttle background tabs
**How to avoid:** Calculate counter value from absolute time (seconds since midnight UTC * rate) rather than accumulating deltas. The rAF loop only controls *display updates*, not the *value calculation*.
**Warning signs:** Counter values diverge between tabs, or jump when switching back to a dormant tab

### Pitfall 2: Layout Thrashing on 60fps Updates
**What goes wrong:** Updating 6 counters at 60fps causes jank if each update triggers layout recalculation
**Why it happens:** Using `innerHTML` or changing element dimensions forces browser reflow
**How to avoid:** Use `textContent` for number updates (no HTML parsing); use `transform` for animations; batch all reads before writes. Consider using a single `<span>` per counter and updating only `textContent`.
**Warning signs:** Frame drops visible in Chrome DevTools Performance panel

### Pitfall 3: World Bank API Returning Null Values
**What goes wrong:** Some indicators have gaps (null values) in certain years, breaking chart rendering
**Why it happens:** Not all countries report every year; world aggregates may lag 1-2 years
**How to avoid:** Filter out null values before passing to D3; use `d3.curveMonotoneX` which handles gaps gracefully; show data range in chart subtitle
**Warning signs:** NaN in SVG path `d` attribute, broken/invisible chart lines

### Pitfall 4: OWID CSV Column Names Are Extremely Long
**What goes wrong:** OWID CSV column headers can be 100+ characters when `useColumnShortNames=false`
**Why it happens:** OWID encodes full indicator metadata in column names by default
**How to avoid:** Always use `useColumnShortNames=true` in the query string; access value column by index position (4th column = index 3) rather than by name
**Warning signs:** Code accessing `row.headcount_ratio__ppp_version_2021__...` -- brittle and unreadable

### Pitfall 5: Counter Precision and Display Format
**What goes wrong:** Counters show too many decimal places or numbers don't feel "alive"
**Why it happens:** Some metrics (trees planted ~15.3B/year) tick fast while others (renewable MW installed ~360GW/year) tick slowly
**How to avoid:** Adjust display precision per metric. Fast-ticking counters (births: ~4.3/sec) show integers. Slow-ticking counters (renewable MW: ~11.4kW/sec) show 1-2 decimals. Always show the number changing to maintain the "hypnotic" feel.
**Warning signs:** Some counters appear frozen while others spin rapidly

### Pitfall 6: D3 SVG Not Responsive
**What goes wrong:** Charts don't resize when panel is resized or window changes
**Why it happens:** SVG width/height set as fixed pixels at render time
**How to avoid:** Use a `ResizeObserver` on the chart container (same pattern as `CountryTimeline.ts`); re-render on size change; use `viewBox` for responsive SVG if simpler
**Warning signs:** Charts overflow or appear tiny in resized panels

## Code Examples

Verified patterns from official sources and existing codebase:

### Counter Metric Definitions
```typescript
// Annual data sources for per-second rate calculation
// Sources: UN Population Division, WHO, UNESCO, World Bank, IRENA
const COUNTER_METRICS: CounterMetric[] = [
  {
    id: 'births',
    label: 'Babies Born Today',
    annualTotal: 135_600_000,     // UN World Population Prospects 2024 (~4.3/sec)
    source: 'UN Population Division',
    perSecondRate: 135_600_000 / 31_536_000,  // ~4.3
    icon: '👶',
    formatPrecision: 0,
  },
  {
    id: 'trees',
    label: 'Trees Planted Today',
    annualTotal: 15_300_000_000,  // Various reforestation tracking orgs (~485/sec)
    source: 'Global Forest Watch / FAO',
    perSecondRate: 15_300_000_000 / 31_536_000,  // ~485
    icon: '🌳',
    formatPrecision: 0,
  },
  {
    id: 'vaccines',
    label: 'Vaccines Administered Today',
    annualTotal: 4_600_000_000,   // WHO Global Immunization Coverage (~146/sec)
    source: 'WHO / UNICEF',
    perSecondRate: 4_600_000_000 / 31_536_000,  // ~146
    icon: '💉',
    formatPrecision: 0,
  },
  {
    id: 'graduates',
    label: 'Students Graduated Today',
    annualTotal: 70_000_000,      // UNESCO tertiary + secondary completions (~2.2/sec)
    source: 'UNESCO Institute for Statistics',
    perSecondRate: 70_000_000 / 31_536_000,  // ~2.2
    icon: '🎓',
    formatPrecision: 0,
  },
  {
    id: 'books',
    label: 'Books Published Today',
    annualTotal: 2_200_000,       // UNESCO + ISBN agencies global (~0.07/sec)
    source: 'UNESCO / Bowker',
    perSecondRate: 2_200_000 / 31_536_000,  // ~0.07
    icon: '📚',
    formatPrecision: 0,
  },
  {
    id: 'renewable',
    label: 'Renewable MW Installed Today',
    annualTotal: 510_000,         // IRENA 2024 capacity additions in MW (~0.016/sec)
    source: 'IRENA / IEA',
    perSecondRate: 510_000 / 31_536_000,  // ~0.016
    icon: '⚡',
    formatPrecision: 2,
  },
];
```

### World Bank Progress Data Fetch (reusing existing infrastructure)
```typescript
// Source: existing src/services/economic/index.ts getIndicatorData()
// Verified: World Bank API returns world-level data with country code "1W"
const PROGRESS_INDICATORS = {
  lifeExpectancy: { code: 'SP.DYN.LE00.IN', years: 65, label: 'Life Expectancy' },
  literacy:       { code: 'SE.ADT.LITR.ZS', years: 55, label: 'Literacy Rate' },
  childMortality: { code: 'SH.DYN.MORT',    years: 65, label: 'Child Mortality' },
  poverty:        { code: 'SI.POV.DDAY',     years: 45, label: 'Extreme Poverty' },
};

// All 4 indicators confirmed returning World-level data via:
// https://api.worldbank.org/v2/country/1W/indicator/{code}?format=json
```

### OWID CSV Fetch for Supplementary Data
```typescript
// Source: OWID API docs (https://docs.owid.io/projects/etl/api/chart-api/)
// Verified endpoints:
//   https://ourworldindata.org/grapher/life-expectancy.csv?csvType=filtered&useColumnShortNames=true&country=~OWID_WRL
//   Columns: entity, code, year, life_expectancy_0
//   Returns World data (OWID_WRL) from 1950-2023

// Note: OWID extreme poverty chart does NOT have World aggregate
// Use World Bank SI.POV.DDAY for poverty (confirmed working with 1W)
```

### Happy Theme Colors for Charts
```typescript
// Source: src/styles/happy-theme.css (existing)
// Warm color palette for progress charts:
const PROGRESS_COLORS = {
  lifeExpectancy: '#6B8F5E',  // --green (sage green)
  literacy:       '#7BA5C4',  // --semantic-info (soft blue)
  childMortality: '#C4A35A',  // --yellow (warm gold)
  poverty:        '#C48B9F',  // --red (muted rose)
};
```

### Panel Wiring in App.ts (existing pattern)
```typescript
// Source: src/App.ts lines 2403-2407 (PositiveNewsFeedPanel wiring)
// Same pattern for new panels:
if (SITE_VARIANT === 'happy') {
  this.countersPanel = new CountersPanel();
  this.panels['counters'] = this.countersPanel;

  this.progressPanel = new ProgressChartsPanel();
  this.panels['progress'] = this.progressPanel;
}

// Data loading in refreshAll():
if (SITE_VARIANT === 'happy') {
  tasks.push({ name: 'progress', task: runGuarded('progress', () => this.loadProgressData()) });
  // Counters don't need a load task -- they start ticking immediately
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| World Bank API v1 | World Bank API v2 | 2020 (v1 retired) | Must use v2 in all calls; existing code already does |
| OWID GitHub CSV downloads | OWID Grapher Chart API | 2024-2025 | Can fetch filtered CSV/JSON directly from chart URLs |
| CSS counter animation (`@property`) | Still viable but rAF preferred | 2023+ | `@property` CSS integer animation works but requires browser support; rAF gives more control |
| WHO GHO API for health indicators | World Bank as primary source | Roadmap decision | WHO GHO API may be deprecated; World Bank has same indicators (SH.DYN.MORT, SP.DYN.LE00.IN) |

**Deprecated/outdated:**
- World Bank API v1: Retired June 2020, replaced by v2 (already using v2)
- WHO GHO API: Roadmap flags as possibly deprecated; use World Bank as primary for health indicators

## Data Source Decision Matrix

### Counters (COUNT-01, COUNT-02)
All counter data uses **hardcoded annual totals** -- no runtime API calls needed:

| Counter | Annual Total | Source | Per-Second Rate |
|---------|-------------|--------|-----------------|
| Babies born | ~135.6M | UN Population Division WPP 2024 | ~4.3 |
| Trees planted | ~15.3B | Global Forest Watch estimates | ~485 |
| Vaccines administered | ~4.6B | WHO/UNICEF WUENIC 2024 | ~146 |
| Students graduated | ~70M | UNESCO education statistics | ~2.2 |
| Books published | ~2.2M | UNESCO/Bowker ISBN data | ~0.07 |
| Renewable MW installed | ~510K MW | IRENA 2024 capacity additions | ~0.016 |

### Progress Charts (PROG-01, PROG-02)
All use **World Bank API** as primary source (via existing sebuf RPC):

| Chart | Indicator Code | Country | Year Range | Verified |
|-------|---------------|---------|------------|----------|
| Life expectancy | SP.DYN.LE00.IN | 1W (World) | 1960-2023 | Yes -- 46.4 to 73.3 |
| Literacy rate | SE.ADT.LITR.ZS | 1W (World) | 1975-2023 | Yes -- 65.4% to 87.6% |
| Child mortality | SH.DYN.MORT | 1W (World) | 1960-2023 | Yes -- 226.8 to 36.7 per 1K |
| Extreme poverty | SI.POV.DDAY | 1W (World) | 1981-2023 | Yes -- ~52% to 10.5% |

**OWID supplementary source** (optional, for longer time series):
- Life expectancy: `ourworldindata.org/grapher/life-expectancy` -- has World data from 1950
- Child mortality: `ourworldindata.org/grapher/child-mortality-rate` -- per-country only, no World aggregate
- Extreme poverty: Per-country only in OWID, no World aggregate -- **use World Bank**
- Literacy: `ourworldindata.org/grapher/literacy-rate-adults` -- has indicator, use World Bank as primary

**Recommendation:** Use World Bank as primary for all 4 indicators (simpler, already wired). OWID as fallback/supplement only if needed for longer time series on life expectancy.

## Open Questions

1. **Counter annual totals accuracy**
   - What we know: The approximate magnitudes for all 6 metrics are well-established in UN/WHO publications
   - What's unclear: Exact 2024/2025 figures for trees planted and books published are harder to source definitively than births/vaccines/mortality
   - Recommendation: Use best available estimates with source attribution; these are Worldometer-style approximations, not exact counts. Document sources in code comments. Can be updated later with better data.

2. **papaparse vs manual CSV parsing**
   - What we know: Roadmap prior decision says papaparse is one of only 2 new deps needed; OWID CSV is well-formatted
   - What's unclear: Whether the OWID CSV data is simple enough to parse without papaparse (all numeric, no quoted fields)
   - Recommendation: Install papaparse as planned. It's 14KB minified, handles edge cases, and the roadmap explicitly lists it. If the user later decides OWID data isn't needed (World Bank covers everything), papaparse could be dropped -- but it's cheap insurance.

3. **Progress chart interactivity level**
   - What we know: Requirement says "sparklines/area charts" which implies compact, inline visualizations
   - What's unclear: Whether users should see tooltips on hover, axis labels, or just the trend shape
   - Recommendation: Start with clean area charts with minimal axis labels (year on x, value on y) and a hover tooltip showing exact year/value. This matches the "sparkline" intent while being informative. The `CountryTimeline.ts` pattern shows how tooltips work with D3 in this codebase.

4. **Counter "today" reset behavior**
   - What we know: Worldometer resets daily counters at midnight UTC
   - What's unclear: Whether to show "today" (reset at midnight) or "this year" (reset Jan 1) or both
   - Recommendation: Default to "today" (midnight UTC reset) to match Worldometer convention and create faster-moving, more engaging numbers. Can add a "this year" toggle later.

## Sources

### Primary (HIGH confidence)
- World Bank API v2 documentation: https://datahelpdesk.worldbank.org/knowledgebase/articles/898599-indicator-api-queries
- World Bank API verified responses for SP.DYN.LE00.IN, SE.ADT.LITR.ZS, SH.DYN.MORT, SI.POV.DDAY (all confirmed returning World-level data)
- OWID Chart API documentation: https://docs.owid.io/projects/etl/api/chart-api/
- OWID CSV endpoint verified: `life-expectancy.csv` returns World data from 1950-2023
- Existing codebase: `server/worldmonitor/economic/v1/list-world-bank-indicators.ts` (World Bank proxy pattern)
- Existing codebase: `src/components/Panel.ts` (panel base class pattern)
- Existing codebase: `src/components/CountryTimeline.ts` (D3 usage pattern)
- Existing codebase: `src/components/MacroSignalsPanel.ts` (sparkline SVG pattern)

### Secondary (MEDIUM confidence)
- UN World Population Prospects 2024: ~135.6M births/year globally (https://population.un.org/wpp/)
- WHO/UNICEF WUENIC 2024: ~4.6B vaccine doses administered globally (https://data.unicef.org)
- IRENA 2024: ~510GW renewable capacity additions (https://www.irena.org)
- Worldometer FAQ on methodology: https://www.worldometers.info/faq/

### Tertiary (LOW confidence)
- Trees planted per year (~15.3B): Aggregate from multiple reforestation initiatives; exact global figure is estimated
- Books published per year (~2.2M): UNESCO/Bowker estimates; varies by definition of "book"
- Students graduated per year (~70M): UNESCO aggregate; definition of "graduated" varies by country

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - D3 already installed, World Bank API already proxied, patterns well-established
- Architecture: HIGH - Direct extension of existing Panel pattern, App.ts wiring follows established precedent
- Pitfalls: HIGH - Counter animation and D3 rendering are well-understood domains; World Bank API quirks documented from existing usage
- Data sources: MEDIUM - Counter annual totals for births/vaccines/mortality are solid (UN/WHO); trees/books/graduates less precisely sourced

**Research date:** 2026-02-23
**Valid until:** 2026-04-23 (60 days -- data sources and APIs are stable)
