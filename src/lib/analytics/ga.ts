// Thin GA4 event helpers for the organic→Pro funnel
// (see docs/seo/iter-2-ga4-integration-spec.md). Client-side only.
//
// No-ops when NEXT_PUBLIC_GA_ID is unset, so the call sites are safe to leave
// in place whether or not GA4 is configured for the current environment —
// `sendGAEvent` would otherwise warn when no dataLayer exists.

import { sendGAEvent } from "@next/third-parties/google";

const GA_ENABLED = Boolean(process.env.NEXT_PUBLIC_GA_ID);

/**
 * Funnel stage: a visitor created an account. Uses GA4's recommended
 * `sign_up` event (also feeds GA's native reports). Mark it as a key event
 * in GA4 Admin → Events so it counts as a conversion.
 */
export function trackSignUp(method: "email" | "oauth" = "email"): void {
  if (!GA_ENABLED) return;
  sendGAEvent("event", "sign_up", { method });
}

/**
 * Funnel stage: a user activated a paid (Pro) subscription. Custom event
 * `pro_activation` — mark it as a key event (conversion) in GA4 Admin. The
 * Phase-B funnel panel (`/admin/seo/funnel`) queries this exact name.
 */
export function trackProActivation(params: {
  planId?: string | null;
  currency?: string | null;
  value?: number | null;
  processor?: string | null;
}): void {
  if (!GA_ENABLED) return;
  sendGAEvent("event", "pro_activation", {
    plan_id: params.planId ?? undefined,
    currency: params.currency ?? undefined,
    value: params.value ?? undefined,
    processor: params.processor ?? undefined,
  });
}
