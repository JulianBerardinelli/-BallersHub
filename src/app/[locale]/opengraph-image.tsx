// Sitewide default Open Graph image (1200×630). Because it lives at the
// `[locale]` segment, Next.js inherits it for EVERY page that doesn't define
// its own `opengraph-image` — including the home, /about, /blog, /legal, etc.
// This is the fix for "sharing ballershub.co showed a random player avatar":
// the home had no og:image, so scrapers scraped a grid <img>. Now every
// surface falls back to a branded card.

import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { OG_SIZE, ACCENT } from "@/lib/og/tokens";
import { ogFonts } from "@/lib/og/fonts";
import { ogAssets } from "@/lib/og/assets";
import { ogStrings } from "@/lib/og/strings";
import { HomeCard } from "@/lib/og/cards";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "'BallersHub — El hub del fútbol profesional";
// OG cards change only when the brand does; cache aggressively.
export const revalidate = 86400;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = hasLocale(routing.locales, locale) ? locale : "es";
  const [fonts, assets] = await Promise.all([ogFonts(), ogAssets()]);

  return new ImageResponse(
    (
      <HomeCard
        S={ogStrings(lang)}
        ac={ACCENT.lima}
        wordmark={assets.wordmark}
        isotipo={assets.isotipo}
      />
    ),
    { ...size, fonts },
  );
}
