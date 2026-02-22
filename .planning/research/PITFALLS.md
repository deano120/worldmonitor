# Domain Pitfalls

**Domain:** Positive news aggregation / sentiment-filtered dashboard (HappyMonitor variant)
**Researched:** 2026-02-22

---

## Critical Pitfalls

Mistakes that cause rewrites, credibility damage, or user abandonment.

---

### Pitfall 1: Sentiment Classification Lets Negative Stories Through (False Positives)

**What goes wrong:** The AI sentiment filter classifies stories as "positive" that are actually negative, disturbing, or ambiguous. A headline like "Survivors found in earthquake rubble" is simultaneously positive (rescue) and deeply negative (earthquake devastation). "Inflation finally drops below 5%" is positive framing of a still-bad economic situation. The model surfaces these as uplifting content, breaking user trust in the product's core value proposition.

**Why it happens:** Sentiment analysis models -- including fine-tuned transformers -- still fail on sarcasm, irony, negation, and mixed-polarity text. Benchmark accuracy on clean datasets (97%+ on Stanford Sentiment Treebank) does not translate to real-world news headlines, which are deliberately crafted to be provocative and ambiguous. Domain-specific transformers achieve 12-18% higher accuracy than general models, but HappyMonitor needs a "positive news" domain model that does not exist as a standard off-the-shelf offering. The existing threat-classifier in WorldMonitor's codebase uses keyword matching + ML, designed for negative event detection -- inverting this for positive detection is not symmetrical.

**Consequences:** Users see upsetting stories on a dashboard that promised only uplifting content. This is worse than a generic news feed because it violates an explicit promise. Users lose trust immediately and do not return. The product becomes a joke ("HappyMonitor showed me a school shooting because someone survived").

**Prevention:**
1. Multi-stage filtering: keyword pre-filter (exclude known negative domains: war, crime, disaster, disease) THEN sentiment model THEN confidence threshold (reject anything below 0.85 positive confidence).
2. Implement "positive framing of negative events" detector: if a story mentions disaster/conflict/death keywords but has positive sentiment, flag it for secondary review or exclusion.
3. Use dedicated positive news sources (Good News Network, Positive.News, Reasons to be Cheerful) as the primary feed, with sentiment-filtered mainstream news as supplementary. This inverts the architecture from "filter mainstream for positive" to "start with curated positive, augment with filtered mainstream."
4. Build a human-in-the-loop feedback mechanism early: thumbs up/down on stories, with rejected stories feeding back into model training data.
5. Test with adversarial examples before launch: compile 200+ edge cases (disaster survivors, war endings, disease cured, crime solved, recession ended) and verify classification.

**Detection (warning signs):**
- Users reporting inappropriate stories within first week of launch
- Engagement drop-off after initial visit (users came, saw a bad story, left)
- High variance in sentiment scores across runs (model is uncertain)

**Confidence:** HIGH -- multiple academic sources confirm sentiment analysis remains unreliable for mixed-polarity content (Toptal, PMC, ScienceDirect). The existing WorldMonitor threat-classifier code confirms this codebase already uses keyword + ML hybrid for exactly this reason.

**Phase relevance:** Must be addressed in Phase 1 (sentiment pipeline). Getting this wrong poisons everything downstream.

---

### Pitfall 2: Toxic Positivity -- The Dashboard Feels Naive, Dismissive, or Cheesy

**What goes wrong:** The product ends up feeling like a greeting card rather than a serious intelligence dashboard. Users perceive it as denying reality rather than offering a genuine counterbalance. The term "toxic positivity" describes exactly this failure mode: forced happiness that dismisses legitimate concerns. Sophisticated WorldMonitor users -- who track military movements and conflict zones -- will reject anything that feels like it is insulting their intelligence.

