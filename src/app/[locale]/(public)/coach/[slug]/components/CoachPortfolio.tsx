// Coach public portfolio — v1 "sober" layout (server component).
//
// Deliberately a clean, semantic, server-rendered dossier (no framer-motion /
// scrolljacking yet — that premium Pro layout is a later design handoff). Every
// load-bearing fact is real TEXT in the initial HTML so search and AI engines
// can extract self-contained passages (GEO citability): "{Nombre} dirige a
// {Club} desde {año}", "Posee la licencia {X} (emitida por {Y}, {año})", etc.
//
// Tier: Free shows the core dossier; Pro additionally surfaces the methodology
// analysis and the verified-licenses block with an emphasis treatment.

import Image from "next/image";
import { getTranslations } from "next-intl/server";

export type CoachCareerRow = {
  id: string;
  club: string;
  roleTitle: string | null;
  division: string | null;
  startYear: number | null;
  endYear: number | null;
};

export type CoachHonourRow = {
  id: string;
  title: string;
  competition: string | null;
  season: string | null;
};

export type CoachLicenseRow = {
  id: string;
  title: string;
  issuer: string | null;
  year: number | null;
};

export type CoachLinkRow = { label: string | null; url: string; kind: string };

export type CoachPortfolioData = {
  fullName: string;
  roleTitle: string | null;
  avatarUrl: string;
  nationality: string[] | null;
  birthDate: string | null;
  currentClub: string | null;
  coachingSince: number | null;
  bio: string | null;
  playingStyle: string | null;
  methodologyAnalysis: string | null;
  preferredFormations: string[] | null;
  career: CoachCareerRow[];
  honours: CoachHonourRow[];
  licenses: CoachLicenseRow[];
  links: CoachLinkRow[];
  isPro: boolean;
};

function years(r: { startYear: number | null; endYear: number | null }, present: string) {
  if (r.startYear && r.endYear) return `${r.startYear} – ${r.endYear}`;
  if (r.startYear && !r.endYear) return `${r.startYear} – ${present}`;
  if (!r.startYear && r.endYear) return `${r.endYear}`;
  return "";
}

export default async function CoachPortfolio({ data }: { data: CoachPortfolioData }) {
  const t = await getTranslations("portfolio");
  const { firstName, lastName } = splitName(data.fullName);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 text-bh-fg-1 sm:px-8 sm:py-16">
      {/* ---------- Hero ---------- */}
      <header className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:gap-7 sm:text-left">
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-bh-xl ring-1 ring-bh-lime/40 sm:h-40 sm:w-40">
          <Image
            src={data.avatarUrl}
            alt={data.fullName}
            fill
            priority
            sizes="(max-width: 640px) 128px, 160px"
            className="object-cover"
          />
        </div>
        <div>
          <h1 className="font-bh-display text-3xl font-bold uppercase leading-[0.95] tracking-[-0.02em] sm:text-4xl">
            <span className="block">{firstName}</span>
            {lastName && <span className="block text-bh-lime">{lastName}</span>}
          </h1>
          <p className="mt-2 text-sm font-medium text-bh-fg-2">
            {data.roleTitle || "Director Técnico"}
            {data.currentClub ? ` · ${data.currentClub}` : ""}
          </p>
          <p className="mt-1 text-xs text-bh-fg-4">
            {(data.nationality ?? []).join(" · ")}
            {data.coachingSince ? ` · ${t("coach.since", { year: data.coachingSince })}` : ""}
          </p>
        </div>
      </header>

      {/* ---------- Bio / ideas de juego ---------- */}
      {(data.bio || data.playingStyle) && (
        <section id="biography" className="mt-12 space-y-6">
          {data.bio && (
            <div>
              <h2 className="mb-2 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
                {t("coach.bioTitle")}
              </h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-bh-fg-2">{data.bio}</p>
            </div>
          )}
          {data.playingStyle && (
            <div>
              <h2 className="mb-2 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
                {t("coach.playingStyleTitle")}
              </h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-bh-fg-2">
                {data.playingStyle}
              </p>
            </div>
          )}
          {data.preferredFormations && data.preferredFormations.length > 0 && (
            <div>
              <h2 className="mb-2 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
                {t("coach.formationsTitle")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.preferredFormations.map((f) => (
                  <span
                    key={f}
                    className="rounded-bh-md border border-bh-lime/30 bg-bh-lime/10 px-3 py-1 text-sm font-semibold text-bh-lime"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------- Análisis metodológico (Pro) ---------- */}
      {data.isPro && data.methodologyAnalysis && (
        <section id="methodology" className="mt-12">
          <h2 className="mb-2 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
            {t("coach.methodologyTitle")}
          </h2>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-bh-fg-2">
            {data.methodologyAnalysis}
          </p>
        </section>
      )}

      {/* ---------- Trayectoria ---------- */}
      {data.career.length > 0 && (
        <section id="career" className="mt-12">
          <h2 className="mb-4 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
            {t("coach.careerTitle")}
          </h2>
          <ol className="space-y-3">
            {data.career.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-0.5 rounded-bh-lg border border-white/[0.07] bg-bh-surface-1 p-4 sm:flex-row sm:items-baseline sm:justify-between"
              >
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-bh-display text-base font-bold">{c.club}</span>
                  {c.roleTitle && <span className="text-sm text-bh-fg-3">· {c.roleTitle}</span>}
                  {c.division && <span className="text-xs text-bh-fg-4">· {c.division}</span>}
                </span>
                <span className="text-xs font-medium tabular-nums text-bh-fg-4">
                  {years(c, t("coach.present"))}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ---------- Licencias (verificadas) ---------- */}
      {data.licenses.length > 0 && (
        <section id="licenses" className="mt-12">
          <h2 className="mb-4 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
            {t("coach.licensesTitle")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.licenses.map((l) => (
              <li
                key={l.id}
                className="rounded-bh-lg border border-bh-lime/25 bg-bh-lime/[0.06] p-4"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-bh-lime">✓</span>
                  <span className="font-bh-display text-sm font-bold">{l.title}</span>
                </div>
                <p className="mt-1 text-xs text-bh-fg-3">
                  {[l.issuer, l.year].filter(Boolean).join(" · ")}
                  <span className="ml-1 text-bh-fg-4">· {t("coach.verified")}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Palmarés ---------- */}
      {data.honours.length > 0 && (
        <section id="honours" className="mt-12">
          <h2 className="mb-4 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
            {t("coach.honoursTitle")}
          </h2>
          <ul className="space-y-2">
            {data.honours.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold text-bh-fg-1">{h.title}</span>
                {(h.competition || h.season) && (
                  <span className="text-bh-fg-4">
                    · {[h.competition, h.season].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Enlaces ---------- */}
      {data.links.length > 0 && (
        <section id="links" className="mt-12">
          <h2 className="mb-3 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
            {t("coach.linksTitle")}
          </h2>
          <div className="flex flex-wrap gap-3">
            {data.links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noreferrer nofollow"
                className="rounded-bh-md border border-white/[0.1] bg-bh-surface-1 px-4 py-2 text-sm text-bh-fg-2 transition-colors hover:border-bh-lime/40 hover:text-bh-fg-1"
              >
                {l.label || l.kind}
              </a>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-16 border-t border-white/[0.06] pt-6 text-center text-xs text-bh-fg-4">
        {t("coach.footerVerified")}
      </footer>
    </main>
  );
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: full, lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
