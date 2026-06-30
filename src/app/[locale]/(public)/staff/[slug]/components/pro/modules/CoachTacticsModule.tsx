"use client";

// Pro coach — RICH tactical block (#tactics). The coach analogue of the player
// `ProfileTacticsModule` scroll-jack, adapted to coach data (no positional 3D
// pitch — coaches have no positions). Structure:
//
//   ┌─ #tactics (h-[200vh] scroll-jack, sticky 100dvh panel) ────────────────┐
//   │  LAYER 1 (EXITS @ ~0..0.4)  → METODOLOGÍA  (methodologyAnalysis)        │
//   │  LAYER 2 (ENTERS @ ~0.32..) → FILOSOFÍA / IDEAS DE JUEGO (playingStyle) │
//   │                               + FORMATION DIAGRAM (mini-pitch 4-3-3)    │
//   │                               + formation chips                         │
//   │  ScrambleTitle flips at 0.35 between the two phases.                    │
//   └────────────────────────────────────────────────────────────────────────┘
//   #tactics-videos → grid of coach_media type=video (YouTube embeds / loops)
//
// Theme: uses the `accent` prop + the `--theme-primary` / `--theme-accent`
// CSS vars set by ProCoachLayout. No-renders (return null) on fully-empty data.

import * as React from "react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  motion,
  useTransform,
  useMotionValueEvent,
  AnimatePresence,
} from "framer-motion";
import { useStableScrollProgress } from "@/hooks/useStableScrollProgress";
import { Section, Reveal } from "./_shared";
import {
  YoutubeClip,
  VideosModal,
  getYouTubeThumbnail,
  type PortfolioVideo,
} from "@/components/portfolio/video";
import type { CoachMediaRow } from "../../CoachPortfolio";

export type CoachTacticsModuleProps = {
  methodologyAnalysis: string | null;
  playingStyle: string | null;
  preferredFormations: string[] | null;
  videos: CoachMediaRow[];
  // 2º asset Pro (cutout transparente) que decora el scroll-jack. NULL → no se
  // renderiza (espejo del modelUrl1 de players en su Tactics module).
  modelUrl?: string | null;
  accent: string;
};

// ── FORMATION PARSING ─────────────────────────────────────────────────────────
// "4-3-3" → [4,3,3]. Accepts 2–5 outfield lines, each 1–6 players. Invalid /
// empty strings → [] (caller filters those out, never renders a broken pitch).
export function parseFormation(raw: string): number[] {
  const parts = raw
    .trim()
    .split(/[-–\s]+/)
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 6);
  return parts.length >= 2 && parts.length <= 5 ? parts : [];
}

