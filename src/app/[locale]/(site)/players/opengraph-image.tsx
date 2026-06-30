// Open Graph image for the /players directory (1200×630).
// Design: Claude Design handoff card 03 — headline + dotted 3D globe +
// real avatar cluster.

import { ImageResponse } from "next/og";
import { and, eq, ne, isNotNull, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { playerProfiles } from "@/db/schema";
import { toCanonicalUrl } from "@/lib/seo/baseUrl";
import { OG_SIZE, ACCENT } from "@/lib/og/tokens";
import { ogFonts } from "@/lib/og/fonts";
import { ogAssets } from "@/lib/og/assets";
import { ogStrings } from "@/lib/og/strings";
import { PlayersCard } from "@/lib/og/cards";
import { globeSvg } from "@/lib/og/globe";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "'BallersHub — Jugadores verificados";
export const revalidate = 86400;

const DEFAULT_AVATAR = "/images/player-default.jpg";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = locale === "es" ? "es" : "en";

  let avatars: string[] = [];
  try {
    const rows = await db
      .select({ avatarUrl: playerProfiles.avatarUrl })
      .from(playerProfiles)
      .where(
        and(
          eq(playerProfiles.visibility, "public"),
          eq(playerProfiles.status, "approved"),
          isNotNull(playerProfiles.avatarUrl),
          ne(playerProfiles.avatarUrl, DEFAULT_AVATAR),
        ),
      )
      .orderBy(desc(playerProfiles.updatedAt))
      .limit(6);
    avatars = rows.map((r) => toCanonicalUrl(r.avatarUrl));
  } catch {
    avatars = [];
  }

  const [fonts, assets] = await Promise.all([ogFonts(), ogAssets()]);

  return new ImageResponse(
    (
      <PlayersCard
        S={ogStrings(lang)}
        ac={ACCENT.lima}
        wordmark={assets.wordmark}
        globe={globeSvg(400, ACCENT.lima.c)}
        avatars={avatars}
      />
    ),
    { ...size, fonts },
  );
}
