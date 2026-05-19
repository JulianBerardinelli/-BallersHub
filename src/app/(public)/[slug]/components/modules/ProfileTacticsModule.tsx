"use client";

import React, { useRef, useState } from "react";
import {
  motion,
  useInView,
  useTransform,
  useMotionValueEvent,
  AnimatePresence,
} from "framer-motion";
import { useLenis } from "lenis/react";
import { Zap } from "lucide-react";
import { useStableScrollProgress } from "@/hooks/useStableScrollProgress";
import SoccerPitch3D, { POSITIONS_MAP, normalizePosition, getPositionColor } from "@/components/common/animations/SoccerPitch3D";
import { IconSoccerField } from "@/components/icons/IconSoccerField";
import { IconBrain } from "@/components/icons/IconBrain";
import { IconActivity } from "@/components/icons/IconActivity";
import { IconPlayFootball } from "@/components/icons/IconPlayFootball";

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getYouTubeId(url: string) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}
function getYouTubeThumbnail(url: string) {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : "/images/player-default.jpg";
}

// ── ANIMATED BACKGROUND ───────────────────────────────────────────────────────
const AnimatedPattern = () => (
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
      className="absolute rounded-full bg-[var(--theme-primary)] opacity-[0.08] w-[220px] h-[220px] blur-[70px] md:w-[600px] md:h-[600px] md:blur-[120px]"
    />
    <motion.div
      animate={{ x: ["30%", "-20%", "30%"], y: ["30%", "-20%", "30%"] }}
      transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      className="absolute rounded-full bg-[var(--theme-accent)] opacity-[0.08] w-[180px] h-[180px] blur-[60px] md:w-[500px] md:h-[500px] md:blur-[120px]"
    />
  </div>
);

