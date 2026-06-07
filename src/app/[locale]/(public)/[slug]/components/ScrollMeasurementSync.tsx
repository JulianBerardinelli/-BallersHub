"use client";

import { useEffect } from "react";

/**
 * Keeps every framer-motion `useScroll({ target: ref })` instance on the page
 * accurately calibrated when the document layout shifts after mount.
 *
 * ## Why this exists
 *
 * `useScroll` measures `target.getBoundingClientRect().top + window.scrollY`
 * once on mount and only re-measures when it receives a `window.resize`
 * event. It does NOT observe DOM mutations or sibling resizes. So when
 * streaming SSR resolves Suspense boundaries (or images/fonts load) at
 * different moments after the initial render, the tracked target gets
 * displaced vertically and the cached measurement goes stale — every
 * `scrollYProgress`-driven animation on the page silently misses its
 * trigger ranges.
 *
 * In `/[slug]` (Pro Athlete portfolio) this manifested as the Tactics
 * scroll-jack reaching only the title flip at scroll 0.35 because the
 * cached offset was anchored to the pre-stream layout, while real scroll
 * had not yet entered the calibrated range. The bug was invisible in
 * `npm run dev` because local Supabase latency made every Suspense
 * resolve in the same tick → no displacement.
 *
 * ## The fix
 *
 * `ResizeObserver(document.body)` fires once per animation frame with all
 * batched DOM size changes. Every time the body height changes (Suspense
 * resolution, image load, font swap, any DOM mutation that shifts layout)
 * we dispatch a synthetic `window.resize`. framer-motion listens to that
 * event and re-measures every tracked target — the calibration stays
 * fresh for the lifetime of the page.
 *
 * Mount once at the top of the layout. Cost is negligible: one observer,
 * one event dispatch per layout change (browser already batches them).
 *
 * ## Replaces
 *
 * Previous `SuspenseResizeNudge.tsx` used `setTimeout` intervals
 * `[0, 100, 300, 700, 1500, 3000]ms` to guess when Suspense would resolve.
 * Production cold-starts on Vercel can blow past 3 s, leaving late
 * resolutions uncovered. This is event-driven instead.
 */
export default function ScrollMeasurementSync() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (typeof ResizeObserver === "undefined") {
      // Old browsers — fall back to a single post-load nudge so the
      // page at least recovers once everything settles.
      if (document.readyState === "complete") {
        window.dispatchEvent(new Event("resize"));
      } else {
        window.addEventListener(
          "load",
          () => window.dispatchEvent(new Event("resize")),
          { once: true },
        );
      }
      return;
    }

    const dispatchResize = () => window.dispatchEvent(new Event("resize"));

    const observer = new ResizeObserver(dispatchResize);
    observer.observe(document.body);
    // documentElement covers viewport sizing (e.g. mobile URL bar collapse).
    if (document.documentElement) {
      observer.observe(document.documentElement);
    }

    // Belt and braces: also fire once after `load` so font/image swaps
    // that finish after the last layout shift still trigger a re-measure.
    let loadHandler: (() => void) | null = null;
    if (document.readyState !== "complete") {
      loadHandler = () => dispatchResize();
      window.addEventListener("load", loadHandler, { once: true });
    }

    return () => {
      observer.disconnect();
      if (loadHandler) window.removeEventListener("load", loadHandler);
    };
  }, []);

  return null;
}
