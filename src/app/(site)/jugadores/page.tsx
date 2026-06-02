// /jugadores — public, crawlable directory of every indexable player.
//
// This page exists to fix "Discovered – currently not indexed": player
// portfolios used to be reachable ONLY via sitemap.xml, which makes them
// orphan pages from Google's perspective (no internal links pointing in).
// Orphan + young domain = stuck in the crawl queue. This index links to
// every indexable profile with a plain crawlable <a href>, turning each
// orphan into a linked page and giving Googlebot a clear path to follow.
//
// "Indexable" is decided by the shared `getIndexablePlayers()` helper so
// this page, the sitemap, and each profile's robots meta never disagree
// (thin Free profiles are excluded here exactly as they're noindexed on
// their own page).

import type { Metadata } from "next";
import Link from "next/link";

import { getIndexablePlayers } from "@/lib/seo/indexable-profiles";
import { formatPlayerPositions } from "@/lib/format";
import { DirectoryJsonLd, type DirectoryItem } from "@/lib/seo/directoryJsonLd";

// Hourly ISR — same cadence as the sitemap and the profile pages. New
// approved profiles surface within the hour, and a profile edit busts
// this path immediately via `revalidatePlayerPublicProfile`.
export const revalidate = 3600;

const PAGE_PATH = "/jugadores";
const PAGE_NAME = "Jugadores";
const PAGE_DESCRIPTION =
  "Directorio de futbolistas con perfil profesional verificado en 'BallersHub. Trayectoria, posición y club actual de cada jugador, con acceso a su portfolio completo.";

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

export default async function JugadoresIndexPage() {
  let players: Awaited<ReturnType<typeof getIndexablePlayers>> = [];
  try {
    players = await getIndexablePlayers();
  } catch (err) {
    // Never let a DB hiccup 500 the directory — degrade to an empty
    // state. A reachable empty page beats a broken internal-link hub.
    console.error("[/jugadores] failed to load players:", err);
  }

  const jsonLdItems: DirectoryItem[] = players.map((p) => ({
    url: `/${p.slug}`,
    name: p.fullName,
  }));

  return (
    <>
      <DirectoryJsonLd
        path={PAGE_PATH}
        name={PAGE_NAME}
        description={PAGE_DESCRIPTION}
        items={jsonLdItems}
      />

      <header className="mb-10 space-y-3">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          Directorio
        </span>
        <h1 className="font-bh-display text-4xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-5xl">
          Jugadores validados
        </h1>
        <p className="max-w-2xl text-sm leading-[1.6] text-bh-fg-3 md:text-base">
          {PAGE_DESCRIPTION}
        </p>
        {players.length > 0 && (
          <p className="text-sm text-bh-fg-3">
            {players.length} {players.length === 1 ? "perfil" : "perfiles"}
          </p>
        )}
      </header>

      {players.length === 0 ? (
        <div className="rounded-bh-lg border border-dashed border-bh-fg-4 bg-bh-surface-1 p-10 text-center">
          <p className="font-bh-display text-2xl font-bold uppercase tracking-tight text-bh-fg-2">
            Todavía no hay perfiles publicados
          </p>
          <p className="mt-2 text-sm text-bh-fg-3">
            Volvé pronto: los jugadores validados aparecen acá apenas se aprueban.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => {
            const positions =
              p.positions && p.positions.length > 0
                ? formatPlayerPositions(p.positions)
                : null;
            const meta = [positions, p.currentClub].filter(Boolean).join(" · ");
            return (
              <li key={p.slug}>
                <Link
                  href={`/${p.slug}`}
                  className="group flex h-full flex-col rounded-bh-lg border border-bh-fg-4 bg-bh-surface-1 p-4 transition-colors hover:border-bh-lime/40 hover:bg-bh-surface-2"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-bh-fg-1 transition-colors group-hover:text-bh-lime">
                      {p.fullName}
                    </span>
                    {p.isPro && (
                      <span className="rounded bg-bh-lime/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bh-lime">
                        Pro
                      </span>
                    )}
                  </span>
                  {meta && (
                    <span className="mt-1 text-sm text-bh-fg-3">{meta}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
