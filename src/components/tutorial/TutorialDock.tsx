"use client";

// Floating bottom-right tutorial dock. Two visual states:
//  - collapsed → small lime pill ("Tu progreso · 3/7")
//  - expanded  → full card with steps + dismiss
//
// Auto-collapse on dismiss. Hot-reload safe: state is local; the
// underlying `TutorialState` comes from the server via `<TutorialProvider>`.

import { useState, useTransition } from "react";
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

export default function TutorialDock() {
  const state = useTutorial();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Hide outright if no state (e.g. user with no role context yet).
  if (!state) return null;

  // If everything's done, show a compact celebration pill that the user
  // can dismiss for good. Don't be annoying.
  if (state.isFullyComplete) {
    if (state.isDismissed) return null;
    return (
      <div className="fixed bottom-5 right-5 z-50 max-w-[320px]">
        <div className="flex items-start gap-3 rounded-bh-lg border border-bh-lime/30 bg-bh-surface-1/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-bh-md bg-bh-lime/15 text-bh-lime">
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
      </div>
    );
  }

  // If the user dismissed and there are pending steps → show a small
  // re-entry pill so they can resume without losing the prompt forever.
  if (state.isDismissed) {
    return (
      <button
        type="button"
        onClick={() => startTransition(() => resumeTutorial().then(() => setIsExpanded(true)))}
        disabled={isPending}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-bh-pill border border-bh-lime/35 bg-bh-surface-1/90 px-4 py-2 text-[11.5px] font-semibold text-bh-fg-1 shadow-[0_8px_28px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:-translate-y-px hover:border-bh-lime/55 hover:bg-bh-surface-1"
      >
        <Sparkles size={13} className="text-bh-lime" />
        Te quedan {state.total - state.completedCount} {state.total - state.completedCount === 1 ? "paso" : "pasos"}
      </button>
    );
  }

  // Collapsed (clean, just the progress pill)
  if (!isExpanded) {
    const ratio = `${state.completedCount}/${state.total}`;
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-bh-pill border border-bh-lime/35 bg-bh-surface-1/90 px-4 py-2 text-[11.5px] font-semibold text-bh-fg-1 shadow-[0_8px_28px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:-translate-y-px hover:border-bh-lime/55"
      >
        <Sparkles size={13} className="text-bh-lime" />
        Tu progreso · {ratio}
        <ChevronUp size={13} className="text-bh-fg-3" />
      </button>
    );
  }

  // Expanded card
  const headerLabel =
    state.audience === "agency"
      ? state.tier === "pro"
        ? "Agencia · Pro"
        : "Agencia · Free"
      : state.tier === "pro"
        ? "Jugador · Pro"
        : "Jugador · Free";

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2.5rem))]">
      <div className="overflow-hidden rounded-bh-lg border border-white/[0.10] bg-bh-surface-1/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] bg-gradient-to-br from-bh-lime/[0.04] to-transparent p-4">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-bh-md bg-bh-lime/15 text-bh-lime">
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
            <span className="font-bh-mono text-[10.5px] font-semibold text-bh-lime">
              {Math.round(state.progress * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-bh-lime transition-all duration-500 ease-out"
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
                      ? "border border-bh-lime/25 bg-bh-lime/[0.06]"
                      : "border border-transparent hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      step.completed
                        ? "bg-bh-lime text-bh-black"
                        : isCurrent
                          ? "border border-bh-lime/60 bg-bh-lime/10 text-bh-lime"
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
                    <ArrowRight size={13} className="mt-1 shrink-0 text-bh-lime" />
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
    </div>
  );
}
