"use client";

// Floating bottom-right tutorial dock. Two visual states:
//  - collapsed → small pill ("Tu progreso · 3/7"); mobile shows only the
//    sparkle icon to keep the footprint minimal.
//  - expanded  → full card with steps + dismiss
//
// Rendered through a portal to `document.body` so `position: fixed`
// references the viewport instead of any ancestor that might create a
// containing block (transform, filter, contain).
//
// The whole dock uses an animated dual-accent border (lime ↔ blue) that
// leans toward the audience accent (lime for player, blue for agency).

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Sparkles,
  X,
  ChevronUp,
  Check,
  Circle,
  ArrowRight,
  PartyPopper,
} from "lucide-react";
import { useTutorial } from "./TutorialProvider";
import { dismissTutorial, resumeTutorial } from "@/app/actions/tutorial";
import type { PlanAudience } from "@/lib/dashboard/plan-access";

type AccentSlot = {
  /** Animated border class. */
  border: string;
  /** Solid foreground colour. */
  text: string;
  /** Solid background — used for the active step check. */
  bg: string;
  /** Foreground for filled bg (contrast). */
  bgFg: string;
  /** Soft tint for the current-step row. */
  bgSoft: string;
  /** Border for the current-step row + inactive icon ring. */
  borderRing: string;
  /** Faint border for hover/inactive states. */
  borderFaint: string;
  /** Soft hover overlay for hovers/pills. */
  hoverBorder: string;
  /** Progress bar fill colour. */
  progressBar: string;
};

const LIME: AccentSlot = {
  border: "bh-border-flow-lime",
  text: "text-bh-lime",
  bg: "bg-bh-lime",
  bgFg: "text-bh-black",
  bgSoft: "bg-bh-lime/[0.06]",
  borderRing: "border-bh-lime/25",
  borderFaint: "border-bh-lime/35",
  hoverBorder: "hover:border-bh-lime/55",
  progressBar: "bg-bh-lime",
};

const BLUE: AccentSlot = {
  border: "bh-border-flow-blue",
  text: "text-bh-blue",
  bg: "bg-bh-blue",
  bgFg: "text-bh-black",
  bgSoft: "bg-[rgba(0,194,255,0.07)]",
  borderRing: "border-[rgba(0,194,255,0.25)]",
  borderFaint: "border-[rgba(0,194,255,0.35)]",
  hoverBorder: "hover:border-[rgba(0,194,255,0.55)]",
  progressBar: "bg-bh-blue",
};

function accentFor(audience: PlanAudience): AccentSlot {
  return audience === "agency" ? BLUE : LIME;
}

// Inline style guarantees `position: fixed` regardless of any CSS layer
// ordering or tailwind purge edge cases. Anchored bottom-right with safe
// area insets so it sits above iOS bottom bars.
const DOCK_FIXED_STYLE: React.CSSProperties = {
  position: "fixed",
  right: "max(1rem, env(safe-area-inset-right))",
  bottom: "max(1rem, env(safe-area-inset-bottom))",
  zIndex: 9999,
  pointerEvents: "auto",
};

