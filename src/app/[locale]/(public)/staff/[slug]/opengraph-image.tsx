// Dynamic Open Graph image for staff (coaches / técnicos) portfolios.
// Reuses the player card frame from the Claude Design handoff, adapted for
// staff (role eyebrow + role chip, URL under /staff/). The page must NOT set
// `openGraph.images`, or it overrides this file with the raw avatar.

import { ImageResponse } from "next/og";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coachProfiles } from "@/db/schema";
import { toCanonicalUrl } from "@/lib/seo/baseUrl";
import { flagEmoji, countryName, alpha2FromLegacyNationality } from "@/lib/scouting/taxonomies";
import { OG_SIZE, ACCENT } from "@/lib/og/tokens";
import { ogFonts } from "@/lib/og/fonts";
import { ogAssets } from "@/lib/og/assets";
import { ogStrings } from "@/lib/og/strings";
import { PlayerCard, type PlayerCardData } from "@/lib/og/cards";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "'BallersHub — Cuerpo técnico";
export const revalidate = 3600;

const DEFAULT_AVATAR = "/images/player-default.jpg";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const lang = locale === "es" ? "es" : "en";
  const S = ogStrings(lang);
  const staffEyebrow = lang === "es" ? "Cuerpo técnico" : "Coaching staff";

  const [coach] = await db
    .select({
      fullName: coachProfiles.fullName,
      roleTitle: coachProfiles.roleTitle,
      currentClub: coachProfiles.currentClub,
      avatarUrl: coachProfiles.avatarUrl,
      nationality: coachProfiles.nationality,
    })
    .from(coachProfiles)
    .where(
      and(
        eq(coachProfiles.slug, slug),
        eq(coachProfiles.visibility, "public"),
        eq(coachProfiles.status, "approved"),
      ),
    )
    .limit(1);

  const [fonts, assets] = await Promise.all([ogFonts(), ogAssets()]);

  const baseData = (over: Partial<PlayerCardData>): PlayerCardData => ({
    firstName: "",
    lastName: "'BallersHub",
    flag: "",
    countryName: "",
    eyebrow: staffEyebrow,
    slug: `staff/${slug}`,
    avatarUrl: toCanonicalUrl(DEFAULT_AVATAR),
    verified: false,
    chips: [],
    club: null,
    crestUrl: null,
    verifiedTag: S.verifiedTag,
    ...over,
  });

  if (!coach) {
    return new ImageResponse(
      <PlayerCard d={baseData({})} ac={ACCENT.lima} wordmark={assets.wordmark} />,
      { ...size, fonts, emoji: "twemoji" },
    );
  }

  const tokens = coach.fullName.trim().split(/\s+/);
  const firstName = tokens.length > 1 ? tokens[0] : "";
  const lastName = tokens.length > 1 ? tokens.slice(1).join(" ") : coach.fullName.trim();
  const alpha2 = alpha2FromLegacyNationality(coach.nationality?.[0] ?? null);

  const data = baseData({
    firstName,
    lastName,
    flag: alpha2 ? flagEmoji(alpha2) : "",
    countryName: alpha2 ? countryName(alpha2) : "",
    avatarUrl:
      coach.avatarUrl && coach.avatarUrl !== DEFAULT_AVATAR
        ? toCanonicalUrl(coach.avatarUrl)
        : toCanonicalUrl(DEFAULT_AVATAR),
    verified: true,
    chips: coach.roleTitle ? [{ accent: true, label: coach.roleTitle }] : [],
    club: coach.currentClub ?? null,
  });

  return new ImageResponse(
    <PlayerCard d={data} ac={ACCENT.lima} wordmark={assets.wordmark} />,
    { ...size, fonts, emoji: "twemoji" },
  );
}
