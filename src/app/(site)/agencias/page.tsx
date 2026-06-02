// /agencias — public, crawlable directory of every approved agency.
//
// Same purpose as /jugadores: agency portfolios (/agency/<slug>) were
// orphan pages reachable only through sitemap.xml, a prime cause of
// "Discovered – currently not indexed". This page links to each approved
// agency with a plain crawlable <a href>, giving Googlebot an internal
// path in. Approval is the editorial bar, so there's no thin-content
// gate here — `getIndexableAgencies()` returns every approved agency.

import type { Metadata } from "next";
import Link from "next/link";

import { getIndexableAgencies } from "@/lib/seo/indexable-profiles";
import { DirectoryJsonLd, type DirectoryItem } from "@/lib/seo/directoryJsonLd";

// Hourly ISR — same cadence as the sitemap and agency pages. New
// approvals surface within the hour and an edit busts this path via
// `revalidateAgencyPublicProfile`.
export const revalidate = 3600;

const PAGE_PATH = "/agencias";
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

export default async function AgenciasIndexPage() {
  let agencies: Awaited<ReturnType<typeof getIndexableAgencies>> = [];
  try {
    agencies = await getIndexableAgencies();
  } catch (err) {
    // Degrade to an empty state rather than 500 the directory.
    console.error("[/agencias] failed to load agencies:", err);
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

      <header className="mb-10 space-y-3">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          Directorio
        </span>
        <h1 className="font-bh-display text-4xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-5xl">
          Agencias de representación
        </h1>
        <p className="max-w-2xl text-sm leading-[1.6] text-bh-fg-3 md:text-base">
          {PAGE_DESCRIPTION}
        </p>
        {agencies.length > 0 && (
          <p className="text-sm text-bh-fg-3">
            {agencies.length} {agencies.length === 1 ? "agencia" : "agencias"}
          </p>
        )}
      </header>

      {agencies.length === 0 ? (
        <div className="rounded-bh-lg border border-dashed border-bh-fg-4 bg-bh-surface-1 p-10 text-center">
          <p className="font-bh-display text-2xl font-bold uppercase tracking-tight text-bh-fg-2">
            Todavía no hay agencias publicadas
          </p>
          <p className="mt-2 text-sm text-bh-fg-3">
            Volvé pronto: las agencias verificadas aparecen acá apenas se aprueban.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/agency/${a.slug}`}
                className="group flex h-full flex-col rounded-bh-lg border border-bh-fg-4 bg-bh-surface-1 p-4 transition-colors hover:border-bh-lime/40 hover:bg-bh-surface-2"
              >
                <span className="font-semibold text-bh-fg-1 transition-colors group-hover:text-bh-lime">
                  {a.name}
                </span>
                <span className="mt-1 text-sm text-bh-fg-3">
                  Ver cartera de jugadores
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
