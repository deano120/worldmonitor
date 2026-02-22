# Feature Research: HappyMonitor

**Domain:** Positive news / uplifting real-time dashboard
**Researched:** 2026-02-22
**Confidence:** MEDIUM-HIGH (verified against competitor landscape + existing codebase capabilities)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist on any positive news dashboard. Missing these = product feels broken or pointless.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Positive News Feed Panel** | Core value prop -- real-time curated uplifting stories. Every competitor (GNN, Positive.News, Goodable, Squirrel News) has this as their centerpiece. | LOW | Reuse existing `NewsPanel` + `LiveNewsPanel` pattern. Add dedicated positive RSS feeds (Good News Network, Positive.News, Reasons to be Cheerful, The Better India, SunnySkyz). Filter existing feeds through sentiment classifier. |
| **AI Sentiment Filter** | Prevents negative stories from leaking through. Users will immediately distrust the dashboard if dark news appears. Goodable and Squirrel News both curate aggressively. | MEDIUM | Existing `DistilBERT-SST2` sentiment model in ML worker already classifies positive/negative. Apply as gate on all incoming feed items. Need threshold tuning -- SST2 is movie reviews; may need fine-tuning or a news-specific model. |
| **Warm & Bright Theme** | Visual signal that this is different from WorldMonitor's dark military aesthetic. Every positive news site uses warm colors (GNN uses green/white, Positive.News uses soft pastels, Reasons to be Cheerful uses colorful illustrations). | MEDIUM | New CSS theme variant. Not just color swap -- needs typography, spacing, and animation changes to feel genuinely warm rather than a dark theme with inverted colors. |
| **Content Categories** | Users need to browse by topic. Reasons to be Cheerful uses: Civic Engagement, Climate + Environment, Cities + Towns, Culture, Economy, Education, Farms + Food, Health, Justice, Science + Tech. GNN uses: USA, World, Animals, Science, Health, Heroes, etc. | LOW | Map to existing feed category system. Recommended categories for HappyMonitor: Science & Health, Nature & Wildlife, Humanity & Kindness, Innovation & Tech, Climate Wins, Culture & Community. |
| **Global Map with Positive Events** | WorldMonitor users expect the map. It IS the product identity. But instead of threats and military movements, show where good things are happening -- conservation wins, renewable installations, recovery stories, scientific discoveries. | MEDIUM | Reuse existing MapLibre GL + Deck.gl infrastructure. New layer types: positive event markers (uplifting green/gold pulses instead of red threat markers). Need geocoding for positive news stories. |
| **Auto-Refresh / Real-Time Feel** | WorldMonitor users expect live, always-updating data. If HappyMonitor feels static like a blog, it fails the "watchability" test. The Worldometer-style ticking counters are compelling because they never stop moving. | LOW | Existing polling infrastructure handles this. Set refresh intervals similar to main variant (5-minute feed cycles). Add visual refresh animations. |
| **Mobile Responsive** | PWA/responsive is baseline for WorldMonitor. Users will access happy.worldmonitor.app on phones. | LOW | Existing responsive grid and mobile panel system applies directly. |
| **Internationalization** | WorldMonitor already supports 14 languages. Users expect the same. | LOW | Existing i18n system. Add translation keys for new panel names and HappyMonitor-specific UI strings. |

### Differentiators (Competitive Advantage)

