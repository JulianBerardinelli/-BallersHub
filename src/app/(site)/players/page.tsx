// /players — public scouting station + crawlable player directory.
//
// Two layers in one route (the architecture that lets the rich UX and the SEO
// fix coexist):
//
//   1. SEO layer (server-rendered, always in the HTML): the JSON-LD ItemList
//      + the dense table, whose rows are real <Link href="/<slug>"> anchors.
//      That's the internal-link surface PR #135 introduced to kill "Discovered
//      – currently not indexed". `getScoutingPlayers()` gates on the exact same
//      `isPlayerIndexable` predicate as the sitemap, so the set never drifts.
//
//   2. Experience layer (client island): filters, sort, and the decorative
//      globe (`ssr: false`) hydrate on top. The table links are present in the
//      first paint regardless of JS.
//
// Implements the Claude Design `/scouting` handoff, Phase 1 (no geo pins —
// see DISEÑO.md / INTEGRACION.md for the phased plan).

import type { Metadata } from "next";

import { getScoutingPlayers } from "@/lib/scouting/data";
import { ScoutingExperience } from "@/components/scouting/ScoutingExperience";
import { DirectoryJsonLd, type DirectoryItem } from "@/lib/seo/directoryJsonLd";

// Hourly ISR — same cadence as the sitemap and the profile pages. New approved
// profiles surface within the hour; a profile edit busts this path immediately
// via `revalidatePlayerPublicProfile`.
export const revalidate = 3600;

const PAGE_PATH = "/players";
const PAGE_NAME = "Jugadores";
const PAGE_DESCRIPTION =
  "Mapa del talento: explorá futbolistas con perfil verificado en 'BallersHub. Filtrá por posición, nacionalidad, edad, altura, pie y situación contractual, y abrí el portfolio completo de cada jugador.";

export const metadata: Metadata = {
  title: "Jugadores validados",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: "Jugadores validados · 'BallersHub",
    description: PAGE_DESCRIPTION,
    url: PAGE_PATH,
    type: "website",
    siteName: "'BallersHub",
    locale: "es_AR",
  },
};

export default async function PlayersScoutingPage() {
  const players = await getScoutingPlayers().catch((err) => {
    // Never let a DB hiccup 500 the page — degrade to an empty experience.
    console.error("[/players] failed to load players:", err);
    return [];
  });

  const jsonLdItems: DirectoryItem[] = players.map((p) => ({
    url: `/${p.slug}`,
    name: p.name,
  }));

  return (
    <>
      <DirectoryJsonLd
        path={PAGE_PATH}
        name={PAGE_NAME}
        description={PAGE_DESCRIPTION}
        items={jsonLdItems}
      />
      <ScoutingExperience players={players} />
    </>
  );
}
