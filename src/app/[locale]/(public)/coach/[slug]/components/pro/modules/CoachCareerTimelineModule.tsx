"use client";

// Pro coach — Career timeline + season record (#career). A premium port of the
// player's CareerTimelineModule: vertical zig-zag on mobile, a pinned
// scroll-jack node timeline on desktop, CountUp stat tiles per stage (DT
// metrics: PJ / G / E / P / %Vict) and a global honours grid with a HonourModal.
//
// Adaptation notes vs the player:
//  - The player carries `startDate`/`endDate` (full dates) + a divisions catalog
//    with crests + per-item honours. The coach carries `startYear`/`endYear`
//    (numbers) + plain `roleTitle`/`division` strings + a GLOBAL honours list.
//  - Player stats are PJ/Titular/Minutos/Goles/Asist; the coach's are per-season
//    W/D/L which we aggregate per stage by matching `stat.team` to the stage's
//    `club` (best-effort, case-insensitive), falling back to none.
//  - There is no team crest / division catalog / external sport links for the
//    coach, so those decorative arms are dropped.

import React, { useMemo, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  animate,
  AnimatePresence,
} from "framer-motion";
import { useLenis } from "lenis/react";
import { useTranslations } from "next-intl";
import CountUp from "@/components/ui/CountUp";
import BioAnimatedBackground from "@/app/[locale]/(public)/[slug]/components/modules/BioAnimatedBackground";
import type { CoachCareerRow, CoachStatRow, CoachHonourRow } from "../../CoachPortfolio";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type CoachCareerTimelineModuleProps = {
  career: CoachCareerRow[];
  stats: CoachStatRow[];
  honours?: CoachHonourRow[];
  accent: string;
};

