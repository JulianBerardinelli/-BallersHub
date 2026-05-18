"use client";

import { useEffect, type RefObject } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

/**
 * Drop-in replacement for framer-motion's `useScroll({ target })` that does
 * NOT cache the target's document offset. Every scroll / resize / layout
 * mutation re-reads `getBoundingClientRect()` and recomputes progress live.
 *
 * ## Why this exists
 *
 * `useScroll({ target: ref })` measures the target's offset relative to the
 * document on mount, then only re-measures on `window.resize`. In streaming
 * SSR (Next.js App Router + `<Suspense>`) sibling boundaries resolve at
 * different moments, pushing the target down vertically AFTER the cached
 * offset was taken — `scrollYProgress` then reports stale values and every
 * scroll-jacked animation silently misses its trigger ranges.
 *
 * Previous workarounds in this repo (`SuspenseResizeNudge` intervals,
 * `ScrollMeasurementSync` ResizeObserver dispatching synthetic resize
 * events) tried to coax framer-motion into re-measuring, with limited
 * success — late Suspense resolutions on slow cold starts still slipped
 * past, and even with the body observer firing there's no guarantee
 * framer-motion's internal measurement pipeline picks up every change in
 * time. This hook eliminates the class of bugs by never caching in the
 * first place.
 *
 * ## Semantics
 *
 * Mimics `useScroll({ target, offset: ["start start", "end end"] })`:
 * - Returns `scrollYProgress = 0` when target top sits at viewport top.
 * - Returns `scrollYProgress = 1` when target bottom sits at viewport
 *   bottom.
 * - Linear interpolation between those points; clamps outside.
 *
 * The returned `MotionValue` is fully compatible with `useTransform`,
 * `useMotionValueEvent`, `useSpring`, etc. — exactly like the framer-motion
 * one. Callsites swap `useScroll({ target })` for
 * `useStableScrollProgress(targetRef)` with no other changes.
 *
 * ## Cost
 *
 * On every scroll tick we coalesce updates through `requestAnimationFrame`,
 * so at most one measurement per frame regardless of scroll velocity. The
 * `ResizeObserver` callback is also batched once per frame by the browser.
 * One observer per call site; cleaned up on unmount.
 */
export function useStableScrollProgress(
  targetRef: RefObject<HTMLElement | null>,
): { scrollYProgress: MotionValue<number> } {
  const scrollYProgress = useMotionValue(0);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    if (typeof window === "undefined") return;

    let rafId = 0;
    let lastValue = -1;

    const measure = () => {
      rafId = 0;
      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const targetHeight = rect.height;

      // Translate `rect.top` into "how far has the user scrolled past the
      // start of the target". rect.top is target's top relative to the
      // current viewport; -rect.top is the amount scrolled into it.
      const scrolledIntoTarget = -rect.top;

      // Total scrollable distance while target is in play: target height
      // minus viewport height (the sticky range). Below that threshold we
      // are before the target; above it we are after.
      const scrollable = targetHeight - viewportHeight;

      let next: number;
      if (scrollable <= 0) {
        // Target shorter than viewport — no meaningful progress.
        next = scrolledIntoTarget > 0 ? 1 : 0;
      } else {
        next = scrolledIntoTarget / scrollable;
        if (next < 0) next = 0;
        else if (next > 1) next = 1;
      }

      // Skip MotionValue updates when the value hasn't materially changed
      // — prevents spurious subscriber notifications.
      if (next !== lastValue) {
        lastValue = next;
        scrollYProgress.set(next);
      }
    };

    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(measure);
    };

    // Initial measurement after layout settles.
    schedule();

    // Scroll: passive for smoothness. Lenis already updates the real
    // window.scrollY, so this works regardless of smooth-scroll wrappers.
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // Catch layout shifts that don't fire scroll/resize: Suspense
    // resolutions, image/font loads, intrinsic size changes inside the
    // target. ResizeObserver batches per frame in the browser.
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      observer.observe(target);
      observer.observe(document.body);
      if (document.documentElement) {
        observer.observe(document.documentElement);
      }
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [targetRef, scrollYProgress]);

  return { scrollYProgress };
}
