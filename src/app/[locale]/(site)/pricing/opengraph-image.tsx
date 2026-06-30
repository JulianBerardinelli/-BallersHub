// Open Graph image for /pricing (1200×630). Design: Claude Design handoff
// card 04 — headline + Free/Pro plan cards.
//
// Two roles:
//   1. Social share preview for ballershub.co/pricing.
//   2. Canonical `Product.image` referenced from `offerJsonLd.tsx` (Google
//      rejects SVG/placeholder images for Product snippets — this 1200×630
//      PNG is the raster it accepts). The route URL is unchanged, so that
//      reference keeps resolving.

import { ImageResponse } from "next/og";
import { PRO_PLAYER_PRICES } from "@/components/site/pricing/data";
import { OG_SIZE, ACCENT } from "@/lib/og/tokens";
import { ogFonts } from "@/lib/og/fonts";
import { ogAssets } from "@/lib/og/assets";
import { ogStrings } from "@/lib/og/strings";
import { PricingCard } from "@/lib/og/cards";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "'BallersHub — Planes y precios";
export const revalidate = 86400;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = locale === "es" ? "es" : "en";
  const [fonts, assets] = await Promise.all([ogFonts(), ogAssets()]);
  // Pro player, USD per-month (annual / 12) — same number the page shows.
  const proPrice = `$${PRO_PLAYER_PRICES.USD.perMonthDisplay}`;

  return new ImageResponse(
    (
      <PricingCard
        S={ogStrings(lang)}
        ac={ACCENT.lima}
        wordmark={assets.wordmark}
        proPrice={proPrice}
      />
    ),
    { ...size, fonts },
  );
}
