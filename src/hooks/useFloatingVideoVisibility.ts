"use client";

import * as React from "react";
import { useLenis } from "lenis/react";

export type FloatingVideoState =
  | "hidden_initial"
  | "open"
  | "hidden_permanent";

type Options = {
  hideSelector: string;
  /** Delay after the user's FIRST scroll before the morph reveals. */
  revealAfterScrollMs?: number;
  /**
   * Delay after mount before revealing. When set, takes precedence over
   * `revealAfterScrollMs` (used by the desktop island, which appears on a
   * timer rather than on first scroll).
   */
  revealAfterLoadMs?: number;
  enabled?: boolean;
  dismissKey?: string;
};

const HIDE_TRIGGER_FRACTION = 0.4;
// A real user scroll has to move at least this far before it counts as the
// "first scroll" — filters out sub-pixel jitter / momentum settle noise.
const FIRST_SCROLL_THRESHOLD_PX = 8;

export function useFloatingVideoVisibility({
  hideSelector,
  revealAfterScrollMs = 1000,
  revealAfterLoadMs,
  enabled = true,
  dismissKey,
}: Options): { state: FloatingVideoState; dismiss: () => void } {
  const [state, setState] = React.useState<FloatingVideoState>("hidden_initial");
  const inHideZoneRef = React.useRef(false);
  const evaluateRef = React.useRef<(() => void) | null>(null);
  const revealCheckRef = React.useRef<(() => void) | null>(null);

  useLenis(() => {
    evaluateRef.current?.();
    revealCheckRef.current?.();
  });

  React.useEffect(() => {
    if (!enabled || !dismissKey) return;
    try {
      if (window.sessionStorage.getItem(dismissKey) === "1") {
        setState("hidden_permanent");
      }
    } catch {}
  }, [enabled, dismissKey]);

  React.useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const evaluate = () => {
      rafId = 0;
      const target = document.querySelector(hideSelector);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const vh = window.innerHeight;
      const triggerLine = vh * HIDE_TRIGGER_FRACTION;
      const isInZone = rect.top < triggerLine && rect.bottom > triggerLine;
      if (isInZone === inHideZoneRef.current) return;
      inHideZoneRef.current = isInZone;
      // Once we cross INTO the hide zone, collapse for the rest of this
      // in-page session. The user explicitly asked: once it disappears, it
      // does not come back while they keep navigating.
      if (!isInZone) return;

      setState((curr) => {
        // Only collapse a morph that is already OPEN. While still in the
        // pre-reveal phase, the reveal timer is the sole authority on whether
        // to open (it re-checks the settled `inHideZoneRef` at fire time).
        // Collapsing here would let a transient layout shift during streaming
        // SSR — where #tactics is momentarily near the top before sibling
        // sections lay out — permanently hide the morph before it ever
        // appears. `inHideZoneRef` is still updated above, so the reveal timer
        // sees the correct settled zone state.
        if (curr === "open") return "hidden_permanent";
        return curr;
      });
    };

    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(evaluate);
    };

    evaluateRef.current = schedule;

    const attachToTarget = (target: Element) => {
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(schedule);
        resizeObserver.observe(target);
        resizeObserver.observe(document.body);
        if (document.documentElement) {
          resizeObserver.observe(document.documentElement);
        }
      }
      schedule();
    };

    const tryAttach = () => {
      const target = document.querySelector(hideSelector);
      if (!target) return false;
      attachToTarget(target);
      return true;
    };

    if (!tryAttach()) {
      mutationObserver = new MutationObserver(() => {
        if (tryAttach()) {
          mutationObserver?.disconnect();
          mutationObserver = null;
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      evaluateRef.current = null;
    };
  }, [enabled, hideSelector]);

  // Reveal trigger. Two modes:
  //  • revealAfterLoadMs set  → appear N ms after mount (desktop island).
  //  • else                   → appear `revealAfterScrollMs` after the user's
  //    FIRST real scroll (mobile morph), giving the hero image time to breathe.
  // Either way the reveal is gated on the hide zone at fire time, so loading
  // already scrolled into tactics (or a fast scroll there) won't pop it just
  // to collapse it.
  React.useEffect(() => {
    if (!enabled) return;
    if (state !== "hidden_initial") return;

    const reveal = () => {
      setState((curr) => {
        if (curr !== "hidden_initial") return curr;
        // Re-measure the hide zone FRESH at fire time instead of trusting the
        // cached ref. The ref can be left stale-true by a transient layout
        // shift during streaming SSR (where #tactics briefly sits near the top
        // before sibling sections lay out) — which would otherwise suppress
        // the reveal entirely and the morph would never appear.
        let inZone = inHideZoneRef.current;
        const target = document.querySelector(hideSelector);
        if (target) {
          const rect = target.getBoundingClientRect();
          const triggerLine = window.innerHeight * HIDE_TRIGGER_FRACTION;
          inZone = rect.top < triggerLine && rect.bottom > triggerLine;
          inHideZoneRef.current = inZone;
        }
        if (inZone) return "hidden_permanent";
        return "open";
      });
    };

    if (revealAfterLoadMs != null) {
      const id = window.setTimeout(reveal, revealAfterLoadMs);
      return () => window.clearTimeout(id);
    }

    let revealTimer = 0;
    let armed = false;

    const arm = () => {
      if (armed) return;
      if (window.scrollY <= FIRST_SCROLL_THRESHOLD_PX) return;
      armed = true;
      window.removeEventListener("scroll", arm);
      revealCheckRef.current = null;
      revealTimer = window.setTimeout(reveal, revealAfterScrollMs);
    };

    // Catch both native scroll (Lenis updates window.scrollY + fires it) and
    // the Lenis callback (wired above via revealCheckRef) for resilience.
    window.addEventListener("scroll", arm, { passive: true });
    revealCheckRef.current = arm;

    return () => {
      window.removeEventListener("scroll", arm);
      revealCheckRef.current = null;
      if (revealTimer) window.clearTimeout(revealTimer);
    };
  }, [enabled, state, revealAfterScrollMs, revealAfterLoadMs]);

  const dismiss = React.useCallback(() => {
    setState("hidden_permanent");
    if (dismissKey) {
      try {
        window.sessionStorage.setItem(dismissKey, "1");
      } catch {}
    }
  }, [dismissKey]);

  return { state, dismiss };
}
