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
import CoachLicenseList from "./CoachLicenseList";
import type { StaffRoleType } from "@/lib/staff/roles";
import type { PitchBoard } from "@/lib/coach/game-ideas";

// Idea de juego approved para el render público (Pro + DT). El pitch_board ya
// viene parseado a PitchBoard válido. Ver docs/staff/PLAN.md §5.2.
export type CoachGameIdeaRow = {
  id: string;
  title: string | null;
  formation: string | null;
  blurb: string | null;
  link: string | null;
  board: PitchBoard;
};

export type CoachCareerRow = {
  id: string;
  club: string;
  roleTitle: string | null;
  // Roles estructurados de la etapa (enum). `roleLabels` ya viene localizado
  // (resuelto en el server con el namespace `staff`) para render directo de chips.
  roles: StaffRoleType[];
  roleLabels: string[];
  division: string | null;
  startYear: number | null;
  endYear: number | null;
  // Escudo + Transfermarkt del club de la etapa (P1.3, vía leftJoin con teams).
  // null cuando la etapa no tiene team linkeado (club legacy en texto) o el club
  // no tiene escudo http(s)/TM cargado. El render cae al placeholder con inicial.
  crestUrl: string | null;
  teamTransfermarktUrl: string | null;
};

export type CoachHonourRow = {
  id: string;
  title: string;
  competition: string | null;
  season: string | null;
  // P1.2 — logros por etapa con video. `careerLabel` ya viene resuelto en el
  // server (club de la etapa); NULL si el logro no está vinculado a una etapa.
  description: string | null;
  careerItemId: string | null;
  careerLabel: string | null;
  videoUrl: string | null;
};

export type CoachLicenseRow = {
  id: string;
  title: string;
  issuer: string | null;
  year: number | null;
  docUrl: string | null;
};

export type CoachLinkRow = { label: string | null; url: string; kind: string };

// Módulo Metodología (universal, todos los oficios). Sólo se pasan rubros
// approved; los docs sólo en Pro (Free los descarta). Ver docs/staff/PLAN.md §5.
export type CoachMethodologyDocRow = {
  id: string;
  url: string;
  title: string | null;
  mime: "pdf" | "ppt" | "pptx" | "file";
};
export type CoachMethodologyRubroRow = {
  id: string;
  title: string;
  icon: string | null;
  body: string | null;
  docs: CoachMethodologyDocRow[];
};

export type CoachStatRow = {
  id: string;
  season: string;
  team: string | null;
  competition: string | null;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type CoachMediaRow = {
  id: string;
  type: "photo" | "video" | "doc";
  url: string;
  title: string | null;
};

// Press notes (coach_articles). Shape mirrors the player ProfilePressNotesModule
// `Article` so the agnostic press component can consume it directly.
export type CoachArticleRow = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  publisher: string | null;
  publishedAt: string | null;
  position: number | null;
};

// Personal details surfaced to the Pro contact module (WhatsApp + show toggle)
// and any future "personal" facts. Mirrors the relevant coach_personal_details
// columns; everything optional/nullable so a coach without a row renders fine.
export type CoachPersonalDetailsData = {
  whatsapp: string | null;
  showContactSection: boolean;
  languages: string[] | null;
  education: string | null;
  residenceCity: string | null;
  residenceCountry: string | null;
  residenceCountryCode: string | null;
};

export type CoachRecord = {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  winPct: number;
  goalDiff: number;
};

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

