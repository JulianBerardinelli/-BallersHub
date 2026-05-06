// Mercado Pago SDK client — server-only.
// Exports a memoised configured client and the resource constructors
// (Preference, Payment) we need.

import "server-only";
import { MercadoPagoConfig, Preference, Payment, PreApproval } from "mercadopago";
import { billingEnv } from "./env";

let _config: MercadoPagoConfig | null = null;

function getConfig(): MercadoPagoConfig {
  if (!_config) {
    _config = new MercadoPagoConfig({
      accessToken: billingEnv.mpAccessToken(),
      options: {
        timeout: 15_000,
        // MP recommends an idempotency key for create-payment to dedupe
        // accidental retries; we set it per-call (not here) because the
        // appropriate key changes with the operation.
      },
    });
  }
  return _config;
}

/** Recurring subscription handle. Used for `preapproval.create()` —
 *  this is what we use for ARS subscriptions per `mp-subscriptions` skill. */
export function getMpPreApproval(): PreApproval {
  return new PreApproval(getConfig());
}

/** One-time payment preference. Kept in case we need it for non-subscription
 *  flows (e.g. one-off purchases). Not used by the main checkout. */
export function getMpPreference(): Preference {
  return new Preference(getConfig());
}

/** Payment lookup. Used by webhook handlers that need to re-fetch a
 *  payment's final state (e.g. for `payment.updated` events that arrive
 *  mid-subscription invoice). */
export function getMpPayment(): Payment {
  return new Payment(getConfig());
}
