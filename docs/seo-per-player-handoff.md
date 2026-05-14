# SEO per-player profile — handoff

**Status:** planned, no code written yet. Will be PR E.
**Last update:** 2026-05-14.
**Branch:** to be created from `dev` once PRs #56/#59/#60/#62 are merged.

This doc is the canonical brief for the next agent to pick up the
SEO-per-player feature. Read it end-to-end before writing code, then
verify against current source — paths/lines may drift.

---

## Context

BallersHub is a Next.js 15 (App Router) + Supabase platform. Player
public profiles live at `/{slug}` and there is a separate agency
portfolio at `/agency/{slug}`. The platform already has a working
Pro/Free plan gating system (see `project_dashboard_plan_gating.md` in
memory, and `docs/pricing-matrix.md` in this repo).

Per the pricing matrix §E ("SEO"), Pro users should get richer SEO than
Free users, but the public surfaces today render only baseline meta
tags. This handoff covers building out §E.

---

## Goal

Implement the full §E row of the pricing matrix for player profiles:

| Feature | Free | Pro |
|---|---|---|
| Meta tags básicos + OG mínimo | ✓ | ✓ |
| Schema.org `Person` JSON-LD | — | ✓ |
| OG image dinámica (avatar + stats overlay) | — | ✓ |
| Sitemap dedicado e indexación priorizada | — | ✓ |
| Alt-tags optimizados en multimedia | — | ✓ |

Apply the same pattern to `/agency/{slug}` for agencies where
applicable (Schema.org `SportsOrganization` instead of `Person`).

---

## Scope decisions

1. **Pro-only for JSON-LD and dynamic OG image.** This is intentional
   — it gives Pro users a visible advantage in SERP rich results and
   social shares.
2. **Sitemap split.** Two surfaces:
   - `app/sitemap.xml/route.ts` (or `app/sitemap.ts`) — all approved
     profiles (Free + Pro), default priority.
   - `app/sitemap-pro.xml/route.ts` — Pro profiles only, with higher
     `priority` and `changefreq=weekly`. Linked from `robots.txt` as a
     hint to crawlers.
3. **Alt-tag optimization.** When a Pro user uploads media, the action
   should compute a default alt text from `player.fullName + position
   + nationality` if the user didn't provide one, instead of saving an
   empty `alt_text`. Free users keep the current behavior (empty if
   omitted) — no upsell, just defense.
4. **Canonical + hreflang.** Add `alternates: { canonical: ..., languages: ... }`
   to the player page metadata. The platform is currently Spanish-only
   so hreflang is `es-AR` for now, but the structure should be ready
   to add `en` later.

---

## Files to touch

| Path | Status | Role |
|---|---|---|
| `src/app/(public)/[slug]/page.tsx` | modify | Player page — improve `generateMetadata`, inject JSON-LD `<script>` for Pro. |
| `src/app/(public)/[slug]/opengraph-image.tsx` | **new** | Pro-only OG image via Next `ImageResponse`. Falls back to a static OG for Free. |
| `src/app/(public)/[slug]/opengraph-image-free.tsx` or `app/(public)/opengraph-image.tsx` | optional | Free fallback (or use the default `metadataBase` OG). |
| `src/app/(public)/agency/[slug]/page.tsx` | modify | Same treatment for agency. `SportsOrganization` JSON-LD. |
| `src/app/(public)/agency/[slug]/opengraph-image.tsx` | **new** | Pro Agency OG. |
| `src/app/sitemap.xml/route.ts` | **new** | All approved profiles. |
| `src/app/sitemap-pro.xml/route.ts` | **new** | Pro profiles only, higher priority. |
| `src/app/robots.ts` or `public/robots.txt` | modify | Reference both sitemaps. |
| `src/lib/seo/player-schema.ts` | **new** | Pure functions: `buildPlayerJsonLd(player)`, `buildAgencyJsonLd(agency)`. |
| `src/lib/seo/og-helpers.ts` | **new** | Shared helpers for the OG image generator (truncation, palette, etc). |
| `src/app/actions/player-media.ts` (or wherever uploads happen) | modify | Compute default alt text for Pro users when omitted. |

---

## Implementation plan (recommended order)

### 1. Baseline metadata improvements (player + agency)

Both `generateMetadata` functions today return basic `title`/`description`.
Improve them:
- Add `metadataBase`, `alternates.canonical`, `alternates.languages`.
- Add `openGraph.images` with a deterministic absolute URL pointing to
  `/[slug]/opengraph-image` (Next auto-detects this convention).
- Add `twitter.card: "summary_large_image"`.
- Add `robots: { index: status === 'approved', follow: true }` so
  pending/draft profiles don't get indexed accidentally.

### 2. Schema.org JSON-LD (Pro only)

Create `src/lib/seo/player-schema.ts`:

