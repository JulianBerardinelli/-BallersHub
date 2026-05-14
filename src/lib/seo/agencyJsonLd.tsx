// Per-agency JSON-LD: SportsOrganization + Breadcrumb + member entities.
//
// Mounted from `agency/[slug]/page.tsx` after data fetching. Closes the
// `worksFor: { "@id": <agency>#organization }` dangling reference that
// player Pro `@graph` already emits — without this, Google sees the
// player → agency edge but can't resolve the agency entity itself.
//
// Strategy:
//
//   • Emit `SportsOrganization` with stable `@id = <canonical>#organization`
//     so cross-references from player pages resolve cleanly.
//   • Include `member` for each represented player so Google can build
//     the agency ↔ players cluster. The Person entries reuse the
//     player's own `<canonical>#person` `@id`, so when Google crawls
//     both pages it merges the entities.
//   • `BreadcrumbList` for "Inicio › Agencias › {Agency}".
//
// This is a flat `@graph`, not a single root node, because we need to
// cross-reference SportsOrganization ↔ BreadcrumbList via `mainEntityOfPage`.

import { toCanonicalUrl, getSiteBaseUrl } from "./baseUrl";

export type AgencyJsonLdData = {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  /** Subset of players the agency represents — used for `member`. */
  players?: Array<{ slug: string; fullName: string }>;
  /** ISO 3166-1 alpha-2 codes the agency operates in. */
  operativeCountries?: string[] | null;
  /** Year the agency was founded — feeds `foundingDate`. */
  foundationYear?: number | null;
  contactEmail?: string | null;
};

export function AgencyJsonLd({ agency }: { agency: AgencyJsonLdData }) {
  const canonical = toCanonicalUrl(`/agency/${agency.slug}`);
  const base = getSiteBaseUrl();
  const orgId = `${canonical}#organization`;
  const breadcrumbId = `${canonical}#breadcrumb`;

  const sameAs = [
    agency.websiteUrl,
    agency.instagramUrl,
    agency.linkedinUrl,
    agency.twitterUrl,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  const members =
    agency.players && agency.players.length > 0
      ? agency.players.map((p) => ({
          "@type": "Person" as const,
          "@id": `${toCanonicalUrl(`/${p.slug}`)}#person`,
          name: p.fullName,
          url: toCanonicalUrl(`/${p.slug}`),
        }))
      : null;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "SportsOrganization",
      "@id": orgId,
      name: agency.name,
      url: canonical,
      ...(agency.logoUrl && { logo: toCanonicalUrl(agency.logoUrl) }),
      ...(agency.description && { description: agency.description }),
      ...(sameAs.length > 0 && { sameAs }),
      ...(agency.foundationYear && {
        foundingDate: String(agency.foundationYear),
      }),
      ...(agency.contactEmail && {
        contactPoint: {
          "@type": "ContactPoint",
          email: agency.contactEmail,
          contactType: "Representation",
        },
      }),
      ...(agency.operativeCountries &&
        agency.operativeCountries.length > 0 && {
          areaServed: agency.operativeCountries.map((code) => ({
            "@type": "Country",
            identifier: code.toUpperCase(),
          })),
        }),
      ...(members && { member: members }),
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonical,
        breadcrumb: { "@id": breadcrumbId },
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: base },
        {
          "@type": "ListItem",
          position: 2,
          name: "Agencias",
          item: `${base}/agency`,
        },
        { "@type": "ListItem", position: 3, name: agency.name, item: canonical },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
