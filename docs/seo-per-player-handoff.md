# SEO per-player & sitewide — Implementation Handoff

> **Status**: Phase 1 partially landed on branch `claude/xenodochial-buck-896eb9`. Not yet deployed to production (`ballershub.co` currently serves a Create-Next-App stub).
> **Owner**: @julian-berardinelli
> **Pricing matrix reference**: §E (5 SEO features, Free vs Pro split)
> **Strategy doc**: [`seo-strategy.md`](./seo-strategy.md)
> **Last updated**: 2026-05-14

## Why this PR exists

Pricing matrix §E defines 5 SEO features with Free vs Pro tier. Before this branch, only basic meta tags existed. This PR delivers the foundation for player-name SERP differentiation against Transfermarkt/BeSoccer/Flashscore.

| Feature (matrix §E) | Free | Pro | This branch |
|---|---|---|---|
| Meta tags básicos + OG mínimo | ✓ | ✓ | ✅ |
| Schema.org `Person` / `SportsOrganization` | — | ✓ | ✅ player + ✅ agency |
| OG image dinámica (avatar + stats overlay) | — | ✓ | ✅ Pro branch; Free renders brand-only fallback |
| Sitemap dedicado e indexación priorizada | — | ✓ | ✅ unified sitemap with Pro=0.9, Free=0.6 |
| Alt-tags optimizados en multimedia | — | ✓ | ✅ server-default in upload route |

## Tier gating — single source of truth

**Detection**: read `subscriptions.plan` (`'free'`, `'pro'`, `'pro_plus'`) AND `subscriptions.status_v2` (`'trialing'`, `'active'`).

**Where it lives**:
- Dashboard / UI gates → `src/lib/dashboard/plan-access.ts` (`resolvePlanAccess`). **Do NOT touch.**
- SEO/sitemap → inlined predicate in `src/app/sitemap.ts` (`plan IN ('pro','pro_plus') AND status_v2 IN ('trialing','active')`). Duplicates the predicate intentionally — batch-friendly vs the per-user helper.
- Per-player JSON-LD shape → `plan` prop passed to `<PersonJsonLd>` from `[slug]/page.tsx`.

Why duplicate the predicate in `sitemap.ts`: the helper reads one row per user; sitemap reads all of them in one query. Refactoring `resolvePlanAccess` to operate on a Set is more invasive than copying 3 lines.

## What landed in this branch

### New files

| File | Purpose |
|---|---|
| `src/lib/seo/baseUrl.ts` | Canonical base-URL helper. Priority: `NEXT_PUBLIC_APP_URL` → `NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` → `localhost`. Mirrors `src/lib/billing/env.ts#appUrl`. **Single source of truth** for sitemap, robots, JSON-LD `@id`, `metadataBase`, `alternates.canonical`. |
| `src/lib/seo/organizationJsonLd.tsx` | Sitewide `@graph` Organization + WebSite with `SearchAction` (search box in SERP) and `sameAs` to IG/X. Cross-referenced via `@id`. Mounted in root layout body. |
| `src/lib/seo/personJsonLd.tsx` | Per-player JSON-LD. **Free** = minimal Person (name, photo, nationality, jobTitle). **Pro** = `@graph` with `Person + SportsTeam + SportsOrganization + BreadcrumbList`, full `sameAs` to Transfermarkt/BeSoccer/IG/X/YT/TT, `height`/`weight` as `QuantitativeValue`, team affiliation via `@id`. Spanish position labels (`Arquero`, `Mediocampista`, etc.). Omits `image` when no real avatar. |
| `src/lib/seo/agencyJsonLd.tsx` | Per-agency JSON-LD. `SportsOrganization` graph with `BreadcrumbList`, `member` cross-references to represented players, `areaServed` for operative countries, `contactPoint`. Closes the `worksFor` dangling pointer from player Pro graphs. |
| `src/lib/seo/offerJsonLd.tsx` | `/pricing` schema. `Product` + `Offer × N` (one per currency × tier). Prices read live from `src/components/site/pricing/data.ts` to avoid duplication. |
| `src/lib/seo/revalidate.ts` | Cache-invalidation helpers. `revalidatePlayerPublicProfile(slug)` and `revalidatePlayerPublicProfileById(supabase, id)`. Invalidates `/<slug>`, `/sitemap.xml`, `/llms.txt` together. |
| `src/app/sitemap.ts` | Dynamic sitemap. Home priority 1.0, Pro players 0.9, Free 0.6, agencies 0.7, static 0.5. `lastModified` from `updated_at`. Fails-safe to static-only if DB unreachable at build. |
| `src/app/robots.ts` | Allow `/` by default. Disallow `/dashboard`, `/admin`, `/checkout`, `/onboarding`, `/auth`, `/api`, `/unsubscribe`. Sitemap reference dynamic to current host. |
| `src/app/llms.txt/route.ts` | AI crawler discoverability manifest. Lists static pages + all approved players + agencies. 1h revalidate. |
| `src/app/(public)/[slug]/opengraph-image.tsx` | Dynamic OG card via `next/og` `ImageResponse`. Edge runtime, 1200×630. Pro tier: avatar + name + position + club. Free tier: brand-only card with name. |

