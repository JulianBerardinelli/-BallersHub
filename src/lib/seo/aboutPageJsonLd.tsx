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
// Data source: getTeam(t)/getMilestones(t) from the about module — same
// source the UI consumes, so the schema never drifts. Text is localized
// via next-intl; `inLanguage` follows the active locale.
// NOTE: ORG_DESCRIPTION/slogan stay es for now — sitewide Organization
// schema localization is handled in Phase 3 (organizationJsonLd).

import { getTranslations, getLocale } from "next-intl/server";

import { getSiteBaseUrl, toCanonicalUrl } from "./baseUrl";
import { getTeam, getMilestones, type TeamMember } from "@/components/site/about/data";
import { HTML_LANG } from "@/i18n/config";
import type { Locale } from "@/i18n/routing";

const ORG_HANDLES = {
  instagram: "https://www.instagram.com/ballershub_",
  twitter: "https://x.com/ballershub_",
} as const;

const ORG_DESCRIPTION =
  "Plataforma de portfolios profesionales para futbolistas y agencias de representación. Cada jugador y cada agencia obtiene un link único optimizado para SEO que centraliza trayectoria, estadísticas, datos físicos y media verificada.";

function personIdFor(member: TeamMember, base: string): string {
  const slug = member.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}/about#person-${slug}`;
}

function buildPersonNodes(team: TeamMember[], base: string): Array<Record<string, unknown>> {
  return team.map((member) => ({
    "@type": "Person",
    "@id": personIdFor(member, base),
    name: member.name,
    jobTitle: member.role,
    description: member.bio,
    ...(member.imageSrc && { image: toCanonicalUrl(member.imageSrc) }),
    worksFor: { "@id": `${base}#organization` },
  }));
}

export async function AboutPageJsonLd() {
  const t = await getTranslations("about");
  const locale = (await getLocale()) as Locale;
  const team = getTeam(t);
  const milestones = getMilestones(t);

  const base = getSiteBaseUrl();
  const aboutUrl = toCanonicalUrl("/about");
  const aboutId = `${aboutUrl}#aboutpage`;
  const orgId = `${base}#organization`;
  const breadcrumbId = `${aboutUrl}#breadcrumb`;

  const founder = team.find((m) => /co.?founder|founder/i.test(m.role));
  const founderId = founder ? personIdFor(founder, base) : null;

  const personNodes = buildPersonNodes(team, base);

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
    name: `${t("meta.title")} · 'BallersHub`,
    inLanguage: HTML_LANG[locale],
    isPartOf: { "@id": `${base}#website` },
    mainEntity: { "@id": orgId },
    breadcrumb: { "@id": breadcrumbId },
    significantLink: milestones.slice(0, 5).map(() => aboutUrl),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: base },
      { "@type": "ListItem", position: 2, name: t("meta.title"), item: aboutUrl },
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
