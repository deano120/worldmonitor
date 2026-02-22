# Research Summary: HappyMonitor

**Domain:** Positive news aggregation & humanity-progress dashboard
**Researched:** 2026-02-22
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

HappyMonitor (happy.worldmonitor.app) is a warm, bright variant of the existing WorldMonitor
real-time intelligence dashboard. Instead of threats and conflicts, it surfaces positive news,
humanity's progress metrics, and uplifting stories. The research confirms this is highly
feasible with minimal new dependencies -- the existing stack provides nearly everything needed.

The core insight is that the existing ML worker already runs sentiment analysis in the browser
via Transformers.js with DistilBERT-SST2. The primary work is not adding new technology but
rather curating new data sources and wrapping existing capabilities in a warm visual theme.
Positive news RSS feeds (Good News Network, Positive.News, Optimist Daily, etc.) slot directly
into the existing RSS proxy infrastructure. GDELT already supports tone filtering (`tone>5`)
which the existing integration can expose with a parameter addition.

For humanity progress data -- the "world is getting better" metrics -- Our World in Data
provides the richest single source with a clean REST API (`/grapher/{slug}.csv`). Combined
with the World Bank Indicators API (free, no auth, 16,000+ indicators), this covers life
expectancy, poverty reduction, literacy, vaccination, renewable energy, and dozens of other
progress narratives. These require a new service module but follow established patterns.

The only genuinely new dependencies are `papaparse` (CSV parsing for OWID data) and
`canvas-confetti` (milestone celebration animations). Everything else is configuration,
theming, and new feed/panel definitions within the existing variant architecture.

## Key Findings

**Stack:** Only 2 new npm packages needed (papaparse, canvas-confetti). Everything else uses existing infrastructure with new configuration.
**Architecture:** New `happy` variant following `tech`/`finance` pattern. New `progress` service domain for OWID/World Bank data. GDELT tone filter parameter addition.
**Critical pitfall:** Sentiment false positives -- sarcasm, ironic headlines, and "positive framing of negative events" will leak through binary classification. Need human-curated seed feeds as the primary source, with ML filtering as a supplement, not the sole gate.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Variant Shell & Theme** - Lowest risk, unblocks everything else
   - Addresses: Visual theme, variant config, basemap, font
   - Avoids: Premature data integration before visual foundation is solid

2. **Positive News Feeds** - Core content, uses proven RSS infrastructure
   - Addresses: Good News Network, Positive.News, and 5-7 other RSS feeds
   - Avoids: Over-reliance on ML-only filtering (curated sources first)

3. **GDELT Positive Tone Filter** - Low effort, high impact
   - Addresses: Global positive news from 250K+ sources via tone>5 filtering
   - Avoids: Building custom scraping when GDELT already indexes everything

4. **Sentiment Filter Pipeline** - ML refinement layer on top of curated feeds
   - Addresses: Filter mixed-content feeds (e.g., BBC) to show only positive stories
   - Avoids: Using sentiment as sole gate (it's a supplement to curated sources)

5. **Progress Metrics Panels** - New data integration (OWID, World Bank)
   - Addresses: "World is getting better" time-series visualizations
   - Avoids: Scope creep -- start with 5-8 key indicators, not all 16,000

6. **Polish & Delight** - Micro-interactions, confetti, streaks
   - Addresses: Celebration animations, positive streaks, milestone markers
   - Avoids: Premature optimization of delight features before core content works

**Phase ordering rationale:**
- Phase 1 before all: variant config is the routing/theming skeleton everything hangs on
- Phase 2 before 4: curated positive feeds establish baseline content before ML filtering
- Phase 3 can parallel Phase 2: GDELT tone filter is independent of RSS feeds
- Phase 5 after 2-4: progress data is a different data type (time-series vs. news) and can be developed independently once the variant shell exists
- Phase 6 last: polish is meaningless without content

**Research flags for phases:**
- Phase 2: LOW risk, standard RSS integration. Verify feed URLs at implementation time.
- Phase 3: LOW risk, GDELT tone filter is well-documented.
- Phase 4: MEDIUM risk -- sentiment threshold tuning needs experimentation. Score >= 0.85 is a starting hypothesis.
- Phase 5: MEDIUM risk -- OWID CSV parsing and World Bank JSON schema need runtime validation. WHO GHO API may have changed (deprecation was planned for late 2025).
- Phase 6: LOW risk, canvas-confetti is well-tested.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 2 new deps. Rest is existing infrastructure. |
| Features | MEDIUM-HIGH | Core features are well-defined. Edge cases (sarcasm, tone scoring thresholds) need experimentation. |
| Architecture | HIGH | Follows existing variant pattern exactly. No architectural novelty. |
| Pitfalls | MEDIUM | Sentiment accuracy and data staleness are real risks but manageable with the curated-first approach. |

## Gaps to Address

- WHO GHO API deprecation status -- was planned for late 2025, unclear if replacement is live. Use World Bank as primary for health indicators to de-risk.
- Exact sentiment score threshold for "positive enough" -- needs A/B testing with real headlines. Start at 0.85, tune based on false positive rate.
- Positive.News, Good Good Good, Future Crunch RSS URLs -- listed by aggregators but not verified programmatically. Test at implementation time.
- Multi-language positive news -- the sentiment model only works reliably on English. Multilingual positive news filtering is a future concern, not MVP.
- `@huggingface/transformers` v4 stability -- v4 preview dropped Feb 2026 with new WebGPU runtime. Do NOT use for production yet. Stick with existing v2 or migrate to v3 stable.
