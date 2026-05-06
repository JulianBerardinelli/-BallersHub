// Server-side plan + currency resolution. Mirrors the public pricing matrix
// (`docs/pricing-matrix.md`) but is the only source the billing layer reads
// from — UI strings and locale formatting live in `components/site/pricing/data.ts`.

import "server-only";

export type CheckoutPlanId = "pro-player" | "pro-agency";
export type CheckoutCurrency = "USD" | "ARS" | "EUR";
export type CheckoutProcessor = "stripe" | "mercado_pago";

export type CheckoutPlanPrice = {
  /** Annual amount in major units (USD/EUR/ARS). */
  amount: number;
  /** Annual amount in minor units (cents / centavos). Stored on checkout_sessions.amount_minor. */
  amountMinor: number;
  /** ISO-4217 lower-case for Stripe; upper for MP. */
  currency: CheckoutCurrency;
};

const TABLE: Record<CheckoutPlanId, Record<CheckoutCurrency, CheckoutPlanPrice>> = {
  "pro-player": {
    USD: { amount: 85, amountMinor: 8500, currency: "USD" },
    EUR: { amount: 73, amountMinor: 7300, currency: "EUR" },
    ARS: { amount: 131_999, amountMinor: 13_199_900, currency: "ARS" },
  },
  "pro-agency": {
    // NOTE: still placeholders pending owner confirmation
    // (see docs/pricing-matrix.md §8 open question 1-3).
    USD: { amount: 169, amountMinor: 16_900, currency: "USD" },
    EUR: { amount: 146, amountMinor: 14_600, currency: "EUR" },
    ARS: { amount: 264_999, amountMinor: 26_499_900, currency: "ARS" },
  },
};

export function getPlanPrice(
  planId: CheckoutPlanId,
  currency: CheckoutCurrency,
): CheckoutPlanPrice {
  const plan = TABLE[planId];
  if (!plan) throw new Error(`[billing/plans] unknown planId: ${planId}`);
  const price = plan[currency];
  if (!price) {
    throw new Error(`[billing/plans] no price for ${planId} in ${currency}`);
  }
  return price;
}

export function processorFor(currency: CheckoutCurrency): CheckoutProcessor {
  if (currency === "ARS") return "mercado_pago";
  return "stripe";
}

export function isCheckoutPlanId(value: string): value is CheckoutPlanId {
  return value === "pro-player" || value === "pro-agency";
}

export function isCheckoutCurrency(value: string): value is CheckoutCurrency {
  return value === "USD" || value === "ARS" || value === "EUR";
}

/** Used in success / failure pages to render the "you paid X" line. */
export function formatPlanAmount(price: CheckoutPlanPrice): string {
  if (price.currency === "ARS") {
    return `ARS ${new Intl.NumberFormat("es-AR").format(price.amount)}`;
  }
  if (price.currency === "EUR") {
    return `EUR ${price.amount}`;
  }
  return `USD ${price.amount}`;
}

export const TRIAL_DAYS = 7;
export const REFUND_GRACE_DAYS = 3;
