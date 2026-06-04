// /agencies — the verified-agencies grid. This is the SEO internal-link
// surface: every card is a real <Link href="/agency/<slug>"> server-rendered in
// the initial HTML, turning agency portfolios into linked-from pages (the same
// job the flat directory did, kept inside the marketing landing).

import Link from "next/link";

import type { DirectoryAgency } from "@/lib/agencies/directory";

export function AgencyGrid({ agencies }: { agencies: DirectoryAgency[] }) {
  return (
    <section id="agencias" className="scroll-mt-28 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
            Directorio
          </span>
          <h2 className="font-bh-display text-2xl font-bold uppercase tracking-tight text-bh-fg-1 md:text-3xl">
            Agencias verificadas
          </h2>
        </div>
        {agencies.length > 0 && (
          <span className="text-sm text-bh-fg-3">
            {agencies.length} {agencies.length === 1 ? "agencia" : "agencias"}
          </span>
        )}
      </header>

      {agencies.length === 0 ? (
        <div className="rounded-bh-lg border border-dashed border-bh-fg-4 bg-bh-surface-1 p-10 text-center">
          <p className="font-bh-display text-2xl font-bold uppercase tracking-tight text-bh-fg-2">
            Todavía no hay agencias publicadas
          </p>
          <p className="mt-2 text-sm text-bh-fg-3">
            Volvé pronto: las agencias verificadas aparecen acá apenas se
            aprueban.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((a) => (
            <li key={a.slug}>
              <AgencyCard agency={a} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AgencyCard({ agency }: { agency: DirectoryAgency }) {
  const location =
    agency.headquarters?.trim() ||
    agency.operativeCountries?.find((c) => c?.trim())?.trim() ||
    null;
  const blurb = agency.tagline?.trim() || agency.description?.trim() || null;

  return (
    <Link
      href={`/agency/${agency.slug}`}
      className="bh-card-lift group flex h-full flex-col gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5 transition-colors hover:border-bh-lime/40"
    >
      <div className="flex items-center gap-3">
        {agency.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agency.logoUrl}
            alt={`Logo de ${agency.name}`}
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-bh-md border border-white/[0.08] bg-bh-black object-contain"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-bh-md border border-white/[0.08] bg-bh-black font-bh-display text-lg font-bold uppercase text-bh-fg-3">
            {agency.name.slice(0, 2)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-bh-heading text-base font-bold text-bh-fg-1 transition-colors group-hover:text-bh-lime">
            {agency.name}
          </h3>
          {location && (
            <p className="mt-0.5 truncate text-xs text-bh-fg-3">{location}</p>
          )}
        </div>
      </div>

      {blurb && (
        <p className="line-clamp-2 text-sm leading-[1.55] text-bh-fg-3">
          {blurb}
        </p>
      )}

      <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-bh-fg-2 transition-colors group-hover:text-bh-lime">
        Ver cartera de jugadores
        <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
