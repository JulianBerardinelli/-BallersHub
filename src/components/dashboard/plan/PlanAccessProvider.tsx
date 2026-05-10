"use client";

// Plan access context — server component computes the access via
// `resolvePlanAccess` and passes it down through this provider so any
// client child can call `usePlanAccess()` without re-fetching.
//
// Audience is forwarded as well because most gates render copy/CTAs that
// vary per audience (player vs agency).

import { createContext, useContext, type ReactNode } from "react";
import type { PlanAccess, PlanAudience } from "@/lib/dashboard/plan-access";

export type PlanAccessContextValue = {
  access: PlanAccess;
  audience: PlanAudience;
};

const PlanAccessContext = createContext<PlanAccessContextValue | null>(null);

export function PlanAccessProvider({
  value,
  children,
}: {
  value: PlanAccessContextValue;
  children: ReactNode;
}) {
  return (
    <PlanAccessContext.Provider value={value}>
      {children}
    </PlanAccessContext.Provider>
  );
}

export function usePlanAccess(): PlanAccessContextValue {
  const ctx = useContext(PlanAccessContext);
  if (!ctx) {
    throw new Error(
      "usePlanAccess must be used inside <PlanAccessProvider>. Mount it in the dashboard layout.",
    );
  }
  return ctx;
}

/**
 * Like `usePlanAccess` but returns null instead of throwing when the
 * provider is missing. Useful for components that may render outside the
 * dashboard tree.
 */
export function useOptionalPlanAccess(): PlanAccessContextValue | null {
  return useContext(PlanAccessContext);
}
