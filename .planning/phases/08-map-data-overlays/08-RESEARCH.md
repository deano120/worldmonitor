# Phase 8: Map Data Overlays - Research

**Researched:** 2026-02-23
**Domain:** Deck.gl choropleth layers, GeoJSON per-country coloring, map data overlays for happiness/species/energy
**Confidence:** HIGH

## Summary

Phase 8 adds three new map overlay layers to the happy variant: a world happiness choropleth (MAP-03) that colors countries by happiness score, species recovery zone markers (MAP-04) showing where wildlife comebacks are happening, and renewable energy installation locations (MAP-05) as point markers on the map. All three layers build on the established Deck.gl layer patterns already used extensively in `DeckGLMap.ts`.

The codebase already has the full infrastructure needed: country boundary GeoJSON at `public/data/countries.geojson` (258 features with `ISO3166-1-Alpha-2` and `name` properties), the `getCountriesGeoJson()` service that loads and indexes this data, and existing `GeoJsonLayer` usage for conflict zones. The World Happiness Report publishes annual happiness scores (Cantril Ladder, 0-10 scale) per country -- a static curated JSON file (same pattern as `conservation-wins.json`) is the most reliable approach since the WHR data updates annually and Excel-only format requires pre-processing. Species recovery zones can be derived from the existing `conservation-wins.json` by adding lat/lon coordinates for each species' recovery habitat. Renewable energy installations can use the WRI Global Power Plant Database (35,000+ plants with lat/lon, filterable to renewables), or a curated subset as static JSON.

**Primary recommendation:** Use the existing `GeoJsonLayer` for the choropleth (country boundaries already loaded), static curated JSON files for all three data sources (consistent with Phase 7 pattern), and `ScatterplotLayer` for point-based markers (species zones and energy installations). Add three new boolean keys to `MapLayers` and three new layer toggle entries for the happy variant.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAP-03 | World happiness heatmap choropleth layer (World Happiness Report data, green = happy) | Use existing `GeoJsonLayer` with country boundaries GeoJSON (`public/data/countries.geojson`); curated static JSON mapping ISO-2 country codes to happiness scores; `getFillColor` accessor maps score to green color scale; 258 countries in GeoJSON with `ISO3166-1-Alpha-2` property for joining |
| MAP-04 | Species recovery zones as map overlay (IUCN data, wildlife comeback locations) | Extend existing `conservation-wins.json` with lat/lon recovery zone coordinates; render as `ScatterplotLayer` with nature-green color and optional `GeoJsonLayer` polygons for habitat regions; 10 species already curated with region info |
| MAP-05 | Renewable energy installation locations as map layer | Curated static JSON of notable renewable energy installations (solar farms, wind farms, hydro) with lat/lon; `ScatterplotLayer` with category-based coloring (solar=gold, wind=blue, hydro=teal); WRI Global Power Plant Database as reference source |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@deck.gl/layers` | ^9.2.6 | `GeoJsonLayer` for choropleth, `ScatterplotLayer` for point markers | Already used for conflict zones (GeoJsonLayer) and all other markers (ScatterplotLayer) |
| `@deck.gl/core` | ^9.2.6 | Layer base types, PickingInfo | Already imported and used |
| `@deck.gl/mapbox` | ^9.2.6 | MapboxOverlay integration with MapLibre | Already the rendering pipeline |
| `maplibre-gl` | ^5.16.0 | Base map rendering, country boundary source | Already loaded with country-boundaries source for hover/highlight |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `country-geometry.ts` | existing | Loads `countries.geojson`, provides `getCountriesGeoJson()` | For choropleth GeoJSON data source |
| `conservation-data.ts` | existing | Curated species recovery data from `conservation-wins.json` | For species recovery zone locations (extend with lat/lon) |
| `renewable-energy-data.ts` | existing | World Bank renewable energy percentages | Background context for energy layer (actual installations need separate data) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static curated happiness JSON | World Happiness Report Excel download + runtime parsing | WHR only publishes Excel; runtime parsing adds complexity. Curated JSON is simpler and follows Phase 7 pattern |
| Static curated energy JSON | WRI Global Power Plant Database (35k plants, CSV) | Full WRI database is 15MB+ and unmaintained since 2022; curated subset of notable installations is smaller and more meaningful for a "positive map" |
| MapLibre native choropleth | Deck.gl GeoJsonLayer choropleth | MapLibre already has country boundaries loaded for hover/highlight; HOWEVER the existing `loadCountryBoundaries()` uses MapLibre layers for hover state only. Using Deck.gl GeoJsonLayer keeps all data layers in a single rendering pipeline. MapLibre native layers could also work but would require different data-update patterns |
| IUCN Red List API for species zones | Curated JSON with habitat coordinates | IUCN spatial data requires shapefiles + registration; curated coordinates are simpler and already follow the Phase 7 decision (07-01) |

**Installation:**
```bash
# No new dependencies needed -- all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── data/
│   ├── conservation-wins.json      # EXISTING: extend with lat/lon recovery zone coordinates
│   ├── world-happiness.json        # NEW: static curated happiness scores by country
│   └── renewable-installations.json # NEW: static curated renewable energy installations
├── services/
│   ├── conservation-data.ts        # EXISTING: extend SpeciesRecovery type with recoveryZone
│   ├── happiness-data.ts           # NEW: load and expose happiness scores + color scale
│   └── renewable-installations.ts  # NEW: load and expose renewable installation locations
├── components/
│   └── DeckGLMap.ts                # ADD: createHappinessChoroplethLayer(), createSpeciesRecoveryLayer(), createRenewableInstallationsLayer()
├── config/
│   ├── variants/happy.ts           # ADD: new layer keys as enabled by default
│   └── panels.ts                   # ADD: new layer keys to MapLayers configs
└── types/
    └── index.ts                    # ADD: happiness, speciesRecovery, renewableInstallations to MapLayers