```ts
export function buildPlayerJsonLd(player: PlayerForSeo): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.fullName,
    jobTitle: "Football player",
    nationality: player.nationality?.[0] ?? undefined,
    affiliation: player.currentClub ? {
      "@type": "SportsOrganization",
      name: player.currentClub,
    } : undefined,
    image: player.avatarUrl ?? undefined,
    url: `https://ballershub.app/${player.slug}`,
    // Pro-only fields:
    additionalProperty: [
      player.marketValueEur ? {
        "@type": "PropertyValue",
        name: "Market value",
        value: player.marketValueEur,
        unitText: "EUR",
      } : undefined,
      ...buildHonoursAsPropertyValues(player.honours),
    ].filter(Boolean),
  };
}
```

Render inline in the player page (server component) ONLY when
`plan === 'pro'`:

```tsx
{access.isPro && (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(buildPlayerJsonLd(player)) }}
  />
)}
```

NB: use `resolvePlanAccess(subscription)` to get the same Pro
detection the dashboard uses (`src/lib/dashboard/plan-access.ts`).

### 3. Dynamic OG image (Pro only)

Convention: `app/(public)/[slug]/opengraph-image.tsx` with
`export const runtime = "edge"` and a default export that returns
`ImageResponse`. Next will route it automatically for the slug page.

Design suggestion (matches the Pro Athlete vibe):
- Background: dark gradient using the player's theme primary/accent.
- Top-left: BallersHub wordmark.
- Center: player avatar (circular, 256px) + full name (bh-display).
- Bottom strip: position · nationality · current club.
- Right side: 2-3 key stats (matches, goals, market value if visible).

For Free users, Next falls back to the parent `opengraph-image` (we can
ship a generic one at `app/(public)/opengraph-image.tsx`).

### 4. Sitemaps

Two routes:

```ts
// app/sitemap.xml/route.ts — all approved profiles
export async function GET() {
  const profiles = await db.query.playerProfiles.findMany({
    where: eq(playerProfiles.status, "approved"),
    columns: { slug: true, updatedAt: true },
  });
  const agencies = await db.query.agencyProfiles.findMany({
    columns: { slug: true, updatedAt: true },
  });
  // Generate XML manually or use a builder.
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
```

```ts
// app/sitemap-pro.xml/route.ts — Pro profiles only with high priority
// Join subscriptions on user_id and filter status_v2 IN (active, trialing)
// + plan_id IN (pro-player, pro-agency).
```

Reference both from `robots.txt`:
```
Sitemap: https://ballershub.app/sitemap.xml
Sitemap: https://ballershub.app/sitemap-pro.xml
```

### 5. Alt-tag defaults for Pro media uploads

In `src/app/actions/player-media.ts` (or wherever `player_media` is
inserted), after validation, if `access.isPro && !altText`, compute:

```ts
const defaultAlt = `${player.fullName}${player.positions?.[0] ? ', ' + player.positions[0] : ''}${player.currentClub ? ' jugando para ' + player.currentClub : ''}`;
```

Same for `player_articles` (alt for the image field).

---

## How to detect Pro

Reuse the existing helpers — don't reinvent:

```ts
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";

const state = await fetchDashboardState(supabase, player.userId);
const access = resolvePlanAccess(state.subscription);
if (access.isPro) {
  // render JSON-LD, dynamic OG, etc.
}
```

For pages that don't have a logged-in user context (the public
profile is consumed by anonymous visitors), fetch the subscription
directly by `user_id` from the player row:

```ts
const sub = await db.query.subscriptions.findFirst({
  where: eq(subscriptions.userId, player.userId),
});
const access = resolvePlanAccess(sub ? toDashboardSubscription(sub) : null);
```

There's an existing `LayoutResolver` in `src/app/(public)/[slug]/components/LayoutResolver.tsx`
that already branches on `plan` — read it to understand the current
pattern.

---

## Testing

After implementing:

1. **Free player profile**: view source → no JSON-LD `<script>`. OG
   image is the fallback. Sitemap includes it but not in `sitemap-pro.xml`.
2. **Pro player profile**: view source → JSON-LD present and valid
   (paste in https://search.google.com/test/rich-results). OG image
   renders the dynamic version (visit `/{slug}/opengraph-image` in
   browser). Sitemap-pro includes it.
3. **`robots.txt`**: references both sitemaps.
4. **`/sitemap.xml` and `/sitemap-pro.xml`**: return valid XML, no 500s.
5. **Build**: `npm run build` must pass (Vercel uses `next build`).

---

## Files NOT to touch

- `src/lib/dashboard/plan-access.ts` — single source of truth, keep
  as is.
- `src/lib/dashboard/feature-gates.ts` — SEO isn't a gateable UI
  feature (no upsell from inside the dashboard), so don't add a
  `feature-gate` entry. The Pro check happens server-side at render.
- `subscriptions.typography` / legacy theme columns — leave alone.

---

## Open questions

1. Should the Free profile have a basic JSON-LD `Person` too (just
   without market value / honours / etc) or none at all? Owner
   preference TBD. Default in this plan: none for Free, as a Pro
   upsell.
2. OG image dimensions: Twitter wants 1200×675, Open Graph standard
   is 1200×630. Use 1200×630 (broader compat).
3. Hreflang: only `es-AR` today. When does `en` come? Out of scope
   for this PR but the structure should accept it.

---

## Recently merged PRs (context)

The agent working on this branch should be aware these are already in
`dev`:

- **PR #56** — Dashboard plan gating + activation flow + cleanup
  layouts. Introduced `resolvePlanAccess`, `feature-gates`,
  `<PlanGate>`, `<SubscriptionStateBanner>`, removed
  Futuristic/Minimalist/Vintage layouts and the typography editor.
- **PR #59** — Pricing page aligned with matrix v5.
- **PR #60** — Tutorial assistant.
- **PR #62** — Agency caps (players ≤5, staff ≤2) + tutorial dock
  polish (animated border, portal mount, mobile responsive).

---

## Estimated effort

~6h for a confident agent. Mostly straightforward — the gnarly bit is
the `ImageResponse` rendering edge runtime (no Node APIs allowed) and
making sure the JSON-LD schema is valid.
