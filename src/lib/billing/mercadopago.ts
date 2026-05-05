// Mercado Pago SDK client — server-only.
// Exports a memoised configured client and the resource constructors
// (Preference, Payment) we need.

import "server-only";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
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

export function getMpPreference(): Preference {
  return new Preference(getConfig());
}

export function getMpPayment(): Payment {
  return new Payment(getConfig());
}