// ── AUTO-PLAY VIDEO (self-hosted) ─────────────────────────────────────────────
function AutoPlayVideo({ src, className = "" }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(videoRef, { margin: "0px 0px -100px 0px" });
  React.useEffect(() => {
    if (!videoRef.current) return;
    if (isInView) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [isInView]);
  return (
    <video ref={videoRef} src={src} className={`object-cover ${className}`} muted loop playsInline preload="none" />
  );
}

// ── YOUTUBE CLIP — thumbnail only (mobile) or iframe (lg+) ───────────────────
function YoutubeClip({ video, className, animate = false }: { video: any; className: string; animate?: boolean }) {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { margin: "400px 0px 400px 0px" });
  const ytId = getYouTubeId(video.url);

  if (!ytId) {
    return (
      <div ref={containerRef} className={className}>
        {isInView && <AutoPlayVideo src={video.url} className="w-full h-full" />}
      </div>
    );
  }

  const inner = isInView ? (
    <iframe
      src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&playsinline=1&disablekb=1`}
      className="w-full h-full absolute inset-0 rounded-[inherit] pointer-events-none"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  ) : (
    <div className="relative w-full h-full bg-black/20" />
  );

  if (animate) {
    return (
      <motion.div
        ref={containerRef}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className={className}
      >
        {inner}
      </motion.div>
    );
  }
  return <div ref={containerRef} className={className}>{inner}</div>;
}

// ── 2D SOCCER PITCH (mobile-only) ─────────────────────────────────────────────
// SVG for the field outline + lines (colours mirror the 3D desktop pitch —
// neutral-900 ground, white/30 paint, subtle white grass stripes). Position
// markers are HTML/CSS lights overlaid on top so framer-motion can drive the
// glow pulse + bob animation, same vocabulary as `SoccerPitch3D`.
function SoccerPitch2D({ positions }: { positions: string[] }) {
  const validPositions = positions
    .filter(p => !["ARQ", "DEF", "MID", "DEL"].includes(p.toUpperCase().trim()))
    .map(p => normalizePosition(p))
    .filter((p): p is string => p !== null);

  return (
    <div className="relative w-full" style={{ aspectRatio: "68 / 105" }}>
      <svg
        viewBox="0 0 68 105"
        className="absolute inset-0 w-full h-full"
        style={{ filter: "drop-shadow(0 0 16px rgba(0,0,0,0.7))" }}
        aria-hidden="true"
      >
        {/* Field background — neutral-900 to match the desktop 3D pitch */}
        <rect x="0" y="0" width="68" height="105" fill="#171717" />
        {/* Grass stripes — subtle white tint, low contrast */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <rect key={i} x="0" y={i * 10} width="68" height="5" fill="rgba(255,255,255,0.04)" />
        ))}
        {/* Outer border — matches desktop border-white/20 */}
        <rect x="0.5" y="0.5" width="67" height="104" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        {/* Center line + circle — white/30 like desktop */}
        <line x1="0.5" y1="52.5" x2="67.5" y2="52.5" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
        <circle cx="34" cy="52.5" r="9.15" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
        <circle cx="34" cy="52.5" r="0.6" fill="rgba(255,255,255,0.3)" />
        {/* Penalty area — top */}
        <rect x="13.85" y="0.5" width="40.32" height="16.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
        <rect x="24.84" y="0.5" width="18.32" height="5.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
        <circle cx="34" cy="11" r="0.6" fill="rgba(255,255,255,0.3)" />
        {/* Penalty area — bottom */}
        <rect x="13.85" y="88" width="40.32" height="16.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
        <rect x="24.84" y="99" width="18.32" height="5.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
        <circle cx="34" cy="94" r="0.6" fill="rgba(255,255,255,0.3)" />
        {/* Goals */}
        <rect x="27.5" y="0" width="13" height="1.5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
        <rect x="27.5" y="103.5" width="13" height="1.5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
      </svg>

      {/* Position markers — HTML overlay with framer-motion animations.
          Mirrors the 3D pitch's "floating light" treatment: outer halo
          pulses scale + opacity, inner dot bobs vertically, both tinted
          with the per-position colour. */}
      <div className="absolute inset-0 pointer-events-none">
        {validPositions.map((posCode, i) => {
          const cfg = POSITIONS_MAP[posCode.toUpperCase()];
          if (!cfg) return null;
          const color = getPositionColor(posCode);

          return (
            <div
              key={posCode}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: cfg.top, left: cfg.left }}
            >
              <div className="relative">
                {/* Outer glow halo — pulses opacity + scale */}
                <motion.div
                  animate={{ scale: [1, 1.7, 1], opacity: [0.35, 0.85, 0.35] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full blur-[7px] mix-blend-screen"
                  style={{ backgroundColor: color }}
                />
                {/* Inner light node — white core with colour border + glow */}
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
                  className="relative w-3 h-3 rounded-full border bg-white flex items-center justify-center z-10"
                  style={{ borderColor: color, boxShadow: `0 0 8px ${color}, 0 0 16px ${color}50` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                </motion.div>
                {/* Position code label below the light — design-system
                    badge tinted with the per-position colour. */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5">
                  <PositionBadge label={posCode.toUpperCase()} color={color} size="xs" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SCRAMBLE TEXT ─────────────────────────────────────────────────────────────
const CYRILLIC = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ";
function ScrambleText({ text, active }: { text: string; active: boolean }) {
  const [displayText, setDisplayText] = useState(text);
  const targetText = useRef(text);
  React.useEffect(() => {
    targetText.current = text;
    let iteration = 0;
    const id = setInterval(() => {
      setDisplayText(() =>
        targetText.current.split("").map((_, index) => {
          if (index < iteration) return targetText.current[index];
          return CYRILLIC[Math.floor(Math.random() * CYRILLIC.length)];
        }).join("")
      );
      if (iteration >= targetText.current.length) clearInterval(id);
      iteration += 1 / 2;
    }, 20);
    return () => clearInterval(id);
  }, [text, active]);
  return <>{displayText}</>;
}

function ScrambleTitle({ isScouting }: { isScouting: boolean }) {
  const title = isScouting ? "Perfil" : "Análisis Táctico";
  const subtitle = isScouting ? "Características" : "Análisis\nPosicional";
  return (
    <div className="relative z-20 shrink-0 mb-2">
      <div className="flex items-center gap-3">
        <h2 className="text-[9px] sm:text-[10px] md:text-sm font-black uppercase tracking-[0.25em] text-[var(--theme-accent)] whitespace-nowrap">
          <ScrambleText text={title} active={isScouting} />
        </h2>
        <div
          className="h-[2px] w-full max-w-[160px] sm:max-w-sm bg-gradient-to-r from-[var(--theme-secondary)] to-transparent opacity-50 transition-all duration-1000"
          style={{ transform: isScouting ? "scaleX(0.5)" : "scaleX(1)", transformOrigin: "left" }}
        />
      </div>
      <h3 className="text-[1.6rem] sm:text-3xl md:text-5xl font-black font-heading text-white uppercase leading-[0.9] whitespace-pre-line mt-1">
        <ScrambleText text={subtitle} active={isScouting} />
      </h3>
    </div>
  );
}

// ── DESIGN-SYSTEM BADGES ──────────────────────────────────────────────────────
// Both the position-code label (EI / MCO / etc.) and the per-skill chips
// (DESBORDE, 1 VS 1, …) use the `.pos-tag` recipe from the Claude Design
// `components-badges.html` brief: Barlow Condensed, color/10% bg, color
// border, rounded 5px. Tinted with the player's per-position colour.

function PositionBadge({
  label,
  color,
  size = "sm",
}: {
  label: string;
  color: string;
  size?: "xs" | "sm" | "md";
}) {
  const sizing =
    size === "xs"
      ? "px-1.5 py-px text-[8px] tracking-[0.06em]"
      : size === "md"
        ? "px-2.5 py-1 text-[12px] tracking-[0.06em]"
        : "px-2 py-0.5 text-[10px] tracking-[0.06em]";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[5px] font-bh-display font-bold uppercase whitespace-nowrap leading-none ${sizing}`}
      style={{
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        color: color,
        border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

function SkillChip({
  label,
  color,
  size = "sm",
  withIcon = false,
}: {
  label: string;
  color: string;
  size?: "sm" | "lg";
  withIcon?: boolean;
}) {
  const sizing =
    size === "lg"
      ? "px-3 py-1.5 text-[11px] gap-1.5 rounded-[6px]"
      : "px-2 py-1 text-[9px] gap-1 rounded-[5px]";
  const iconClass = size === "lg" ? "w-3 h-3" : "w-2.5 h-2.5";

  return (
    <span
      className={`inline-flex items-center font-bh-display font-bold uppercase tracking-[0.08em] whitespace-nowrap leading-none transition-all hover:-translate-y-px ${sizing}`}
      style={{
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        color: color,
        border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
      }}
    >
      {withIcon && (
        <Zap
          className={`${iconClass} shrink-0`}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}

// ── MOBILE POSITION CARD (3D flip) ────────────────────────────────────────────
// Glass card for the mobile Layer 1 that flips 180° on Y axis when tapped:
// front shows the position identity (badge + label + zone of influence), back
// shows the skill chips. Using `transform-style: preserve-3d` + `backface-
// visibility: hidden` instead of a collapsible wrapper, so the card stays a
// single fixed-height tile and never pushes content below it down — fixing
// the collision that the earlier accordion version had inside the scroll-jack
// 100dvh frame.
//
// The two faces sit in the same CSS grid cell via `grid-area: card` so the
// container auto-sizes to the larger of the two faces.

function MobilePositionCard({
  posCode,
  color,
  cfg,
}: {
  posCode: string;
  color: string;
  cfg: { label: string; area: string; strengths: string[] };
}) {
  const [flipped, setFlipped] = useState(false);
  const hasChips = cfg.strengths.length > 0;

  // No chips → render a plain, non-flippable card (no flip indicator either).
  if (!hasChips) {
    return (
      <div className="relative overflow-hidden bg-black/40 backdrop-blur-[40px] border border-white/10 ring-1 ring-white/5 rounded-2xl p-3 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]">
        <div className="absolute top-0 left-0 w-[3px] h-full" style={{ background: color }} />
        <div className="flex items-center gap-2.5 mb-2.5">
          <PositionBadge label={posCode.toUpperCase()} color={color} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[8px] uppercase tracking-[0.25em] text-white/40 leading-none mb-1">Posición</p>
            <h4 className="text-[11px] font-black text-white uppercase leading-tight">{cfg.label}</h4>
          </div>
        </div>
        <div>
          <p className="text-[8px] uppercase tracking-[0.2em] mb-1 font-bh-display font-bold" style={{ color }}>
            Zona de Influencia
          </p>
          <p className="text-[11px] font-bold text-white/75 leading-snug">{cfg.area}</p>
        </div>
      </div>
    );
  }

  const faceClasses =
    "relative overflow-hidden bg-black/40 backdrop-blur-[40px] border border-white/10 ring-1 ring-white/5 rounded-2xl p-3 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]";

  return (
    <div className="relative w-full" style={{ perspective: "1200px" }}>
      <motion.button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-pressed={flipped}
        aria-label={flipped ? "Volver al frente de la card" : "Ver atributos clave"}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full text-left grid"
        style={{
          transformStyle: "preserve-3d",
          gridTemplateAreas: '"card"',
        }}
      >
        {/* ── FRONT FACE ── */}
        <div
          className={faceClasses}
          style={{
            gridArea: "card",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Accent stripe */}
          <div className="absolute top-0 left-0 w-[3px] h-full" style={{ background: color }} />

          {/* Header: badge + label + flip indicator */}
          <div className="flex items-start gap-2.5 mb-2.5">
            <PositionBadge label={posCode.toUpperCase()} color={color} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[8px] uppercase tracking-[0.25em] text-white/40 leading-none mb-1">
                Posición
              </p>
              <h4 className="text-[11px] font-black text-white uppercase leading-tight">
                {cfg.label}
              </h4>
            </div>
            {/* Flip affordance — tinted with the position colour. Circle
                pulses subtly for attention, and the arrow inside rotates
                around the Y axis as a literal preview of the card's flip
                gesture. */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-px"
              style={{
                background: `color-mix(in srgb, ${color} 14%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
                boxShadow: `0 0 8px color-mix(in srgb, ${color} 25%, transparent)`,
              }}
              aria-hidden="true"
            >
              <motion.svg
                animate={{ rotateY: [0, 180, 360] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  ease: "easeInOut",
                }}
                className="w-2 h-2"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color, transformStyle: "preserve-3d" }}
              >
                <path d="M2 6h8" />
                <path d="M7 3l3 3-3 3" />
              </motion.svg>
            </motion.div>
          </div>

          {/* Zona de influencia */}
          <div>
            <p
              className="text-[8px] uppercase tracking-[0.2em] mb-1 font-bh-display font-bold"
              style={{ color }}
            >
              Zona de Influencia
            </p>
            <p className="text-[11px] font-bold text-white/75 leading-snug">{cfg.area}</p>
          </div>
        </div>

        {/* ── BACK FACE ── */}
        <div
          className={`${faceClasses} flex flex-col`}
          style={{
            gridArea: "card",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Accent stripe */}
          <div className="absolute top-0 left-0 w-[3px] h-full" style={{ background: color }} />

          {/* Back header: badge + title + back arrow */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <PositionBadge label={posCode.toUpperCase()} color={color} size="xs" />
              <span
                className="text-[8px] uppercase font-bh-display font-bold tracking-[0.2em] truncate"
                style={{ color }}
              >
                Atributos clave
              </span>
            </div>
            {/* Back-to-front affordance */}
            <div
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: `color-mix(in srgb, ${color} 14%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
              }}
              aria-hidden="true"
            >
              <svg
                className="w-2 h-2"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color }}
              >
                <path d="M10 6H2" />
                <path d="M5 3l-3 3 3 3" />
              </svg>
            </div>
          </div>

          {/* Chips — vertically centred so the back face balances the front */}
          <div className="flex flex-wrap gap-1 flex-1 items-center content-center">
            {cfg.strengths.map((s, idx) => (
              <SkillChip key={idx} label={s} color={color} />
            ))}
          </div>
        </div>
      </motion.button>
    </div>
  );
}

// ── ACCORDION CARD (mobile scouting) ─────────────────────────────────────────
function AccordionCard({
  label, content, accentColor, accentBg, motionStyle, isOpen, onToggle,
}: {
  label: string;
  content: string | null | undefined;
  accentColor: string;
  accentBg: string;
  motionStyle: any;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      style={{ ...motionStyle, borderColor: "rgba(255,255,255,0.08)" }}
      className="rounded-xl overflow-hidden border bg-neutral-900/50 backdrop-blur-sm"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3.5 py-3 text-left active:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-[3px] h-4 rounded-full ${accentBg} opacity-80`} />
          <span style={{ color: accentColor }} className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
            {label}
          </span>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/30 text-xl leading-none select-none"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-white/5">
              {content ? (
                <p className="text-[12px] text-neutral-300 leading-[1.7] font-light">{content}</p>
              ) : (
                <p className="text-xs text-neutral-600 italic">Sin reportar.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── VIDEOS MODAL ──────────────────────────────────────────────────────────────
// Opens from the mobile highlights "Ver más" button when the player has more
// than the 5-item inline cap. Locks both `document.body.overflow` and Lenis
// (same recipe `GalleryLightbox` uses) so the page behind doesn't scroll.
function VideosModal({
  videos,
  playerName,
  onClose,
}: {
  videos: any[];
  playerName: string;
  onClose: () => void;
}) {
  const lenis = useLenis();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [onClose, lenis]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Todos los highlights de ${playerName}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-neutral-900/95 backdrop-blur-[40px] border border-white/10 ring-1 ring-white/5 rounded-3xl p-5 relative shadow-2xl max-h-[80vh] flex flex-col"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10 z-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-4 pr-10">
          <span className="text-[9px] uppercase font-black tracking-[0.3em] text-[var(--theme-accent)]">
            Highlights · {videos.length}
          </span>
          <h3 className="text-xl font-black font-heading text-white uppercase leading-tight mt-1">
            Todos los videos
          </h3>
        </div>

        <ul className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2 -mr-1">
          {videos.map((vid: any) => {
            const year = vid.createdAt ? new Date(vid.createdAt).getFullYear() : new Date().getFullYear();
            return (
              <li key={vid.id}>
                <a
                  href={vid.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 bg-white/[0.02] border border-white/10 rounded-lg p-2 hover:bg-white/[0.06] hover:border-[var(--theme-primary)]/50 transition-colors"
                >
                  <div className="w-16 h-10 bg-black rounded overflow-hidden shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getYouTubeThumbnail(vid.url)}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                      alt=""
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white/80 group-hover:bg-[var(--theme-primary)] group-hover:text-white group-hover:border-transparent transition-colors">
                        <span className="text-[7px] ml-[1px]">▶</span>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/90 font-bold uppercase tracking-wide line-clamp-1">
                      {vid.title || "Match Highlight"}
                    </p>
                    <p className="text-[var(--theme-accent)] text-[9px] uppercase font-black tracking-widest mt-0.5">
                      Temp. {year}
                    </p>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </motion.div>
  );
}

// ── MAIN MODULE ───────────────────────────────────────────────────────────────
export default function ProfileTacticsModule({
  player,
  media,
  isScoutingProp = false,
}: {
  player: any;
  media: any[];
  isScoutingProp?: boolean;
}) {
  const videos = media.filter((m) => m.type === "video");
  const sectionRef = useRef<HTMLElement>(null);
  const [isScouting, setIsScouting] = useState(isScoutingProp);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [videosModalOpen, setVideosModalOpen] = useState(false);

  // Custom live-measurement hook (see `src/hooks/useStableScrollProgress.ts`)
  // instead of framer-motion's `useScroll({ target })` — the latter caches
  // the target's document offset on mount and only refreshes on `resize`,
  // which is fatal for this section because streaming-SSR siblings (Bio,
  // Career, Media) resolve at different moments and shift its offset after
  // calibration. Live measurement reads `getBoundingClientRect()` on every
  // scroll / resize / layout mutation so the calibration never goes stale.
  const { scrollYProgress } = useStableScrollProgress(sectionRef);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest > 0.35 && !isScouting) setIsScouting(true);
    if (latest <= 0.35 && isScouting) setIsScouting(false);
  });

  // ── EXIT ANIMATIONS (Layer 1) ────────────────────────────────────────────
  const pitchOpac    = useTransform(scrollYProgress, [0.0, 0.4], [1, 0]);
  const pitchScale   = useTransform(scrollYProgress, [0.0, 0.4], [1, 0.9]);
  const pitchRotateX = useTransform(scrollYProgress, [0.0, 0.4], [0, 10]);
  const vid1Opac     = useTransform(scrollYProgress, [0.05, 0.45], [1, 0]);
  const vid1Y        = useTransform(scrollYProgress, [0.05, 0.45], [0, 30]);
  const highOpac     = useTransform(scrollYProgress, [0.15, 0.50], [1, 0]);
  const highY        = useTransform(scrollYProgress, [0.15, 0.50], [0, 20]);

  // ── ENTER ANIMATIONS (Layer 2) ───────────────────────────────────────────
  // Tightened ranges so Layer 2 is fully visible shortly after the title flip
  // at 0.35 — keeps the staggered cascade but everything resolves by ~0.55
  const scoutCharOpac   = useTransform(scrollYProgress, [0.30, 0.42], [0, 1]);
  const scoutCharY      = useTransform(scrollYProgress, [0.30, 0.42], [30, 0]);
  const scoutTacticOpac = useTransform(scrollYProgress, [0.32, 0.45], [0, 1]);
  const scoutTacticY    = useTransform(scrollYProgress, [0.32, 0.45], [30, 0]);
  const scoutPhysOpac   = useTransform(scrollYProgress, [0.35, 0.48], [0, 1]);
  const scoutPhysY      = useTransform(scrollYProgress, [0.35, 0.48], [30, 0]);
  const scoutMentOpac   = useTransform(scrollYProgress, [0.38, 0.51], [0, 1]);
  const scoutMentY      = useTransform(scrollYProgress, [0.38, 0.51], [30, 0]);
  const scoutTechOpac   = useTransform(scrollYProgress, [0.41, 0.54], [0, 1]);
  const scoutTechY      = useTransform(scrollYProgress, [0.41, 0.54], [30, 0]);

  // ── DATA ────────────────────────────────────────────────────────────────
  const characteristics = (player.topCharacteristics || player.top_characteristics || []) as string[];
  const author = player.analysisAuthor || player.analysis_author;
  const tact   = player.tacticsAnalysis  || player.tactics_analysis;
  const phys   = player.physicalAnalysis || player.physical_analysis;
  const ment   = player.mentalAnalysis   || player.mental_analysis;
  const tech   = player.techniqueAnalysis || player.technique_analysis;
  const squarePhotos = media?.filter(
    (m) => m.url && (m.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || m.mediaType === "photo")
  ).slice(0, 3) || [];

  // Primary position info for mobile display
  const rawPositions = player.positions || ["DEL"];
  const validPositions = rawPositions
    .filter((p: string) => !["ARQ", "DEF", "MID", "DEL"].includes(p.toUpperCase().trim()))
    .map((p: string) => normalizePosition(p))
    .filter((p: string | null): p is string => p !== null);

  return (
    <section
      ref={sectionRef}
      id="tactics"
      className="relative w-full h-[200vh]"
      style={{ overflow: "clip" }}
    >
      {/*
        Sticky viewport:
        - position: sticky + height: 100dvh → scroll-jacking
        - overflow: clip (on section, NOT overflow:hidden) → clips background visually
          without creating a scroll container that would break sticky
        - height: 100dvh → fix Safari/Chrome mobile URL bar
      */}
      <div
        className="sticky top-0 w-full overflow-hidden"
        style={{ height: "100dvh" }}
      >
        <AnimatedPattern />

        <div
          className="absolute inset-0 w-full h-full flex flex-col px-5 sm:px-8 lg:px-16 z-10 pointer-events-none"
          style={{ paddingTop: "108px", paddingBottom: "16px" }}
        >
          <div className="w-full max-w-[1400px] mx-auto h-full flex flex-col pointer-events-auto relative">

            {/* TÍTULO SCRAMBLE */}
            <ScrambleTitle isScouting={isScouting} />

            <div className="relative flex-grow w-full min-h-0">

              {/* ═══════════════════════════════════════════════════════════
                  LAYER 1 — PERFIL POSICIONAL (EXITS)
              ═══════════════════════════════════════════════════════════ */}
              <div
                className={`absolute inset-0 w-full h-full flex flex-col transition-all duration-500 ${
                  isScouting ? "pointer-events-none" : "pointer-events-auto"
                }`}
              >
                {/* ▸ MOBILE layout (< lg): info left + 2D pitch right, highlights below.
                    Reworked to match the rest of /slug's design system:
                    glass cards (bg-black/40 backdrop-blur + ring/border),
                    accent-tinted rounded-square badges (like the scouting
                    cards), and proper section dividers. Extra top padding
                    so the content has breathing room from the scramble
                    title above. */}
                <div className="flex lg:hidden flex-col h-full gap-3 pt-3 pb-1">

                  {/* Top row: position cards (left, collapsible chips so the
                      stack stays compact) + 2D pitch (right). `items-start`
                      keeps both columns top-aligned regardless of how tall
                      either becomes. */}
                  <motion.div
                    style={{ opacity: pitchOpac, scale: pitchScale }}
                    className="flex gap-3 min-h-0 items-start"
                  >
                    {/* Position cards */}
                    <div className="flex flex-col gap-2.5 flex-1 min-w-0 pr-0.5 overflow-y-auto scrollbar-hide">
                      {validPositions.length > 0 ? (
                        validPositions.map((posCode: string) => {
                          const cfg = POSITIONS_MAP[posCode.toUpperCase()];
                          const color = getPositionColor(posCode);
                          return (
                            <MobilePositionCard
                              key={posCode}
                              posCode={posCode}
                              color={color}
                              cfg={cfg}
                            />
                          );
                        })
                      ) : (
                        <div className="bg-black/40 backdrop-blur-[40px] border border-white/10 ring-1 ring-white/5 rounded-2xl p-4 text-center">
                          <p className="text-white/30 text-xs uppercase tracking-widest font-medium">
                            Sin posición registrada
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 2D pitch — bare against the ambient bg. */}
                    <div className="w-[42%] sm:w-[38%] shrink-0">
                      <SoccerPitch2D positions={player.positions || ["DEL"]} />
                    </div>
                  </motion.div>

                  {/* Highlights: section header → hero auto-play (videos[0])
                      → "Ver todos los highlights +N" theme-tinted button when
                      the player has more than 1 video. Removed inline link
                      items — the stack was getting too cramped within the
                      scroll-jack's 100dvh frame; the modal carries the rest. */}
                  {videos.length > 0 && (
                    <motion.div style={{ opacity: highOpac, y: highY }} className="shrink-0">
                      {/* Section divider header */}
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-white/60 text-[9px] uppercase font-black tracking-[0.3em] shrink-0">
                          Highlights
                        </h4>
                        <div className="flex-grow h-px bg-gradient-to-r from-white/10 to-transparent" />
                      </div>

                      {/* Hero auto-play — videos[0]. Anchor wraps the YouTube
                          iframe (which is pointer-events-none in YoutubeClip),
                          so any tap on the player redirects to YouTube. */}
                      <a
                        href={videos[0].url}
                        target="_blank"
                        rel="noreferrer"
                        className="relative block w-full aspect-video rounded-lg overflow-hidden border border-white/10 ring-1 ring-white/5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] group"
                      >
                        <YoutubeClip
                          video={videos[0]}
                          className="absolute inset-0 w-full h-full"
                        />
                        {/* Tap affordance */}
                        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/15 pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                            <span className="text-white text-base ml-0.5">▶</span>
                          </div>
                        </div>
                      </a>

                      {/* "Ver todos los highlights +N" — primary CTA. Theme-
                          tinted gradient + glow using the player's
                          `--theme-primary` so it pops against the ambient
                          backdrop and reads as the canonical action. Opens
                          the full-list VideosModal. */}
                      {videos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setVideosModalOpen(true)}
                          className="mt-2.5 w-full group flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg transition-all hover:scale-[1.01]"
                          style={{
                            background:
                              "linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 28%, transparent), color-mix(in srgb, var(--theme-accent) 18%, transparent))",
                            border:
                              "1px solid color-mix(in srgb, var(--theme-primary) 50%, transparent)",
                            boxShadow:
                              "0 6px 18px color-mix(in srgb, var(--theme-primary) 28%, transparent), inset 0 1px 0 color-mix(in srgb, var(--theme-primary) 25%, transparent)",
                          }}
                        >
                          <span className="text-[10px] uppercase font-black tracking-[0.22em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                            Ver todos los highlights
                          </span>
                          <span
                            className="text-[10px] font-black text-white tabular-nums font-bh-display px-2 py-0.5 rounded-full backdrop-blur-sm leading-none"
                            style={{
                              background:
                                "color-mix(in srgb, var(--theme-primary) 55%, transparent)",
                              border:
                                "1px solid color-mix(in srgb, var(--theme-primary) 70%, transparent)",
                            }}
                          >
                            +{videos.length - 1}
                          </span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* ▸ DESKTOP layout (lg+): 3D pitch izq + video/highlights der */}
                <div className="hidden lg:flex flex-row h-full gap-16">
                  {/* Lado izq: pitch 3D */}
                  <motion.div
                    style={{ opacity: pitchOpac, scale: pitchScale, rotateX: pitchRotateX, transformOrigin: "center" }}
                    className="w-1/2 flex flex-col items-center relative -mt-10"
                  >
                    <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[var(--theme-primary)] blur-[150px] opacity-10 pointer-events-none" />
                    <SoccerPitch3D
                      playerPositions={player.positions || ["DEL"]}
                      characteristics={characteristics}
                    />

                    {/* Floating skill chips — fill the empty space below the
                        3D pitch on desktop. Each chip bobs independently with
                        a staggered delay so the cluster reads as "alive" but
                        not chaotic. Tinted with the per-position colour to
                        echo the pitch's position lights above. */}
                    {validPositions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-6 lg:mt-8 w-full max-w-[460px] flex flex-col gap-2 items-center"
                      >
                        <h5 className="text-[9px] uppercase font-black tracking-[0.4em] text-white/40 text-center mb-1">
                          Atributos clave
                        </h5>
                        {validPositions.map((posCode: string, i: number) => {
                          const cfg = POSITIONS_MAP[posCode.toUpperCase()];
                          if (!cfg || cfg.strengths.length === 0) return null;
                          const color = getPositionColor(posCode);
                          return (
                            <div
                              key={posCode}
                              className="flex items-center justify-center gap-2 flex-wrap"
                            >
                              <PositionBadge label={posCode.toUpperCase()} color={color} size="sm" />
                              {cfg.strengths.map((skill, j) => (
                                <motion.div
                                  key={`${posCode}-${j}`}
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{
                                    duration: 3 + j * 0.18,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: (i * cfg.strengths.length + j) * 0.22,
                                  }}
                                >
                                  <SkillChip label={skill} color={color} size="lg" withIcon />
                                </motion.div>
                              ))}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Lado der: video + highlights */}
                  <div className="w-1/2 relative flex flex-col items-end pb-0">
                    {videos[0] && (
                      <div className="relative w-full max-w-[550px] shrink-0 mb-8 mt-4 flex justify-center z-20">
                        <motion.div style={{ opacity: vid1Opac, y: vid1Y }} className="w-full">
                          <a href={videos[0].url} target="_blank" rel="noreferrer" className="group block w-full relative z-20">
                            <div className="absolute -inset-4 bg-[var(--theme-primary)] rounded-2xl blur-[30px] opacity-0 group-hover:opacity-40 transition-opacity duration-500 -z-10" />
                            <YoutubeClip
                              video={videos[0]}
                              className="w-full aspect-video rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative z-10"
                              animate
                            />
                            <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer bg-black/10 rounded-xl">
                              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                <span className="text-white text-xl ml-1">▶</span>
                              </div>
                            </div>
                          </a>
                        </motion.div>
                      </div>
                    )}
                    <motion.div style={{ opacity: highOpac, y: highY }} className="w-full max-w-[550px] relative z-30">
                      <h4 className="text-white/50 text-[10px] uppercase font-black tracking-[0.2em] mb-4 border-b border-white/10 pb-2">Highlights</h4>
                      {videos.length <= 1 ? (
                        videos.length === 0 && (
                          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Sin recursos</p>
                        )
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {/* Show videos[1] and videos[2] as link items —
                              videos[0] is already on display as the hero
                              auto-play above. Beyond videos[2], surface the
                              "Ver todos" CTA so the column doesn't fill the
                              whole sticky pin with link items. */}
                          {videos.slice(1, 3).map((vid) => {
                            const year = vid.createdAt ? new Date(vid.createdAt).getFullYear() : new Date().getFullYear();
                            return (
                              <li key={vid.id}>
                                <a href={vid.url} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-4 group bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-3 hover:bg-black/60 hover:border-[var(--theme-primary)] transition-colors"
                                >
                                  <div className="w-16 h-12 bg-black rounded overflow-hidden shrink-0 relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={getYouTubeThumbnail(vid.url)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="thumbnail" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-5 h-5 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white/80 group-hover:bg-[var(--theme-primary)] group-hover:border-transparent group-hover:text-white transition-colors">
                                        <span className="text-[6px] ml-[1px]">▶</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col justify-center min-w-0">
                                    <span className="text-white/90 text-xs font-bold tracking-widest uppercase line-clamp-1">{vid.title || "Match Highlight"}</span>
                                    <span className="text-[var(--theme-accent)] text-[9px] uppercase font-black tracking-widest mt-1">Temp. {year}</span>
                                  </div>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {/* "Ver todos los highlights" CTA — mirrors the mobile
                          treatment. Fires the same VideosModal with the full
                          list. Threshold is `> 3` because desktop shows hero
                          + 2 inline links by default. */}
                      {videos.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setVideosModalOpen(true)}
                          className="mt-3 w-full group flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg transition-all hover:scale-[1.01]"
                          style={{
                            background:
                              "linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 28%, transparent), color-mix(in srgb, var(--theme-accent) 18%, transparent))",
                            border:
                              "1px solid color-mix(in srgb, var(--theme-primary) 50%, transparent)",
                            boxShadow:
                              "0 6px 18px color-mix(in srgb, var(--theme-primary) 28%, transparent), inset 0 1px 0 color-mix(in srgb, var(--theme-primary) 25%, transparent)",
                          }}
                        >
                          <span className="text-[10px] uppercase font-black tracking-[0.22em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                            Ver todos los highlights
                          </span>
                          <span
                            className="text-[10px] font-black text-white tabular-nums font-bh-display px-2 py-0.5 rounded-full backdrop-blur-sm leading-none"
                            style={{
                              background:
                                "color-mix(in srgb, var(--theme-primary) 55%, transparent)",
                              border:
                                "1px solid color-mix(in srgb, var(--theme-primary) 70%, transparent)",
                            }}
                          >
                            +{videos.length - 3}
                          </span>
                        </button>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  LAYER 2 — SCOUTING REPORT (ENTERS)
              ═══════════════════════════════════════════════════════════ */}
              <div
                className={`absolute inset-0 w-full h-full flex flex-col lg:flex-row gap-3 lg:gap-8 overflow-hidden ${
                  !isScouting ? "pointer-events-none" : "pointer-events-auto"
                }`}
              >
                {/* ▸ MOBILE layout (< lg): características + acordeones (sin fotos) */}
                <div className="flex lg:hidden flex-col gap-2 h-full relative">

                  {/* MOBILE PNG Asset (Bottom Right, absolute, crisp right edge) */}
                  {(player.modelUrl1 || player.modelUrl2) && (
                    <motion.div
                      style={{ opacity: scoutTacticOpac, y: scoutTacticY }}
                      className="absolute bottom-[-5%] right-0 w-[140%] max-w-[500px] pointer-events-none z-0 flex justify-end"
                    >
                       <img 
                          src={player.modelUrl1 || player.modelUrl2} 
                          alt="Player asset mobile"
                          className="w-full h-auto object-contain object-bottom object-right max-h-[70vh]"
                          style={{ 
                              transformOrigin: "bottom right",
                              WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 40%)",
                              maskImage: "linear-gradient(to top, transparent 0%, black 40%)"
                          }}
                       />
                    </motion.div>
                  )}

                  {/* Avatar + Características principales */}
                  <motion.div
                    style={{ opacity: scoutTacticOpac, y: scoutTacticY }}
                    className="flex items-center gap-2.5 shrink-0 mb-0.5 mt-5 relative z-10 w-[85%] max-w-[320px]"
                  >
                    {/* Avatar pequeño */}
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0 bg-neutral-800">
                      <img
                        src={player.avatarUrl || "/images/player-default.jpg"}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Label + chips en wrap */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-[0.2em] text-white/40 whitespace-nowrap border-r border-white/15 pr-2">
                        Características
                      </span>
                      {characteristics.map((char: string, i: number) => (
                        <div
                          key={i}
                          className="px-2.5 py-0.5 flex items-center gap-1 rounded-full border border-white/15 bg-white/5 text-[8px] font-bold tracking-widest text-white/65 uppercase backdrop-blur-sm"
                        >
                          <span className="w-[5px] h-[5px] rounded-full bg-white/40 shrink-0" />
                          {char}
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Accordion analysis cards */}
                  <div className="flex flex-col gap-1.5 overflow-y-auto pb-8 relative z-10 custom-scrollbar w-[85%] max-w-[320px]">
                    <AccordionCard
                      label="Análisis Táctico"
                      content={tact}
                      accentColor="var(--theme-accent)"
                      accentBg="bg-[var(--theme-primary)]"
                      motionStyle={{ opacity: scoutTacticOpac, y: scoutTacticY }}
                      isOpen={openCard === "tact"}
                      onToggle={() => setOpenCard(openCard === "tact" ? null : "tact")}
                    />
                    <AccordionCard
                      label="Cualidades Físicas"
                      content={phys}
                      accentColor="#fb923c"
                      accentBg="bg-orange-500"
                      motionStyle={{ opacity: scoutPhysOpac, y: scoutPhysY }}
                      isOpen={openCard === "phys"}
                      onToggle={() => setOpenCard(openCard === "phys" ? null : "phys")}
                    />
                    <AccordionCard
                      label="Perfil Mental"
                      content={ment}
                      accentColor="#a78bfa"
                      accentBg="bg-violet-500"
                      motionStyle={{ opacity: scoutMentOpac, y: scoutMentY }}
                      isOpen={openCard === "ment"}
                      onToggle={() => setOpenCard(openCard === "ment" ? null : "ment")}
                    />
                    <AccordionCard
                      label="Virtud Técnica"
                      content={tech}
                      accentColor="#34d399"
                      accentBg="bg-emerald-500"
                      motionStyle={{ opacity: scoutTechOpac, y: scoutTechY }}
                      isOpen={openCard === "tech"}
                      onToggle={() => setOpenCard(openCard === "tech" ? null : "tech")}
                    />
                  </div>

                  {/* Autor — solo si hay */}
                  {author && author.trim() !== "" && (
                    <motion.div
                      style={{ opacity: scoutCharOpac, y: scoutCharY }}
                      className="shrink-0 mt-auto relative z-10 flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl p-2.5 hover:border-white/15 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center shrink-0">
                        <span className="text-[8px] text-white font-black">ST</span>
                      </div>
                      <div className="overflow-hidden min-w-0">
                        <p className="text-[7px] uppercase tracking-[0.15em] text-[var(--theme-accent)] mb-0.5">Evaluación Oficial</p>
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest leading-none truncate">{author}</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ▸ DESKTOP layout (lg+): fotos izq + grid cards der */}
                <motion.div
                  style={{ opacity: scoutCharOpac, y: scoutCharY }}
                  className="hidden lg:flex lg:w-3/12 flex-col justify-end relative h-full pb-0 z-0"
                >
                  {(player.modelUrl1 || player.modelUrl2) ? (
                    <div className="w-full relative h-full">
                      {/* Ground Shadow (Piso) - aligned with the image bottom-left anchor */}
                      <div
                        className="absolute bottom-0 left-[6%] w-[55%] h-[18px] pointer-events-none z-0"
                        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, transparent 70%)" }}
                      />

                      {/* Asset Pro PNG — anchored bottom-left, scaled by height so it
                          bleeds past the 3/12 column and sits BEHIND the right cards
                          (Layer 2 parent has overflow-hidden, so the bleed is clipped
                          at the row edges — the player overlapping the cards is the
                          intended visual). */}
                      <img
                         src={player.modelUrl1 || player.modelUrl2}
                         alt="Player full body"
                         className="absolute bottom-0 -left-56 w-auto h-[95%] max-w-none max-h-[95vh] object-contain object-left-bottom"
                         style={{
                            transformOrigin: "bottom left",
                            WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 32%)",
                            maskImage: "linear-gradient(to top, transparent 0%, black 32%)"
                         }}
                      />

                      {/* Evaluación Oficial flotante */}
                      {author && author.trim() !== "" && (
                        <div className="absolute top-10 left-0 right-0 mx-auto w-max z-20 flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl hover:border-white/25 transition-colors">
                          <div className="absolute inset-0 bg-gradient-to-r from-[var(--theme-primary)] to-transparent opacity-10 rounded-2xl pointer-events-none" />
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center shrink-0 shadow-lg">
                            <span className="text-[10px] text-white font-black">ST</span>
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[8px] uppercase tracking-[0.2em] text-[var(--theme-accent)] mb-0.5">Evaluación Oficial</p>
                            <p className="text-[11px] font-bold text-white uppercase tracking-widest leading-none truncate">{author}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-end pb-10">
                      {squarePhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                          {squarePhotos.map((photo, i) => (
                            <div
                              key={i}
                              onClick={() => setLightboxImg(photo.url)}
                              className={`w-full aspect-square relative rounded-2xl overflow-hidden border border-white/10 group shadow-2xl cursor-pointer ${i === 0 ? "col-span-2" : "col-span-1"}`}
                            >
                              <img src={photo.url} alt={`Scout ${i + 1}`} className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full aspect-square bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center p-4 text-center mt-auto mb-10">
                          <span className="text-[10px] uppercase font-light text-white/30 tracking-widest">Sin fotos</span>
                        </div>
                      )}
                      
                      {author && author.trim() !== "" && (
                        <div className="mt-4 relative flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/5 rounded-[1rem] p-3 hover:border-white/20 transition-colors">
                          <div className="absolute inset-0 bg-gradient-to-r from-[var(--theme-primary)] to-transparent opacity-[0.02] rounded-[1rem] pointer-events-none" />
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center shrink-0">
                            <span className="text-[9px] text-white font-black">ST</span>
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[7px] uppercase tracking-[0.2em] text-[var(--theme-accent)] mb-0.5">Evaluación Oficial</p>
                            <p className="text-[10px] font-bold text-white uppercase tracking-widest leading-none truncate">{author}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
                
                <div className="hidden lg:flex lg:w-9/12 flex-col gap-4 z-10">
                  {/* Avatar + Características principales (desktop) */}
                  {characteristics.length > 0 && (
                    <motion.div
                      style={{ opacity: scoutTacticOpac, y: scoutTacticY }}
                      className="w-full flex items-center gap-4 flex-wrap mb-2 bg-white/[0.02] border border-white/5 p-4 rounded-2xl backdrop-blur-sm"
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shrink-0 bg-neutral-800 shadow-xl">
                        <img
                          src={player.avatarUrl || "/images/player-default.jpg"}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Label */}
                      <div className="flex flex-col">
                        <span className="text-[10px] lg:text-xs uppercase font-black tracking-[0.2em] text-[var(--theme-accent)]">
                          Cualidades Destacadas
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-white/40">
                          Principales fortalezas
                        </span>
                      </div>
                      
                      <div className="h-8 w-px bg-white/10 mx-2 hidden lg:block" />

                      {/* Chips */}
                      <div className="flex flex-wrap gap-2.5">
                        {characteristics.map((char: string, i: number) => (
                          <div
                            key={i}
                            className="px-4 py-2 flex items-center gap-2 rounded-xl border border-[var(--theme-primary)]/30 bg-[var(--theme-primary)]/10 shadow-sm text-[11px] font-bold tracking-widest text-white/90 uppercase backdrop-blur-md hover:bg-[var(--theme-primary)]/20 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)]" />
                            {char}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Título de Reporte Scouting */}
                  <motion.div style={{ opacity: scoutTacticOpac, y: scoutTacticY }} className="mt-2 mb-2 flex items-center gap-3">
                    <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white">Reporte Scouting</h3>
                    <div className="flex-grow h-px bg-gradient-to-r from-white/20 to-transparent" />
                  </motion.div>

                  {(() => {
                    const scoutingCards = [
                      { key: "tact", mo: { opacity: scoutTacticOpac, y: scoutTacticY }, accent: "var(--theme-accent)", accentBg: "bg-[var(--theme-primary)]", label: "Análisis Táctico", content: tact, Icon: IconSoccerField },
                      { key: "phys", mo: { opacity: scoutPhysOpac,   y: scoutPhysY   }, accent: "#fb923c",            accentBg: "bg-orange-500",            label: "Cualidades Físicas", content: phys, Icon: IconActivity },
                      { key: "ment", mo: { opacity: scoutMentOpac,   y: scoutMentY   }, accent: "#a78bfa",            accentBg: "bg-violet-500",            label: "Perfil Mental", content: ment, Icon: IconBrain },
                      { key: "tech", mo: { opacity: scoutTechOpac,   y: scoutTechY   }, accent: "#34d399",            accentBg: "bg-emerald-500",           label: "Virtud Técnica", content: tech, Icon: IconPlayFootball },
                    ];
                    const currentKey = openCard || "tact";
                    const activeCard = scoutingCards.find(c => c.key === currentKey)!;
                    const inactiveCards = scoutingCards.filter(c => c.key !== currentKey);

                    // flex-grow + min-h-0 lets the row expand to fill the
                    // remaining vertical space inside the parent flex-col,
                    // and the active card's inner overflow-y-auto handles
                    // long content without clipping the row visually.
                    return (
                      <motion.div style={{ opacity: scoutTacticOpac, y: scoutTacticY }} className="flex flex-row gap-4 flex-grow min-h-0 pb-4">
                        {/* Panel Maestro (Activo) — izquierda 60-65% */}
                        <motion.div
                          layoutId={`scout-card-${activeCard.key}`}
                          style={{ border: "1px solid color-mix(in srgb, var(--theme-secondary) 40%, transparent)" }}
                          className="w-[60%] xl:w-[65%] bg-neutral-900/60 backdrop-blur-[20px] shadow-2xl rounded-2xl p-6 lg:p-8 group relative overflow-hidden flex flex-col justify-start min-h-0"
                        >
                          <div className={`absolute top-0 left-0 w-[4px] h-full ${activeCard.accentBg} opacity-100 z-10`} />
                          {/* Watermark icon — anchored bottom-right but pulled
                              inward and bigger so it reads as a decorative
                              background instead of a clipped corner element. */}
                          <activeCard.Icon size={220} strokeWidth={0.35} className="absolute -bottom-8 right-4 text-white opacity-[0.07] pointer-events-none" />

                          <div className="relative z-10 mb-6 flex items-center gap-3">
                            {/* Title icon — sits inside an accent-tinted square
                                so it reads as a real header element instead of
                                a small decoration next to the text. */}
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: `color-mix(in srgb, ${activeCard.accent} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${activeCard.accent} 30%, transparent)` }}
                            >
                              <activeCard.Icon size={20} style={{ color: activeCard.accent }} />
                            </div>
                            <h4 style={{ color: activeCard.accent }} className="text-sm lg:text-base uppercase font-black tracking-[0.25em]">
                              {activeCard.label}
                            </h4>
                          </div>

                          <div className="relative z-10 flex-grow min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                            {activeCard.content ? (
                              <p className="text-[13px] xl:text-[14px] text-neutral-300 leading-[1.8] font-light">{activeCard.content}</p>
                            ) : (
                              <p className="text-sm text-neutral-600 font-medium italic">Sin reportar.</p>
                            )}
                          </div>
                        </motion.div>

                        {/* Panel Detalle (Comprimidas) — derecha 40-35% */}
                        <div className="w-[40%] xl:w-[35%] flex flex-col gap-3 min-h-0">
                          {inactiveCards.map((card) => (
                            <button
                              key={card.key}
                              onClick={() => setOpenCard(card.key)}
                              className="flex-1 w-full flex items-center justify-between bg-neutral-900/30 backdrop-blur-md rounded-2xl p-5 hover:bg-neutral-800/60 transition-colors group relative overflow-hidden"
                              style={{ border: "1px solid color-mix(in srgb, var(--theme-secondary) 20%, transparent)" }}
                            >
                              <div className={`absolute top-0 left-0 w-[3px] h-full ${card.accentBg} opacity-50 group-hover:opacity-100 transition-opacity z-10`} />

                              <div className="flex items-center gap-3 relative z-10 min-w-0">
                                <div
                                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                                  style={{ background: `color-mix(in srgb, ${card.accent} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${card.accent} 22%, transparent)` }}
                                >
                                  <card.Icon size={18} style={{ color: card.accent }} />
                                </div>
                                <span className="text-[10px] xl:text-[11px] font-black uppercase tracking-[0.2em] text-white/70 group-hover:text-white transition-colors text-left leading-tight">
                                  {card.label}
                                </span>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <span className="text-white/40 group-hover:text-white/80">→</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* LIGHTBOX */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
            className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 lg:p-10 cursor-zoom-out"
          >
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute top-4 right-4 lg:top-10 lg:right-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors border border-white/20 z-10 text-xl cursor-pointer"
            >
              ✕
            </button>
            <motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={lightboxImg}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10 cursor-auto"
              alt="Ampliada"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Videos full-list modal — surfaced from the mobile highlights
          "Ver más" button when there are more than 5 videos. */}
      <AnimatePresence>
        {videosModalOpen && (
          <VideosModal
            videos={videos}
            playerName={player.fullName as string}
            onClose={() => setVideosModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
