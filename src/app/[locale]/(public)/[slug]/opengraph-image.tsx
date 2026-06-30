// Dynamic Open Graph image for player portfolios (1200×630), built from DB
// data per profile so every shared link shows that player's face + identity.
// Design: Claude Design handoff `OG Images BallersHub.html` (card 01).
//
// Applies to BOTH Free and Pro public profiles — a branded, personalized card
// is the single biggest social-organic lever (every WhatsApp/X/IG share is an
// impression with our logo). The page must NOT also set `openGraph.images`
// (that would override this file convention with the raw square avatar).

import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { teams } from "@/db/schema";
import { toCanonicalUrl } from "@/lib/seo/baseUrl";
import { flagEmoji, alpha2FromLegacyNationality } from "@/lib/scouting/taxonomies";
import { ogCountryName } from "@/lib/og/country";
import { localizePlayerPositions } from "@/lib/i18n/positions";
import { OG_SIZE, ACCENT } from "@/lib/og/tokens";
import { ogFonts } from "@/lib/og/fonts";
import { ogAssets } from "@/lib/og/assets";
import { ogStrings } from "@/lib/og/strings";
import { PlayerCard, type PlayerCardData } from "@/lib/og/cards";
import type { Locale } from "@/i18n/routing";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "'BallersHub — Perfil de jugador";
export const revalidate = 3600;

const DEFAULT_AVATAR = "/images/player-default.jpg";
const DEFAULT_CREST = "/images/team-default.svg";

function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age >= 12 && age <= 60 ? age : null;
}

function formatValue(eur: number | null): string | null {
  if (!eur || eur <= 0) return null;
  if (eur >= 1_000_000) return `€${(eur / 1_000_000).toFixed(eur % 1_000_000 === 0 ? 0 : 1)}M`;
  if (eur >= 1_000) return `€${Math.round(eur / 1_000)}K`;
  return `€${Math.round(eur)}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const lang = locale === "es" ? "es" : "en";

  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
    columns: {
      fullName: true,
      avatarUrl: true,
      positions: true,
      currentClub: true,
      currentTeamId: true,
      nationality: true,
      birthDate: true,
      foot: true,
      marketValueEur: true,
    },
  });

  const [fonts, assets] = await Promise.all([ogFonts(), ogAssets()]);
  const S = ogStrings(lang);

  // No player (or 404'd slug) → sitewide-style brand card via the home cascade
  // is unreachable here (file convention wins), so render the player frame
  // with brand-only fallbacks.
  if (!player) {
    return new ImageResponse(
      (
        <PlayerCard
          d={{
            firstName: "",
            lastName: "'BallersHub",
            flag: "",
            countryName: "",
            eyebrow: S.profileEyebrow,
            slug,
            avatarUrl: toCanonicalUrl(DEFAULT_AVATAR),
            verified: false,
            chips: [],
            club: null,
            crestUrl: null,
            verifiedTag: S.verifiedTag,
          }}
          ac={ACCENT.lima}
          wordmark={assets.wordmark}
        />
      ),
      { ...size, fonts, emoji: "twemoji" },
    );
  }

  // ----- derive card fields -----
  const tokens = player.fullName.trim().split(/\s+/);
  const firstName = tokens.length > 1 ? tokens[0] : "";
  const lastName = tokens.length > 1 ? tokens.slice(1).join(" ") : player.fullName.trim();

  const alpha2 = alpha2FromLegacyNationality(player.nationality?.[0] ?? null);
  const flag = alpha2 ? flagEmoji(alpha2) : "";
  const country = ogCountryName(alpha2, lang);

  const positionLabel =
    player.positions && player.positions.length > 0
      ? localizePlayerPositions([player.positions[0]], locale as Locale)
      : null;
  const age = ageFrom(player.birthDate);
  const foot = player.foot ? (S.foot[player.foot] ?? player.foot) : null;
  const value = formatValue(player.marketValueEur ?? null);

  const chips: PlayerCardData["chips"] = [];
  if (positionLabel) chips.push({ accent: true, label: positionLabel });
  if (age)
    chips.push({
      // NBSP between the number and the unit: Satori collapses a plain space
      // between a text node and a sibling <span> ("21años").
      label: (
        <span>
          {`${age} `}
          <span style={{ color: "rgba(255,255,255,0.40)", fontWeight: 500 }}>{S.age}</span>
        </span>
      ),
    });
  if (foot) chips.push({ label: foot });
  if (value) chips.push({ accent: true, label: value });

  // crest: only when the team has a real (non-placeholder) crest
  let crestUrl: string | null = null;
  if (player.currentTeamId) {
    const team = await db
      .select({ crest: teams.crestUrl })
      .from(teams)
      .where(eq(teams.id, player.currentTeamId))
      .limit(1);
    const c = team[0]?.crest;
    if (c && c !== DEFAULT_CREST) crestUrl = toCanonicalUrl(c);
  }

  const avatarUrl =
    player.avatarUrl && player.avatarUrl !== DEFAULT_AVATAR
      ? toCanonicalUrl(player.avatarUrl)
      : toCanonicalUrl(DEFAULT_AVATAR);

  const data: PlayerCardData = {
    firstName,
    lastName,
    flag,
    countryName: country,
    eyebrow: S.profileEyebrow,
    slug,
    avatarUrl,
    verified: true,
    chips,
    club: player.currentClub ?? null,
    crestUrl,
    verifiedTag: S.verifiedTag,
  };

  return new ImageResponse(
    <PlayerCard d={data} ac={ACCENT.lima} wordmark={assets.wordmark} />,
    { ...size, fonts, emoji: "twemoji" },
  );
}