type CoachRecordTotals = {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

type StageData = CoachCareerRow & {
  isCurrent: boolean;
  totals: CoachRecordTotals;
  winPct: number;
  hasStats: boolean;
};

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// ------------------------------------------------------------
// Root
// ------------------------------------------------------------

export default function CoachCareerTimelineModule({
  career,
  stats,
  honours = [],
  accent,
}: CoachCareerTimelineModuleProps) {
  // Sort newest → oldest. Stages without a startYear bubble to the top
  // (treated as "current / ongoing"), mirroring the player module.
  const sortedCareer = useMemo(
    () =>
      [...career].sort((a, b) => {
        if (a.startYear == null) return -1;
        if (b.startYear == null) return 1;
        return b.startYear - a.startYear;
      }),
    [career],
  );

  const [selectedHonour, setSelectedHonour] = useState<CoachHonourRow | null>(null);

  if (sortedCareer.length === 0 && stats.length === 0 && honours.length === 0) {
    return null;
  }

  return (
    <div className="w-full relative font-sans" id="career">
      <AnimatePresence>
        {selectedHonour && (
          <HonourModal honour={selectedHonour} accent={accent} onClose={() => setSelectedHonour(null)} />
        )}
      </AnimatePresence>

      {sortedCareer.length > 0 && (
        <>
          {/* MOBILE TIMELINE — vertical zig-zag, visible < lg */}
          <div className="block lg:hidden w-full relative py-16 pl-3 pr-4">
            <BioAnimatedBackground />
            <CareerHeader mobile />
            <div className="relative z-10">
              <div className="absolute top-0 bottom-0 left-[12px] w-[2px] bg-white/10 rounded-full" />
              <div className="flex flex-col gap-8 relative w-full">
                {sortedCareer.map((item, index) => {
                  const nodeData = prepareStage(item, index, stats);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                      className="relative w-full flex items-center pl-[28px]"
                    >
                      <div
                        className="absolute left-[12px] w-4 h-4 rounded-full -translate-x-1/2 z-10"
                        style={{ backgroundColor: accent, boxShadow: `0 0 15px ${accent}` }}
                      >
                        <div className="absolute inset-[3px] rounded-full bg-black/50" />
                      </div>
                      <MobileTimelineCard nodeData={nodeData} accent={accent} />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DESKTOP TIMELINE — pinned scroll-jack nodes, visible >= lg */}
          <div className="hidden lg:block w-full">
            <DesktopNodesTimeline sortedCareer={sortedCareer} stats={stats} accent={accent} />
          </div>
        </>
      )}

      {/* GLOBAL HONOURS — coach palmarés (data.honours has no per-item link). */}
      {honours.length > 0 && (
        <div className="relative w-full px-5 pb-16 sm:px-8 lg:px-0 lg:max-w-[1240px] lg:mx-auto">
          <HonoursGrid honours={honours} accent={accent} onSelectHonour={setSelectedHonour} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Header
// ------------------------------------------------------------

function CareerHeader({ mobile }: { mobile?: boolean }) {
  const t = useTranslations("portfolio");
  if (mobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative z-10 w-full mb-12 flex flex-col"
      >
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--theme-accent)] mb-2">
          {t("modules.career.eyebrow")}
        </h2>
        <h3 className="text-3xl font-black font-bh-heading text-white uppercase drop-shadow-lg leading-none">
          {t("coach.careerTitle")}
        </h3>
      </motion.div>
    );
  }
  return null;
}

// ------------------------------------------------------------
// Desktop pinned scroll-jack node timeline
// ------------------------------------------------------------

function DesktopNodesTimeline({
  sortedCareer,
  stats,
  accent,
}: {
  sortedCareer: CoachCareerRow[];
  stats: CoachStatRow[];
  accent: string;
}) {
  const t = useTranslations("portfolio");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const progressBarWidth = useTransform(scrollYProgress, [0, 1], ["100%", "0%"]);

  const [activeIndex, setActiveIndex] = useState(0);
  const isScrollingProgrammatically = useRef(false);
  const lenis = useLenis();

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (isScrollingProgrammatically.current) return;
    let idx = Math.round(latest * Math.max(sortedCareer.length - 1, 1));
    idx = Math.min(Math.max(idx, 0), sortedCareer.length - 1);
    if (idx !== activeIndex) setActiveIndex(idx);
  });

  const handleNodeClick = (index: number) => {
    if (!containerRef.current) return;
    setActiveIndex(index);
    isScrollingProgrammatically.current = true;

    const stepSize = 1 / Math.max(sortedCareer.length - 1, 1);
    const peakProgress = index * stepSize;
    const rect = containerRef.current.getBoundingClientRect();
    const absoluteTop = window.scrollY + rect.top;
    const scrollableDistance = containerRef.current.offsetHeight - window.innerHeight;
    const targetScrollY = absoluteTop + peakProgress * scrollableDistance;

    if (lenis) {
      lenis.scrollTo(targetScrollY, { duration: 1.2, lock: true });
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 1250);
    } else {
      animate(window.scrollY, targetScrollY, {
        duration: 1.2,
        ease: [0.32, 0.72, 0, 1],
        onUpdate: (latest) => window.scrollTo(0, latest),
        onComplete: () => {
          isScrollingProgrammatically.current = false;
        },
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-screen"
      style={{
        height: "450vh",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
      }}
    >
      <motion.div className="sticky top-0 h-screen w-full flex flex-col items-center overflow-hidden bg-[var(--theme-background)] z-20">
        <BioAnimatedBackground />

        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[14vh] z-[1] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, var(--theme-background) 25%, transparent 100%)" }}
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-[18vh] z-[1] pointer-events-none"
          style={{ background: "linear-gradient(to top, var(--theme-background) 25%, transparent 100%)" }}
        />

        <div
          className="w-full max-w-[1240px] px-8 flex flex-col relative z-10"
          style={{
            height: "100svh",
            paddingTop: "128px",
            paddingBottom: "0px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Header */}
          <div className="text-center shrink-0">
            <h2 className="text-[9px] font-black uppercase tracking-[0.5em] text-[var(--theme-accent)] mb-1">
              {t("modules.career.eyebrow")}
            </h2>
            <h3 className="text-3xl lg:text-4xl xl:text-5xl font-black font-bh-heading text-white uppercase drop-shadow-2xl leading-[0.9]">
              {t("coach.careerTitle")}
            </h3>
            <p className="mt-1.5 mx-auto text-white/40 font-medium text-[10px] max-w-xs leading-relaxed">
              {t("modules.career.scrollHint")}
            </p>
          </div>

          {/* CENTRAL CARD STACK */}
          <div className="relative w-full flex-1 flex items-center justify-center perspective-1000 min-h-0 pt-0 pb-1">
            {sortedCareer.map((item, index) => {
              const nodeData = prepareStage(item, index, stats);
              const isActive = index === activeIndex;
              return (
                <motion.div
                  key={item.id}
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    scale: isActive ? 1 : 0.95,
                    zIndex: isActive ? 50 : 10,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ pointerEvents: isActive ? "auto" : "none" }}
                  className="absolute w-full max-w-[750px] drop-shadow-2xl"
                >
                  <div className="w-full bg-black/40 backdrop-blur-[40px] border border-white/10 ring-1 ring-white/5 rounded-[2rem] p-5 lg:p-6 flex flex-col relative overflow-hidden shadow-[inset_0_0_60px_rgba(255,255,255,0.03)]">
                    <div
                      className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full blur-[80px] opacity-[0.12] pointer-events-none"
                      style={{ backgroundColor: accent }}
                    />

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span
                          className="w-fit px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest mb-3"
                          style={
                            nodeData.isCurrent
                              ? { backgroundColor: accent, color: "#0a0a0a" }
                              : { backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
                          }
                        >
                          {yearRange(nodeData, t("modules.career.present"))}
                        </span>
                        <h4 className="text-2xl lg:text-3xl font-black text-white uppercase leading-[1.1] max-w-[480px] text-pretty">
                          {nodeData.club}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2">
                          {nodeData.roleTitle && (
                            <span
                              className="font-bold uppercase tracking-widest text-xs"
                              style={{ color: accent }}
                            >
                              {nodeData.roleTitle}
                            </span>
                          )}
                          {nodeData.division && (
                            <span className="inline-flex items-center gap-1.5 text-white/50 font-bold uppercase tracking-widest text-[11px] before:content-['·'] before:text-white/30">
                              {nodeData.division}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {nodeData.hasStats && <CoachStatRow nodeData={nodeData} accent={accent} />}

                    {!nodeData.hasStats && (
                      <div className="mt-2 text-[10px] font-medium uppercase tracking-widest italic text-white/20">
                        {t("modules.career.noOfficialRecords")}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* BOTTOM TARGET NODES */}
          <div className="relative w-full shrink-0" style={{ height: "150px" }}>
            <div className="absolute left-0 right-0 h-[2px] bg-white/10 rounded-full" style={{ top: "24px" }} />
            <motion.div
              style={{ width: progressBarWidth, position: "absolute", top: "24px", left: 0 }}
              className="h-[2px] rounded-full overflow-hidden"
            >
              <span
                className="block h-full w-full rounded-full"
                style={{
                  background: `linear-gradient(to right, transparent, ${accent})`,
                  boxShadow: `0 0 20px ${accent}`,
                }}
              />
            </motion.div>

            {sortedCareer.map((item, index) => {
              const stepPct = (1 - index / Math.max(sortedCareer.length - 1, 1)) * 100;
              const isActive = index === activeIndex;
              const nodeData = prepareStage(item, index, stats);
              return (
                <div
                  key={index}
                  onClick={() => handleNodeClick(index)}
                  className="absolute flex flex-col items-center cursor-pointer"
                  style={{ top: "17px", left: `${stepPct}%`, transform: "translateX(-50%)" }}
                >
                  <motion.div
                    animate={{
                      scale: isActive ? 1.3 : 1,
                      backgroundColor: isActive ? accent : "#222",
                      borderColor: isActive ? "white" : "rgba(255,255,255,0.2)",
                    }}
                    whileHover={{ scale: 1.3 }}
                    transition={{ duration: 0.3 }}
                    className="w-3.5 h-3.5 rounded-full border-[3px] z-10 shadow-lg relative shrink-0"
                  >
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded-full blur-[8px] opacity-80"
                        style={{ backgroundColor: accent }}
                      />
                    )}
                  </motion.div>

                  <motion.div
                    animate={{ opacity: isActive ? 1 : 0.55 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center w-36 gap-0.5 mt-1.5"
                  >
                    <span
                      className="text-[11px] font-black uppercase tracking-widest leading-none transition-colors"
                      style={{ color: isActive ? accent : "#fff" }}
                    >
                      {nodeData.startYear ?? "—"}
                    </span>
                    <MarqueeClubTitle text={nodeData.club} isActive={isActive} accent={accent} />
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ------------------------------------------------------------
// Stat row (coach DT metrics with CountUp + win-rate donut)
// ------------------------------------------------------------

function CoachStatRow({ nodeData, accent }: { nodeData: StageData; accent: string }) {
  const t = useTranslations("portfolio");
  const { totals, winPct } = nodeData;
  const C = 125.66; // 2πr, r=20

  return (
    <div className="grid grid-cols-5 gap-0 bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
      <StatCell label={t("coach.abbrMatches")}>
        <CountUp value={totals.matches} className="text-xl lg:text-3xl text-white font-black leading-none" />
      </StatCell>

      <StatCell label={t("coach.abbrWins")} bordered>
        <CountUp value={totals.wins} className="text-xl lg:text-3xl text-white font-black leading-none" />
      </StatCell>

      <StatCell label={t("coach.abbrDraws")} bordered>
        <CountUp value={totals.draws} className="text-xl lg:text-3xl text-white font-black leading-none" />
      </StatCell>

      <StatCell label={t("coach.abbrLosses")} bordered>
        <CountUp value={totals.losses} className="text-xl lg:text-3xl text-white font-black leading-none" />
      </StatCell>

      {/* Win-rate donut keyed to the coach accent. */}
      <StatCell label={t("coach.abbrWinRate")} bordered tint={accent}>
        <div className="relative w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center mt-1">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3.5" fill="transparent" className="text-white/10" />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke={accent}
              strokeWidth="3.5"
              fill="transparent"
              strokeDasharray={C}
              strokeDashoffset={C - (winPct / 100) * C}
              className="transition-all duration-1000 ease-out"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${accent}80)` }}
            />
          </svg>
          <span className="relative flex items-baseline font-black text-white leading-none">
            <CountUp value={winPct} className="text-base lg:text-xl" />
            <span className="text-[9px] lg:text-[11px] text-white/50 ml-0.5">%</span>
          </span>
        </div>
      </StatCell>
    </div>
  );
}

function StatCell({
  label,
  bordered,
  tint,
  children,
}: {
  label: string;
  bordered?: boolean;
  tint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-3 lg:p-4 ${bordered ? "border-l border-white/5" : ""}`}
      style={tint ? { backgroundColor: `${tint}0d` } : undefined}
    >
      <span
        className="text-[9px] lg:text-[10px] uppercase font-bold tracking-widest mb-1"
        style={{ color: tint ? `${tint}cc` : "rgba(255,255,255,0.4)" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

// ------------------------------------------------------------
// Mobile card
// ------------------------------------------------------------

function MobileTimelineCard({ nodeData, accent }: { nodeData: StageData; accent: string }) {
  const t = useTranslations("portfolio");
  const { club, division, roleTitle, isCurrent, totals, winPct, hasStats } = nodeData;
  const C = 94.24; // 2πr, r=15

  return (
    <div className="w-full bg-black/40 backdrop-blur-[40px] border border-white/10 ring-1 ring-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden shadow-[inset_0_0_60px_rgba(255,255,255,0.03)]">
      <div
        className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full blur-[80px] opacity-[0.12] pointer-events-none"
        style={{ backgroundColor: accent }}
      />

      <span
        className="inline-block px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest mb-4 relative z-10"
        style={
          isCurrent
            ? { backgroundColor: accent, color: "#0a0a0a", boxShadow: `0 0 10px ${accent}` }
            : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }
        }
      >
        {yearRange(nodeData, t("modules.career.present"))}
      </span>

      <div className="flex items-start justify-between relative z-10">
        <h4 className="text-2xl font-black text-white uppercase leading-[1.1] mb-1 pr-2 text-pretty">{club}</h4>
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 border-b border-white/[0.05] pb-4 relative z-10">
        {roleTitle && (
          <span className="font-bold uppercase tracking-widest text-[10px]" style={{ color: accent }}>
            {roleTitle}
          </span>
        )}
        {division && (
          <span className="inline-flex items-center text-white/40 font-bold uppercase tracking-widest text-[10px] before:content-['·'] before:mr-1.5 before:text-white/30">
            {division}
          </span>
        )}
      </div>

      {hasStats ? (
        <div className="mt-5 grid grid-cols-6 gap-1 bg-black/40 rounded-2xl p-2 border border-white/5 overflow-hidden relative z-10">
          {/* Row 1 — PJ + win-rate donut */}
          <div className="col-span-3 flex flex-col items-center justify-center p-1">
            <span className="text-[8px] text-white/40 uppercase font-black tracking-widest text-center mb-1">
              {t("coach.abbrMatches")}
            </span>
            <CountUp value={totals.matches} className="text-xl text-white font-black leading-none" />
          </div>
          <div className="col-span-3 flex items-center justify-center p-1 border-l border-white/5">
            <div className="relative w-12 h-12 flex flex-col items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-white/10" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  stroke={accent}
                  strokeWidth="2.5"
                  fill="transparent"
                  strokeDasharray={C}
                  strokeDashoffset={C - (winPct / 100) * C}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 4px ${accent}66)` }}
                />
              </svg>
              <span className="relative flex items-baseline font-black text-white leading-none">
                <CountUp value={winPct} className="text-[13px]" />
                <span className="text-[8px] text-white/50 ml-0.5">%</span>
              </span>
              <span className="relative text-[6px] font-black uppercase tracking-[0.18em] text-white/60 mt-0.5">
                {t("coach.abbrWinRate")}
              </span>
            </div>
          </div>
          {/* Row 2 — G / E / P */}
          <div className="col-span-2 flex flex-col items-center justify-center p-1.5 border-t border-white/5">
            <span className="text-[8px] text-white/40 uppercase font-black tracking-widest text-center mb-1">
              {t("coach.abbrWins")}
            </span>
            <CountUp value={totals.wins} className="text-xl text-white font-black leading-none" />
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center p-1.5 border-t border-l border-white/5">
            <span className="text-[8px] text-white/40 uppercase font-black tracking-widest text-center mb-1">
              {t("coach.abbrDraws")}
            </span>
            <CountUp value={totals.draws} className="text-xl text-white font-black leading-none" />
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center p-1.5 border-t border-l border-white/5">
            <span className="text-[8px] text-white/40 uppercase font-black tracking-widest text-center mb-1">
              {t("coach.abbrLosses")}
            </span>
            <CountUp value={totals.losses} className="text-xl text-white font-black leading-none" />
          </div>
        </div>
      ) : (
        <div className="mt-5 text-[10px] font-medium uppercase tracking-widest italic text-white/20 relative z-10">
          {t("modules.career.noOfficialRecords")}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Marquee club title (overflow-aware horizontal scroll)
// ------------------------------------------------------------

function MarqueeClubTitle({
  text,
  isActive,
  accent,
}: {
  text: string;
  isActive: boolean;
  accent: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldMarquee, setShouldMarquee] = useState(false);

  React.useEffect(() => {
    if (textRef.current && containerRef.current) {
      setShouldMarquee(textRef.current.scrollWidth > containerRef.current.clientWidth);
    }
  }, [text, isActive]);

  const xVal =
    shouldMarquee && textRef.current && containerRef.current
      ? containerRef.current.clientWidth - textRef.current.scrollWidth - 12
      : 0;

  return (
    <div
      ref={containerRef}
      className={`w-[125px] max-w-full overflow-hidden relative flex mt-1 mb-1 ${
        shouldMarquee ? "justify-start text-left" : "justify-center text-center"
      }`}
    >
      <motion.span
        ref={textRef}
        animate={shouldMarquee && isActive ? { x: [0, xVal, 0] } : { x: 0 }}
        transition={{ duration: 4, ease: "linear", repeat: Infinity, repeatDelay: 1 }}
        className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap inline-block shrink-0"
        style={{ color: isActive ? accent : "rgba(255,255,255,0.7)" }}
      >
        {text}
      </motion.span>
    </div>
  );
}

// ------------------------------------------------------------
// Honours grid + modal
// ------------------------------------------------------------

function HonoursGrid({
  honours,
  accent,
  onSelectHonour,
}: {
  honours: CoachHonourRow[];
  accent: string;
  onSelectHonour: (h: CoachHonourRow) => void;
}) {
  const t = useTranslations("portfolio");
  return (
    <div className="relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 flex items-center gap-4"
      >
        <span className="h-px w-10" style={{ backgroundColor: accent }} />
        <h2 className="font-bh-display text-xs font-bold uppercase tracking-[0.18em] text-white/50">
          {t("coach.honoursTitle")}
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {honours.map((h, i) => {
          const trophy = isHonourTrophy(h.title);
          return (
            <motion.button
              key={h.id}
              type="button"
              onClick={() => onSelectHonour(h)}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
              className="group flex items-center justify-between gap-3 rounded-xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-transparent px-4 py-3 text-left transition-colors hover:bg-yellow-500/20"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[11px] font-extrabold uppercase tracking-wider text-yellow-500 transition-colors group-hover:text-yellow-400">
                  {h.title}
                </span>
                {(h.competition || h.season) && (
                  <span className="truncate text-[10px] font-bold uppercase text-yellow-500/50 transition-colors group-hover:text-yellow-500/80">
                    {[h.competition, h.season].filter(Boolean).join(" • ")}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-500">
                  {trophy ? <TrophyIcon className="h-4 w-4" /> : <StarIcon className="h-3.5 w-3.5" />}
                </span>
                <svg
                  className="h-3.5 w-3.5 text-yellow-500/50 transition-all group-hover:translate-x-0.5 group-hover:text-yellow-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function HonourModal({
  honour,
  accent,
  onClose,
}: {
  honour: CoachHonourRow;
  accent: string;
  onClose: () => void;
}) {
  const trophy = isHonourTrophy(honour.title);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 relative shadow-2xl overflow-hidden"
      >
        <div
          className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none"
          style={{ backgroundColor: accent }}
        />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          aria-label="close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4 mb-2 relative z-10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center border border-yellow-500/20 text-yellow-500 shrink-0 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            {trophy ? <TrophyIcon className="w-6 h-6" /> : <StarIcon className="w-6 h-6" />}
          </div>
          <div className="flex-1 pr-4">
            <h4 className="text-xl font-black text-white uppercase leading-tight text-pretty">{honour.title}</h4>
            {(honour.competition || honour.season) && (
              <span className="text-yellow-500/80 text-xs font-bold uppercase tracking-widest mt-1 block">
                {[honour.competition, honour.season].filter(Boolean).join(" • ")}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ------------------------------------------------------------
// Icons
// ------------------------------------------------------------

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L15 8H9L12 2Z" />
      <path d="M19 8H5V10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10V8Z" />
      <path d="M11 17V20H8V22H16V20H13V17H11Z" />
      <path d="M5 8C3.34315 8 2 9.34315 2 11C2 12.6569 3.34315 14 5 14V8Z" />
      <path d="M19 8C20.6569 8 22 9.34315 22 11C22 12.6569 20.6569 14 19 14V8Z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

// ------------------------------------------------------------
// Shared logic
// ------------------------------------------------------------

function yearRange(stage: CoachCareerRow, present: string) {
  const start = stage.startYear ?? "—";
  const end = stage.endYear ?? present;
  if (stage.startYear && stage.endYear) return `${start} - ${end}`;
  if (stage.startYear && !stage.endYear) return `${start} - ${present}`;
  if (!stage.startYear && stage.endYear) return `${end}`;
  return present;
}

// Aggregate the per-season coach stats that belong to a stage by matching the
// stat's `team` to the stage `club` (case/accent-insensitive). Coach stats are
// not linked by id (no careerItemId), so this is the best available join; a
// stage with no matching seasons simply renders without a stat row.
function prepareStage(item: CoachCareerRow, index: number, stats: CoachStatRow[]): StageData {
  const clubKey = norm(item.club);
  const rows = clubKey ? stats.filter((s) => norm(s.team) === clubKey) : [];

  const totals = rows.reduce<CoachRecordTotals>(
    (acc, s) => ({
      matches: acc.matches + (s.matches || 0),
      wins: acc.wins + (s.wins || 0),
      draws: acc.draws + (s.draws || 0),
      losses: acc.losses + (s.losses || 0),
      goalsFor: acc.goalsFor + (s.goalsFor || 0),
      goalsAgainst: acc.goalsAgainst + (s.goalsAgainst || 0),
    }),
    { matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
  );

  return {
    ...item,
    isCurrent: index === 0 && item.endYear == null,
    totals,
    winPct: pct(totals.wins, totals.matches),
    hasStats: totals.matches > 0,
  };
}

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
