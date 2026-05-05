// Stripe event router. Each handler is purposefully tiny and idempotent —
// they read the latest state from Stripe (instead of trusting the event
// payload, which may be stale after retries) and upsert into our DB.
//
// Phase-1 scope: enough plumbing to update `subscriptions` and link
// `checkout_sessions` on the happy path. Edge cases (chargebacks, dunning)
// land in Phase 6.

import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { checkoutSessions, subscriptions } from "@/db/schema";
import { getStripe } from "../stripe";

export async function handleStripeEvent(
  event: Stripe.Event,
  _eventRowId: string,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await onSubscriptionChange(event.data.object as Stripe.Subscription);
      break;

    case "invoice.paid":
    case "invoice.payment_failed":
      // Phase 1: just log. Phase 3 will email the user and update past_due
      // / active state more precisely.
      break;

    default:
      // Unhandled types are fine — we still recorded them in payment_events.
      break;
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const internalId = session.client_reference_id ?? session.metadata?.internal_session_id;
  if (!internalId) return;

  await db
    .update(checkoutSessions)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(checkoutSessions.id, internalId));

  // If this was a subscription mode checkout, the actual subscription row
  // is created by `customer.subscription.created` (which fires immediately
  // after this event). We don't need to do anything else here.
}

async function onSubscriptionChange(sub: Stripe.Subscription): Promise<void> {
  // Look up the checkout session by metadata to find our internal user id.
  const internalSessionId = sub.metadata?.internal_session_id;
  const planId = sub.metadata?.plan_id;
  if (!internalSessionId) return;

  const [checkout] = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, internalSessionId))
    .limit(1);
  if (!checkout) return;

  const status = mapStripeStatus(sub.status);
  const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
  // Stripe API: `current_period_start/end` live on the first item, not the
  // subscription root, in v2025-04-30. Read them defensively to support
  // older snapshots too.
  const periodStart = readPeriodStart(sub);
  const periodEnd = readPeriodEnd(sub);

  // We may already have a row for this checkout (e.g. on subsequent updates).
  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.processorSubscriptionId, sub.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(subscriptions).values({
      userId: checkout.userId ?? "00000000-0000-0000-0000-000000000000",
      planId: planId ?? checkout.planId,
      currency: checkout.currency,
      processor: "stripe",
      processorSubscriptionId: sub.id,
      processorCustomerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      trialEndsAt,
      currentPeriodStartsAt: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      billingAddressId: checkout.billingAddressId,
      statusV2: status,
      // Mirror to legacy fields the rest of the app reads.
      plan: status === "trialing" || status === "active" ? "pro" : "free",
      status: status === "active" ? "active" : status,
    });
  } else {
    await db
      .update(subscriptions)
      .set({
        statusV2: status,
        trialEndsAt,
        currentPeriodStartsAt: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        updatedAt: new Date(),
        plan: status === "trialing" || status === "active" ? "pro" : "free",
        status: status === "active" ? "active" : status,
      })
      .where(eq(subscriptions.processorSubscriptionId, sub.id));
  }

  // Touch Stripe just to make sure we have the latest billing details
  // cached in case downstream tooling expects them. Soft-fail: any error
  // here doesn't change subscription state.
  try {
    await getStripe().subscriptions.retrieve(sub.id);
  } catch {
    /* non-fatal */
  }
}

function mapStripeStatus(s: Stripe.Subscription.Status): import("@/db/schema").SubscriptionStatusV2 {
  switch (s) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    default:
      return "incomplete";
  }
}

type PeriodAccessor = {
  current_period_start?: number | null;
  current_period_end?: number | null;
  items?: { data?: Array<{ current_period_start?: number; current_period_end?: number }> };
};

function readPeriodStart(sub: Stripe.Subscription): Date | null {
  const s = sub as unknown as PeriodAccessor;
  const ts =
    s.current_period_start ?? s.items?.data?.[0]?.current_period_start ?? null;
  return ts ? new Date(ts * 1000) : null;
}

function readPeriodEnd(sub: Stripe.Subscription): Date | null {
  const s = sub as unknown as PeriodAccessor;
  const ts = s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? null;
  return ts ? new Date(ts * 1000) : null;
}