// Aggregate a coach's season rows into a single career record. Percentages are
// derived here (D6: stored as counts, computed in the front) — this runs in the
// server component, so the citable record passage is real text in the initial
// HTML for GEO.
export function computeCoachRecord(rows: CoachStatRow[]): CoachRecord | null {
  if (rows.length === 0) return null;
  const acc = rows.reduce(
    (a, r) => ({
      matches: a.matches + (r.matches || 0),
      wins: a.wins + (r.wins || 0),
      draws: a.draws + (r.draws || 0),
      losses: a.losses + (r.losses || 0),
      goalsFor: a.goalsFor + (r.goalsFor || 0),
      goalsAgainst: a.goalsAgainst + (r.goalsAgainst || 0),
    }),
    { matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
  );
  return { ...acc, winPct: pct(acc.wins, acc.matches), goalDiff: acc.goalsFor - acc.goalsAgainst };
}

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
  stats: CoachStatRow[];
  record: CoachRecord | null;
  honours: CoachHonourRow[];
  licenses: CoachLicenseRow[];
  media: CoachMediaRow[];
  links: CoachLinkRow[];
  isPro: boolean;
  // Roles estructurados del staff. `roleDisplay` es el label combinado
  // (principal · secundarios) ya resuelto en el server (es nativo).
  primaryRole: StaffRoleType | null;
  secondaryRoles: StaffRoleType[] | null;
  roleDisplay: string | null;
  // false SÓLO cuando el rol principal es un oficio NO-DT conocido → oculta
  // ideas de juego / formaciones. null (perfil sin rol estructurado todavía) →
  // true, para no romper coaches legacy/nuevos. Ver src/lib/staff/roles.ts.
  showTactical: boolean;
  // Rubros de metodología approved (universal). Free recibe ≤2 sin docs.
  methodology: CoachMethodologyRubroRow[];
  // Datos personales públicos (residencia/educación/idiomas). Sólo se setean
  // si el coach completó coach_personal_details; Free los muestra como
  // DataRows en la ficha §01. show_contact_section y otros campos privados
  // viven sólo en el Pro layout (CoachContactModule).
  publicPersonalDetails: {
    residence: string | null;
    education: string | null;
    languages: string[] | null;
  } | null;
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
  const photos = data.media.filter((m) => m.type === "photo");
  const videos = data.media.filter((m) => m.type === "video");

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
            {data.roleTitle || "Cuerpo Técnico"}
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

      {/* ---------- Estadísticas / record (D6) ---------- */}
      {data.record && data.record.matches > 0 && (
        <section id="stats" className="mt-12">
          <h2 className="mb-4 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
            {t("coach.statsTitle")}
          </h2>

          {/* Citable record passage — real text for GEO. */}
          <p className="mb-5 text-[15px] leading-relaxed text-bh-fg-2">
            {t("coach.recordSummary", {
              name: data.fullName,
              matches: data.record.matches,
              winRate: data.record.winPct,
              wins: data.record.wins,
              draws: data.record.draws,
              losses: data.record.losses,
            })}
          </p>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <StatTile label={t("coach.recordMatches")} value={data.record.matches} />
            <StatTile label={t("coach.recordWins")} value={data.record.wins} />
            <StatTile label={t("coach.recordDraws")} value={data.record.draws} />
            <StatTile label={t("coach.recordLosses")} value={data.record.losses} />
            <StatTile label={t("coach.recordWinRate")} value={`${data.record.winPct}%`} accent />
            <StatTile
              label={t("coach.recordGoals")}
              value={`${data.record.goalsFor}/${data.record.goalsAgainst}`}
            />
          </div>

          {data.stats.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/[0.1] text-left text-[11px] uppercase tracking-[0.06em] text-bh-fg-4">
                    <th className="py-2 pr-3 font-semibold">{t("coach.seasonLabel")}</th>
                    <th className="px-2 py-2 text-center font-semibold">{t("coach.abbrMatches")}</th>
                    <th className="px-2 py-2 text-center font-semibold">{t("coach.abbrWins")}</th>
                    <th className="px-2 py-2 text-center font-semibold">{t("coach.abbrDraws")}</th>
                    <th className="px-2 py-2 text-center font-semibold">{t("coach.abbrLosses")}</th>
                    <th className="px-2 py-2 text-center font-semibold">{t("coach.abbrWinRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stats.map((s) => (
                    <tr key={s.id} className="border-b border-white/[0.05]">
                      <td className="py-2 pr-3">
                        <span className="font-semibold text-bh-fg-1">{s.season}</span>
                        {s.team && <span className="text-bh-fg-4"> · {s.team}</span>}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-bh-fg-2">{s.matches}</td>
                      <td className="px-2 py-2 text-center tabular-nums text-bh-fg-2">{s.wins}</td>
                      <td className="px-2 py-2 text-center tabular-nums text-bh-fg-2">{s.draws}</td>
                      <td className="px-2 py-2 text-center tabular-nums text-bh-fg-2">{s.losses}</td>
                      <td className="px-2 py-2 text-center tabular-nums font-semibold text-bh-lime">
                        {pct(s.wins, s.matches)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ---------- Licencias (verificadas) ---------- */}
      {data.licenses.length > 0 && (
        <section id="licenses" className="mt-12">
          <h2 className="mb-4 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
            {t("coach.licensesTitle")}
          </h2>
          <CoachLicenseList
            licenses={data.licenses.map((l) => ({
              id: l.id,
              title: l.title,
              issuer: l.issuer,
              year: l.year,
              docUrl: l.docUrl,
            }))}
            verifiedLabel={t("coach.verified")}
          />
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

      {/* ---------- Multimedia ---------- */}
      {data.media.length > 0 && (
        <section id="media" className="mt-12">
          <h2 className="mb-4 font-bh-display text-xs font-bold uppercase tracking-[0.08em] text-bh-fg-4">
            {t("coach.mediaTitle")}
          </h2>
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((m) => (
                <div
                  key={m.id}
                  className="relative aspect-[4/3] overflow-hidden rounded-bh-lg border border-white/[0.07] bg-bh-surface-1"
                >
                  <Image
                    src={m.url}
                    alt={m.title ?? data.fullName}
                    fill
                    sizes="(max-width: 640px) 50vw, 280px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          {videos.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {videos.map((m) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="flex items-center gap-2 rounded-bh-lg border border-white/[0.1] bg-bh-surface-1 px-4 py-3 text-sm text-bh-fg-2 transition-colors hover:border-bh-lime/40 hover:text-bh-fg-1"
                >
                  <span aria-hidden className="text-bh-lime">▶</span>
                  <span className="truncate">{m.title || t("coach.videoFallback")}</span>
                </a>
              ))}
            </div>
          )}
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

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-bh-lg border border-white/[0.07] bg-bh-surface-1 p-3 text-center">
      <p
        className={`font-bh-display text-xl font-bold tabular-nums ${
          accent ? "text-bh-lime" : "text-bh-fg-1"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase leading-tight tracking-[0.06em] text-bh-fg-4">
        {label}
      </p>
    </div>
  );
}