```

### Pattern 1: GeoJsonLayer Choropleth (MAP-03)
**What:** A filled polygon layer where each country is colored based on a data value (happiness score)
**When to use:** Per-country coloring with existing country boundary GeoJSON
**Example:**
```typescript
// Pattern based on existing createConflictZonesLayer() at DeckGLMap.ts:1246
// and deck.gl GeoJsonLayer docs: https://deck.gl/docs/api-reference/layers/geojson-layer

private happinessScores: Map<string, number> = new Map(); // ISO-2 -> score (0-10)

private createHappinessChoroplethLayer(): GeoJsonLayer {
  // getCountriesGeoJson() is already loaded by loadCountryBoundaries()
  // We can reuse the same GeoJSON data
  const geojson = this.countriesGeoJsonData; // cached reference

  return new GeoJsonLayer({
    id: 'happiness-choropleth-layer',
    data: geojson,
    filled: true,
    stroked: true,
    getFillColor: (feature: any) => {
      const code = feature.properties?.['ISO3166-1-Alpha-2'];
      const score = code ? this.happinessScores.get(code) : undefined;
      if (score == null) return [0, 0, 0, 0]; // transparent for missing data
      // Green scale: darker green = happier (score 0-10)
      const t = score / 10; // normalize to 0-1
      return [
        Math.round(40 + (1 - t) * 180),   // R: 40 (happy) to 220 (unhappy)
        Math.round(180 + t * 60),           // G: 180 (base) to 240 (happy)
        Math.round(40 + (1 - t) * 100),    // B: 40 (happy) to 140 (unhappy)
        140,                                 // Alpha: semi-transparent
      ] as [number, number, number, number];
    },
    getLineColor: [100, 100, 100, 60],
    getLineWidth: 1,
    lineWidthMinPixels: 0.5,
    pickable: true,
    updateTriggers: {
      getFillColor: [this.happinessScores.size], // re-evaluate when data changes
    },
  });
}
```

### Pattern 2: ScatterplotLayer with Static Data (MAP-04, MAP-05)
**What:** Point markers from curated static JSON, following existing positive events/kindness pattern
**When to use:** All point-based data layers with category-based coloring
**Example:**
```typescript
// Pattern from existing createPositiveEventsLayers() at DeckGLMap.ts:2345

