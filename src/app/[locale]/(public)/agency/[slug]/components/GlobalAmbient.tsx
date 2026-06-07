"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * One continuous decorative layer that spans the whole modules area.
 * Renders multiple "scenes" stacked vertically — each band has its own
 * pattern (grid, dots, hatch) so the backdrop changes as you scroll
 * without ever feeling like contained cards. Bands fade at their edges
 * so adjacent scenes blend instead of butting up.
 */
export default function GlobalAmbient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Vertically stacked scenes — each band has its own pattern */}
      <SceneBand top="0%" height="34%" pattern="grid" />
      <SceneBand top="22%" height="34%" pattern="dots" />
      <SceneBand top="45%" height="32%" pattern="hatch" />
      <SceneBand top="70%" height="34%" pattern="dots" />

      {/* Cross-scene scan lines — slow drift, very subtle */}
      <motion.div
        className="absolute inset-0 opacity-[0.10] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 7px)",
        }}
        animate={{ x: [0, -7, 0] }}
        transition={{ duration: 14, ease: "linear", repeat: Infinity }}
      />

      {/* Twinkling particles scattered across the page */}
      <ParticleField count={30} />

      {/* Drifting orbs — passive ambient color */}
      <FloatOrb top="6%" left="-10%" size={620} duration={28} accent="primary" delay={0} />
      <FloatOrb top="22%" right="-8%" size={560} duration={26} accent="accent" delay={6} />
      <FloatOrb top="48%" left="-6%" size={520} duration={30} accent="accent" delay={2} />
      <FloatOrb top="68%" right="-12%" size={680} duration={24} accent="primary" delay={4} />
      <FloatOrb top="86%" left="-4%" size={480} duration={28} accent="accent" delay={1} />
    </div>
  );
}

function SceneBand({
  top,
  height,
  pattern,
}: {
  top: string;
  height: string;
  pattern: "grid" | "dots" | "hatch";
}) {
  const PATTERN_STYLES: Record<typeof pattern, React.CSSProperties> = {
    grid: {
      backgroundImage:
        "linear-gradient(var(--theme-accent) 1px, transparent 1px), linear-gradient(90deg, var(--theme-accent) 1px, transparent 1px)",
      backgroundSize: "92px 92px",
      opacity: 0.045,
    },
    dots: {
      backgroundImage:
        "radial-gradient(circle, var(--theme-accent) 1.2px, transparent 1.6px)",
      backgroundSize: "32px 32px",
      opacity: 0.07,
    },
    hatch: {
      backgroundImage:
        "repeating-linear-gradient(135deg, var(--theme-accent) 0px, var(--theme-accent) 1px, transparent 1px, transparent 18px)",
      opacity: 0.05,
    },
  };

  return (
    <div
      aria-hidden
      className="absolute inset-x-0"
      style={{
        top,
        height,
        ...PATTERN_STYLES[pattern],
        // Soft fade at top + bottom so adjacent bands blend smoothly.
        maskImage:
          "linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%)",
      }}
    />
  );
}

function FloatOrb({
  top,
  left,
  right,
  size,
  duration,
  accent,
  delay,
}: {
  top: string;
  left?: string;
  right?: string;
  size: number;
  duration: number;
  accent: "accent" | "primary";
  delay: number;
}) {
  const color =
    accent === "accent" ? "var(--theme-accent)" : "var(--theme-primary)";
  return (
    <motion.div
      className="absolute rounded-full blur-[140px] mix-blend-screen"
      style={{
        backgroundColor: color,
        opacity: 0.18,
        width: size,
        height: size,
        top,
        ...(left ? { left } : {}),
        ...(right ? { right } : {}),
      }}
      animate={{
        x: [0, 30, -25, 0],
        y: [0, -20, 25, 0],
      }}
      transition={{
        duration,
        ease: "easeInOut",
        repeat: Infinity,
        delay,
      }}
    />
  );
}

type Particle = {
  top: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
};

/**
 * Field of small twinkling dots that fade in/out at random rates. Positions
 * are generated client-side only (avoids hydration mismatches) using a
 * deterministic LCG so re-renders don't shuffle the particles.
 */
function ParticleField({ count }: { count: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    let seed = 17;
    const next = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const arr: Particle[] = Array.from({ length: count }, () => ({
      top: next() * 100,
      left: next() * 100,
      size: 1 + next() * 2,
      delay: next() * 6,
      duration: 4 + next() * 4,
    }));
    setParticles(arr);
  }, [count]);

  return (
    <>
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: "var(--theme-accent)",
          }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.6, 1, 0.6] }}
          transition={{
            duration: p.duration,
            ease: "easeInOut",
            repeat: Infinity,
            delay: p.delay,
          }}
        />
      ))}
    </>
  );
}
