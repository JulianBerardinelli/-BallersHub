// app/(site)/pricing/page.tsx

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

export const metadata = {
  title: "Planes y precios · 'BallersHub",
  description:
    "Elegí el plan que potencia tu carrera. Empezá gratis y escalá cuando estés listo.",
};

export default function PricingPage() {
  return (
    <PricingProvider initialAudience="player" initialCurrency="USD">
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
