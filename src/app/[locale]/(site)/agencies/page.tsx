// /agencies — marketing landing for agencies + crawlable directory.
//
// Two jobs in one server-rendered page (no "use client"):
//   1. Marketing: a hero, value props and a CTA aimed at agencies/representatives.
//   2. SEO: the JSON-LD `CollectionPage + ItemList` and a grid of real
//      <Link href="/agency/<slug>"> cards — the internal-link surface that keeps
//      agency portfolios from being orphan pages ("Discovered – not indexed").
//
// The agency set comes from `getApprovedAgencies()` (isApproved = true), the same
// predicate as the sitemap, so the rendered links + JSON-LD never drift from it.

import type { Metadata } from "next";

import { getApprovedAgencies } from "@/lib/agencies/directory";
import { DirectoryJsonLd, type DirectoryItem } from "@/lib/seo/directoryJsonLd";
import { AgenciesHero } from "@/components/site/agencies/AgenciesHero";
import { AgencyValueProps } from "@/components/site/agencies/AgencyValueProps";
import { AgencyGrid } from "@/components/site/agencies/AgencyGrid";
import { AgenciesCta } from "@/components/site/agencies/AgenciesCta";

// Hourly ISR — same cadence as the sitemap and agency pages. New approvals
// surface within the hour; an edit busts this path via
// `revalidateAgencyPublicProfile`.
export const revalidate = 3600;

const PAGE_PATH = "/agencies";
const PAGE_NAME = "Agencias";
const PAGE_DESCRIPTION =
  "Directorio de agencias de representación de futbolistas verificadas en 'BallersHub. Accedé a la cartera oficial de jugadores de cada agencia.";

export const metadata: Metadata = {
  title: "Agencias de representación",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: "Agencias de representación · 'BallersHub",
    description: PAGE_DESCRIPTION,
    url: PAGE_PATH,
    type: "website",
    siteName: "'BallersHub",
    locale: "es_AR",
  },
};

export default async function AgenciesPage() {
  let agencies: Awaited<ReturnType<typeof getApprovedAgencies>> = [];
  try {
    agencies = await getApprovedAgencies();
  } catch (err) {
    // Degrade to an empty state rather than 500 the landing.
    console.error("[/agencies] failed to load agencies:", err);
  }

  const jsonLdItems: DirectoryItem[] = agencies.map((a) => ({
    url: `/agency/${a.slug}`,
    name: a.name,
  }));

  return (
    <>
      <DirectoryJsonLd
        path={PAGE_PATH}
        name={PAGE_NAME}
        description={PAGE_DESCRIPTION}
        items={jsonLdItems}
      />

      <div className="space-y-16 pb-4 md:space-y-20">
        <AgenciesHero count={agencies.length} />
        <AgencyValueProps />
        <AgencyGrid agencies={agencies} />
        <AgenciesCta />
      </div>
    </>
  );
}
