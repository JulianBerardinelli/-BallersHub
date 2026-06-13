"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Motion helper for the dock. Returns:
 *  - `d(ms)`     → a CSS duration string scaled by `speed`, collapsed to ~0
 *                  when the user prefers reduced motion.
 *  - `delay(ms)` → numeric ms (for animationDelay), 0 under reduced motion.
 *  - `reduce`    → the prefers-reduced-motion flag (also used to drop the
 *                  live-dot pulse).
 *
 * `speed` mirrors the handoff prototype's slider (1 = production).
 */
export function useDockMotion(speed: number = 1) {
  const reduce = useReducedMotion() ?? false;
  const d = (ms: number) => (reduce ? "0ms" : `${Math.round(ms / speed)}ms`);
  const delay = (ms: number) => (reduce ? 0 : Math.round(ms / speed));
  return { reduce, d, delay };
}
