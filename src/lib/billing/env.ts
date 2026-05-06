// Centralised, lazy access to billing env vars.
// Each helper throws a descriptive error when called without the var set,
// so misconfigurations surface as clear errors at call site (instead of
// silent SDK auth failures or undefined headers).
//
// Server-only — do not import from client components.

import "server-only";

function require(varName: string): string {
  const value = process.env[varName];
  if (!value || value.length < 10) {
    throw new Error(
      `[billing/env] Missing or empty env var ${varName}. ` +
        `See docs/checkout-architecture.md §6 for the full required set.`,
    );
  }
  return value;
}

function optional(varName: string): string | undefined {
  const value = process.env[varName];
  return value && value.length > 0 ? value : undefined;
}

export const billingEnv = {
  // ----- Stripe -----
  stripeSecretKey: () => require("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => require("STRIPE_WEBHOOK_SECRET"),
  stripePublishableKey: () => optional("STRIPE_PUBLISHABLE_KEY"),

  // Per-plan price IDs in Stripe — created once via dashboard or stripe CLI
  // and pinned by SKU (planId × currency).
  stripePriceId: (planId: string, currency: "USD" | "EUR"): string | undefined => {
    const norm = planId.toUpperCase().replace(/-/g, "_");
    return optional(`STRIPE_PRICE_${norm}_${currency}`);
  },

  // ----- Mercado Pago -----
  mpAccessToken: () => require("MP_ACCESS_TOKEN"),
  mpPublicKey: () => optional("MP_PUBLIC_KEY"),
  mpWebhookSecret: () => require("MP_WEBHOOK_SECRET"),

  // ----- Generic -----
  appUrl: (): string => {
    // Used to build success_url / cancel_url / back_urls.
    // Falls back to localhost during local dev.
    return optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
  },
};

/**
 * Boolean check used by the /checkout page to decide whether to render the
 * form or a "this processor is not configured yet" banner. Doesn't throw,
 * unlike the accessors above — calling code can branch instead of failing.
 */
export function isProcessorConfigured(
  processor: "stripe" | "mercado_pago",
): boolean {
  if (processor === "stripe") {
    return !!optional("STRIPE_SECRET_KEY");
  }
  return !!optional("MP_ACCESS_TOKEN");
}
