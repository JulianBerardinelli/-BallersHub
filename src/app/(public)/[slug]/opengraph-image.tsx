// Dynamic Open Graph image for player portfolios (Pro-only).
//
// Pricing matrix §E item #3 — Pro users get an auto-generated 1200x630
// social-share card with their avatar, name, position, and current
// club composed onto the brand background. Free users fall back to
// the sitewide static OG declared in `app/layout.tsx`.
//
// Why this is the single biggest social-organic lever:
//
//   Every time a player shares their profile URL on WhatsApp / X /
//   Instagram, the receiving platform fetches this image and shows it
//   as the rich preview. A branded, personalized card converts far
//   better than a generic site logo — both for the player (more clicks
//   back to their portfolio) and for BallersHub (impression with logo
//   on every share, regardless of click-through).
//
// Implementation notes:
//
//   • Uses `next/og`'s `ImageResponse` — runs on the Edge runtime.
//     Free tier falls through to the static fallback by returning the
//     site's default OG; Next.js handles the dispatch.
//   • Image dimensions: 1200x630 (Facebook/Twitter/IG canonical).
//   • No external font fetches — Edge runtime makes font loading
//     fragile and the system stack covers the design.
//   • Avatar is rendered via an absolute URL because `ImageResponse`
//     cannot resolve relative paths.

import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema/subscriptions";
import { eq } from "drizzle-orm";
import { toCanonicalUrl } from "@/lib/seo/baseUrl";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Cache for an hour, same as the page. Sharers will see fresh edits
// within 60 minutes; AI/bot scrapers can't DoS the edge runtime.
export const revalidate = 3600;

type Params = { slug: string };

export default async function OpenGraphImage({ params }: { params: Params }) {
  const { slug } = params;

  // Single query: pull the player and their subscription tier in one
  // round-trip. The Free tier early-returns a brand-only card so the
  // visual contract holds (static fallback would be served by the
  // root layout's `openGraph` metadata, but Next.js routes the
  // file-based image first, so we render a usable Free version here).
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
    columns: {
      userId: true,
      fullName: true,
      positions: true,
      currentClub: true,
      avatarUrl: true,
      nationality: true,
    },
  });

  if (!player) {
    return brandOnlyCard("BallersHub");
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, player.userId),
    columns: { plan: true, statusV2: true },
  });

  const isPro =
    sub != null &&
    (sub.plan === "pro" || sub.plan === "pro_plus") &&
    (sub.statusV2 === "trialing" || sub.statusV2 === "active");

  if (!isPro) {
    // Free tier — render a lean brand card with just the name. We
    // could `return null` to fall through to the static layout OG,
    // but that yields the generic "BallersHub" image for every Free
    // player. Showing the name is still better SEO than nothing.
    return brandOnlyCard(player.fullName);
  }

  // Pro card — avatar + name + position + club.
  const positionLabel =
    player.positions && player.positions.length > 0
      ? player.positions.slice(0, 2).join(" / ")
      : null;
  const avatarUrl = player.avatarUrl ? toCanonicalUrl(player.avatarUrl) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(125% 125% at 50% 10%, #001915 40%, #0dd5a5 100%)",
          color: "#fff",
          padding: 80,
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: 0.85,
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#CCFF00",
            }}
          />
          BallersHub
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 56,
            marginTop: 80,
            flex: 1,
          }}
        >
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt=""
              width={280}
              height={280}
              style={{
                width: 280,
                height: 280,
                borderRadius: 999,
                objectFit: "cover",
                border: "6px solid #CCFF00",
                boxShadow: "0 0 0 12px #080808",
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flex: 1,
              minWidth: 0,
            }}
          >
            {positionLabel && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#CCFF00",
                  color: "#080808",
                  padding: "8px 18px",
                  fontSize: 24,
                  fontWeight: 900,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  borderRadius: 6,
                }}
              >
                {positionLabel}
              </div>
            )}
            <div
              style={{
                fontSize: 96,
                fontWeight: 900,
                lineHeight: 0.95,
                textTransform: "uppercase",
                letterSpacing: -2,
              }}
            >
              {player.fullName}
            </div>
            {player.currentClub && (
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  opacity: 0.85,
                  marginTop: 8,
                }}
              >
                {player.currentClub}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            opacity: 0.7,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <span>Perfil profesional</span>
          <span>ballershub.co/{slug}</span>
        </div>
      </div>
    ),
    size,
  );
}

function brandOnlyCard(displayName: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background:
            "radial-gradient(125% 125% at 50% 10%, #001915 40%, #0dd5a5 100%)",
          color: "#fff",
          padding: 80,
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 700,
            opacity: 0.8,
            marginBottom: 24,
          }}
        >
          BallersHub
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            textTransform: "uppercase",
            maxWidth: 1000,
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            fontSize: 24,
            opacity: 0.7,
            marginTop: 28,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Perfil profesional
        </div>
      </div>
    ),
    size,
  );
}
