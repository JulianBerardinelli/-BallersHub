// Stripe SDK client — server-only.
// Exports a memoised singleton so we don't re-instantiate per request.

import "server-only";
import Stripe from "stripe";
import { billingEnv } from "./env";

let _client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_client) {
    _client = new Stripe(billingEnv.stripeSecretKey(), {
      // Pin the API version explicitly so unannounced Stripe changes don't
      // break us in production. Bump deliberately when reviewing release notes.
      apiVersion: "2026-04-22.dahlia",
      // Tag every API call so dashboard logs are easy to grep.
      appInfo: {
        name: "BallersHub",
        version: "0.1.0",
        url: billingEnv.appUrl(),
      },
      // Stripe SDK retries network errors automatically; cap at 2 to avoid
      // hammering the API on prolonged outages.
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return _client;
}
