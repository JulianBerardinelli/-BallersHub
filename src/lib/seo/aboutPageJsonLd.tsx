// JSON-LD for /about — AboutPage + Organization (rich) + team Person entities.
//
// The /about page is 'BallersHub's E-E-A-T anchor. Google's quality
// guidelines explicitly reward sites that disclose who is behind them,
// when the company was founded, and what credentials the team brings.
// We surface all of that as structured data so search engines and AI
// engines can ingest it without having to parse the visual layout.
//
// Cross-references via @id:
//   • AboutPage.mainEntity → Organization (already declared sitewide,
//     so we extend it here with founders/employees instead of
//     re-declaring it).
//   • Each TeamMember becomes a Person node referenced from
//     Organization.founder / Organization.employee.
//
// Data source: `src/components/site/about/data.ts` (TEAM, MILESTONES,
// ABOUT_HERO). Pulling from the same module the UI consumes guarantees
// the schema never drifts from the visible page content.

import { getSiteBaseUrl, toCanonicalUrl } from "./baseUrl";
import { TEAM, MILESTONES, type TeamMember } from "@/components/site/about/data";

const ORG_HANDLES = {
  instagram: "https://www.instagram.com/ballershub_",
  twitter: "https://x.com/ballershub_",
} as const;

const ORG_DESCRIPTION =
  "Plataforma de portfolios profesionales para futbolistas y agencias de representación. Cada jugador y cada agencia obtiene un link único optimizado para SEO que centraliza trayectoria, estadísticas, datos físicos y media verificada.";

function personIdFor(member: TeamMember, base: string): string {
  // Stable id derived from the member name slug. We don't have
  // individual /team/[slug] pages yet, so each Person id is anchored to
  // /about with a hash fragment — schema.org accepts that as long as
  // the @id is unique within the graph.
  const slug = member.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}/about#person-${slug}`;
}

function buildPersonNodes(base: string): Array<Record<string, unknown>> {
  return TEAM.map((member) => ({
    "@type": "Person",
    "@id": personIdFor(member, base),
    name: member.name,
    jobTitle: member.role,
    description: member.bio,
    ...(member.imageSrc && { image: toCanonicalUrl(member.imageSrc) }),
    worksFor: { "@id": `${base}#organization` },
  }));
}

export function AboutPageJsonLd() {
  const base = getSiteBaseUrl();
  const aboutUrl = toCanonicalUrl("/about");
  const aboutId = `${aboutUrl}#aboutpage`;
  const orgId = `${base}#organization`;
  const breadcrumbId = `${aboutUrl}#breadcrumb`;

  const founder = TEAM.find((m) => /co.?founder|founder/i.test(m.role));
  const founderId = founder ? personIdFor(founder, base) : null;

  const personNodes = buildPersonNodes(base);

  const orgExtension = {
    "@type": "Organization",
    "@id": orgId,
    name: "'BallersHub",
    url: base,
    foundingDate: "2025-08",
    description: ORG_DESCRIPTION,
    logo: {
      "@type": "ImageObject",
      url: `${base}/images/logo/imagotipo-full_lime.svg`,
    },
    sameAs: [ORG_HANDLES.instagram, ORG_HANDLES.twitter],
    slogan: "Perfiles profesionales de futbolistas",
    ...(founderId && { founder: { "@id": founderId } }),
    employee: personNodes.map((p) => ({ "@id": p["@id"] })),
  };

  const aboutPage = {
    "@type": "AboutPage",
    "@id": aboutId,
    url: aboutUrl,
    name: "Nosotros · 'BallersHub",
    inLanguage: "es-AR",
    isPartOf: { "@id": `${base}#website` },
    mainEntity: { "@id": orgId },
    breadcrumb: { "@id": breadcrumbId },
    significantLink: MILESTONES.slice(0, 5).map(() => aboutUrl),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: base },
      { "@type": "ListItem", position: 2, name: "Nosotros", item: aboutUrl },
    ],
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [aboutPage, orgExtension, breadcrumb, ...personNodes],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
