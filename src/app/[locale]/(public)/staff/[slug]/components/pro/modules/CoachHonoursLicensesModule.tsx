"use client";

// Pro coach — Licences + honours (#honours). Two themed sub-blocks under one
// section eyebrow:
//   1. Verified-licence cards (reusing CoachLicenseList, themed per-coach via
//      `accent` — federation logos + in-app document modal).
//   2. Palmarés grid with the PLAYER-level honour treatment: gold/medal cards,
//      trophy vs star badge (isHonourTrophy heuristic), and a per-item reveal
//      stagger so the block animates in like the player's career honours.
// Renders nothing when there are neither licences nor honours.

import { Section, SubLabel, Reveal } from "./_shared";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import CoachLicenseList from "../../CoachLicenseList";
import type { CoachLicenseRow, CoachHonourRow } from "../../CoachPortfolio";

export type CoachHonoursLicensesModuleProps = {
  licenses: CoachLicenseRow[];
  honours: CoachHonourRow[];
  accent: string;
};

export default function CoachHonoursLicensesModule({
  licenses,
  honours,
  accent,
}: CoachHonoursLicensesModuleProps) {
  const t = useTranslations("portfolio");

  if (licenses.length === 0 && honours.length === 0) return null;

  return (
    <Section id="honours" title={t("coach.honoursTitle")} accent={accent}>
      {/* ---------- Verified licences ---------- */}
      {licenses.length > 0 && (
        <Reveal className="mb-3">
          <SubLabel accent={accent}>{t("coach.licensesTitle")}</SubLabel>
        </Reveal>
      )}
      {licenses.length > 0 && (
        <CoachLicenseList
          licenses={licenses.map((l) => ({
            id: l.id,
            title: l.title,
            issuer: l.issuer,
            year: l.year,
            docUrl: l.docUrl,
          }))}
          verifiedLabel={t("coach.verified")}
          accent={accent}
        />
      )}

      {/* ---------- Palmarés ---------- */}
      {honours.length > 0 && (
        <div className={licenses.length > 0 ? "mt-10" : ""}>
          <Reveal className="mb-3">
            <SubLabel accent={accent}>{t("coach.honoursTitle")}</SubLabel>
          </Reveal>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {honours.map((h, i) => (
              <HonourCard key={h.id} honour={h} index={i} accent={accent} />
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

// Gold/medal honour card — same visual language as the player's career honours
// (yellow gradient, trophy vs star badge). P1.2: muestra la etapa vinculada
// (careerLabel), la descripción y un botón de video opcional (abre el clip).
function HonourCard({
  honour,
  index,
  accent,
}: {
  honour: CoachHonourRow;
  index: number;
  accent: string;
}) {
  const isTrophy = isHonourTrophy(honour.title);
  const meta = [honour.competition, honour.season, honour.careerLabel].filter(Boolean).join(" • ");

  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.36), ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col gap-2 rounded-xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-transparent px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-bh-display text-sm font-bold uppercase tracking-wide text-yellow-500">
            {honour.title}
          </span>
          {meta && (
            <span className="truncate font-body text-[11px] font-semibold uppercase tracking-wider text-yellow-500/50">
              {meta}
            </span>
          )}
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
          {isTrophy ? (
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2L15 8H9L12 2Z" />
              <path d="M19 8H5V10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10V8Z" />
              <path d="M11 17V20H8V22H16V20H13V17H11Z" />
              <path d="M5 8C3.34315 8 2 9.34315 2 11C2 12.6569 3.34315 14 5 14V8Z" />
              <path d="M19 8C20.6569 8 22 9.34315 22 11C22 12.6569 20.6569 14 19 14V8Z" />
            </svg>
          ) : (
            <svg className="size-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          )}
        </span>
      </div>

      {honour.description && (
        <p className="font-body text-[12px] leading-relaxed text-white/60">{honour.description}</p>
      )}

      {honour.videoUrl && (
        <a
          href={honour.videoUrl}
          target="_blank"
          rel="noreferrer nofollow"
          className="inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ color: accent }}
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          Ver video
        </a>
      )}
    </motion.li>
  );
}

// Mirror of the player's isHonourTrophy heuristic: titles evoking a title/cup
// get the trophy glyph, everything else a star (kept independent so the player
// module stays untouched).
function isHonourTrophy(title: string) {
  const t = title.toLowerCase();
  return (
    t.includes("campeón") ||
    t.includes("campeon") ||
    t.includes("copa") ||
    t.includes("oro") ||
    t.includes("1er") ||
    t.includes("primero") ||
    t.includes("ganador") ||
    t.includes("ascenso") ||
    t.includes("trofeo") ||
    t.includes("liga") ||
    t.includes("champion") ||
    t.includes("medalla")
  );
}
