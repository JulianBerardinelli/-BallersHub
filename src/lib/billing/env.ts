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
    // Used to build success_url / cancel_url / back_urls. MP rejects
    // localhost / non-HTTPS URLs, so we walk through every plausible
    // env source the deploy might have, in priority order:
    //
    //   1. NEXT_PUBLIC_APP_URL — explicit canonical setting (preferred).
    //   2. NEXT_PUBLIC_SITE_URL — legacy alias used by emails/marketing
    //      modules; common to have only this set in older repos.
    //   3. VERCEL_URL — auto-injected on every Vercel deploy
    //      (`<project>-<branch>-<hash>.vercel.app`, no protocol).
    //   4. localhost — last resort for `npm run dev` without env file.
    //
    // Whatever we resolve gets normalized to drop trailing slashes and
    // gain `https://` if it's missing the protocol.
    const candidates = [
      optional("NEXT_PUBLIC_APP_URL"),
      optional("NEXT_PUBLIC_SITE_URL"),
      optional("VERCEL_URL"),
    ];
    const raw = candidates.find((v) => v && v.length > 0);
    const base = raw ? normalizePublicUrl(raw) : "http://localhost:3000";
    return base;
  },
};

function normalizePublicUrl(input: string): string {
  let v = input.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(v)) {
    // VERCEL_URL ships as `host` without protocol — assume HTTPS
    // (every Vercel deploy serves over HTTPS).
    v = `https://${v}`;
  }
  return v;
}

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
