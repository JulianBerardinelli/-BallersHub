// Plan access resolver — single source of truth for "is this user Pro?"
// across the dashboard.
//
// Rules (kept here, not duplicated):
// - Pro = `plan === 'pro'` AND `status_v2 IN ('trialing', 'active')`.
// - Comp grants (admin-issued, `processor IS NULL`) follow the same rule:
//   we look at `status_v2`, not `processor`.
// - Lazy on-read effective plan: if `current_period_end < now` and the row
//   says `status_v2 IN ('canceled','past_due')`, we treat the user as Free
//   without writing to DB. A nightly job (out of scope) can do the cleanup.
// - Trialing and active are equivalent for gating. We expose `isTrialing`
//   only to drive copy ("Estás en tu trial, te quedan X días").
//
// Audience (player vs agency) is NOT computed here — it lives upstream in
// `userProfiles.role`. Callers pass it in if they need plan × audience.

import type { DashboardSubscription } from "./client/data-provider";

export type PlanAudience = "player" | "agency";

export type PlanSource = "paid" | "comp_grant" | "free";

export type PlanAccess = {
  /** True if Pro features should be unlocked right now. */
  isPro: boolean;
  /** True for free users (no Pro entitlement, expired Pro, etc). */
  isFree: boolean;
  /** True when status_v2 = 'trialing'. UI uses this for trial countdowns. */
  isTrialing: boolean;
  /** Pro is active but cancellation is scheduled at period end. */
  isCancelingSoon: boolean;
  /** Pro is past_due — payment failed but grace period is open. */
  isPastDue: boolean;
  /** Pro was effectively granted via admin (no payment processor). */
  isAdminGrant: boolean;
  /** Pro was paid through Stripe or Mercado Pago. */
  isPaid: boolean;
  /** Where the entitlement comes from — drives copy in settings/subscription. */
  source: PlanSource;
  /** ISO timestamp at which Pro expires; null when permanent (some comp grants). */
  expiresAt: string | null;
  /**
   * The plan we should treat the user as having for gating. Always one of
   * `'pro' | 'free'`. Lazy on-read: if the stored plan is 'pro' but the
   * subscription is canceled/past_due AND beyond `current_period_end`, this
   * collapses to 'free' without touching the DB.
   */
  effectivePlan: "pro" | "free";
};

/**
 * Resolve the effective plan access for a subscription row. Returns a
 * deterministic result given the same input — no clock reads outside of
 * `Date.now()` for the lazy-expiry check.
 *
 * Source of truth: `status_v2` + `plan_id` + `processor`. The legacy
 * `plan` column is a derived cache that has been observed to lag
 * behind the truth (e.g. a Mercado Pago checkout that flipped
 * `status_v2` to `trialing` but didn't propagate to `plan`). We treat
 * the row as Pro whenever the *real* entitlement signals say so,
 * regardless of what `plan` says.
 */
export function resolvePlanAccess(
  subscription: DashboardSubscription | null,
): PlanAccess {
  if (!subscription) return freeAccess("free");

  const statusV2 = subscription.statusV2;
  const plan = subscription.plan ?? "free";

  // ---- Decide whether the entitlement is currently ACTIVE ----
  // We DO NOT block on `plan === 'pro'` here — that column is a cache
  // and has been observed to lag behind reality. Treat status_v2 as
  // primary truth, with a legacy fallback for unmigrated rows.
  const isActiveStatus = statusV2 === "active" || statusV2 === "trialing";
  const legacyActive = statusV2 == null && subscription.status === "active" && (plan === "pro" || plan === "pro_plus");
  const isPastDue = statusV2 === "past_due";

  if (!isActiveStatus && !legacyActive && !isPastDue) {
    // canceled / paused / incomplete / unknown / no statusV2 + free plan
    return freeAccess("free");
  }

  // ---- Decide whether this entitlement is actually Pro-tier ----
  // A subscription with statusV2 active/trialing but no plan_id and
  // legacy plan='free' is NOT a Pro entitlement (corrupt or partial row).
  // Either plan_id (the granular pricing-matrix id) or the legacy
  // plan column being 'pro'/'pro_plus' is enough.
  const planId = subscription.planId;
  const hasPlanIdProTier = planId === "pro-player" || planId === "pro-agency";
  const hasLegacyProTier = plan === "pro" || plan === "pro_plus";
  if (!hasPlanIdProTier && !hasLegacyProTier) {
    return freeAccess("free");
  }

  // ---- Lazy expiry check ----
  const now = Date.now();
  const periodEndTs = subscription.currentPeriodEnd
    ? Date.parse(subscription.currentPeriodEnd)
    : null;
  const isExpired =
    periodEndTs !== null && Number.isFinite(periodEndTs) && periodEndTs < now;

  if (isExpired) return freeAccess("free");

  // past_due: payment failed but processor still in grace. We keep Pro
  // on so the user has a chance to fix it. The banner surfaces the
  // "actualizar pago" CTA.
  // (No-op here — fall through.)

  const isAdminGrant =
    subscription.processor === null &&
    (subscription.processorSubscriptionId ?? "").startsWith("admin_grant:");

  const isPaid = !isAdminGrant && subscription.processor !== null;

  const source: PlanSource = isAdminGrant
    ? "comp_grant"
    : isPaid
      ? "paid"
      : "free";

  return {
    isPro: true,
    isFree: false,
    isTrialing: statusV2 === "trialing",
    isCancelingSoon: subscription.cancelAtPeriodEnd === true,
    isPastDue,
    isAdminGrant,
    isPaid,
    source,
    expiresAt: subscription.currentPeriodEnd,
    effectivePlan: "pro",
  };
}

function freeAccess(source: PlanSource): PlanAccess {
  return {
    isPro: false,
    isFree: true,
    isTrialing: false,
    isCancelingSoon: false,
    isPastDue: false,
    isAdminGrant: false,
    isPaid: false,
    source,
    expiresAt: null,
    effectivePlan: "free",
  };
}

/**
 * Days remaining until Pro expires. Returns null when the user is Free or
 * when the subscription has no expiry (some comp grants are permanent).
 */
export function daysUntilExpiry(access: PlanAccess): number | null {
  if (!access.isPro || !access.expiresAt) return null;
  const ts = Date.parse(access.expiresAt);
  if (!Number.isFinite(ts)) return null;
  const diffMs = ts - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Build the upsell URL for a feature. Centralized so we can pin UTM tags
 * and pre-select audience+currency consistently.
 */
export function buildUpgradeUrl(options: {
  audience: PlanAudience;
  feature?: string;
  currency?: "USD" | "ARS" | "EUR";
}): string {
  const params = new URLSearchParams();
  params.set("audience", options.audience);
  params.set("currency", options.currency ?? "ARS");
  if (options.feature) {
    params.set("utm_source", "dashboard");
    params.set("utm_medium", "gate");
    params.set("utm_campaign", options.feature);
  }
  return `/pricing?${params.toString()}`;
}
