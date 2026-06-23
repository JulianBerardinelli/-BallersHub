// app/(site)/pricing/page.tsx

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  PricingCTA,
  PricingComparisonTable,
  PricingHero,
  PricingPlans,
  PricingProvider,
  PricingToggles,
} from "@/components/site/pricing";
import { OfferJsonLd } from "@/lib/seo/offerJsonLd";
import { localizedAlternates } from "@/lib/seo/hreflang";
import { OG_LOCALE } from "@/i18n/config";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("pricing");
  // Self-canonical per locale + hreflang (agrees with sitemapLanguages("/pricing")).
  const alt = localizedAlternates(locale as Locale, "/pricing");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: alt,
    openGraph: {
      title: t("meta.ogTitle"),
      description: t("meta.ogDescription"),
      url: alt.canonical,
      type: "website",
      locale: OG_LOCALE[locale as Locale] ?? "es_AR",
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
        <PricingCTA />
      </div>
    </PricingProvider>
  );
}
