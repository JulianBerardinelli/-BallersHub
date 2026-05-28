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
//
// Fix Issue #3 del SEO health check del 2026-05-27: el Product ahora
// vive dentro de `@graph` con `@id` explícito y `brand` cross-referencia
// al `#organization` sitewide, en lugar de ser un objeto suelto sin
// cross-refs. Esto consolida el grafo y permite que Google entienda
// que el Product es publicado por la misma Organization que aparece
// en el resto del sitio.

import { toCanonicalUrl, getSiteBaseUrl } from "./baseUrl";
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
  const base = getSiteBaseUrl();
  const pricingUrl = toCanonicalUrl("/pricing");
  const productId = `${pricingUrl}#product`;
  const orgId = `${base}#organization`;
  const breadcrumbId = `${pricingUrl}#breadcrumb`;

  const productNode = {
    "@type": "Product",
    "@id": productId,
    name: "'BallersHub — Suscripciones",
    description:
      "Acceso a perfiles profesionales en 'BallersHub. Plan Free disponible para jugadores y agencias; Pro desbloquea galería extendida, prensa curada, SEO avanzado y schema verificable.",
    // `image` requerido por Google para Product/Merchant rich results
    // (GSC health check 2026-05-27 lo marcaba como error crítico).
    // Apunta al OG dinámico de /pricing (PNG 1200×630 raster, generado
    // por src/app/(site)/pricing/opengraph-image.tsx). Raster, no SVG —
    // Google rechaza SVG como Product image.
    image: `${pricingUrl}/opengraph-image`,
    // Brand cross-referenced al Organization sitewide — el publisher
    // del Product es la misma entidad que el resto del grafo.
    brand: { "@id": orgId },
    url: pricingUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pricingUrl,
      breadcrumb: { "@id": breadcrumbId },
    },
    offers: buildOffers(),
  };

  const breadcrumbNode = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: base },
      { "@type": "ListItem", position: 2, name: "Planes y precios", item: pricingUrl },
    ],
  };

  const payload = {
    "@context": "https://schema.org",
    "@graph": [productNode, breadcrumbNode],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
