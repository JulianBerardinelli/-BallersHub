// Server-side guard for actions that mutate Pro-only state. Use this in
// server actions and route handlers to prevent a Free user from saving
// fields gated to Pro (even if they bypass the UI).
//
// Usage:
//   import { requireProForFeature } from "@/lib/dashboard/gate-actions";
//   export async function saveMarketValue(value: number) {
//     await requireProForFeature("marketValue");
//     // ...persist
//   }

import "server-only";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { resolvePlanAccess } from "./plan-access";
import { fetchDashboardState } from "./client/data-provider";
import {
  FEATURE_GATES,
  type FeatureId,
} from "./feature-gates";

export class PlanGateError extends Error {
  readonly feature: FeatureId;
  readonly code = "PLAN_GATE_REJECTED";

  constructor(feature: FeatureId, message?: string) {
    super(
      message ??
        `Esta acción requiere plan Pro (feature: ${FEATURE_GATES[feature].id}).`,
    );
    this.feature = feature;
  }
}

/**
 * Throws if the current user is not Pro for the given feature. Returns
 * the plan access record on success so callers can branch on
 * `isTrialing` etc if needed.
 */
export async function requireProForFeature(feature: FeatureId) {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new PlanGateError(feature, "No hay sesión activa.");
  }

  const state = await fetchDashboardState(supabase, user.id);
  const access = resolvePlanAccess(state.subscription);

  if (!access.isPro) {
    throw new PlanGateError(feature);
  }

  return access;
}
