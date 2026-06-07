"use client";

import * as React from "react";

// ── math ──
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** remap v from [a,b] → [0,1], clamped. */
export const rmp = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1);

// ── design-system fonts (loaded via next/font in app/layout.tsx). Chain through
//    the raw next/font var so it resolves regardless of Tailwind @theme inline. ──
export const FONT_DISPLAY = "var(--font-bh-display, var(--font-barlow-condensed, 'Barlow Condensed')), sans-serif";
export const FONT_BODY = "var(--font-bh-body, var(--font-dm-sans, 'DM Sans')), sans-serif";
export const FONT_MONO = "var(--font-bh-mono, var(--font-dm-mono, 'DM Mono')), ui-monospace, monospace";

// brand accents
export const ACCENT = "#CCFF00"; // --bh-lime-200
export const SECONDARY = "#00C2FF"; // --bh-blue-200 (player tags)

/**
 * Per-frame scroll progress (0→1) over a pinned section's scroll length.
 * Drives on rAF AND raw scroll/resize events so the timeline stays correct
 * even when rAF is throttled. `apply` mutates refs (never setState per frame).
 */
export function useHeroScroll(
  ref: React.RefObject<HTMLElement | null>,
  apply: (p: number) => void,
  deps: React.DependencyList = [],
) {
  React.useEffect(() => {
    let raf = 0;
    let last = -1;
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp(-el.getBoundingClientRect().top / total, 0, 1) : 0;
      if (Math.abs(p - last) > 0.0005) {
        apply(p);
        last = p;
      }
    };
    const tick = () => {
      compute();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onScroll = () => compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** useLayoutEffect on the client, useEffect on the server (no SSR warning). */
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;
