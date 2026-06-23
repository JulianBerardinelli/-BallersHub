// /players — public scouting station + crawlable player directory.
//
// Two layers in one route (the architecture that lets the rich UX and the SEO
// fix coexist):
//
//   1. SEO layer (server-rendered, always in the HTML): the JSON-LD ItemList
//      + the dense table, whose rows are real <Link href="/<slug>"> anchors.
//      That's the internal-link surface PR #135 introduced to kill "Discovered
//      – currently not indexed". The directory itself lists EVERY public
//      profile (Free included, no Pro tag), but the JSON-LD ItemList is kept on
//      the `isPlayerIndexable` subset — same predicate as the sitemap — so the
//      structured data never drifts from what we ask Google to index.
//
//   2. Experience layer (client island): filters, sort, and the decorative
//      globe (`ssr: false`) hydrate on top. The table links are present in the
//      first paint regardless of JS.
//
// Implements the Claude Design `/scouting` handoff, Phase 1 (no geo pins —
// see DISEÑO.md / INTEGRACION.md for the phased plan).

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getScoutingPlayers } from "@/lib/scouting/data";
import { ScoutingExperience } from "@/components/scouting/ScoutingExperience";
import { DirectoryJsonLd, type DirectoryItem } from "@/lib/seo/directoryJsonLd";
import { localizedAlternates } from "@/lib/seo/hreflang";
import { OG_LOCALE } from "@/i18n/config";
import type { Locale } from "@/i18n/routing";

// Hourly ISR — same cadence as the sitemap and the profile pages. New approved
// profiles surface within the hour; a profile edit busts this path immediately
// via `revalidatePlayerPublicProfile`.
export const revalidate = 3600;

const PAGE_PATH = "/players";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("scouting");
  // Self-canonical per locale + hreflang (agrees with sitemapLanguages("/players")).
  const alt = localizedAlternates(locale as Locale, PAGE_PATH);
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: alt,
    openGraph: {
      title: t("meta.ogTitle"),
      description: t("meta.description"),
      url: alt.canonical,
      type: "website",
      siteName: "'BallersHub",
      locale: OG_LOCALE[locale as Locale] ?? "es_AR",
    },
  };
}

export default async function PlayersScoutingPage() {
  const t = await getTranslations("scouting");

  // Show the FULL public directory — Free profiles included (no Pro tag), even
  // the thin-bio ones the sitemap doesn't index.
  const players = await getScoutingPlayers({ includeNonIndexable: true }).catch(
    (err) => {
      // Never let a DB hiccup 500 the page — degrade to an empty experience.
      console.error("[/players] failed to load players:", err);
      return [];
    },
  );

  // …but the JSON-LD ItemList stays on the INDEXABLE subset, so the structured
  // data keeps matching the sitemap (linking a thin Free profile is fine;
  // advertising it as indexable structured data would reintroduce drift).
  const jsonLdItems: DirectoryItem[] = players
    .filter((p) => p.indexable)
    .map((p) => ({ url: `/${p.slug}`, name: p.name }));

  return (
    <>
      <DirectoryJsonLd
        path={PAGE_PATH}
        name={t("meta.collectionName")}
        description={t("meta.description")}
        items={jsonLdItems}
      />
      <ScoutingExperience players={players} />
    </>
  );
}
