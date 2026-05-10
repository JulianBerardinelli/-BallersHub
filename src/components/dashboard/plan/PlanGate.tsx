"use client";

// PlanGate — wraps content that may need to be hidden, blurred, or
// badged based on the user's plan. The behavior comes from the feature's
// declarative gate config (see `feature-gates.ts`).
//
// Usage:
//   <PlanGate feature="templateColors">
//     <ColorPickerSection />
//   </PlanGate>
//
// For `soft-save` and `hard-cap` gates, this component does NOT intercept
// — those need imperative handling at the action call site (use
// `useUpgradeModal` directly + a `requireProForFeature` server guard).

import { type ReactNode } from "react";
import { Lock } from "lucide-react";
import {
  FEATURE_GATES,
  type FeatureGate,
  type FeatureId,
} from "@/lib/dashboard/feature-gates";
import { usePlanAccess } from "./PlanAccessProvider";
import UpgradeCta from "./UpgradeCta";

export type PlanGateProps = {
  feature: FeatureId;
  children: ReactNode;
  /** Override the lock title shown in the overlay. */
  lockTitle?: string;
  /** Override the lock body shown in the overlay. */
  lockBody?: string;
  /** When set, render this slot instead of children when locked. */
  fallback?: ReactNode;
  /** Extra classes for the wrapping element when locked. */
  className?: string;
};

export default function PlanGate({
  feature,
  children,
  lockTitle,
  lockBody,
  fallback,
  className = "",
}: PlanGateProps) {
  const { access } = usePlanAccess();
  const gate: FeatureGate = FEATURE_GATES[feature];

  // Pro users see everything as-is. No wrapping, no overhead.
  if (access.isPro) return <>{children}</>;

  const title = lockTitle ?? gate.copy?.title ?? "Funcionalidad Pro";
  const body =
    lockBody ??
    gate.copy?.body ??
    "Activá el plan Pro para desbloquear esta función.";

  switch (gate.behavior) {
    case "hidden":
      return fallback ? <>{fallback}</> : null;

    case "blurred":
      return (
        <div className={`relative ${className}`}>
          <div className="pointer-events-none select-none" aria-hidden="true" style={{ filter: "blur(6px) saturate(0.7)", opacity: 0.55 }}>
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-bh-black/55 rounded-bh-lg">
            <div className="max-w-md space-y-3 rounded-bh-lg border border-white/[0.10] bg-bh-surface-1/95 p-5 text-center shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
              <div className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-bh-md bg-bh-lime/15 text-bh-lime">
                <Lock size={14} />
              </div>
              <h3 className="font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                {title}
              </h3>
              <p className="text-[12.5px] leading-[1.55] text-bh-fg-3">{body}</p>
              <div className="pt-1">
                <UpgradeCta feature={feature} size="md" />
              </div>
            </div>
          </div>
        </div>
      );

    case "badge":
      return (
        <div className="relative">
          <span className="pointer-events-none absolute -right-2 -top-2 z-10 inline-flex items-center gap-1 rounded-full border border-bh-lime/40 bg-bh-lime/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-bh-lime">
            <Lock size={9} /> Pro
          </span>
          {children}
        </div>
      );

    case "soft-save":
    case "hard-cap":
      // These behaviors are imperative — the gate just renders the
      // children verbatim. The action handler (e.g. on save / on add)
      // calls `useUpgradeModal().open(feature)` to surface the modal.
      return <>{children}</>;

    default:
      return <>{children}</>;
  }
}