export default function TutorialDock() {
  const state = useTutorial();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  // Portal mount only after hydration to avoid SSR mismatch.
  useEffect(() => setMounted(true), []);

  if (!state) return null;
  if (!mounted) return null;

  const accent = accentFor(state.audience);

  // 100% complete + not dismissed → small celebration card.
  if (state.isFullyComplete) {
    if (state.isDismissed) return null;
    return createPortal(
      <div
        id="tutorial-dock-root"
        style={DOCK_FIXED_STYLE}
        className="max-w-[calc(100vw-2.5rem)] sm:max-w-[320px]"
      >
        <div
          className={`${accent.border} flex items-start gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl`}
        >
          <div
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-bh-md ${accent.bgSoft} ${accent.text}`}
          >
            <PartyPopper size={16} />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="font-bh-display text-[13px] font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                ¡Perfil completo!
              </p>
              <p className="mt-0.5 text-[11.5px] leading-[1.5] text-bh-fg-3">
                Sumaste todos los pasos del onboarding {state.tier === "pro" ? "Pro" : "Free"}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startTransition(() => dismissTutorial().then(() => {}))}
              disabled={isPending}
              className="text-[11px] font-semibold text-bh-fg-3 underline-offset-4 hover:text-bh-fg-1 hover:underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // Dismissed with pending steps → re-entry pill.
  if (state.isDismissed) {
    const pendingCount = state.total - state.completedCount;
    return createPortal(
      <div id="tutorial-dock-root" style={DOCK_FIXED_STYLE}>
        <button
          type="button"
          onClick={() => startTransition(() => resumeTutorial().then(() => setIsExpanded(true)))}
          disabled={isPending}
          aria-label={`Reabrir tutorial · te quedan ${pendingCount} ${pendingCount === 1 ? "paso" : "pasos"}`}
          className={`${accent.border} inline-flex items-center gap-2 rounded-bh-pill border ${accent.borderFaint} bg-bh-surface-1/95 p-2.5 text-[11.5px] font-semibold text-bh-fg-1 shadow-[0_8px_28px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:-translate-y-px ${accent.hoverBorder} sm:px-4 sm:py-2`}
        >
          <Sparkles size={14} className={accent.text} />
          <span className="hidden sm:inline">
            Te quedan {pendingCount} {pendingCount === 1 ? "paso" : "pasos"}
          </span>
          <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full ${accent.bg} ${accent.bgFg} px-1 text-[9px] font-bold sm:hidden`}>
            {pendingCount}
          </span>
        </button>
      </div>,
      document.body,
    );
  }

  // Collapsed pill — mobile: only icon + count badge; desktop: text + ratio.
  if (!isExpanded) {
    const ratio = `${state.completedCount}/${state.total}`;
    return createPortal(
      <div id="tutorial-dock-root" style={DOCK_FIXED_STYLE}>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          aria-label={`Tu progreso · ${ratio}`}
          className={`${accent.border} inline-flex items-center gap-2 rounded-bh-pill border ${accent.borderFaint} bg-bh-surface-1/95 p-2.5 text-[11.5px] font-semibold text-bh-fg-1 shadow-[0_8px_28px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:-translate-y-px ${accent.hoverBorder} sm:px-4 sm:py-2`}
        >
          <Sparkles size={14} className={accent.text} />
          <span className="hidden sm:inline">Tu progreso · {ratio}</span>
          <span className={`inline-flex h-4 min-w-[20px] items-center justify-center rounded-full ${accent.bg} ${accent.bgFg} px-1 text-[9px] font-bold sm:hidden`}>
            {ratio}
          </span>
          <ChevronUp size={13} className="hidden text-bh-fg-3 sm:inline" />
        </button>
      </div>,
      document.body,
    );
  }

  // Expanded card.
  const headerLabel =
    state.audience === "agency"
      ? state.tier === "pro"
        ? "Agencia · Pro"
        : "Agencia · Free"
      : state.tier === "pro"
        ? "Jugador · Pro"
        : "Jugador · Free";

  // Header gradient leans toward the same accent.
  const headerGradient =
    state.audience === "agency"
      ? "from-[rgba(0,194,255,0.05)] to-transparent"
      : "from-bh-lime/[0.04] to-transparent";

  return createPortal(
    <div
      id="tutorial-dock-root"
      style={DOCK_FIXED_STYLE}
      className="w-[min(360px,calc(100vw-2rem))] sm:w-[360px]"
    >
      <div
        className={`${accent.border} overflow-hidden rounded-bh-lg border border-white/[0.10] bg-bh-surface-1/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl`}
      >
        {/* Header */}
        <div className={`flex items-start justify-between gap-3 border-b border-white/[0.06] bg-gradient-to-br ${headerGradient} p-4`}>
          <div className="flex items-start gap-2.5">
            <div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-bh-md ${accent.bgSoft} ${accent.text}`}>
              <Sparkles size={14} />
            </div>
            <div>
              <p className="font-bh-display text-[12.5px] font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                Tu primer perfil
              </p>
              <p className="mt-0.5 font-bh-mono text-[10px] uppercase tracking-[0.12em] text-bh-fg-4">
                {headerLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            aria-label="Minimizar tutorial"
            className="rounded-bh-md p-1 text-bh-fg-4 transition-colors hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-2 pt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-bh-fg-3">
              <span className="font-bh-mono font-semibold text-bh-fg-1">
                {state.completedCount}
              </span>
              <span className="text-bh-fg-4"> / {state.total} </span>
              completados
            </span>
            <span className={`font-bh-mono text-[10.5px] font-semibold ${accent.text}`}>
              {Math.round(state.progress * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full ${accent.progressBar} transition-all duration-500 ease-out`}
              style={{ width: `${state.progress * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <ol className="max-h-[60vh] overflow-y-auto px-2 py-2">
          {state.steps.map((step, idx) => {
            const isCurrent = step.id === state.currentStepId;
            return (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className={`flex items-start gap-2.5 rounded-bh-md px-3 py-2.5 transition-colors ${
                    isCurrent
                      ? `border ${accent.borderRing} ${accent.bgSoft}`
                      : "border border-transparent hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      step.completed
                        ? `${accent.bg} ${accent.bgFg}`
                        : isCurrent
                          ? `border ${accent.borderFaint} ${accent.bgSoft} ${accent.text}`
                          : "border border-white/[0.12] bg-white/[0.04] text-bh-fg-4"
                    }`}
                    aria-hidden
                  >
                    {step.completed ? <Check size={11} strokeWidth={3} /> : <Circle size={6} fill="currentColor" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[12.5px] font-semibold leading-tight ${
                        step.completed
                          ? "text-bh-fg-3 line-through decoration-bh-fg-4 decoration-1"
                          : isCurrent
                            ? "text-bh-fg-1"
                            : "text-bh-fg-2"
                      }`}
                    >
                      <span className="mr-1.5 font-bh-mono text-[10px] text-bh-fg-4">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {step.title}
                    </p>
                    {step.subtitle && !step.completed && (
                      <p className="mt-0.5 text-[11px] leading-[1.45] text-bh-fg-4">
                        {step.subtitle}
                      </p>
                    )}
                  </div>
                  {!step.completed && isCurrent && (
                    <ArrowRight size={13} className={`mt-1 shrink-0 ${accent.text}`} />
                  )}
                </Link>
              </li>
            );
          })}
        </ol>

        {/* Footer — dismiss */}
        <div className="border-t border-white/[0.06] bg-black/20 px-4 py-2.5">
          <button
            type="button"
            onClick={() => startTransition(() => dismissTutorial().then(() => {}))}
            disabled={isPending}
            className="text-[11px] font-semibold text-bh-fg-3 underline-offset-4 transition-colors hover:text-bh-fg-1 hover:underline"
          >
            Cerrar tutorial · podés volver cuando quieras
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