interface SpeciesRecoveryZone {
  id: string;
  name: string;        // e.g. "Bald Eagle - Eastern USA"
  species: string;     // e.g. "Bald Eagle"
  lat: number;
  lon: number;
  status: string;      // "recovered" | "recovering"
  region: string;
}

private createSpeciesRecoveryLayer(): ScatterplotLayer {
  return new ScatterplotLayer<SpeciesRecoveryZone>({
    id: 'species-recovery-layer',
    data: this.speciesRecoveryZones,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 50000,       // ~50km radius circles for habitat zones
    getFillColor: [74, 222, 128, 120], // green with transparency
    radiusMinPixels: 8,
    radiusMaxPixels: 25,
    stroked: true,
    getLineColor: [74, 222, 128, 200],
    lineWidthMinPixels: 1,
    pickable: true,
  });
}
```

### Pattern 3: MapContainer Delegation (DeckGL-only layers)
**What:** MapContainer passes data to DeckGLMap only, SVG map does not support these layers
**When to use:** All Phase 8 layers (consistent with Phase 4 decision)
**Example:**
```typescript
// Pattern from MapContainer.ts:338-349
public setHappinessScores(scores: Map<string, number>): void {
  if (this.useDeckGL) {
    this.deckGLMap?.setHappinessScores(scores);
  }
  // SVG map does not support choropleth overlay
}
```

### Anti-Patterns to Avoid
- **Loading GeoJSON twice for choropleth:** The country boundaries GeoJSON is already loaded by `loadCountryBoundaries()` for hover/highlight. Do NOT load it a second time for the choropleth. Cache a reference to the loaded GeoJSON and reuse it.
- **Using MapLibre native layers for data overlay:** The existing country hover/highlight uses MapLibre native layers (`fill`, `line`), but data-driven overlays should use Deck.gl for consistency with all other data layers. Mixing data-update patterns between MapLibre style paint and Deck.gl props creates maintenance confusion.
- **Fetching WHR data at runtime:** The World Happiness Report only publishes an Excel file (`Data+for+Figure+2.1+(2011-2024).xlsx`). Do NOT try to fetch and parse this at runtime. Pre-process it into a static JSON file.
- **Using the full WRI database:** The Global Power Plant Database is 35,000+ entries and unmaintained since 2022. Curate a meaningful subset of notable/recent renewable installations rather than dumping the full CSV onto the map.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Country boundary polygons | Custom GeoJSON generation | Existing `public/data/countries.geojson` (258 features) | Already loaded, indexed, and used for hover/highlight |
| Color scale for choropleth | Custom interpolation function | Simple linear RGB mapping in `getFillColor` accessor | Deck.gl accessors are evaluated per-feature; keep the math inline and simple |
| Country code matching | Manual ISO code lookup tables | `ISO3166-1-Alpha-2` property in GeoJSON, join via Map<string, score> | GeoJSON features already have standardized codes |
| Species recovery coordinates | Reverse geocoding from region names | Curate lat/lon directly in `conservation-wins.json` | Each species has a well-known recovery habitat center point |

**Key insight:** The choropleth is just a `GeoJsonLayer` with a data-driven `getFillColor` -- the same pattern already used for conflict zones. The only new work is preparing the data (happiness scores, species coordinates, energy installations) and wiring the layers.

## Common Pitfalls

### Pitfall 1: GeoJSON Layer Rendering Order vs MapLibre Layers
**What goes wrong:** The choropleth GeoJsonLayer in Deck.gl renders ON TOP of the MapLibre basemap but may conflict with the existing MapLibre `country-interactive` / `country-hover-fill` layers that are also based on the same GeoJSON source.
**Why it happens:** MapLibre layers and Deck.gl layers occupy different rendering pipelines but overlay the same geographic space. Two fill layers on the same polygons create visual z-fighting.
**How to avoid:** Set the Deck.gl choropleth to lower opacity (alpha ~100-140) so it acts as a tint. The MapLibre hover layer has opacity 0.06-0.10, so it will still be visible on top. Alternatively, when the happiness layer is active, set the MapLibre hover fill to a higher opacity or different color.
**Warning signs:** Countries appear "double-shaded" or hover effect becomes invisible.

### Pitfall 2: Country Code Mismatch Between Data Sources
**What goes wrong:** WHR data uses country names (e.g., "United States"), GeoJSON uses ISO 3166-1 Alpha-2 codes (e.g., "US"). Join fails for some countries.
**Why it happens:** Country naming is inconsistent across data sources. "South Korea" vs "Korea, Republic of" vs "KR".
**How to avoid:** Pre-process WHR data into `{ [iso2code]: score }` format. Include a manual mapping table for known mismatches (e.g., "Turkiye" -> "TR", "Czechia" -> "CZ", "Congo" -> "CG" vs "CD").
**Warning signs:** Countries appear transparent (no data) despite having WHR scores.

### Pitfall 3: updateTriggers for Dynamic Data
**What goes wrong:** GeoJsonLayer does not re-render when the data Map changes because deck.gl does shallow-comparison on the `data` prop.
**Why it happens:** Same GeoJSON reference, but the happiness score Map was updated. Deck.gl skips re-computation.
**How to avoid:** Use `updateTriggers: { getFillColor: [this.happinessScores.size] }` or increment a version counter. The existing codebase uses `updateTriggers` in several places (e.g., line 2411).
**Warning signs:** Choropleth shows stale/empty colors after data loads.

### Pitfall 4: Performance with Full Country GeoJSON
**What goes wrong:** 258 country features with complex MultiPolygon geometries cause slow `buildLayers()` if GeoJsonLayer is recreated every frame.
**Why it happens:** The `buildLayers()` method is called on every render pass. Creating a new GeoJsonLayer instance each time forces re-tessellation.
**How to avoid:** The existing codebase already uses `this.layerCache` for some layers. Either cache the choropleth layer similarly, or rely on Deck.gl's internal memoization (GeoJsonLayer will skip re-tessellation if `data` reference is stable). Keep the GeoJSON reference stable and only change `updateTriggers`.
**Warning signs:** `buildLayers()` exceeds 16ms budget when happiness layer is active.

### Pitfall 5: Data Sparsity for Renewable Installations
**What goes wrong:** Too few or too many markers on the map. Too few looks empty; too many creates visual noise.
**Why it happens:** Curated dataset size is a design choice. The WRI database has 35,000+ plants but most are small; a handful of "notable" ones may be too sparse.
**How to avoid:** Target 50-150 curated installations globally -- enough to show density patterns (China/EU/US clusters) without overwhelming the map. Include a mix of types (solar, wind, hydro, geothermal) and sizes (utility-scale only, >100MW).
**Warning signs:** Layer looks empty at global zoom or turns into visual noise at regional zoom.

## Code Examples

Verified patterns from existing codebase:

### GeoJsonLayer for Polygons (Conflict Zones Pattern)
```typescript
// Source: src/components/DeckGLMap.ts:1246-1275
private createConflictZonesLayer(): GeoJsonLayer {
  const geojsonData = {
    type: 'FeatureCollection' as const,
    features: CONFLICT_ZONES.map(zone => ({
      type: 'Feature' as const,
      properties: { id: zone.id, name: zone.name, intensity: zone.intensity },
      geometry: { type: 'Polygon' as const, coordinates: [zone.coords] },
    })),
  };

  return new GeoJsonLayer({
    id: 'conflict-zones-layer',
    data: geojsonData,
    filled: true,
    stroked: true,
    getFillColor: () => COLORS.conflict,
    getLineColor: () => getCurrentTheme() === 'light'
      ? [255, 0, 0, 120] : [255, 0, 0, 180],
    getLineWidth: 2,
    lineWidthMinPixels: 1,
    pickable: true,
  });
}
```

### Data Setter + Render Pattern
```typescript
// Source: src/components/DeckGLMap.ts:3580-3588
public setPositiveEvents(events: PositiveGeoEvent[]): void {
  this.positiveEvents = events;
  this.syncPulseAnimation();
  this.render();
}