**Why it happens:** The natural instinct when building a "positive news" product is to make everything relentlessly upbeat: bright colors, happy emojis, exclamation marks, celebration language. This creates a tonal mismatch with the data-driven, intelligence-grade aesthetic that makes WorldMonitor compelling. Research on constructive journalism shows that the most effective approach is "solutions journalism" -- rigorous reporting on what IS working -- not cheerleading. The distinction is subtle but critical: "Poverty has declined 50% since 2000 (Our World in Data, verified)" feels credible; "Amazing news!! Fewer poor people!!!" feels insulting.

**Consequences:** The product gets dismissed as lightweight or naive. Existing WorldMonitor users (the primary audience) actively dislike it. Social media mockery positions it as the opposite of what made WorldMonitor viral. The warm-bright theme amplifies this -- if the visual design feels like a children's app, the content will be dismissed regardless of quality.

**Prevention:**
1. Tone guide: data-driven, measured optimism. Present progress with citations, context, and honest framing. "Child mortality has halved since 1990" not "Kids are doing great!!!"
2. Visual identity: warm and bright, but with the SAME information density and typographic seriousness as WorldMonitor. The monospace font stack (SF Mono, Inconsolata) should carry over. Think "warm command center" not "wellness blog."
3. Include context with every metric: "Global poverty at 8.5% (down from 36% in 1990, but still 680M people)" -- acknowledging reality while showing progress.
4. Avoid superlatives and emotional language in automated content. Let the data speak.
5. Study the tone of Our World in Data and Gapminder -- serious institutions that communicate progress without toxic positivity.

**Detection (warning signs):**
- User feedback contains words like "cheesy," "naive," "out of touch," "tone deaf"
- Social media shares are mocking rather than earnest
- Bounce rate higher than WorldMonitor despite initial curiosity traffic

**Confidence:** HIGH -- well-documented phenomenon. Wikipedia, Psychology Today, Washington Post, Healthline all describe toxic positivity. Constructive journalism literature (Bonn Institute, multiple academic papers) explicitly warns against conflating positive news with cheerleading.

**Phase relevance:** Must be addressed in visual design phase (theme) AND content strategy phase simultaneously. These are not independent -- tone and visuals must be coherent.

---

### Pitfall 3: Positive News Sources Dry Up -- Content Freshness Crisis

**What goes wrong:** The dashboard runs out of fresh positive content within hours of launch. Mainstream news is 70-90% negative by volume. Dedicated positive news sources (Good News Network, Positive.News, Reasons to be Cheerful) publish 5-20 stories per day, not the hundreds needed for a real-time dashboard that matches WorldMonitor's information density. The result is a dashboard that shows the same 15 stories all day, or fills with low-quality filler.

**Why it happens:** WorldMonitor's "stare at it all day" quality comes from constant data updates: flights moving, ships repositioning, new seismic events, breaking news. This creates a sense of liveness. Positive news does not generate volume at the same rate as negative news -- there is no equivalent of "breaking good news" that updates every 30 seconds. The asymmetry between negative and positive news volume is structural, not a filtering problem.

**Consequences:** The dashboard feels dead or repetitive. Users check it once, see the same stories, and never return. Stale content is worse than no content -- it signals the product is abandoned or broken. The "real-time" promise of HappyMonitor is broken.

