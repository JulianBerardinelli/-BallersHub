// app/(site)/pricing/page.tsx

import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Planes y precios",
  description:
    "Elegí el plan que potencia tu carrera o agencia. Free incluye perfil verificado y URL pública. Pro suma galería extendida, prensa, SEO avanzado y schema en JSON-LD.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Planes y precios — BallersHub",
    description:
      "Free vs Pro para jugadores y agencias. Suscripción anual con trial de 7 días en Pro.",
    url: "/pricing",
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <PricingProvider initialAudience="player" initialCurrency="USD">
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