### Modified files

| File | Change |
|---|---|
| `src/app/layout.tsx` | • `metadataBase` uses `getSiteBaseUrlObject` (replaces local helper).<br>• Title default: `"BallersHub — Perfiles profesionales de futbolistas"` (was `"'BallersHub"`).<br>• Description with real keywords.<br>• `keywords`, `authors`, `creator`, `publisher`, `applicationName`.<br>• Explicit `robots` with `max-image-preview: large`, `max-snippet: -1`.<br>• `openGraph.locale: es_AR`, `twitter.site: @ballershub_`.<br>• `<html lang="es-AR">` (was `"es"`).<br>• `<OrganizationJsonLd />` inserted in body. |
| `src/app/(public)/[slug]/page.tsx` | • **`revalidate: 0 → 3600`** (cache 1h, avoids per-bot re-query).<br>• `generateMetadata` enriched: title with `position + currentClub`, description with bio cleaned (158 chars, word boundary), `alternates.canonical`, full OG, Twitter with avatar.<br>• 404 → `robots: { index: false, follow: false }` (prevents soft-404 spam).<br>• `<PersonJsonLd plan={plan} player={...} />` rendered. |
| `src/app/(public)/agency/[slug]/page.tsx` | • **`revalidate: 0 → 3600`**.<br>• `generateMetadata` enriched: title pattern, description word-boundary truncation, `alternates.canonical`, OG with logo.<br>• `<AgencyJsonLd agency={...} />` rendered (closes the player→agency `worksFor` cross-ref). |
| `src/app/(public)/[slug]/components/ProAthleteLayout.tsx` | **8 `<h1>` → 1 semantic `<h1>`**. The 6 decorative ghost-trail H1s + invisible width spacer + outline overlay all demoted to `<span aria-hidden="true">` (or `<motion.span>` for animated ones). The canonical H1 carries `aria-label={fullName}` + `<span class="sr-only">{firstName}</span> {lastName}` so crawlers + screen readers receive the full name in one phrase. Parallax animations unchanged (`motion.span` ≡ `motion.h1` for framer-motion). |
| `src/app/(site)/pricing/page.tsx` | • Metadata: `alternates.canonical`, richer description, OG. <br>• `<OfferJsonLd />` mounted. |
| `src/app/api/media/upload/route.ts` | • `select` extended to fetch `slug, full_name, positions, current_club`.<br>• `altText` server-default composed from those fields when the form omits it.<br>• `revalidatePlayerPublicProfile(slug)` called after successful insert. |
| `src/app/(dashboard)/dashboard/edit-profile/personal-data/actions.ts` | • `revalidatePlayerPublicProfile` after `updateBasicInfo` (was missing).<br>• **Bug fix** in `updateContactInfo`: previously `revalidatePath('/' + playerId)` (UUID) — never matched the `/<slug>` route. Now resolves slug from DB and invalidates correctly. |
| `src/app/(dashboard)/dashboard/edit-profile/football-data/actions.ts` | `revalidatePlayerPublicProfileById` wired into every mutation that touches publicly-rendered fields: `updateSportProfile`, `updateMarketProjection`, `updateScoutingAnalysis`, `upsert/delete` for `PlayerLink`, `PlayerHonour`, `SeasonStat`, `submitCareerRevision`. |
| `vercel.json` | Headers rule: hosts matching `*.vercel.app` get `X-Robots-Tag: noindex, nofollow` so preview deploys don't compete with production. |

### Deleted files

