"use client";

// Shared signal for hiding the floating dock while an external, user-intent
// overlay is open.
//
// Why this exists: the dock is portaled to document.body, so its z-index sits
// ABOVE in-page modals that are trapped inside a lower stacking context (e.g.
// the /players bottom-sheet, which lives under the (site) layout's
// `isolate`/`z-10` contexts). z-index alone can't put such a modal above a
// body-level dock. HeroUI overlays (z-50, also body-portaled) already win
// because the dock is z-40 — this signal is only for the trapped in-page case.
//
// Any overlay that must cover the dock calls `useHideDockWhile(open)`.

import { useEffect, useSyncExternalStore } from "react";

let count = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => count > 0;
const getServerSnapshot = () => false;

/** True when ≥1 external overlay has requested the dock be hidden. */
export function useDockHidden(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hide the bottom dock while `active` is true. Use from any modal/sheet that
 * must sit above the dock but lives in a trapped stacking context (so plain
 * z-index won't lift it above the body-portaled dock).
 */
export function useHideDockWhile(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    count += 1;
    emit();
    return () => {
      count = Math.max(0, count - 1);
      emit();
    };
  }, [active]);
}
