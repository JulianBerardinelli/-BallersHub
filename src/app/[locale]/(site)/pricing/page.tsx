// app/(site)/pricing/page.tsx

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  PricingCTA,
  PricingComparisonTable,
  PricingFAQ,
  PricingHero,
  PricingPlans,
  PricingProvider,
  PricingToggles,
  PricingValueGrid,
} from "@/components/site/pricing";
import { OfferJsonLd } from "@/lib/seo/offerJsonLd";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    // canonical only for now; hreflang alternates land once the F3 helper
    // (localizedAlternates) is in main and the plan core is localized too.
    alternates: { canonical: "/pricing" },
    openGraph: {
      title: t("meta.ogTitle"),
      description: t("meta.ogDescription"),
      url: "/pricing",
      type: "website",
    },
  };
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string; currency?: string }>;
}) {
  const sp = await searchParams;
  const audience = sp.audience === "agency" ? "agency" : "player";
  const currency =
    sp.currency === "ARS" || sp.currency === "EUR" ? sp.currency : "USD";

  return (
    <PricingProvider initialAudience={audience} initialCurrency={currency}>
      {/*
        Product + Offer × N (one Offer per currency × tier). Helps the
        page win plan/price queries and gives AI Overviews a structured
        pricing table to cite.
      */}
      <OfferJsonLd />
      <div className="space-y-24 pb-12">
        <PricingHero />
        <div className="space-y-10">
          <PricingToggles />
          <PricingPlans />
        </div>
        <PricingComparisonTable />
        <PricingValueGrid />
        <PricingFAQ />
        <PricingCTA />
      </div>
    </PricingProvider>
  );
}
