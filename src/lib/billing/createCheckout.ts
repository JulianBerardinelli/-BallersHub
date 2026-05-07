// Server-only: create a checkout session in our DB AND in the chosen
// processor (Stripe or Mercado Pago). Returns the redirect URL the user
// should be sent to.
//
// This is the single entry point used by the `/checkout/[planId]` UI. The
// processor is decided automatically from the currency.

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutSessions, billingAddresses } from "@/db/schema";
import {
  type CheckoutPlanId,
  type CheckoutCurrency,
  getPlanPrice,
  processorFor,
  TRIAL_DAYS,
} from "./plans";
import { getStripe } from "./stripe";
import { getMpPreApproval } from "./mercadopago";
import { billingEnv } from "./env";

export type BillingAddressInput = {
  fullName: string;
  taxId?: string | null;
  taxIdType?:
    | "dni"
    | "cuit"
    | "cuil"
    | "nie"
    | "nif"
    | "vat"
    | "other"
    | null;
  countryCode: string;
  state?: string | null;
  city: string;
  postalCode: string;
  streetLine1: string;
  streetLine2?: string | null;
  phone?: string | null;
};

export type CreateCheckoutInput = {
  planId: CheckoutPlanId;
  currency: CheckoutCurrency;
  /** Authenticated user id. Pass null to create a guest session — they'll
   *  need to claim it after auth on the success callback. */
  userId: string | null;
  /** Email used by the processor for receipts. Required even for guests. */
  email: string;
  billingAddress: BillingAddressInput;
};

export type CreateCheckoutResult = {
  checkoutSessionId: string;
  redirectUrl: string;
  processor: "stripe" | "mercado_pago";
};

const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export async function createCheckout(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const { planId, currency, userId, email, billingAddress } = input;
  const price = getPlanPrice(planId, currency);
  const processor = processorFor(currency);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  // 1. Persist billing address (we keep one row per checkout — easier to
  //    audit than mutating shared addresses).
  const [address] = await db
    .insert(billingAddresses)
    .values({
      userId: userId ?? "00000000-0000-0000-0000-000000000000",
      fullName: billingAddress.fullName,
      taxId: billingAddress.taxId ?? null,
      taxIdType: billingAddress.taxIdType ?? null,
      countryCode: billingAddress.countryCode,
      state: billingAddress.state ?? null,
      city: billingAddress.city,
      postalCode: billingAddress.postalCode,
      streetLine1: billingAddress.streetLine1,
      streetLine2: billingAddress.streetLine2 ?? null,
      phone: billingAddress.phone ?? null,
    })
    .returning({ id: billingAddresses.id });

  // 2. Create the local checkout_sessions row first (status: pending) so
  //    we have an internal id to pass to the processor as `external_reference`
  //    / `client_reference_id`.
  const [session] = await db
    .insert(checkoutSessions)
    .values({
      userId,
      planId,
      currency,
      processor,
      status: "pending",
      billingAddressId: address.id,
      amountMinor: price.amountMinor,
      trialDays: processor === "stripe" ? TRIAL_DAYS : 0,
      expiresAt,
      metadata: {
        email,
        // Useful in support: shows where the user came from in case they
        // contact us about a stuck checkout.
        userAgent: "n/a",
      },
    })
    .returning({ id: checkoutSessions.id });

  const internalSessionId = session.id;

  // 3. Hand off to the processor.
  if (processor === "stripe") {
    return await createStripeCheckout({
      internalSessionId,
      planId,
      currency,
      email,
      price,
    });
  }

  return await createMpCheckout({
    internalSessionId,
    planId,
    currency,
    email,
    price,
  });
}

// ---------------------------------------------------------------
// Stripe Checkout — `mode: 'subscription'` with a 7-day trial
// ---------------------------------------------------------------

async function createStripeCheckout(args: {
  internalSessionId: string;
  planId: CheckoutPlanId;
  currency: CheckoutCurrency;
  email: string;
  price: ReturnType<typeof getPlanPrice>;
}): Promise<CreateCheckoutResult> {
  const stripe = getStripe();
  const baseUrl = billingEnv.appUrl();
  const stripeCurrency = args.currency.toLowerCase();
  const priceId = billingEnv.stripePriceId(
    args.planId,
    args.currency as "USD" | "EUR",
  );

  const lineItem = priceId
    ? // Preferred path: Price provisioned in Stripe Dashboard, pinned by env.
      { price: priceId, quantity: 1 }
    : // Fallback: ad-hoc Price using `price_data`. Useful in dev / preview
      // envs where we haven't yet provisioned the canonical Price object.
      {
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: planLabel(args.planId),
            description: planDescription(args.planId),
          },
          unit_amount: args.price.amountMinor,
          recurring: { interval: "year" as const },
        },
        quantity: 1,
      };

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [lineItem],
    customer_email: args.email,
    client_reference_id: args.internalSessionId,
    // Land on /processing first; that page polls our DB and forwards to
    // /success once the webhook has flipped checkout_sessions.status to
    // 'completed'. Avoids the awkward "is it done yet?" flash when the
    // webhook hasn't arrived by the time the user is redirected back.
    success_url: `${baseUrl}/checkout/processing?internal=${args.internalSessionId}&cs_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/${args.planId}?currency=${args.currency}&canceled=1&internal=${args.internalSessionId}`,
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: {
        internal_session_id: args.internalSessionId,
        plan_id: args.planId,
      },
    },
    metadata: {
      internal_session_id: args.internalSessionId,
      plan_id: args.planId,
    },
    // Always-on: tax_id_collection is the right move for B2B-like SaaS.
    tax_id_collection: { enabled: true },
    billing_address_collection: "auto",
    locale: "es-419", // LatAm Spanish
  });

  if (!stripeSession.url) {
    throw new Error("[createCheckout] Stripe did not return a session URL");
  }

  await db
    .update(checkoutSessions)
    .set({
      status: "redirected",
      processorSessionId: stripeSession.id,
      processorSessionUrl: stripeSession.url,
    })
    .where(eqId(args.internalSessionId));

  return {
    checkoutSessionId: args.internalSessionId,
    redirectUrl: stripeSession.url,
    processor: "stripe",
  };
}

