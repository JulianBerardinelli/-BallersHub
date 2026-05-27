"use client";

import * as React from "react";
import { useLenis } from "lenis/react";

export type FloatingVideoState =
  | "hidden_initial"
  | "open"
  | "hidden_permanent";

type Options = {
  hideSelector: string;
  initialDelayMs?: number;
  enabled?: boolean;
  dismissKey?: string;
};

const HIDE_TRIGGER_FRACTION = 0.4;

export function useFloatingVideoVisibility({
  hideSelector,
  initialDelayMs = 1200,
  enabled = true,
  dismissKey,
}: Options): { state: FloatingVideoState; dismiss: () => void } {
  const [state, setState] = React.useState<FloatingVideoState>("hidden_initial");
  const inHideZoneRef = React.useRef(false);
  const evaluateRef = React.useRef<(() => void) | null>(null);

  useLenis(() => {
    evaluateRef.current?.();
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
        if (curr === "hidden_permanent") return curr;
        return "hidden_permanent";
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

  React.useEffect(() => {
    if (!enabled) return;
    if (state !== "hidden_initial") return;
    const id = window.setTimeout(() => {
      setState((curr) => {
        if (curr !== "hidden_initial") return curr;
        if (inHideZoneRef.current) return "hidden_permanent";
        return "open";
      });
    }, initialDelayMs);
    return () => window.clearTimeout(id);
  }, [enabled, state, initialDelayMs]);

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
