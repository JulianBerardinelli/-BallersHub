// Global JSON-LD: Organization + WebSite with SearchAction.
//
// Mounted once in the root layout. Two purposes:
//
//   1. Establish BallersHub as a recognized brand entity in Google's
//      Knowledge Graph so player profiles can later reference it via
//      `publisher` on Article/Person schemas.
//   2. Emit a `WebSite` node with a `SearchAction` so Google can offer
//      an inline search box for the site in the SERP.
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

/**
 * Single combined `@graph` object covering Organization + WebSite.
 * Using `@graph` lets us cross-reference the two nodes via `@id`,
 * which is Google's preferred shape for sitewide JSON-LD.
 */
export function OrganizationJsonLd() {
  const base = getSiteBaseUrl();
  const orgId = `${base}#organization`;
  const siteId = `${base}#website`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: "BallersHub",
        alternateName: "'BallersHub",
        url: base,
        logo: {
          "@type": "ImageObject",
          url: `${base}/images/logo/imagotipo-full_lime.svg`,
          contentUrl: `${base}/images/logo/imagotipo-full_lime.svg`,
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
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