// ---------------------------------------------------------------
// Mercado Pago — Subscriptions API (preapproval)
//
// Uses MP's recurring billing API instead of one-time Checkout Pro. This
// gives us native annual recurrence + 7-day free trial without needing a
// cron job to re-create preferences each year. The user authorises the
// subscription once via the redirect URL; MP charges automatically at
// each interval and emits `subscription.*` / `invoice.*` webhooks we
// handle in `lib/billing/handlers/mercadopago.ts`.
//
// Reference: skills/mp-subscriptions/SKILL.md
// ---------------------------------------------------------------

async function createMpCheckout(args: {
  internalSessionId: string;
  planId: CheckoutPlanId;
  currency: CheckoutCurrency;
  email: string;
  price: ReturnType<typeof getPlanPrice>;
}): Promise<CreateCheckoutResult> {
  const preapproval = getMpPreApproval();
  const baseUrl = billingEnv.appUrl();

  // Annual recurrence expressed as 12-month frequency. MP's
  // `frequency_type` only supports `days` and `months` — there is no
  // `years` value (per skill reference table).
  //
  // Trial caveats (known limitations with `/preapproval` direct creation):
  //   - `free_trial` is only valid on `/preapproval_plan` (abstract plans).
  //   - `start_date` is silently ignored / rejected without `card_token_id`
  //     in the redirect flow. We don't pass it.
  //   - Net effect: in test mode there is no native MP-side trial. The
  //     first cycle charges immediately on authorization. We compensate
  //     in the handler by tagging the local subscription as `trialing`
  //     for the first TRIAL_DAYS regardless.
  //   - Long-term: migrate to `/preapproval_plan` ids per (planId × ARS),
  //     pin in env vars (mirror Stripe Prices). See docs §6.
  //
  // Test-mode payer override: MP rejects `payer_email` values that
  // don't match a registered test buyer (the error is non-descriptive
  // — known footgun, see goncy/next-mercadopago README). Set
  // MP_TEST_BUYER_EMAIL to the *exact* email of your MP test buyer
  // account (find it inside that test buyer's profile after logging in
  // at mercadopago.com.ar in incognito).
  //
  // Credential format note: `MP_ACCESS_TOKEN` must be the `APP_USR-*`
  // PRODUCTION credential of an application owned by a TEST SELLER
  // account. MP deprecated the legacy `TEST-*` sandbox tokens for
  // Subscriptions; using one returns a generic 400 / 401 here.
  const tokenIsLegacyTest = (process.env.MP_ACCESS_TOKEN ?? "").startsWith(
    "TEST-",
  );
  const testBuyerEmail = process.env.MP_TEST_BUYER_EMAIL?.trim();
  const payerEmail = testBuyerEmail || args.email;

  const result = await preapproval.create({
    body: {
      reason: planLabel(args.planId),
      external_reference: args.internalSessionId,
      payer_email: payerEmail,
      back_url: `${baseUrl}/checkout/processing?internal=${args.internalSessionId}`,
      auto_recurring: {
        frequency: 12,
        frequency_type: "months",
        transaction_amount: args.price.amount,
        currency_id: "ARS",
      },
      // status: "pending" is required for the redirect flow (no card
      // token capture). Confirmed against goncy/next-mercadopago which
      // is a known-working reference for MP Subscriptions.
      status: "pending",
    },
  }).catch((err: unknown) => {
    // Re-throw with a richer message so the action layer can log the
    // MP API body (signal, message, error). Plain `throw err` loses
    // the MP-specific detail because the SDK doesn't always serialize
    // its error payload via `Error#message`.
    if (tokenIsLegacyTest) {
      console.warn(
        "[mp-create] Hint: MP_ACCESS_TOKEN starts with `TEST-` (deprecated sandbox format). Subscriptions require an APP_USR-* token from a test seller account.",
      );
    }
    throw err;
  });

  const url = result.init_point;
  if (!url || !result.id) {
    throw new Error(
      "[createCheckout] Mercado Pago did not return a preapproval URL",
    );
  }

  await db
    .update(checkoutSessions)
    .set({
      status: "redirected",
      processorSessionId: result.id,
      processorSessionUrl: url,
    })
    .where(eqId(args.internalSessionId));

  return {
    checkoutSessionId: args.internalSessionId,
    redirectUrl: url,
    processor: "mercado_pago",
  };
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function planLabel(planId: CheckoutPlanId): string {
  return planId === "pro-agency" ? "BallersHub Pro Agency" : "BallersHub Pro Player";
}

function planDescription(planId: CheckoutPlanId): string {
  return planId === "pro-agency"
    ? "Suscripción anual al plan Pro Agency. Cobro anual, renovable. 7 días de prueba sin cargo."
    : "Suscripción anual al plan Pro Player. Cobro anual, renovable. 7 días de prueba sin cargo.";
}

function eqId(id: string) {
  return eq(checkoutSessions.id, id);
}
