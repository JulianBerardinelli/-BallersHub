// Global JSON-LD: Organization + WebSite + SoftwareApplication.
//
// Mounted once in the root layout. Three purposes:
//
//   1. Establish BallersHub as a recognized brand entity in Google's
//      Knowledge Graph so player profiles can later reference it via
//      `publisher` on Article/Person schemas.
//   2. Emit a `WebSite` node with a `SearchAction` so Google can offer
//      an inline search box for the site in the SERP.
//   3. Declare the product as a `SoftwareApplication` so AI engines and
//      Google can surface it in app-style result cards.
//
// Why a server component returning a <script> tag: Next.js streams the
// JSON-LD with the initial HTML, which is exactly what crawlers consume.
// `dangerouslySetInnerHTML` with `JSON.stringify` is the canonical
// Next.js pattern for structured data; React 19 does not escape script
// children, so the alternative would silently fail to render valid JSON.

import { getSiteBaseUrl } from "./baseUrl";

const ORG_HANDLES = {
  instagram: "https://www.instagram.com/ballershub_",
  twitter: "https://x.com/ballershub_",
} as const;

const ORG_DESCRIPTION =
  "Plataforma de portfolios profesionales para futbolistas y agencias de representación. Cada jugador y cada agencia obtiene un link único optimizado para SEO que centraliza trayectoria, estadísticas, datos físicos y media verificada.";

const APP_DESCRIPTION =
  "Aplicación web para crear portfolios profesionales de futbolistas y agencias: link único, datos centralizados, SEO listo desde el primer día.";

export function OrganizationJsonLd() {
  const base = getSiteBaseUrl();
  const orgId = `${base}#organization`;
  const siteId = `${base}#website`;
  const appId = `${base}#software`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: "BallersHub",
        url: base,
        // Founded August 2025 — sourced from docs/about MILESTONES.
        foundingDate: "2025-08",
        description: ORG_DESCRIPTION,
        logo: {
          "@type": "ImageObject",
          url: `${base}/images/logo/imagotipo-full_lime.svg`,
        },
        sameAs: [ORG_HANDLES.instagram, ORG_HANDLES.twitter],
        slogan: "Perfiles profesionales de futbolistas",
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        url: base,
        name: "BallersHub",
        inLanguage: "es-AR",
        publisher: { "@id": orgId },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${base}/search?q={search_term_string}`,
          },
          // schema.org requires this exact literal string format.
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": appId,
        name: "BallersHub",
        url: base,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "es-AR",
        description: APP_DESCRIPTION,
        publisher: { "@id": orgId },
        // Offers live on /pricing as their own Product+Offer graph; we
        // link to that page so crawlers can follow the trail without us
        // duplicating price data here.
        offers: {
          "@type": "AggregateOffer",
          url: `${base}/pricing`,
          priceCurrency: "USD",
          lowPrice: "0",
          offerCount: 2,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
