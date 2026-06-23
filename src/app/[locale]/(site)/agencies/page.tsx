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
import { getTranslations } from "next-intl/server";

import { localizedAlternates } from "@/lib/seo/hreflang";
import { OG_LOCALE } from "@/i18n/config";
import type { Locale } from "@/i18n/routing";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("site.agencies");
  // Self-canonical per locale + hreflang cluster (must agree with the sitemap's
  // sitemapLanguages("/agencies"), or search engines drop the cluster).
  const alt = localizedAlternates(locale as Locale, PAGE_PATH);
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alt,
    openGraph: {
      title: t("ogTitle"),
      description: t("metaDescription"),
      url: alt.canonical,
      type: "website",
      siteName: "'BallersHub",
      locale: OG_LOCALE[locale as Locale] ?? "es_AR",
    },
  };
}

export default async function AgenciesPage() {
  const tAgencies = await getTranslations("site.agencies");
  const PAGE_NAME = tAgencies("pageName");
  const PAGE_DESCRIPTION = tAgencies("metaDescription");
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
