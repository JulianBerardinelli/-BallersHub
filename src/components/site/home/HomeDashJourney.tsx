"use client";

import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";

// The product tour is below the fold, heavy DOM, and scroll/window-driven →
// lazy + client-only. A 520vh loading box reserves the exact section height so
// the page below it (pricing) doesn't jump when the chunk arrives.
const DashJourney = dynamic(() => import("./DashJourney"), {
  ssr: false,
  loading: () => <div style={{ height: "520vh" }} aria-hidden />,
});

/**
 * Home wiring for the DashJourney "product tour" — the second seamless scrolljack
 * (Producto → Dashboard → Agente, liquid waves), mounted right after the
 * HeroJourney videowall and before pricing.
 *
 *  - Full-bleed (negative margin, NOT transform → keeps the inner `sticky`).
 *  - `marginTop: -100vh` overlaps the videowall's tail so the first wave rises
 *    OVER the still-visible grid (the transparent stage shows it through) — a
 *    direct hand-off with no dead scroll. Disabled for reduced-motion (static).
 *  - Skip jumps to `#planes` (the pricing section).
 */
export default function HomeDashJourney() {
  const prefersReduced = useReducedMotion();
  return (
    <div className="relative ml-[calc(50%-50vw)] w-screen" style={{ marginTop: prefersReduced ? undefined : "-100vh" }}>
      <DashJourney
        tweaks={{ accent: "#CCFF00", liquidStyle: "Ola", step1Bg: "Lime", uiDensity: "Completa", reduceMotion: !!prefersReduced }}
      />
    </div>
  );
}