**Prevention:**
1. Diversify content types beyond news: humanity progress metrics (updated daily/weekly but always available), live positive data streams (renewable energy production, vaccination rates, species recovery counts), scientific breakthrough tickers, community kindness trackers.
2. Use "progress data" as the always-available backbone. News stories are supplementary. Our World in Data has a public API with thousands of indicators that update on various schedules -- this provides depth even when news is slow.
3. Implement geographic rotation: show positive stories from different world regions at different times, creating a sense of global activity even with limited per-region volume.
4. Time-aware content strategy: show "today's positive news" during business hours, transition to "this week's progress" and "historical milestones on this date" during slow periods.
5. Avoid padding with trivial content (celebrity birthdays, cute animal videos) -- this undermines the intelligence-grade positioning.
6. Consider original content generation: daily AI-generated progress summaries from statistical data (similar to existing WorldMonitor's AI Insights panel).

**Detection (warning signs):**
- Average story age in feed exceeds 6 hours
- Fewer than 20 unique stories per day
- User session duration drops below 2 minutes (indicating "nothing new to see")
- RSS feed health monitoring shows fewer than expected articles per source per day

**Confidence:** MEDIUM -- extrapolated from known positive news source publication rates and WorldMonitor's existing feed volume. Specific volume numbers need validation by actually polling the candidate RSS feeds.

**Phase relevance:** Must be addressed in Phase 1 (data sources) and Phase 2 (progress metrics). If Phase 1 only has sentiment-filtered mainstream news, the dashboard will feel empty.

---

### Pitfall 4: Variant Architecture Becomes a Maintenance Nightmare

**What goes wrong:** Adding a 4th variant ("happy") to the existing 3-variant codebase (full/tech/finance) creates a combinatorial explosion of conditional logic. Every `SITE_VARIANT === 'tech' ? ... : SITE_VARIANT === 'finance' ? ... : ...` pattern in the codebase needs a 4th branch. The "happy" variant has fundamentally different requirements than the others (different theme, different data sources, different panels, different tone), and the existing variant system was designed for variants that are subsets of the full version, not a thematically different product.

**Why it happens:** The current variant system (visible in `src/config/variant.ts`, `src/config/panels.ts`, `src/config/feeds.ts`) uses simple string matching. It works well when variants are "full minus some panels" (tech variant = tech panels only, finance variant = finance panels only). But "happy" is not a subset -- it needs NEW panels (progress metrics, kindness tracker, nature wins), a NEW theme (warm instead of dark), and DIFFERENT feeds (positive sources instead of geopolitical). This is a different product wearing the same technical clothes.

**Consequences:** Every code change requires testing across 4 variants instead of 3. Bugs in one variant silently break another. The theme system needs a complete overhaul to support "warm" alongside "dark/light." New developers cannot reason about the codebase because every component has 4 code paths. The monolithic App.ts (already 4,570 lines, per CONCERNS.md) gets even larger.

**Prevention:**
1. Treat "happy" as a configuration-driven variant, not a code-branching variant. Define panels, feeds, theme, and tone in a single variant config object (extend `src/config/variants/base.ts`), not scattered ternary expressions.
2. Refactor existing ternary chains to a registry/lookup pattern BEFORE adding the happy variant:
   ```typescript
   const VARIANT_PANELS: Record<string, Record<string, PanelConfig>> = {
     full: FULL_PANELS,
     tech: TECH_PANELS,
     finance: FINANCE_PANELS,
     happy: HAPPY_PANELS,
   };
   export const DEFAULT_PANELS = VARIANT_PANELS[SITE_VARIANT] || FULL_PANELS;
   ```
3. Theme should be a separate dimension from variant. The current dark/light toggle (`[data-theme="light"]` in main.css) already exists -- add "happy" as a third theme, not embedded in variant logic.
4. New happy-specific panels (progress metrics, kindness tracker) should be regular Panel subclasses registered in the panel config, not special-cased in App.ts.
5. Add variant-specific E2E tests from day one. The existing Playwright test suite already supports multi-variant testing.

**Detection (warning signs):**
- PR diffs touching 15+ files for a "happy variant only" change
- Regressions in full/tech/finance variants after happy-specific changes
- Growing number of `if (SITE_VARIANT === 'happy')` scattered across components
- App.ts growing beyond 5,000 lines

**Confidence:** HIGH -- the existing codebase concerns document (CONCERNS.md) already flags the monolithic App.ts and variant complexity. The current ternary pattern in panels.ts and feeds.ts is visible in the code.

**Phase relevance:** Must be addressed in Phase 0 (foundation/refactoring) before any happy-specific features are built. This is prerequisite work, not optional cleanup.

---

## Moderate Pitfalls

---

### Pitfall 5: In-Browser Sentiment Model Kills Mobile Performance

**What goes wrong:** Running a sentiment classification model in the browser via Transformers.js/ONNX Runtime adds significant latency and memory usage. The existing ML pipeline already restricts to desktop-only (visible in `ml-capabilities.ts`: `isSupported = isDesktop && ...`). Adding a sentiment model on top of the existing ML workload could push even desktop users into performance issues, and mobile users get zero AI filtering.

**Why it happens:** The current architecture runs ML models in-browser for privacy and offline support. First inference incurs model download + initialization latency. Subsequent inferences take ~200ms per item, but with 100+ news articles to classify, that is 20+ seconds of blocking computation. WebGPU can help but is not universally available.

**Prevention:**
1. Run sentiment classification server-side in the Sebuf handler, not in-browser. The news handler already has a summarization RPC (`newsClient.summarizeArticle`) -- add a sentiment classification RPC alongside it. Server-side classification is faster, consistent across devices, and cacheable.
2. If in-browser is required for offline/desktop, use a small distilled model (distilbert-base-uncased-finetuned-sst-2-english is ~270MB, but quantized INT8 versions exist at ~67MB).
3. Classify at ingest time (when feeds are fetched), not at render time. Cache sentiment scores alongside articles. This is the same pattern as the existing Redis caching for summarization.
4. On mobile, rely entirely on server-side classification with pre-scored articles.

**Detection (warning signs):**
- Time-to-interactive exceeds 5 seconds on desktop
- Memory usage exceeds 500MB in browser DevTools
- Mobile users see unfiltered content or empty panels
- ML worker thread consuming >30% CPU continuously

**Confidence:** HIGH -- verified from codebase: `ml-capabilities.ts` already gates ML to desktop, and the CONCERNS.md documents ONNX Runtime's ~2MB bundle impact.

**Phase relevance:** Architecture decision needed in Phase 1 (sentiment pipeline). Choosing client-side vs. server-side early avoids a rewrite later.

---

### Pitfall 6: Map Visualization Has Nothing Compelling to Show

**What goes wrong:** WorldMonitor's map is compelling because it shows planes flying, ships moving, earthquake epicenters pulsing, conflict zones highlighted -- all inherently visual and spatially interesting. HappyMonitor's map has no obvious equivalent. "Happy events" do not cluster geographically the same way, and showing dots for "good news happened here" is not inherently watchable.

**Why it happens:** Negative events are concentrated (conflict zones, earthquake faults, shipping lanes) and urgent (something happening NOW). Positive events are diffuse (a school built in Kenya, a forest replanted in Brazil, a law passed in Norway) and often historical (the event already happened, we are reporting on it). The real-time animated quality of WorldMonitor's map does not naturally transfer.

**Prevention:**
1. Focus map visualization on LIVE positive data streams that ARE inherently spatial: renewable energy production by country (animated growth), reforestation progress (satellite-derived), species migration recovery patterns, vaccination coverage expansion.
2. Use the map for "progress heatmaps" rather than event markers -- showing which countries are improving fastest on key metrics creates a compelling global view.
3. Keep the map but reduce its prominence compared to WorldMonitor. Panels with charts, tickers, and metrics may be the better primary visual for positive content.
4. Animated transitions: show metrics CHANGING over time on the map (poverty declining, life expectancy rising) as temporal animations, creating the same "watchable" quality through data transitions rather than real-time events.
5. If the map cannot be made compelling for MVP, launch without it as a prominent feature and add it later. Better no map than a boring map.

**Detection (warning signs):**
- User heatmaps show no engagement with map area
- Map layers are mostly empty or static
- Users immediately scroll past map to panels
- Average time spent on map view < 10 seconds

**Confidence:** MEDIUM -- extrapolated from the nature of positive vs. negative events and WorldMonitor's existing map engagement patterns. Actual engagement data would need to be measured post-launch.

**Phase relevance:** Should be explored in Phase 2-3 (visualization). Do not block Phase 1 on solving the map problem.

---

### Pitfall 7: "Positive Framing of Negative Events" Slips Through

**What goes wrong:** The most insidious false positive category: stories that are ABOUT negative events but framed positively. "Earthquake death toll lower than feared," "Fewer civilians killed in this airstrike than the last one," "Cancer survival rates up 2% (still 40% die)." These are technically positive-sentiment text about deeply negative topics. A sentiment model scores them as positive. Users are disturbed to see death tolls and airstrikes on a dashboard promising uplifting content.

**Why it happens:** This is a superset of Pitfall 1 but deserves separate attention because it is harder to detect. The sentiment IS positive at the text level. The topic is negative. Standard sentiment models do not separate topic sentiment from framing sentiment. This requires topic detection + sentiment analysis, not just sentiment analysis.

**Prevention:**
1. Build a topic exclusion list: any story mentioning death, killing, war, disease, crime, terrorism, poverty (in absolute terms, not declining trends) should be excluded regardless of sentiment score.
2. Implement a two-axis classification: Topic valence (is the SUBJECT positive?) + Framing valence (is the TONE positive?). Only stories that are positive on BOTH axes should pass.
3. Use LLM-based classification for edge cases: send borderline stories to the summarization pipeline with the prompt "Is this story genuinely uplifting, or is it a positive framing of a negative event? Respond with UPLIFTING, NEGATIVE_TOPIC, or AMBIGUOUS." This is expensive but worth it for the 10-20% of stories that fall in the gray zone.
4. Whitelist approach for curated sources: stories from Good News Network, Positive.News, etc. get automatic approval. Only mainstream-source stories go through the full classification pipeline.

**Detection (warning signs):**
- Stories about wars, disasters, or disease appearing in the feed despite positive sentiment scores
- User feedback specifically calling out "That is not happy news"
- Manual audit finding >5% of stories are negative-topic/positive-framing

**Confidence:** HIGH -- this is a well-documented NLP challenge. The Toptal article on sentiment analysis accuracy explicitly calls out "multipolarity" where different subjects are criticized and praised within the same text.

**Phase relevance:** Phase 1 (sentiment pipeline), specifically the secondary classification stage.

---

### Pitfall 8: Progress Data Looks Static and Boring

**What goes wrong:** Humanity progress metrics (poverty declining, literacy rising, life expectancy increasing) are compelling as a concept but update infrequently (annually or quarterly). A panel showing "Global poverty: 8.5%" with a last-update timestamp of "March 2025" feels broken on a real-time dashboard, even though it is accurate.

**Why it happens:** The best progress data sources (Our World in Data, World Bank, UN) publish annual aggregates. There is no real-time poverty tracker. The mismatch between the dashboard's real-time aesthetic and the data's annual update cycle creates a perception of staleness.

**Prevention:**
1. Design progress panels for TREND visualization, not point-in-time values. Show the 50-year trend line with the current value highlighted. The visual is the trajectory, not the number.
2. Add intermediate proxy metrics that update more frequently: daily renewable energy generation (updated hourly), weekly vaccination counts, monthly disaster response funding. These bridge the gap between annual aggregate data and real-time feel.
3. Use "on this day in history" comparisons: "Today in 2000, 36% of the world lived in extreme poverty. Today: 8.5%." This creates fresh framing of static data.
4. Animate chart transitions: when a user opens the panel, animate the trend line drawing from past to present. This creates a sense of movement even with static data.
5. Mix slow-updating metrics with fast-updating ones: put the poverty trend next to a live renewable energy production counter. The live counter creates ambient movement that makes the whole panel feel alive.

**Detection (warning signs):**
- Users not interacting with progress panels
- "Last updated" timestamps older than 30 days
- Progress panels have lowest engagement among all panel types

**Confidence:** MEDIUM -- Our World in Data's API documentation confirms annual/quarterly update cadences. The "real-time feel" concern is extrapolated from dashboard UX principles.

**Phase relevance:** Phase 2 (progress metrics panel design). Requires creative visualization decisions, not just data plumbing.

---

## Minor Pitfalls

---

### Pitfall 9: Theme System Requires CSS Variable Overhaul

**What goes wrong:** The existing theme uses CSS custom properties defined in `:root` (dark) with a `[data-theme="light"]` override. Adding a "happy" theme requires a third complete set of 40+ CSS variables. Many existing components have hardcoded dark-aesthetic assumptions (green-on-black map, red threat colors, military-grade typography). Simply changing CSS variables does not change the FEEL of these components.

**Prevention:**
1. Audit all 40+ CSS custom properties in `main.css` and define a "happy" palette that maintains the same variable names but with warm tones (golden yellows, soft greens, sky blues instead of threat reds and military greens).
2. The map needs specific attention: `--map-bg`, `--map-grid`, `--map-country`, `--map-stroke` are all dark military greens. The happy variant needs a completely different map style, possibly a different MapLibre style.json altogether.
3. Do NOT change the font stack. The monospace aesthetic (SF Mono, Inconsolata) should carry over -- it is what makes the dashboard feel like a serious tool rather than a blog.
4. Create a `src/styles/themes/happy.css` file that overrides all custom properties, imported conditionally based on variant. Keep it separate from the main.css to avoid bloat.
5. Test with actual content in the happy theme -- colors that look good on a design mockup often fail with real data density.

**Detection (warning signs):**
- Components looking broken or unreadable in happy theme
- Hardcoded color values bypassing CSS variables (grep for hex codes in component files)
- Map tiles clashing with warm overlay colors

**Confidence:** HIGH -- verified from codebase. The CSS custom properties system is well-structured but the values are deeply dark-mode. The map variables are particularly entrenched.

**Phase relevance:** Phase 1 or 2 (visual theme). Should be done as a single focused effort, not incrementally.

---

### Pitfall 10: Dedicated Positive News Sources Have Unreliable RSS Feeds

**What goes wrong:** Positive news outlets (Good News Network, Positive.News, Reasons to be Cheerful, Upworthy) are small organizations with limited technical infrastructure. Their RSS feeds may be unreliable, rate-limited, intermittently broken, or poorly formatted compared to major wire services (Reuters, AP) that WorldMonitor already integrates.

**Prevention:**
1. Test each candidate RSS feed for 2+ weeks before committing to it as a source: check uptime, publication frequency, feed validity, response times.
2. Build the same circuit-breaker pattern used for existing feeds (already in the codebase via `createCircuitBreaker`).
3. Have fallback sources for each category: if Good News Network's RSS breaks, fall back to sentiment-filtered Reuters/AP.
4. Consider scraping positive news aggregator sites as a backup if RSS is not available (with appropriate rate limiting and terms-of-service compliance).
5. Log feed health metrics per source to detect degradation before it impacts the dashboard.

**Detection (warning signs):**
- Feed fetch failures exceeding 5% for any source
- Publication frequency dropping below expected rate
- XML parsing errors in RSS responses
- Source publishing duplicate articles (broken pagination)

**Confidence:** LOW -- this is speculative based on the typical infrastructure of small media organizations. Actual feed reliability must be tested empirically.

**Phase relevance:** Phase 1 (data source integration). Test feeds early to identify unreliable ones before depending on them.

---

### Pitfall 11: Propaganda and Manufactured Positivity Infiltration

**What goes wrong:** State-sponsored media, corporate PR departments, and authoritarian-regime outlets publish "positive news" that is actually propaganda. A sentiment filter would happily surface "Country X reports 100% employment and citizen satisfaction" from state media. Without credibility filtering, the dashboard becomes a vector for disinformation dressed as good news.

**Prevention:**
1. Maintain a source allowlist, not a blocklist. Only accept articles from vetted sources. The existing `SOURCE_TIERS` system in `feeds.ts` provides a model for this.
2. Exclude state-sponsored media outlets entirely (RT, CGTN, Xinhua, TASS) unless their articles are corroborated by independent sources.
3. For mainstream sources, inherit WorldMonitor's existing source tier system -- Tier 1 (Reuters, AP, AFP) and Tier 2 (BBC, Guardian, NPR) are trustworthy; lower tiers need additional scrutiny.
4. Never auto-surface corporate press releases as positive news, even if they are positive in tone.

**Detection (warning signs):**
- Single-source stories that sound too good to be true
- Stories from unfamiliar sources appearing in the feed
- Geopolitically convenient narratives from state-adjacent outlets

**Confidence:** MEDIUM -- the general problem is well-documented (PMC, University of Michigan). The specific risk to HappyMonitor is extrapolated.

**Phase relevance:** Phase 1 (source curation). Define the allowlist alongside feed integration.

---

### Pitfall 12: Engagement Metrics Disappoint Compared to WorldMonitor

**What goes wrong:** Negative news generates higher click-through rates (each additional negative word increases CTR by 2.3%, per Nature Publishing Group research). HappyMonitor's positive content may show structurally lower engagement metrics, leading stakeholders to conclude the product has failed when it is actually performing as expected for its content type.

**Prevention:**
1. Define success metrics BEFORE launch that account for the positivity engagement gap: time on site (not just clicks), return visit frequency, session count per week, direct navigation (users typing the URL, indicating intentional visits).
2. Do NOT compare raw pageviews or CTR to WorldMonitor. These are fundamentally different content types with different engagement profiles.
3. Research suggests users self-report preference for positive content but engage more with negative content. Design for the "intentional visit" pattern: users choosing to visit HappyMonitor as a deliberate counterbalance, not doom-scrolling it all day.
4. Track qualitative signals: social shares with positive commentary, user feedback, newsletter signups.

**Detection (warning signs):**
- Stakeholders comparing HappyMonitor pageviews directly to WorldMonitor
- Pressure to add "edgier" content to boost engagement
- Feature creep toward negative content to increase clicks

**Confidence:** MEDIUM -- the 2.3% CTR increase per negative word is from published research (Nature). The engagement gap concern is extrapolated from this data.

**Phase relevance:** Phase 0 (success criteria definition). Must be agreed before launch to avoid misinterpretation of metrics.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Sentiment pipeline (Phase 1) | False positives on mixed-polarity news (Pitfall 1, 7) | Multi-stage filter: keywords + sentiment + topic + confidence threshold. Test with 200+ adversarial examples before launch. |
| Data source integration (Phase 1) | Content volume too low (Pitfall 3), unreliable feeds (Pitfall 10) | Start with curated sources, not filtered mainstream. Test RSS feeds for 2 weeks before depending on them. |
| Visual theme (Phase 1-2) | Toxic positivity aesthetic (Pitfall 2), CSS overhaul scope (Pitfall 9) | Warm but serious. Keep monospace font. New map style. Single focused theme implementation. |
| Variant architecture (Phase 0) | Codebase complexity explosion (Pitfall 4) | Refactor ternary chains to registry pattern BEFORE adding happy variant. Config-driven, not code-branching. |
| Progress metrics (Phase 2) | Static data feels dead (Pitfall 8) | Mix annual aggregates with fast-updating proxies. Trend visualization over point-in-time values. |
| Map visualization (Phase 2-3) | Nothing compelling to show (Pitfall 6) | Progress heatmaps, live renewable data, animated temporal trends. May need to de-emphasize map vs. WorldMonitor. |
| Performance (Phase 1) | In-browser ML kills mobile (Pitfall 5) | Server-side sentiment classification in Sebuf handler. Cache scores with articles. |
| Content integrity (Phase 1) | Propaganda infiltration (Pitfall 11) | Source allowlist inherited from WorldMonitor's tier system. Vetted sources only. |
| Launch metrics (Phase 0) | Engagement disappointment (Pitfall 12) | Define positivity-appropriate success metrics before launch. Time-on-site and return visits, not CTR. |

---

## Sources

**Sentiment Analysis Accuracy:**
- [Toptal: 4 Sentiment Analysis Accuracy Traps](https://www.toptal.com/deep-learning/4-sentiment-analysis-accuracy-traps) -- MEDIUM confidence
- [PMC: Automated Sentiment Analysis Methods evaluation](https://pmc.ncbi.nlm.nih.gov/articles/PMC11784633/) -- HIGH confidence
- [Label Your Data: Sentiment Analysis methods and challenges 2026](https://labelyourdata.com/articles/natural-language-processing/sentiment-analysis) -- MEDIUM confidence
- [Nature: Sarcasm detection challenges](https://www.nature.com/articles/s41598-025-08131-x) -- HIGH confidence
- [ScienceDirect: Recent NLP sentiment analysis challenges](https://www.sciencedirect.com/science/article/pii/S2949719124000074) -- HIGH confidence

**Positive News Engagement and Toxic Positivity:**
- [Nature (PMC): Negativity drives online news consumption](https://pmc.ncbi.nlm.nih.gov/articles/PMC10202797/) -- HIGH confidence
- [Nature: Negative news shared more to social media](https://www.nature.com/articles/s41598-024-71263-z) -- HIGH confidence
- [arXiv: Negative news posts generate lower engagement than non-negative](https://arxiv.org/html/2507.19300v1) -- MEDIUM confidence
- [Psychology Today: Toxic Positivity](https://www.psychologytoday.com/us/basics/toxic-positivity) -- HIGH confidence
- [Washington Post: Toxic positivity and mental health](https://www.washingtonpost.com/lifestyle/wellness/toxic-positivity-mental-health-covid/2020/08/19/5dff8d16-e0c8-11ea-8181-606e603bb1c4_story.html) -- MEDIUM confidence
- [Wikipedia: Toxic positivity](https://en.wikipedia.org/wiki/Toxic_positivity) -- MEDIUM confidence

**Constructive Journalism:**
- [Bonn Institute: What is Constructive Journalism](https://www.bonn-institute.org/en/what-is-constructive-journalism) -- HIGH confidence
- [SAGE Journals: Journalism professionals' perceptions of constructive journalism](https://journals.sagepub.com/doi/10.1177/14648849251331262) -- MEDIUM confidence
- [WAN-IFRA: Newsrooms countering news avoidance with uplifting content](https://wan-ifra.org/2025/04/how-newsrooms-are-countering-news-avoidance-by-offering-uplifting-content-to-break-negative-news-cycles/) -- MEDIUM confidence

**Content Freshness and Curation:**
- [Columbia Journalism Review: Repetitive content problems](https://www.cjr.org/analysis/content-nytimes-cnn-wsj-npr.php) -- HIGH confidence
- [News Minimalist: Stale news and topic fatigue](https://www.newsminimalist.com/blog/adding-live-coverage-and-solving-topic-fatigue) -- MEDIUM confidence

**Variant Architecture and Feature Flags:**
- [Martin Fowler: Feature Toggles](https://martinfowler.com/articles/feature-toggles.html) -- HIGH confidence
- [Flagsmith: 5 Feature Flag Management Pitfalls](https://www.flagsmith.com/blog/pitfalls-of-feature-flags) -- MEDIUM confidence
- [Unleash: Best practices at scale](https://docs.getunleash.io/topics/feature-flags/best-practices-using-feature-flags-at-scale) -- MEDIUM confidence

**Theme and UX Design:**
- [DoorDash: Launching Dark Mode at Scale](https://careersatdoordash.com/blog/launching-dark-mode-while-building-a-scalable-design-system/) -- MEDIUM confidence
- [Toptal: Dark UI Dos and Don'ts](https://www.toptal.com/designers/ui/dark-ui) -- MEDIUM confidence

**Our World in Data API:**
- [OWID Technical Documentation: APIs](https://docs.owid.io/projects/etl/api/) -- HIGH confidence
- [OWID GitHub: data-api](https://github.com/owid/data-api) -- HIGH confidence

**Codebase-specific sources (verified from code):**
- `src/config/variant.ts` -- variant detection logic
- `src/config/panels.ts` -- ternary variant branching pattern
- `src/config/feeds.ts` -- feed configuration and source tiers
- `src/styles/main.css` -- CSS custom properties and theme system
- `src/services/ml-capabilities.ts` -- ML desktop-only gating
- `src/services/threat-classifier.ts` -- existing sentiment/threat classification
- `src/services/summarization.ts` -- existing LLM pipeline pattern
- `.planning/codebase/CONCERNS.md` -- monolithic App.ts, performance issues