export default function CoachTacticsModule({
  methodologyAnalysis,
  playingStyle,
  preferredFormations,
  videos,
  modelUrl,
  accent,
}: CoachTacticsModuleProps) {
  const t = useTranslations("portfolio");

  const formations = (preferredFormations ?? []).filter((f) => parseFormation(f).length > 0);
  const ideas = playingStyle?.trim() || null;
  const methodology = methodologyAnalysis?.trim() || null;
  const videoList: PortfolioVideo[] = videos.map((v) => ({
    id: v.id,
    url: v.url,
    title: v.title,
  }));

  const hasScrollJack = !!methodology || !!ideas || formations.length > 0;
  const hasAnything = hasScrollJack || videoList.length > 0;
  if (!hasAnything) return null;

  return (
    <section id="tactics" className="scroll-mt-28">
      {/* The two-phase scroll-jack only renders when there's narrative content
          (methodology / ideas / formations). When a coach only has videos, we
          skip straight to the grid below. */}
      {hasScrollJack && (
        <TacticsScrollJack
          methodology={methodology}
          ideas={ideas}
          formations={formations}
          modelUrl={modelUrl ?? null}
          accent={accent}
        />
      )}

      {/* Video grid — coach_media type=video, full agnostic treatment. */}
      {videoList.length > 0 && (
        <div id="tactics-videos" className={hasScrollJack ? "mt-20 md:mt-32" : ""}>
          <Section id="tactics-videos-inner" title={t("coach.mediaTitle")} accent={accent}>
            <VideoGrid videos={videoList} accent={accent} />
          </Section>
        </div>
      )}
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SCROLL-JACK (Layer 1 METODOLOGÍA exits → Layer 2 FILOSOFÍA enters @ 0.35)
// ════════════════════════════════════════════════════════════════════════════
function TacticsScrollJack({
  methodology,
  ideas,
  formations,
  modelUrl,
  accent,
}: {
  methodology: string | null;
  ideas: string | null;
  formations: string[];
  modelUrl: string | null;
  accent: string;
}) {
  const t = useTranslations("portfolio");
  const sectionRef = useRef<HTMLElement>(null);
  const [phase2, setPhase2] = useState(false);

  // Live-measured progress (same hook the player uses) so streaming-SSR
  // siblings shifting the section offset don't stale the trigger ranges.
  const { scrollYProgress } = useStableScrollProgress(sectionRef);
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest > 0.35 && !phase2) setPhase2(true);
    if (latest <= 0.35 && phase2) setPhase2(false);
  });

  // Layer 1 (METODOLOGÍA) — exits.
  const l1Opac = useTransform(scrollYProgress, [0.0, 0.4], [1, 0]);
  const l1Y = useTransform(scrollYProgress, [0.0, 0.4], [0, -40]);
  const l1Scale = useTransform(scrollYProgress, [0.0, 0.4], [1, 0.94]);
  const lineWidth = useTransform(scrollYProgress, [0.05, 0.32], ["0%", "100%"]);

  // Layer 2 (FILOSOFÍA + DIAGRAMA) — enters, staggered.
  const ideasOpac = useTransform(scrollYProgress, [0.32, 0.45], [0, 1]);
  const ideasY = useTransform(scrollYProgress, [0.32, 0.45], [40, 0]);
  const diagOpac = useTransform(scrollYProgress, [0.38, 0.52], [0, 1]);
  const diagY = useTransform(scrollYProgress, [0.38, 0.52], [40, 0]);

  // 2º asset (cutout): aparece junto a la fase 2 (Ideas de Juego), como en
  // players. Parallax suave + fade-in con el avance del scroll.
  const assetOpac = useTransform(scrollYProgress, [0.3, 0.5], [0, 0.95]);
  const assetY = useTransform(scrollYProgress, [0.3, 1], ["8%", "-12%"]);

  // If there's no methodology, skip the whole exit phase — Layer 2 should be
  // the resting state. We still keep the 200vh frame so the reveal has room.
  const hasMethodology = !!methodology;

  return (
    <section
      ref={sectionRef}
      // Break out of the parent max-w column so the sticky panel is full-bleed,
      // mirroring the player Tactics module's edge-to-edge feel.
      className="relative left-1/2 right-1/2 -mx-[50vw] w-screen h-[200vh]"
      style={{ overflow: "clip" }}
    >
      <div className="sticky top-0 w-full overflow-hidden" style={{ height: "100dvh" }}>
        {/* Drifting orb background — accent + primary blobs, low opacity. */}
        <AmbientOrbs accent={accent} />

        {/* 2º asset Pro (cutout) — decoración anclada abajo-derecha, detrás del
            contenido (z-[5]). Máscara para fundirlo con el fondo. Mismo patrón
            que el ProfileTacticsModule de players. */}
        {modelUrl && (
          <motion.div
            style={{ opacity: assetOpac, y: assetY }}
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 z-[5] hidden w-[42%] max-w-[560px] lg:block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={modelUrl}
              alt=""
              className="h-auto w-full object-contain"
              style={{
                transformOrigin: "bottom right",
                WebkitMaskImage:
                  "linear-gradient(to top, transparent 4%, black 22%), linear-gradient(to right, black 55%, transparent 100%)",
                maskImage:
                  "linear-gradient(to top, transparent 4%, black 22%), linear-gradient(to right, black 55%, transparent 100%)",
                WebkitMaskComposite: "source-in",
                maskComposite: "intersect",
              }}
            />
          </motion.div>
        )}

        <div
          className="absolute inset-0 w-full h-full flex flex-col px-5 sm:px-8 lg:px-16 z-10"
          style={{ paddingTop: "108px", paddingBottom: "32px" }}
        >
          <div className="w-full max-w-[1400px] mx-auto h-full flex flex-col relative">
            {/* SCRAMBLE TITLE — flips label between the two phases. */}
            <ScrambleTitle
              eyebrow={phase2 ? t("coach.playingStyleTitle") : t("coach.methodologyTitle")}
              heading={phase2 ? t("coach.formationsTitle") : t("coach.bioTitle")}
              accent={accent}
              phase2={phase2}
            />

            <div className="relative flex-grow w-full min-h-0">
              {/* ─────────── LAYER 1 — METODOLOGÍA (exits) ─────────── */}
              {hasMethodology && (
                <motion.div
                  style={{ opacity: l1Opac, y: l1Y, scale: l1Scale }}
                  className={`absolute inset-0 w-full h-full flex flex-col justify-center ${
                    phase2 ? "pointer-events-none" : "pointer-events-auto"
                  }`}
                >
                  <div className="max-w-3xl">
                    <motion.div
                      style={{ width: lineWidth }}
                      className="h-[2px] mb-6 max-w-[420px]"
                      // Accent rule that grows as the phase progresses.
                    >
                      <div className="h-full w-full" style={{ background: accent }} />
                    </motion.div>
                    <p className="whitespace-pre-line text-[15px] md:text-lg leading-relaxed md:leading-[1.85] text-white/80 font-light">
                      {methodology}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ─────────── LAYER 2 — FILOSOFÍA / IDEAS + DIAGRAMA (enters) ─────────── */}
              <div
                className={`absolute inset-0 w-full h-full flex flex-col lg:flex-row gap-6 lg:gap-12 overflow-hidden ${
                  phase2 || !hasMethodology ? "pointer-events-auto" : "pointer-events-none"
                }`}
              >
                {/* Left: ideas de juego narrative. */}
                {ideas && (
                  <motion.div
                    style={hasMethodology ? { opacity: ideasOpac, y: ideasY } : undefined}
                    className="lg:w-1/2 flex flex-col justify-center min-h-0"
                  >
                    <div className="flex items-center gap-3 mb-4 shrink-0">
                      <span
                        className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em]"
                        style={{ color: accent }}
                      >
                        {t("coach.playingStyleTitle")}
                      </span>
                      <span className="flex-grow h-px bg-gradient-to-r from-white/15 to-transparent" />
                    </div>
                    <div className="overflow-y-auto pr-2 custom-scrollbar min-h-0 max-h-full">
                      <p className="whitespace-pre-line text-[14px] md:text-base leading-relaxed md:leading-[1.85] text-white/80 font-light">
                        {ideas}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Right: animated formation diagram(s) + chips. */}
                {formations.length > 0 && (
                  <motion.div
                    style={hasMethodology ? { opacity: diagOpac, y: diagY } : undefined}
                    className={`${ideas ? "lg:w-1/2" : "w-full"} flex flex-col justify-center min-h-0`}
                  >
                    <div className="flex items-center gap-3 mb-4 shrink-0">
                      <span
                        className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-white/60"
                      >
                        {t("coach.formationsTitle")}
                      </span>
                      <span className="flex-grow h-px bg-gradient-to-r from-white/15 to-transparent" />
                    </div>

                    {/* Primary formation rendered big; the rest as chips. */}
                    <div className="flex-grow min-h-0 flex flex-col gap-4">
                      <div className="flex-grow min-h-0 flex items-center justify-center">
                        <FormationDiagram formation={formations[0]} accent={accent} animated />
                      </div>
                      {formations.length > 1 && (
                        <div className="flex flex-wrap gap-2 shrink-0 justify-center lg:justify-start">
                          {formations.slice(1).map((f) => (
                            <FormationChip key={f} formation={f} accent={accent} />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── AMBIENT DRIFTING ORBS ─────────────────────────────────────────────────────
function AmbientOrbs({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1.5px, transparent 1.5px)",
          backgroundSize: "36px 36px",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 100%)",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 100%)",
        }}
      />
      <motion.div
        animate={{ x: ["-20%", "30%", "-20%"], y: ["-20%", "30%", "-20%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full opacity-[0.08] w-[220px] h-[220px] blur-[70px] md:w-[600px] md:h-[600px] md:blur-[120px]"
        style={{ backgroundColor: "var(--theme-primary)" }}
      />
      <motion.div
        animate={{ x: ["30%", "-20%", "30%"], y: ["30%", "-20%", "30%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full opacity-[0.08] w-[180px] h-[180px] blur-[60px] md:w-[500px] md:h-[500px] md:blur-[120px]"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}

// ── SCRAMBLE TEXT ─────────────────────────────────────────────────────────────
const SCRAMBLE_CHARS = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ";
function ScrambleText({ text, active }: { text: string; active: boolean }) {
  const [displayText, setDisplayText] = useState(text);
  const targetText = useRef(text);
  React.useEffect(() => {
    targetText.current = text;
    let iteration = 0;
    const id = setInterval(() => {
      setDisplayText(() =>
        targetText.current
          .split("")
          .map((_, index) => {
            if (index < iteration) return targetText.current[index];
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join(""),
      );
      if (iteration >= targetText.current.length) clearInterval(id);
      iteration += 1 / 2;
    }, 20);
    return () => clearInterval(id);
  }, [text, active]);
  return <>{displayText}</>;
}

function ScrambleTitle({
  eyebrow,
  heading,
  accent,
  phase2,
}: {
  eyebrow: string;
  heading: string;
  accent: string;
  phase2: boolean;
}) {
  return (
    <div className="relative z-20 shrink-0 mb-6 lg:mb-8">
      <div className="flex items-center gap-3">
        <h2
          className="text-[9px] sm:text-[10px] md:text-sm font-black uppercase tracking-[0.25em] whitespace-nowrap"
          style={{ color: accent }}
        >
          <ScrambleText text={eyebrow} active={phase2} />
        </h2>
        <div
          className="h-[2px] w-full max-w-[160px] sm:max-w-sm opacity-50 transition-all duration-1000"
          style={{
            background: `linear-gradient(to right, ${accent}, transparent)`,
            transform: phase2 ? "scaleX(1)" : "scaleX(0.5)",
            transformOrigin: "left",
          }}
        />
      </div>
      <h3 className="text-[1.6rem] sm:text-3xl md:text-5xl font-black font-bh-heading text-white uppercase leading-[0.9] whitespace-pre-line mt-1">
        <ScrambleText text={heading} active={phase2} />
      </h3>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  FORMATION DIAGRAM — mini-pitch with animated nodes per line
// ════════════════════════════════════════════════════════════════════════════
function FormationDiagram({
  formation,
  accent,
  animated = false,
}: {
  formation: string;
  accent: string;
  animated?: boolean;
}) {
  const rows = parseFormation(formation);
  // Render top→bottom = attack→defence; the keeper sits at the very bottom.
  const outfieldTopToBottom = [...rows].reverse();
  const lines: { count: number; isKeeper: boolean }[] = [
    ...outfieldTopToBottom.map((count) => ({ count, isKeeper: false })),
    { count: 1, isKeeper: true },
  ];

  // Stagger delay index — flat counter across all nodes so the whole shape
  // "lights up" line by line.
  let nodeIndex = 0;

  return (
    <div
      className="relative w-full max-w-[360px] mx-auto rounded-2xl border bg-black/30 backdrop-blur-sm p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      style={{ borderColor: `${accent}33` }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="font-bh-display text-base font-black tabular-nums tracking-wide"
          style={{ color: accent }}
        >
          {rows.join("-")}
        </span>
        <span className="font-bh-mono text-[9px] uppercase tracking-[0.2em] text-white/30">XI</span>
      </div>

      {/* Pitch */}
      <div
        className="relative flex aspect-[3/4] flex-col justify-between rounded-xl p-3 overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom, color-mix(in srgb, var(--theme-accent) 7%, #0d0d0d), #0a0a0a)",
          border: `1px solid ${accent}22`,
        }}
        aria-label={`${rows.join("-")}`}
      >
        {/* Pitch markings */}
        <span
          className="pointer-events-none absolute left-3 right-3 top-1/2 h-px -translate-y-1/2"
          style={{ backgroundColor: `${accent}22` }}
        />
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ border: `1px solid ${accent}22` }}
        />
        {/* Penalty boxes */}
        <span
          className="pointer-events-none absolute left-1/2 top-0 h-6 w-1/2 -translate-x-1/2 rounded-b-md"
          style={{ border: `1px solid ${accent}1f`, borderTop: "none" }}
        />
        <span
          className="pointer-events-none absolute left-1/2 bottom-0 h-6 w-1/2 -translate-x-1/2 rounded-t-md"
          style={{ border: `1px solid ${accent}1f`, borderBottom: "none" }}
        />

        {/* Player nodes */}
        {lines.map((line, rowIdx) => (
          <div key={rowIdx} className="relative z-10 flex items-center justify-around">
            {Array.from({ length: line.count }).map((_, i) => {
              const idx = nodeIndex++;
              return (
                <PlayerNode
                  key={i}
                  accent={accent}
                  isKeeper={line.isKeeper}
                  index={idx}
                  animated={animated}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerNode({
  accent,
  isKeeper,
  index,
  animated,
}: {
  accent: string;
  isKeeper: boolean;
  index: number;
  animated: boolean;
}) {
  const delay = index * 0.18;
  return (
    <span className="relative flex items-center justify-center">
      {/* Pulsing halo */}
      {animated && (
        <motion.span
          className="absolute rounded-full"
          style={{ backgroundColor: accent }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay }}
        />
      )}
      {/* Node */}
      <motion.span
        className="relative h-3 w-3 rounded-full"
        style={{
          backgroundColor: isKeeper ? `${accent}cc` : accent,
          boxShadow: isKeeper ? `0 0 8px ${accent}` : `0 0 8px ${accent}, 0 0 16px ${accent}55`,
          ...(isKeeper ? { outline: "2px solid rgba(255,255,255,0.3)", outlineOffset: "1px" } : {}),
        }}
        initial={animated ? { scale: 0, opacity: 0 } : false}
        animate={animated ? { scale: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
      />
    </span>
  );
}

// Compact mini-pitch chip for secondary formations — non-animated.
function FormationChip({ formation, accent }: { formation: string; accent: string }) {
  const rows = parseFormation(formation);
  return (
    <span
      className="inline-flex items-center gap-2 rounded-[8px] border px-3 py-1.5 font-bh-display text-sm font-bold tabular-nums transition-transform hover:-translate-y-px"
      style={{
        background: `color-mix(in srgb, ${accent} 10%, transparent)`,
        color: accent,
        borderColor: `color-mix(in srgb, ${accent} 28%, transparent)`,
      }}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {rows.map((_, i) => (
          <span key={i} className="h-3 w-px" style={{ backgroundColor: `${accent}80` }} />
        ))}
      </span>
      {rows.join("-")}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  VIDEO GRID — coach_media type=video
// ════════════════════════════════════════════════════════════════════════════
function VideoGrid({ videos, accent }: { videos: PortfolioVideo[]; accent: string }) {
  const t = useTranslations("portfolio");
  const [modalOpen, setModalOpen] = useState(false);

  const hero = videos[0];
  const rest = videos.slice(1);
  const INLINE_REST = 3; // hero + 3 inline thumbs, then "view all".
  const inlineRest = rest.slice(0, INLINE_REST);
  const overflow = rest.length - inlineRest.length;

  return (
    <>
      <Reveal className="flex flex-col gap-5">
        {/* Hero auto-play / embed. */}
        {hero && (
          <a
            href={hero.url}
            target="_blank"
            rel="noreferrer nofollow"
            className="group relative block w-full aspect-video overflow-hidden rounded-2xl border border-white/10 ring-1 ring-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
          >
            <YoutubeClip video={hero} className="absolute inset-0 w-full h-full" animate />
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/60 shadow-2xl backdrop-blur-md"
              >
                <span className="ml-1 text-xl text-white">▶</span>
              </div>
            </div>
          </a>
        )}

        {/* Inline thumbnails of the next few videos. */}
        {inlineRest.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inlineRest.map((vid) => (
              <li key={vid.id}>
                <a
                  href={vid.url}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 transition-colors hover:border-white/30"
                >
                  <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getYouTubeThumbnail(vid.url)}
                      alt=""
                      className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/70 text-[8px] text-white/80 transition-colors group-hover:text-white"
                        style={{ ["--tw-shadow-color" as string]: accent }}
                      >
                        ▶
                      </span>
                    </div>
                  </div>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold uppercase tracking-wide text-white/85">
                    {vid.title || t("scouting.matchHighlight")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* "View all highlights +N" — opens the full-list modal. */}
        {overflow > 0 && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group mx-auto flex w-full max-w-sm items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 transition-all hover:scale-[1.01]"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 28%, transparent), color-mix(in srgb, var(--theme-accent) 18%, transparent))",
              border: "1px solid color-mix(in srgb, var(--theme-primary) 50%, transparent)",
              boxShadow:
                "0 6px 18px color-mix(in srgb, var(--theme-primary) 28%, transparent), inset 0 1px 0 color-mix(in srgb, var(--theme-primary) 25%, transparent)",
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
              {t("scouting.viewAllHighlights")}
            </span>
            <span
              className="rounded-full px-2 py-0.5 font-bh-display text-[10px] font-black leading-none tabular-nums text-white backdrop-blur-sm"
              style={{
                background: "color-mix(in srgb, var(--theme-primary) 55%, transparent)",
                border: "1px solid color-mix(in srgb, var(--theme-primary) 70%, transparent)",
              }}
            >
              +{overflow}
            </span>
          </button>
        )}
      </Reveal>

      <AnimatePresence>
        {modalOpen && (
          <VideosModal
            videos={videos}
            ownerName={t("coach.mediaTitle")}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