public setKindnessData(points: KindnessPoint[]): void {
  this.kindnessPoints = points;
  this.syncPulseAnimation();
  this.render();
}
```

### MapContainer Delegation (DeckGL-only)
```typescript
// Source: src/components/MapContainer.ts:338-349
public setPositiveEvents(events: PositiveGeoEvent[]): void {
  if (this.useDeckGL) {
    this.deckGLMap?.setPositiveEvents(events);
  }
  // SVG map does not support positive events layer
}
```

### Layer Toggle Configuration (Happy Variant)
```typescript
// Source: src/components/DeckGLMap.ts:2993-2998
: SITE_VARIANT === 'happy'
? [
    { key: 'positiveEvents', label: 'Positive Events', icon: '&#127775;' },
    { key: 'kindness', label: 'Acts of Kindness', icon: '&#128154;' },
    { key: 'natural', label: t('components.deckgl.layers.naturalEvents'), icon: '&#127755;' },
  ]
```

### Tooltip Pattern
```typescript
// Source: src/components/DeckGLMap.ts:2651-2657
case 'positive-events-layer': {
  const catLabel = obj.category ? obj.category.replace(/-/g, ' & ') : 'Positive Event';
  const countInfo = obj.count > 1 ? `<br/><span style="opacity:.7">${obj.count} sources reporting</span>` : '';
  return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/><span style="text-transform:capitalize">${text(catLabel)}</span>${countInfo}</div>` };
}
```

### Static JSON Data Loading (Phase 7 Pattern)
```typescript
// Source: src/services/conservation-data.ts:33-36
export async function fetchConservationWins(): Promise<SpeciesRecovery[]> {
  const { default: data } = await import('@/data/conservation-wins.json');
  return data as SpeciesRecovery[];
}
```

## Data Source Details

### MAP-03: World Happiness Report Data

**Source:** World Happiness Report 2025 (covers 2011-2024 data)
**URL:** `https://happiness-report.s3.us-east-1.amazonaws.com/2025/Data+for+Figure+2.1+(2011-2024).xlsx`
**Format:** Excel only (needs pre-processing to JSON)
**Key field:** "Ladder score" (Cantril Ladder, 0-10 scale, based on Gallup World Poll)
**Coverage:** ~169 countries
**Update frequency:** Annual (each March)

**Pre-processing needed:**
1. Download Excel file
2. Extract latest year's data (2024): country name, ladder score
3. Map country names to ISO 3166-1 Alpha-2 codes (to match GeoJSON)
4. Save as `src/data/world-happiness.json` with structure:
```json
{
  "year": 2024,
  "source": "World Happiness Report 2025",
  "scores": {
    "FI": 7.736,
    "DK": 7.586,
    "IS": 7.530,
    ...
  }
}
```

**Color scale design:**
- Score 7+ = deep green (happiest countries: Finland, Denmark, Iceland)
- Score 5-7 = medium green (most countries)
- Score 3-5 = pale green / neutral
- Score <3 = very pale / near-transparent (least happy)
- No data = fully transparent

**Confidence:** HIGH -- data is publicly available, well-documented, stable format.

### MAP-04: Species Recovery Zones

**Source:** Existing `conservation-wins.json` (10 species, Phase 7)
**Enhancement needed:** Add lat/lon coordinates for each species' primary recovery habitat

**Proposed coordinate additions:**
| Species | Recovery Zone | Lat | Lon |
|---------|--------------|-----|-----|
| Bald Eagle | Chesapeake Bay, USA | 38.5 | -76.4 |
| Humpback Whale | Hawaii, USA | 20.8 | -156.3 |
| Giant Panda | Sichuan, China | 30.8 | 103.0 |
| Southern White Rhino | Kruger NP, South Africa | -24.0 | 31.5 |
| Gray Wolf | Yellowstone, USA | 44.6 | -110.5 |
| Peregrine Falcon | Rocky Mountains, USA | 39.7 | -105.2 |
| American Alligator | Everglades, USA | 25.3 | -80.9 |
| Arabian Oryx | Abu Dhabi, UAE | 24.2 | 55.5 |
| California Condor | Grand Canyon, USA | 36.1 | -112.1 |
| Mountain Gorilla | Virunga, DRC/Rwanda | -1.5 | 29.5 |

**Multiple zones per species (stretch):** Some species have multiple recovery areas (e.g., Humpback Whale in multiple oceans). Can add an array of `recoveryZones` per species for denser map coverage.

**Confidence:** HIGH -- coordinates can be curated from species' known recovery habitats.

### MAP-05: Renewable Energy Installations

**Reference source:** WRI Global Power Plant Database (v1.3.0, last updated 2022)
**Alternative:** Curated JSON of notable recent installations

**Recommended approach:** Curate 80-120 notable renewable energy installations globally:
- Solar: Major utility-scale farms (Bhadla Solar Park, Tengger Desert, Noor Ouarzazate)
- Wind: Large wind farms (Hornsea, Gansu, Alta Wind)
- Hydro: Major stations (Three Gorges, Itaipu, Guri)
- Geothermal: Notable sites (Geysers, Hellisheidi)

**Data structure:**
```json
{
  "id": "bhadla-solar",
  "name": "Bhadla Solar Park",
  "type": "solar",
  "capacityMW": 2245,
  "country": "IN",
  "lat": 27.5,
  "lon": 71.9,
  "status": "operational",
  "year": 2020
}
```

**Category colors (matching happy theme):**
- Solar = gold [255, 200, 50, 200]
- Wind = sky blue [100, 200, 255, 200]
- Hydro = teal [0, 180, 180, 200]
- Geothermal = warm orange [255, 150, 80, 200]

**Confidence:** HIGH -- installation data is publicly available from multiple sources.

## GeoJSON Country Boundaries Analysis

**File:** `public/data/countries.geojson`
**Features:** 258 country features
**Properties per feature:**
- `name` (string) -- country name (e.g., "Indonesia")
- `ISO3166-1-Alpha-3` (string) -- 3-letter code (e.g., "IDN")
- `ISO3166-1-Alpha-2` (string) -- 2-letter code (e.g., "ID")

**Geometry types:** Mix of `Polygon` and `MultiPolygon`

**Already loaded by:** `country-geometry.ts` via `getCountriesGeoJson()` into module-level `loadedGeoJson` variable. Also loaded by DeckGLMap's `loadCountryBoundaries()` into MapLibre as `country-boundaries` source.

**Key consideration for choropleth:** The GeoJSON data can be used EITHER through:
1. **Deck.gl GeoJsonLayer** (recommended) -- consistent with other data layers, data-driven accessors
2. **MapLibre data-driven paint** -- set `fill-color` as a data-driven expression on the existing `country-interactive` layer

Option 1 is recommended for consistency with the codebase pattern where all data-driven overlays use Deck.gl.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MapLibre data-driven paint for choropleths | Deck.gl GeoJsonLayer with accessor functions | deck.gl 8.x+ | Deck.gl provides cleaner data-update patterns and consistent tooltip/picking pipeline |
| WRI Global Power Plant Database as live API | Static curated data (WRI unmaintained since 2022) | 2022 | Must use curated/alternative data for current installations |
| IUCN Red List API for species spatial data | Curated static JSON (decision 07-01) | Phase 7 | Consistent with existing project pattern |

**Deprecated/outdated:**
- WRI Global Power Plant Database: Not maintained since v1.3.0 (2022). Still useful as reference for historical installation data but not for current/recent builds.
- ChoroplethLayer (old deck.gl): Was deprecated in deck.gl v5 in favor of GeoJsonLayer with polygon rendering. Do NOT use `@deck.gl/deprecated`.

## Open Questions

1. **MapLibre vs Deck.gl for choropleth rendering pipeline**
   - What we know: Both can render filled country polygons. MapLibre already loads the country boundaries. Deck.gl GeoJsonLayer is the standard pattern for data layers in this codebase.
   - What's unclear: Whether rendering the same GeoJSON in BOTH MapLibre (for hover) AND Deck.gl (for choropleth) causes z-fighting or performance issues.
   - Recommendation: Use Deck.gl GeoJsonLayer for the choropleth. If z-fighting occurs with the MapLibre hover layer, reduce MapLibre hover opacity or disable it when choropleth is active.

2. **Should choropleth be on by default?**
   - What we know: The existing happy variant enables `positiveEvents` and `kindness` by default. A choropleth is visually prominent.
   - What's unclear: Whether three new layers default-on plus two existing default-on creates visual overload.
   - Recommendation: Enable `happiness` by default (it's the primary "happiness heatmap" feature). Disable `speciesRecovery` and `renewableInstallations` by default -- they are secondary and can clutter the map.

3. **Data update lifecycle for WHR scores**
   - What we know: WHR publishes annually in March. The curated JSON is static.
   - What's unclear: Whether to add a fetch-from-URL path as fallback.
   - Recommendation: Static JSON only, same as conservation wins. Update JSON file when new WHR data is published. Do NOT add runtime fetching for annual data.

## Sources

### Primary (HIGH confidence)
- `src/components/DeckGLMap.ts` -- existing GeoJsonLayer (conflict zones), ScatterplotLayer (all marker types), layer toggle UI, tooltip rendering, data setter pattern
- `src/services/country-geometry.ts` -- GeoJSON loading, country code indexing, `getCountriesGeoJson()`
- `src/data/conservation-wins.json` -- existing species data (10 species, no coordinates yet)
- `src/services/renewable-energy-data.ts` -- existing World Bank renewable energy service
- `src/config/variants/happy.ts` -- happy variant layer configuration
- `src/config/panels.ts` -- HAPPY_MAP_LAYERS, HAPPY_MOBILE_MAP_LAYERS
- `src/types/index.ts` -- MapLayers interface (lines 486-529)
- `public/data/countries.geojson` -- 258 country boundaries with ISO codes
- deck.gl GeoJsonLayer docs: https://deck.gl/docs/api-reference/layers/geojson-layer

### Secondary (MEDIUM confidence)
- World Happiness Report 2025 data: https://www.worldhappiness.report/ -- Excel download, 169 countries, Cantril Ladder 0-10
- WHR data download link: `https://happiness-report.s3.us-east-1.amazonaws.com/2025/Data+for+Figure+2.1+(2011-2024).xlsx`
- WRI Global Power Plant Database: https://github.com/wri/global-power-plant-database -- v1.3.0, unmaintained since 2022

### Tertiary (LOW confidence)
- IRENA Global Atlas for Renewable Energy: https://globalatlas.irena.org/ -- may have API but unclear access requirements
- IUCN Red List spatial data: https://www.iucnredlist.org/resources/spatial-data-download -- shapefiles requiring registration, not used (curated JSON preferred)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns established in Phase 4
- Architecture: HIGH -- follows existing GeoJsonLayer (conflict zones) and ScatterplotLayer (everything else) patterns exactly
- Data sources: HIGH for happiness scores (public, well-documented), HIGH for species zones (extend existing curated data), MEDIUM for energy installations (requires curation work)
- Pitfalls: HIGH -- identified specific z-fighting risk, code mismatch risk, and updateTriggers requirement

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable -- all patterns are established, data sources are annual)