`src/app/(public)/[slug]/metadata.ts` — was empty (0 bytes), forgotten placeholder.

## Schema audit findings (from `/claude-seo:seo schema`)

Audit ran in static-mode against the branch since production is unschema'd. Findings to address in Phase 1 closure or follow-up:

### Critical

**C1 — Agency page emits no JSON-LD.** `agency/[slug]/page.tsx` only ships metadata + OG, leaving the cross-reference `worksFor: {"@id": <agency-url>#organization}` (declared in player Pro graph) dangling.

**Fix**: create `src/lib/seo/agencyJsonLd.tsx` with `SportsOrganization` graph (`@id: ${canonical}#organization`), including `name`, `url`, `logo`, `sameAs` (agency socials), `member` (representative players), `address` (if available), and a `BreadcrumbList`. Then mount in `agency/[slug]/page.tsx` after the fetch.

**Reference skeleton** (already validated by skill):

```tsx
// src/lib/seo/agencyJsonLd.tsx
import { toCanonicalUrl, getSiteBaseUrl } from "./baseUrl";

export type AgencyJsonLdData = {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  players?: Array<{ slug: string; fullName: string }>;
};

export function AgencyJsonLd({ agency }: { agency: AgencyJsonLdData }) {
  const canonical = toCanonicalUrl(`/agency/${agency.slug}`);
  const base = getSiteBaseUrl();
  const orgId = `${canonical}#organization`;
  const sameAs = [
    agency.websiteUrl,
    agency.instagramUrl,
    agency.linkedinUrl,
    agency.twitterUrl,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  const graph: Record<string, unknown>[] = [
    {
      "@type": "SportsOrganization",
      "@id": orgId,
      name: agency.name,
      url: canonical,
      ...(agency.logoUrl && { logo: toCanonicalUrl(agency.logoUrl) }),
      ...(agency.description && { description: agency.description }),
      ...(sameAs.length > 0 && { sameAs }),
      ...(agency.players && agency.players.length > 0 && {
        member: agency.players.map((p) => ({
          "@type": "Person",
          "@id": `${toCanonicalUrl(`/${p.slug}`)}#person`,
          name: p.fullName,
          url: toCanonicalUrl(`/${p.slug}`),
        })),
      }),
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonical,
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: base },
        { "@type": "ListItem", position: 2, name: "Agencias", item: `${base}/agency` },
        { "@type": "ListItem", position: 3, name: agency.name, item: canonical },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
```

### High

**H1 — No Offer schema on `/pricing`.** Three plans with no `Offer` markup means Google can't show plan/price in rich results or AI Overviews.

**Fix**: add `Product` + nested `Offer × 3` in `(site)/pricing/page.tsx`. Pull prices from `pricing-matrix.md` (single source of truth) — not hardcoded.

**H2 — Player `image` falls back to `/images/player-default.jpg` when no avatar exists.** Google Rich Results Test flags generic placeholders as low-quality. Fix in `personJsonLd.tsx`:

```tsx
const baseImage = player.avatarUrl ? toCanonicalUrl(player.avatarUrl) : null;
// then in the spread:
...(baseImage && { image: baseImage }),
```

Person schema is valid without `image`. Better to omit than to emit a placeholder.

**H3 — `jobTitle: "Footballer"` (English) on `es-AR` locale site.** Inconsistent with `inLanguage: "es-AR"` in WebSite. Choose:
- **Option A** (simpler): change to `"Futbolista"` and translate position map to Spanish (`"Mediocampista"`, `"Delantero"`, etc.).
- **Option B** (i18n-ready): use bilingual `[{"@language": "es", "@value": "Mediocampista"}]` arrays. Defer until hreflang exists.

Recommended: Option A now.

### Medium

| ID | Issue | Action |
|---|---|---|
| M1 | `alternateName: "'BallersHub"` has leading apostrophe — confirm intentional brand styling vs smart-quote leftover | Verify with owner |
| M2 | Organization lacks `foundingDate`, `address`, `contactPoint` | Add when data available — strengthens Knowledge Graph eligibility |
| M3 | `image.contentUrl` duplicates `url` in OrganizationJsonLd | Drop `contentUrl`, keep `url` |
| M4 | OrganizationJsonLd `sameAs` only has IG + X | Add LinkedIn, YouTube, TikTok when accounts exist |
| M5 | No `BreadcrumbList` on `/agency/[slug]` | Addressed in C1 fix above |

### Low

| ID | Issue | Defer reason |
|---|---|---|
| L1 | `@id` consistency across files | Verify when agency JSON-LD lands |
| L2 | `SearchAction.target.urlTemplate` points to `/search?q={search_term_string}` — confirm route accepts query param | Confirm pre-deploy |
| L3 | No `llms.txt` for AI crawler discoverability | Phase 1 punch list, low effort |

## Phase 1 closure punch list

- [x] **C1** — `src/lib/seo/agencyJsonLd.tsx` created + mounted in `agency/[slug]/page.tsx`. Emits `SportsOrganization` graph with `BreadcrumbList`, `member` cross-refs, `areaServed`, `contactPoint`.
- [x] **H1** — `src/lib/seo/offerJsonLd.tsx` created + mounted in `(site)/pricing/page.tsx`. `Product` + `Offer × N` (one per currency × tier). Prices pulled from `data.ts` to avoid duplication.
- [x] **H2** — `personJsonLd.tsx` now omits `image` when the player has no real avatar (was emitting the placeholder).
- [x] **H3** — `jobTitle: "Futbolista"` + `POSITION_LABELS` map translated to Spanish (`Arquero`, `Mediocampista central`, etc.) to match `inLanguage: es-AR`.
- [x] **L3** — `src/app/llms.txt/route.ts` created. Lists static pages + all approved players + agencies; 1h revalidate.
- [x] **OG image dinámica** — `src/app/(public)/[slug]/opengraph-image.tsx`. Pro-only branched card with avatar + name + position + club; Free tier gets a brand-only card with the player's name. Edge runtime, 1h cache.
- [x] **Server-default alt-tags** — `src/app/api/media/upload/route.ts` now composes `${fullName} — ${positions} · ${currentClub}` when `altText` is empty. Always inserts a non-empty `alt_text`.
- [x] **`vercel.json` x-robots-tag** — headers rule added; hosts matching `*.vercel.app` get `X-Robots-Tag: noindex, nofollow` so previews don't compete with production.
- [x] **Revalidation helpers + wired in actions** — new `src/lib/seo/revalidate.ts` with `revalidatePlayerPublicProfile(slug)` and `revalidatePlayerPublicProfileById(supabase, id)`. Wired into:
  - `personal-data/actions.ts` (`updateBasicInfo`, `updateContactInfo` — fixed the playerId-vs-slug bug from before)
  - `football-data/actions.ts` (`updateSportProfile`, `updateMarketProjection`, `updateScoutingAnalysis`, `upsert/deletePlayerLink`, `upsert/deletePlayerHonour`, `upsert/deleteSeasonStat`, `submitCareerRevision`)
  - `api/media/upload/route.ts`
- [ ] **Deploy the real app to `ballershub.co`** — currently serves a Create-Next-App stub. Nothing in this PR matters until this happens.

### What is verified

- `npm run typecheck` — clean. The only remaining errors are pre-existing missing node_modules (stripe, mercadopago, d3-geo, topojson-client, world-atlas) and one Globe3D component — all unrelated to this branch.
- `npm run lint` — clean for every SEO file created/modified in this branch. 0 errors, no new warnings.

## Post-deploy validation

Once real app is live with these changes:

```
/claude-seo:seo audit https://ballershub.co
/claude-seo:seo page https://ballershub.co/<real-pro-slug>
/claude-seo:seo schema https://ballershub.co/<real-pro-slug>
/claude-seo:seo technical https://ballershub.co
/claude-seo:seo drift baseline https://ballershub.co/<real-pro-slug>  # capture baseline for regression detection
```

Then run **Google Rich Results Test** + **Schema.org validator** on at least:
- Home
- One Free player slug
- One Pro player slug
- One agency slug
- `/pricing`

## Files NOT to touch (out of scope)

- `src/lib/dashboard/plan-access.ts` — single source of truth for plan gating (UI). Sitemap inlines its own predicate intentionally.
- `src/lib/dashboard/feature-gates.ts` — SEO is not UI-gateable; not a feature gate.
- `subscriptions.typography` and legacy theme columns — preserved in DB but no longer respected.

## Estimated effort

- Phase 1 punch list above: **~4–6h** dev + **~1h** validation in Rich Results Test.
- Single bundled PR against `dev` (owner preference for tightly-coupled changes).
