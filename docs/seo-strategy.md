# 'BallersHub — SEO Strategy

> **Status:** Phase 1 (foundation) in progress on branch `claude/xenodochial-buck-896eb9`. Phases 2–4 not started.
> **Owner:** @julian-berardinelli
> **Last updated:** 2026-05-14
> **Generated from:** `/claude-seo:seo plan saas` skill output + manual codebase audit.

> When this strategy changes, **update this doc first**. The implementation handoff lives in [`seo-per-player-handoff.md`](./seo-per-player-handoff.md). The pricing matrix §E is the contractual source of truth for what Free vs Pro get — this strategy can never violate it.

---

## 1. Business model & audiences

**Model**: two-sided marketplace (players + agencies) monetized via subscriptions. Free is the acquisition funnel; Pro unlocks SERP differentiation (JSON-LD, dynamic OG, sitemap priority, alt-tags).

**Audience map**:

| Audience | Intent | Landing page | What we sell them |
|---|---|---|---|
| **Primary** — scouts, journalists, recruiters, fans searching player names | Find / verify a specific player | `/[slug]` | First-party portfolio (vs Transfermarkt's database aggregation) |
| **Secondary** — players & agencies searching `"perfil profesional futbolista"`, `"portfolio scout"`, `"página jugador"` | Acquisition | `/`, `/pricing` | Authoring platform |
| **Tertiary** — clubs evaluating agencies | B2B intent | `/agency/[slug]` | Agency credibility |

## 2. KPIs that matter

Generic SaaS metrics (MQL, organic clicks) are too coarse. Specific to BallersHub:

| Metric | Today | 3 months | 6 months | 12 months |
|---|---|---|---|---|
| Indexed pages (GSC) | ~10 static | 50 (+blog) | 500+ | 2,000+ |
| **Pro players winning their own name SERP** | unknown | 30% | 60% | 80% |
| Organic clicks/month | low | 500 | 3,000 | 15,000 |
| Free → Pro from organic | unknown | baseline | +20% | +50% |
| Core Web Vitals "Good" on `/[slug]` | unmeasured | 90% | 95% | 95% |

The **player-name win-rate** is the single most important KPI. Everything else is secondary.

## 3. Competitor landscape

| Competitor | DA (approx.) | Coverage | Their weakness we exploit |
|---|---|---|---|
| Transfermarkt | ~88 | Top-tier pros, deep stats | Thin on lower divisions, women's football, emerging players |
| BeSoccer | ~78 | Pros + database aggregation | No first-party media or contact channels |
| Flashscore | ~85 | Live scores, deep stats | Profiles are afterthoughts; no portfolio surface |
| Promiedos | ~65 (AR) | AFA-specific | Doesn't index individual player pages |
| Instagram athlete profiles | infinite | Self-published | Not indexable for football queries; no structured data |

**Battle plan**: we cannot dethrone Transfermarkt on top-tier player queries inside 12 months. We CAN dominate:
- Lower divisions (Primera Nacional, B Metro, regional leagues)
- Emerging players (U17, U20, recent debutants)
- Women's football (where Transfermarkt coverage is sparse)
- AR-specific positional/regional long-tails (`"delantero argentino libre"`, `"arquero AFA disponible"`)

A "win" in BallersHub terms is appearing as the **2nd result under Transfermarkt** for established pros, and the **1st result** for everyone else.

## 4. Site architecture

The textbook SaaS tree (`/features/*`, `/solutions/*`, `/integrations/*`) does **not** fit. The portfolio page IS the feature page. Use this instead:

```
/                                    ← Organization + WebSite + (eventually) SoftwareApplication
├── /pricing                         ← Offer schema × N plans
├── /about                           ← E-E-A-T anchor: founder + team Person entities
├── /[slug]                          ← player portfolio — PRIMARY organic engine
├── /agency/[slug]                   ← agency portfolio — secondary engine
├── /search                          ← internal discovery (noindex)
├── /blog                            ← Phase 2 — editorial track
│   ├── /[post-slug]                 ← Article schema, author Person link
│   └── /autores/[author-slug]       ← author hub (E-E-A-T)
└── /jugadores                       ← Phase 3 — directory hubs (programmatic SEO analogue)
    ├── /por-club/[club-slug]
    ├── /por-posicion/[position]
    └── /por-pais/[country]
```

**Quality gate on `/jugadores/por-*`**: do NOT ship a hub with <10 approved profiles matching the filter — return 404. Thin programmatic pages trigger Google's quality threshold and tank the whole subdomain.

## 5. Content strategy — three tracks

### Track A — Marketing pages (one-time work, then frozen)

- `/` — value prop for both audiences. Two CTAs above the fold (one player, one agency).
- `/pricing` — Offer schema × plans, plain in-page FAQ (no FAQPage schema — Google killed rich results for commercial sites in Aug 2023).
- `/about` — team Person entities, mission, contact, founding date. This is where E-E-A-T lives.
- `/legal/*` — keep crawlable as trust signal.

### Track B — Editorial blog (`/blog`)

The blog exists to:
1. Capture mid-funnel queries from players/agencies considering signup.
2. Link to portfolios to boost their crawl frequency (link-equity flywheel).
3. Build domain authority.

**Cluster topics**:

1. **Career guidance for footballers** (target: players)
   - "Cómo armar un portfolio profesional de futbolista"
   - "Qué buscan los scouts en un perfil"
   - "Estadísticas que importan según tu posición"
2. **Agency operations** (target: agencies)
   - "Gestión de roster de jugadores: herramientas"
   - "Cómo presentar jugadores a clubes"
3. **Industry/local AR** (target: top-of-funnel, AR market)
   - "Mercado de pases AFA 2026"
   - "Categorías de ascenso argentino: estructura"

**Cadence target**: 2 posts/week, ≥1,500 words each, every post links to ≥3 relevant `/[slug]` portfolios.

### Track C — Portfolio quality enforcement (highest leverage)

The biggest SEO win is NOT a new page type. It's making existing Pro portfolios actually rank for player-name queries. Levers:

- **Minimum bio length** ≥ 300 chars for Pro before publish (gate at save action)
- **Server-computed alt-tags** when Pro user doesn't provide one: `${fullName} - ${position} - ${currentClub}` (pricing matrix §E item #5)
- **Bidirectional internal links**: every player page links to their agency; agency pages list all their players with anchor text = player name
- **BreadcrumbList** on every portfolio (already implemented in Pro `personJsonLd`)
- **Soft-noindex Free portfolios with bio <100 chars** to avoid thin-content drag on site-level quality

## 6. Schema plan per page type

| Page | Schema | Status |
|---|---|---|
| `/` | `Organization`, `WebSite` (with `SearchAction`), `SoftwareApplication` | Partial — Organization + WebSite shipped, SoftwareApplication TODO |
| `/pricing` | `Product` + `Offer × N`, `BreadcrumbList` | TODO |
| `/about` | `Organization` (extended), team members as `Person` | TODO |
| `/[slug]` Free | minimal `Person` | ✅ Done |
| `/[slug]` Pro | `@graph` `Person` + `SportsTeam` + `SportsOrganization` + `BreadcrumbList` + `sameAs` | ✅ Done |
| `/agency/[slug]` | `SportsOrganization` + `BreadcrumbList` + `member` × players | ❌ Missing — generator drafted in handoff doc |
| `/blog/[post]` | `Article` + author `Person` | Phase 2 |
| `/jugadores/por-*` | `CollectionPage` + `ItemList` | Phase 3 |

**Schemas to NEVER add**:
- `FAQPage` — Google removed rich results for commercial sites (Aug 2023). Maintenance burden, zero benefit.
- `HowTo` — deprecated by Google (Sept 2023).
- `Review` for player profiles — we're not a review site. Manual action risk.
- `SoftwareApplication.aggregateRating` — no review data → faking it = manual action.

## 7. Technical foundation

### Already correct

- App Router with server-rendered metadata + JSON-LD (Google sees on first byte)
- 1h ISR cache on `/[slug]` — good for crawler economy
- Canonical URLs via `metadataBase` + `alternates.canonical`
- `robots.txt` blocks transactional paths (`/dashboard`, `/admin`, `/checkout`, `/onboarding`, `/auth`, `/api`)
- `<html lang="es-AR">` (consistent with `WebSite.inLanguage`)
- Single canonical `<h1>` per page (refactored Pro layout from 8+ down to 1)

### Required for Phase 1 closure

1. **Dynamic OG image** — `src/app/(public)/[slug]/opengraph-image.tsx` using `next/og`'s `ImageResponse`. Pro-only; Free falls back to static OG. (Matrix §E item #3.)
2. **Server-default alt-tags** — when Pro user uploads media without alt, compute `${playerName} - ${context}` server-side. (Matrix §E item #5.)
3. **Agency JSON-LD** — `SportsOrganization` graph for `/agency/[slug]` (currently emits zero schema).
4. **`x-robots-tag: noindex` on Vercel previews** — `vercel.json` headers rule keyed on `$VERCEL_ENV !== 'production'`. Prevents preview deploys from competing with prod.
5. **`/llms.txt`** — `src/app/llms.txt/route.ts` exposing player/agency directory for AI crawlers (Perplexity, ChatGPT, Claude). Cheap, aligns with AI-search readiness.

### Core Web Vitals targets (post-prod)

- LCP ≤ 2.5s (mobile)
- INP ≤ 200ms
- CLS ≤ 0.1

Audit with `/claude-seo:seo page https://ballershub.co/<slug>` once a Pro profile is live.

## 8. Roadmap

### Phase 1 — Foundation (this week)

Goal: ship deployable SEO baseline.

- [x] `robots.ts`
- [x] `sitemap.ts` with Pro/Free priority
- [x] Person JSON-LD (Free minimal, Pro full graph)
- [x] Organization + WebSite JSON-LD sitewide
- [x] `metadataBase`, canonical, rich metadata in root layout + `[slug]` + `agency/[slug]`
- [x] Fix `revalidate: 0` → 3600
- [x] Refactor Pro layout: 8+ H1 → 1 semantic H1
- [ ] Dynamic OG image (Pro-only)
- [ ] Agency JSON-LD
- [ ] Offer schema on `/pricing`
- [ ] Drop default placeholder image from Person.image when no real avatar (audit finding H2)
- [ ] Language consistency: `jobTitle: "Futbolista"` (audit finding H3)
- [ ] **Deploy real app to `ballershub.co`** — currently a stub Create-Next-App placeholder

### Phase 2 — Blog + E-E-A-T (weeks 2-6)

- `/blog` with Article schema + author Person entities
- `/about` with team Person entities
- 6 cornerstone posts (2 per cluster from §5 Track B)
- Extend `sitemap.ts` to include blog posts
- Wire `revalidatePath('/<slug>')` in player dashboard save action

### Phase 3 — Directory hubs (months 2-3, gated by ≥200 Pro profiles)

- `/jugadores/por-club/[club]`, `/por-posicion/[position]`, `/por-pais/[country]`
- `CollectionPage` + `ItemList` schema
- Quality gate: 404 if <10 matching profiles
- Add hubs to sitemap

### Phase 4 — Authority + AI search (months 4-6)

- Publish original benchmark data (avg portfolio views, signing rates) — citable by AI engines
- Monitor Perplexity / Google AI Overviews citations for `"perfil futbolista profesional"`
- Outreach: backlinks from infobae, Olé, TyC Sports to high-value Pro portfolios
- Switch to `/sitemap-index.xml` if approved player count exceeds ~5k
- Evaluate English (`/en/[slug]`) hreflang once AR-only growth plateaus

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Transfermarkt dominates name queries for established pros | Don't fight them on top-tier — focus on lower divisions, emerging, women's football |
| Thin Free portfolios hurt site quality | Free already at sitemap priority 0.6; consider `noindex` for portfolios with bio <100 chars |
| AI engines scrape but don't cite | Add `llms.txt`, ensure Person JSON-LD has rich `sameAs`, write quotable bio passages |
| Schema bloat → invalid markup → Google ignores | Validate with Rich Results Test after every JSON-LD change |
| Mass-indexing Free portfolios floods crawl budget | Phase 3 sitemap split + lower Free priority is the lever |

## 10. What to skip (anti-cargo-cult)

- **`/features/*` tree** — your features are profile fields. The portfolio page IS the feature page.
- **vs-competitor pages** — wrong positioning. We're an authoring platform, not a database substitute for Transfermarkt.
- **Glossary / TermDefinition** — wrong audience need.
- **`SoftwareApplication.aggregateRating`** — no review data → fabrication risk.
- **Programmatic city pages** — we're not a local service. The §4 club/position/country hubs are the right analogue.
- **FAQ schema on commercial pages** — zero rich-result benefit since 2023, only maintenance cost.

---

## Quick reference — skill commands per phase

| Phase | Commands |
|---|---|
| Pre-deploy (now) | `/claude-seo:seo plan saas`, `/claude-seo:seo schema` |
| Post-Phase 1 deploy | `/claude-seo:seo audit <url>`, `/claude-seo:seo page <url>/<slug>`, `/claude-seo:seo schema <url>` |
| Phase 2 prep | `/claude-seo:seo cluster "futbolista profesional"`, `/claude-seo:seo content <url>` |
| Phase 3 prep | `/claude-seo:seo programmatic <url>`, `/claude-seo:seo competitor-pages <transfermarkt-url>` |
| Phase 4 / ongoing | `/claude-seo:seo geo <url>`, `/claude-seo:seo backlinks <url>`, `/claude-seo:seo google [GSC/PageSpeed/CrUX]`, `/claude-seo:seo drift baseline/compare` |

**Skip entirely**: `/seo local`, `/seo maps`, `/seo ecommerce`, `/seo hreflang` (Phase 4 only), `/seo dataforseo` (paid), `/seo image-gen` (players upload their own).
