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
import { getMpPreference } from "./mercadopago";
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
// Mercado Pago Checkout Pro — redirect-based
// ---------------------------------------------------------------

async function createMpCheckout(args: {
  internalSessionId: string;
  planId: CheckoutPlanId;
  currency: CheckoutCurrency;
  email: string;
  price: ReturnType<typeof getPlanPrice>;
}): Promise<CreateCheckoutResult> {
  const preference = getMpPreference();
  const baseUrl = billingEnv.appUrl();

  const result = await preference.create({
    body: {
      items: [
        {
          id: args.planId,
          title: planLabel(args.planId),
          description: planDescription(args.planId),
          quantity: 1,
          unit_price: args.price.amount,
          currency_id: "ARS",
        },
      ],
      payer: { email: args.email },
      back_urls: {
        // Same rationale as Stripe: route through /processing so the page
        // can wait on the MP webhook before showing success.
        success: `${baseUrl}/checkout/processing?internal=${args.internalSessionId}`,
        failure: `${baseUrl}/checkout/failure?internal=${args.internalSessionId}`,
        pending: `${baseUrl}/checkout/pending?internal=${args.internalSessionId}`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      external_reference: args.internalSessionId,
      statement_descriptor: "BALLERSHUB",
      metadata: {
        plan_id: args.planId,
        internal_session_id: args.internalSessionId,
      },
    },
  });

  const url = result.init_point ?? result.sandbox_init_point;
  if (!url || !result.id) {
    throw new Error(
      "[createCheckout] Mercado Pago did not return a preference URL",
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
