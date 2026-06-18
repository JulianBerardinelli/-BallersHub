// Shared coach plan-access loader. The coach shell resolves plan access for
// its header, but individual coach pages/actions (translations, future Pro
// gates) render as separate server entries and must re-resolve it. Mirrors the
// subscription select in loadCoachShellData so gating stays consistent.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardSubscription } from "./client/data-provider";
import { resolvePlanAccess, type PlanAccess } from "./plan-access";

export async function loadCoachPlanAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanAccess> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "plan, status, status_v2, plan_id, processor, processor_subscription_id, current_period_end, trial_ends_at, cancel_at_period_end, canceled_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const subscription: DashboardSubscription | null = sub
    ? {
        plan: (sub.plan as string | null) ?? null,
        status: (sub.status as string | null) ?? null,
        statusV2: (sub.status_v2 as string | null) ?? null,
        planId: (sub.plan_id as string | null) ?? null,
        processor: (sub.processor as string | null) ?? null,
        processorSubscriptionId: (sub.processor_subscription_id as string | null) ?? null,
        currentPeriodEnd: (sub.current_period_end as string | null) ?? null,
        trialEndsAt: (sub.trial_ends_at as string | null) ?? null,
        cancelAtPeriodEnd: (sub.cancel_at_period_end as boolean | null) ?? null,
        canceledAt: (sub.canceled_at as string | null) ?? null,
      }
    : null;

  return resolvePlanAccess(subscription);
}
