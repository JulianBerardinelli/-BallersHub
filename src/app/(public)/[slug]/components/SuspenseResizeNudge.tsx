"use client";

import { useEffect } from "react";

/**
 * Workaround for a framer-motion `useScroll` measurement bug in
 * production builds with streaming SSR.
 *
 * Problem: TacticsModule scroll-jacks via `useScroll({ target: sectionRef })`.
 * It measures the section's offset against the document on mount. When
 * sibling Suspense boundaries (BioModule, CareerTimeline, MediaGallery)
 * stream their content in afterwards, they grow from a small fallback
 * height to their real height, displacing the Tactics section vertically.
 * `useScroll` does NOT re-measure unless the target itself resizes, so
 * the scroll-progress calibration stays stale and the Layer 1 → Layer 2
 * transition never reaches its trigger ranges (0.30–0.42).
 *
 * Locally with `npm run dev` the Supabase DB is slow enough that every
 * Suspense resolves in the same tick — no displacement, no bug. Vercel
 * production resolves them at different moments → bug shows.
 *
 * Fix: dispatch synthetic `resize` events at staggered intervals after
 * mount. framer-motion's `useScroll` listens to window resize and
 * re-measures all tracked targets, so this nudges it to recalibrate
 * after each likely Suspense resolution.
 *
 * The intervals (0ms, 100ms, 300ms, 700ms, 1500ms, 3000ms) span the
 * usual streaming window without over-firing. Each nudge is O(N targets)
 * which is trivial in practice.
 */
export default function SuspenseResizeNudge() {
  useEffect(() => {
    const intervals = [0, 100, 300, 700, 1500, 3000];
    const timers = intervals.map((delay) =>
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return null;
}
