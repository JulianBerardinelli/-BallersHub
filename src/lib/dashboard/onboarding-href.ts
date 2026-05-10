// Compute the right onboarding entry point for a user based on their
// subscription plan. Avoids the server-side redirect flash on
// /onboarding/start when the user already paid.
//
// Returns:
//   - "/onboarding/player/apply"   if the user paid pro-player
//   - "/onboarding/manager/info"   if the user paid pro-agency
//   - "/onboarding/start"          if no plan id (the role chooser)
//
// We accept either the bare planId string or the full subscription row.

export function resolveOnboardingHref(
  planIdOrSubscription:
    | string
    | null
    | { planId?: string | null }
    | undefined,
): string {
  const planId =
    typeof planIdOrSubscription === "string"
      ? planIdOrSubscription
      : planIdOrSubscription?.planId ?? null;

  if (planId === "pro-player") return "/onboarding/player/apply";
  if (planId === "pro-agency") return "/onboarding/manager/info";
  return "/onboarding/start";
}