Features that make HappyMonitor compelling, shareable, and viral. These are what no existing positive news platform does well -- they are all editorial websites, not real-time dashboards.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Live Humanity Counters Panel** | Worldometer-style ticking counters but exclusively positive metrics: babies born today, trees planted, vaccines administered, students graduated, books published, renewable MW installed. Hypnotic, always-moving numbers that make the world feel alive and productive. Nothing in the positive news space does this in dashboard format. | MEDIUM | Use Worldometer / StatsPanda / UN data methodology: take annual figures, compute per-second rates, animate in real-time. No live API needed -- calculated from latest annual stats. Visually the most "watchable" panel. |
| **Humanity Progress Charts Panel** | Long-term trend charts showing undeniable human progress: extreme poverty declining, literacy rising, child mortality dropping, life expectancy increasing, democracy expanding. Our World in Data has the data but presents it as static research pages, not a live dashboard. This repackages their findings into a compelling "the world is actually getting better" visualization. | MEDIUM | Use D3.js (already in stack) to render sparkline/area charts. Source data from Our World in Data (open CC-BY license), World Bank API, UN SDG indicators. Update weekly/monthly, not real-time -- the power is in the long trend, not the tick. |
| **Species Comeback Tracker Panel** | Wildlife conservation wins visualized: species moving off endangered lists, population counts rising (black rhinos from 2,300 to 6,788, Iberian lynx from 100 to 1,000+, mountain gorillas surpassing 1,000). Each entry is a mini celebration. Pairs beautifully with the map (show recovery zones). | MEDIUM | Source from IUCN Red List API (free for non-commercial), WWF reports, Mongabay. Display as cards with species photo, population trend sparkline, recovery status badge. Update monthly. |
| **Renewable Energy Growth Tracker Panel** | Real-time(ish) renewable energy capacity -- solar/wind installations growing, coal plants closing, grid percentage shifting green. 2025 was the year renewables surpassed coal globally (Science's Breakthrough of the Year). IEA has the data. This is inherently positive and always trending up. | MEDIUM | IEA Renewable Energy Progress Tracker data + EIA real-time grid data (existing `EIA_API_KEY` already in env). Show global renewable percentage climbing as animated gauge + regional breakdown. |
| **Scientific Breakthroughs Ticker** | Scrolling ticker of recent scientific discoveries and medical advances. Cures found, diseases eradicated, physics records broken, space milestones. Format like a stock ticker but for human achievement. | LOW | RSS feeds from ScienceDaily, Live Science, Nature, Science. Filter for positive/breakthrough content via sentiment + keyword matching. Horizontal scrolling ticker component -- simple, visually distinctive. |
| **"Today's Best Human" Spotlight** | Daily featured story of an individual doing extraordinary good -- the hero, the inventor, the rescuer, the volunteer. Full-width card with photo, story excerpt, and location on map. Emotionally anchoring. GNN's "Heroes" category is their most shared content type. | LOW | Curate from GNN Heroes feed + manual editorial picks stored in config/Convex. Single card component, rotate daily. High shareability -- this is the screenshot people post on social media. |
| **Live Kindness Map** | Animated map layer showing acts of kindness, donations, volunteer events geolocated worldwide. Green pulses appearing and fading. The visual equivalent of "good things are happening everywhere, right now." | HIGH | Hardest to source reliably. Options: (1) aggregate from GoFundMe trending, Change.org wins, community service APIs; (2) estimate from research showing benevolent acts 10% above pre-pandemic levels; (3) hybrid real + estimated. Start with estimated baseline pulses weighted by population density, overlay real events when available. |
| **Ambient/TV Mode** | Full-screen, lean-back mode designed for putting on a TV or second monitor. Auto-cycles through panels with smooth transitions, no interaction needed. Samsung/Google TV ambient mode is popular -- this serves the same "background positivity" use case. WorldMonitor users already keep it on a second screen. | MEDIUM | Slideshow/carousel mode cycling through panels at configurable intervals (30s-2min). Suppress interactive elements. Larger typography. Add subtle particle animations (floating leaves, gentle waves) for ambient warmth. |
| **Shareable Story Cards** | One-tap generation of beautiful, branded image cards for sharing positive stories on social media. "Screenshot-ready" formatting with the HappyMonitor watermark. This is how WorldMonitor went viral -- people shared screenshots. | MEDIUM | Canvas/SVG rendering of story card with headline, category badge, warm gradient background, HappyMonitor branding. Export as PNG. Similar to existing `story-share.ts` service. |
| **Daily Digest / "5 Good Things"** | Summary panel showing 5 curated top positive stories of the day in 50 words or less each. Inspired by Squirrel News (10-12 daily picks) and newsletter formats (Reasons to be Cheerful reaches 120K subscribers with weekly digest). Quick scan for time-pressed users. | LOW | AI summarization via existing Flan-T5 model in ML worker. Select top 5 by engagement signals + editorial scoring. Compact card layout. |
| **World Happiness Heatmap** | Choropleth map layer showing country-level happiness/wellbeing scores. World Happiness Report + Happy Planet Index data. Gives geographic context -- where are people thriving? Pairs with news stories from those regions. | LOW | Existing choropleth infrastructure (used for CII/instability). Invert the color scale (green = happy). Source: World Happiness Report (annual), Happy Planet Index. Static data layer, update annually. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good for a positive news platform but create problems. Explicitly NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **User-Submitted Good News** | "Let users share their own good news!" Feels community-driven and warm. | Moderation nightmare. Quality collapse. Spam. Misinformation dressed as positivity. Toxic positivity ("my MLM changed my life!"). Every platform that opens UGC for positive content gets flooded with self-promotion. GNN accepts submissions but manually curates -- they have editorial staff for this. | Curate from established sources. Use the "Today's Best Human" spotlight for handpicked stories. Keep quality over quantity. |
| **Comments / Social Features** | "Let people discuss and share within the app." | Destroys the dashboard experience. Comments sections inevitably attract negativity, even on positive stories ("this is propaganda," "what about X crisis"). Moderation burden is enormous. WorldMonitor explicitly avoids this and it works. | Social sharing OUT of the app (shareable cards). Let Twitter/Reddit be the comment section. |
| **Gamification / Streaks / Points** | "Reward users for reading positive news daily." | Undermines authenticity. Turns genuine positivity into a chore/obligation. Creates anxiety about streaks. Goodable tried wellness journeys -- it feels forced. The dashboard should be a refuge, not another app demanding your attention. | Let the content be intrinsically compelling. The ticking counters and live map already provide the "one more look" loop. |
| **Push Notifications** | "Alert users when something positive happens!" | Notification fatigue. Interrupts rather than soothes. Users who want ambient positivity don't want buzzing phones. Uplifting News charges $4.99/month for "daily reminders" -- it's a feature that sounds good but annoys in practice. | Make the dashboard itself the destination. PWA home screen icon is sufficient reminder. Optional email digest only. |
| **Personalized / Algorithmic Feed** | "Show users the type of positive news they prefer." | Algorithmic feeds create filter bubbles even in positive content. Also adds engineering complexity. The dashboard should feel like a shared experience -- everyone sees the same uplifting world. This is what makes it shareable. | Category browsing (user chooses which panels to show/hide -- already built into WorldMonitor's panel toggle system). |
| **Premium/Paywall** | "Monetize the happiest users." | Contradicts the mission. Positive news should be freely accessible. WorldMonitor's existing model (free + desktop app) works. GNN's $2.99/month ad-removal is their weakest feature. | Keep free. Monetize through the existing WorldMonitor ecosystem (desktop app, API keys for power users). |
| **Excessive Animation / Particle Effects** | "Make it feel magical and joyful with confetti and sparkles." | Quickly becomes annoying and childish. Kills the "serious dashboard" credibility. The goal is warm and hopeful, not a birthday party. WorldMonitor went viral because it feels like a real command center. HappyMonitor needs the same gravitas. | Subtle, purposeful animation: smooth counter ticks, gentle map pulses, soft transitions. Reserve celebration animations for genuine milestones (e.g., species recovery announced). |
| **News Aggregation from All Sources + Filter** | "Just filter ALL news for positive sentiment instead of curating sources." | SST2-style sentiment classifiers have ~5-10% error rate on news headlines. Letting through even one negative story ("War ends!" classified as positive due to "ends") breaks user trust instantly. Volume of false positives from general feeds overwhelms the dashboard. | Two-tier approach: (1) Dedicated positive news sources as primary feed (GNN, Positive.News, etc.) -- these are pre-curated by human editors. (2) Use sentiment filter as a secondary check on mixed-source feeds, with HIGH threshold to minimize false positives. Quality > quantity. |

## Feature Dependencies

```
[AI Sentiment Filter]
    |
    +---> [Positive News Feed Panel] (sentiment gates all content)
    |         |
    |         +---> [Daily Digest / "5 Good Things"] (requires scored, ranked stories)
    |         +---> [Shareable Story Cards] (requires story data)
    |         +---> ["Today's Best Human" Spotlight] (requires story data + editorial scoring)
    |
    +---> [Global Map with Positive Events] (geocoded positive stories need sentiment scores)

[Warm & Bright Theme]
    |
    +---> [Ambient/TV Mode] (requires theme to not look jarring at large size)
    +---> [Shareable Story Cards] (cards must use warm theme branding)

[Live Humanity Counters Panel] ---- independent, no deps ----

[Humanity Progress Charts Panel] ---- independent, no deps ----

[Species Comeback Tracker] --enhances--> [Global Map] (recovery zones as map layer)

[Renewable Energy Tracker] --enhances--> [Global Map] (installation locations as map layer)

[Scientific Breakthroughs Ticker] ---- independent, no deps ----

[World Happiness Heatmap] --enhances--> [Global Map] (choropleth layer)

[Live Kindness Map] --requires--> [Global Map] (needs map infrastructure)
                     --requires--> external data sourcing (hardest dependency)
```

### Dependency Notes

- **AI Sentiment Filter is the foundation:** Almost every content panel depends on it to guarantee positive-only content. Must be built and tuned first.
- **Warm & Bright Theme is visual foundation:** Every panel and shareable feature depends on the theme being right. Cannot launch with WorldMonitor's dark theme.
- **Map layers are additive:** Species recovery, renewable installations, happiness heatmap, and kindness events all layer onto the same map. Each can be shipped independently.
- **Live Kindness Map conflicts with data reliability:** The most visually compelling feature is the hardest to source honestly. Estimated/simulated data risks feeling fake. Consider shipping later after sourcing is validated.

## MVP Definition

### Launch With (v1)

Minimum set to validate "Is HappyMonitor compelling enough to watch?"

- [x] **Warm & Bright Theme** -- visual identity must be established from day one
- [x] **Positive News Feed Panel** -- core value prop, reuse existing panel pattern with positive RSS feeds
- [x] **AI Sentiment Filter** -- quality gate on all content, leverage existing DistilBERT-SST2
- [x] **Live Humanity Counters Panel** -- the "always moving" hook that makes it watchable; calculated from annual data, no external API dependency
- [x] **Content Categories** -- basic browse by topic (Science, Nature, Humanity, Innovation, Climate, Culture)
- [x] **Global Map with Positive Events** -- WorldMonitor's identity IS the map; show geocoded positive stories
- [x] **Happy variant config** -- `VITE_VARIANT=happy` routing, panel config, subdomain

### Add After Validation (v1.x)

Features to add once core is working and user feedback is gathered.

- [ ] **Humanity Progress Charts Panel** -- high value, medium complexity; add after core panels stabilize
- [ ] **Scientific Breakthroughs Ticker** -- low complexity, high appeal; easy second-wave addition
- [ ] **"Today's Best Human" Spotlight** -- requires editorial pipeline, even if minimal
- [ ] **Daily Digest / "5 Good Things"** -- needs AI summarization pipeline tuned for positive content
- [ ] **Shareable Story Cards** -- critical for virality; add as soon as there's content worth sharing
- [ ] **World Happiness Heatmap** -- quick map layer addition once base map is working

### Future Consideration (v2+)

Features to defer until the product proves stickiness.

- [ ] **Species Comeback Tracker Panel** -- needs IUCN data integration, monthly update cadence
- [ ] **Renewable Energy Growth Tracker** -- needs IEA/EIA data pipeline, moderate complexity
- [ ] **Ambient/TV Mode** -- high value for retention but not critical for launch validation
- [ ] **Live Kindness Map** -- most complex differentiator; defer until data sourcing is solved
- [ ] **Email digest (weekly "5 Good Things")** -- requires email infrastructure, nice for retention later

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Positive News Feed Panel | HIGH | LOW | P1 |
| AI Sentiment Filter | HIGH | MEDIUM | P1 |
| Warm & Bright Theme | HIGH | MEDIUM | P1 |
| Live Humanity Counters | HIGH | MEDIUM | P1 |
| Global Map + Positive Events | HIGH | MEDIUM | P1 |
| Happy Variant Config | HIGH | LOW | P1 |
| Content Categories | MEDIUM | LOW | P1 |
| Shareable Story Cards | HIGH | MEDIUM | P2 |
| Scientific Breakthroughs Ticker | MEDIUM | LOW | P2 |
| "Today's Best Human" Spotlight | HIGH | LOW | P2 |
| Humanity Progress Charts | HIGH | MEDIUM | P2 |
| Daily Digest / "5 Good Things" | MEDIUM | LOW | P2 |
| World Happiness Heatmap | MEDIUM | LOW | P2 |
| Species Comeback Tracker | MEDIUM | MEDIUM | P3 |
| Renewable Energy Tracker | MEDIUM | MEDIUM | P3 |
| Ambient/TV Mode | MEDIUM | MEDIUM | P3 |
| Live Kindness Map | HIGH | HIGH | P3 |

**Priority key:**
- P1: Must have for launch -- without these, the product doesn't make sense
- P2: Should have -- add quickly post-launch; these drive virality and retention
- P3: Nice to have -- defer until product-market fit is established

## Competitor Feature Analysis

| Feature | Good News Network | Positive.News | Reasons to be Cheerful | Squirrel News | Goodable | **HappyMonitor** |
|---------|-------------------|---------------|------------------------|---------------|----------|-----------------|
| Curated positive news feed | Yes (editorial) | Yes (editorial) | Yes (editorial) | Yes (10-12/day curated) | Yes (AI + editorial) | Yes (AI + dedicated sources) |
| Real-time dashboard format | No (blog/magazine) | No (magazine) | No (magazine) | No (app, not dashboard) | No (app feed) | **Yes -- primary differentiator** |
| Interactive global map | No | No | No | No | No | **Yes -- inherited from WorldMonitor** |
| Live ticking counters | No | No | No | No | No | **Yes -- Worldometer-style positivity** |
| Long-term progress charts | No | Occasional articles | Occasional articles | No | No | **Yes -- Our World in Data as dashboard** |
| Sentiment AI filtering | No (human only) | No (human only) | No (human only) | No (human only) | Partial | **Yes -- DistilBERT in-browser** |
| TV/ambient mode | No | No | No | No | No | **Planned** |
| Shareable cards | No | No | No | No | No | **Yes -- viral mechanic** |
| Multiple languages | No (English + Spanish) | No (English) | No (English) | German + English | No (English) | **Yes -- 14 languages from WorldMonitor** |
| Categories/topics | 20+ categories | 5 sections | 10 topics | No categories | 6 categories | 6 focused categories |
| Free access | Ads + $2.99 premium | Free (member-supported) | Free (donor-supported) | Free (donations) | Free tier + $4.99 premium | **Fully free** |
| Desktop app | No | No | No | No | No | **Yes (Tauri, inherited)** |
| Offline/PWA | No | No | No | Yes (app) | Yes (app) | **Yes (inherited)** |

### Key Competitive Insight

No competitor operates as a real-time dashboard. They are all editorial publications or mobile apps with blog-style feeds. HappyMonitor's unique position is translating WorldMonitor's "command center you can't stop watching" aesthetic into the positive news space. The combination of live map + ticking counters + streaming positive news + AI sentiment filtering has no direct competitor.

The closest analog is Worldometer (live counters) + Our World in Data (progress visualization) + Good News Network (editorial feed) -- but nobody has combined these into a single, cohesive, watchable dashboard.

## Sources

**Competitor Platforms (verified via WebFetch/WebSearch):**
- [Good News Network](https://www.goodnewsnetwork.org/) -- 25+ year pioneer, 21,000+ stories, editorial curation, categories
- [Positive.News](https://www.positive.news/) -- UK-based, member-supported, 5 sections, weekly roundups
- [Reasons to be Cheerful](https://reasonstobecheerful.world/) -- David Byrne's project, 1,000+ stories, 10 topic categories, 120K newsletter subscribers
- [Squirrel News](https://squirrelnews.net/) -- 10-12 curated solution stories daily, minimalist approach
- [Goodable](https://goodable.co/) -- AI-personalized positive feed, wellness journeys add-on
- [SunnySkyz](https://www.sunnyskyz.com/good-news) -- Simple positive news aggregator
- [The Better India](https://www.thebetterindia.com/) -- World's largest positive/solutions content platform

**Data Sources (verified via WebSearch):**
- [Worldometer](https://www.worldometers.info/) -- Live world statistics counters using UN/WHO data
- [Our World in Data](https://ourworldindata.org/) -- Open CC-BY dataset for humanity progress metrics
- [IEA Renewable Energy Tracker](https://www.iea.org/data-and-statistics/data-tools/renewable-energy-progress-tracker) -- Renewable capacity data
- [Happy Planet Index](https://happyplanetindex.org/) -- Country-level wellbeing scores
- [World Happiness Report](https://data.worldhappiness.report/) -- Annual happiness rankings
- [IUCN Red List](https://www.iucnredlist.org/) -- Species conservation status data
- [Solutions Journalism Network](https://www.solutionsjournalism.org/) -- 17,300 solutions stories tracked

**Existing Codebase (verified via code inspection):**
- Sentiment model: `DistilBERT-SST2` already configured in `src/config/ml-config.ts`
- ML worker: Sentiment classification pipeline in `src/workers/ml.worker.ts`
- Variant architecture: `src/config/variant.ts` + `src/config/panels.ts` support new variants
- Feed infrastructure: `src/config/feeds.ts` RSS proxy system with tier-based prioritization
- Map: MapLibre GL + Deck.gl fully operational with multiple layer types
- Sharing: `src/services/story-share.ts` exists for screenshot sharing

---
*Feature research for: HappyMonitor (happy.worldmonitor.app)*
*Researched: 2026-02-22*
