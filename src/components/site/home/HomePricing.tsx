// Pricing plans on the home, right below the video grid. Reuses the EXACT
// /pricing UI — audience (Jugador ↔ Agencia) + currency (USD/ARS/EUR) toggles,
// the plan cards and the feature comparison table — so the two stay in sync.
// Only the FAQ stays exclusive to /pricing (linked at the bottom).
//
// Server component composing the client pricing pieces (same pattern as the
// /pricing page), so the cards SSR. `m` animations work via the (site) layout's
// SiteMotionProvider (LazyMotion).

import { getTranslations } from "next-intl/server";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import {
  PricingComparisonTable,
  PricingPlans,
  PricingProvider,
  PricingToggles,
} from "@/components/site/pricing";

export default async function HomePricing() {
  const t = await getTranslations("home.pricing");
  return (
    <PricingProvider initialAudience="player" initialCurrency="USD">
      <section id="planes" aria-labelledby="home-pricing-title" className="relative scroll-mt-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="bh-animate-in inline-flex items-center gap-1.5 rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-bh-lime" />
            {t("eyebrow")}
          </span>

          <h2
            id="home-pricing-title"
            className="bh-animate-in bh-animate-d1 mt-5 font-bh-display text-[2rem] font-black uppercase leading-[0.95] tracking-[-0.01em] text-bh-fg-1 md:text-[2.75rem]"
          >
            {t("titleLine1")} <span className="bh-text-shimmer">{t("titleHighlight")}</span>
          </h2>

          <p className="bh-animate-in bh-animate-d2 mx-auto mt-4 max-w-[520px] text-[15px] leading-[1.6] text-bh-fg-3">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-10 space-y-10">
          <PricingToggles />
          <PricingPlans />
        </div>

        <div className="mt-20">
          <PricingComparisonTable />
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-bh-fg-3 transition-colors duration-150 hover:text-bh-fg-1"
          >
            {t("viewFaq")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </PricingProvider>
  );
}
