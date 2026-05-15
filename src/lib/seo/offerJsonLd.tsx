// Offer schema for /pricing.
//
// Emits a `Product` with nested `Offer` × N — one per (audience, tier,
// currency) combination. We render every currency we sell in so Google
// has the full pricing matrix, but Google Shopping rich-result eligibility
// requires a single canonical `price` per Offer; multi-currency `Offer`s
// satisfy that by being separate Offer nodes.
//
// Source of truth: `src/components/site/pricing/data.ts` (PRO_PLAYER_PRICES,
// PRO_AGENCY_PRICES). When prices change there, this picks them up
// automatically — no duplicate constants here.

import { toCanonicalUrl } from "./baseUrl";
import {
  PRO_PLAYER_PRICES,
  PRO_AGENCY_PRICES,
} from "@/components/site/pricing/data";

type OfferShape = {
  "@type": "Offer";
  name: string;
  category: string;
  price: string;
  priceCurrency: string;
  url: string;
  availability: string;
  eligibleRegion?: { "@type": "Country"; name: string };
};

function buildOffers(): OfferShape[] {
  const pricingUrl = toCanonicalUrl("/pricing");
  const offers: OfferShape[] = [];

  // Free tiers — single Offer per audience, no currency split.
  offers.push({
    "@type": "Offer",
    name: "Free Player",
    category: "Player profile",
    price: "0",
    priceCurrency: "USD",
    url: `${pricingUrl}#free-player`,
    availability: "https://schema.org/InStock",
  });
  offers.push({
    "@type": "Offer",
    name: "Free Agency",
    category: "Agency profile",
    price: "0",
    priceCurrency: "USD",
    url: `${pricingUrl}#free-agency`,
    availability: "https://schema.org/InStock",
  });

  // Pro tiers — one Offer per currency.
  for (const [currency, price] of Object.entries(PRO_PLAYER_PRICES)) {
    offers.push({
      "@type": "Offer",
      name: "Pro Player",
      category: "Player profile",
      price: String(price.annual),
      priceCurrency: currency,
      url: `${pricingUrl}#pro-player`,
      availability: "https://schema.org/InStock",
    });
  }
  for (const [currency, price] of Object.entries(PRO_AGENCY_PRICES)) {
    offers.push({
      "@type": "Offer",
      name: "Pro Agency",
      category: "Agency profile",
      price: String(price.annual),
      priceCurrency: currency,
      url: `${pricingUrl}#pro-agency`,
      availability: "https://schema.org/InStock",
    });
  }

  return offers;
}

export function OfferJsonLd() {
  const pricingUrl = toCanonicalUrl("/pricing");

  const payload = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "BallersHub — Suscripciones",
    description:
      "Acceso a perfiles profesionales en BallersHub. Plan Free disponible para jugadores y agencias; Pro desbloquea galería extendida, prensa curada, SEO avanzado y schema verificable.",
    brand: { "@type": "Brand", name: "BallersHub" },
    url: pricingUrl,
    offers: buildOffers(),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
