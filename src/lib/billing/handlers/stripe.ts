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
import {
  formatPlanAmount,
  getPlanPrice,
  isCheckoutCurrency,
  isCheckoutPlanId,
  type CheckoutPlanId,
} from "../plans";
import {
  sendPaymentFailedEmail,
  sendSubscriptionWelcomeEmail,
} from "@/lib/resend";
import { runSubscriptionSideEffects } from "../subscriptionSideEffects";

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
      // First successful charge after trial → status will already be
      // 'active' via subscription.updated, so we don't need to mutate
      // anything here. We could send a receipt email, but Stripe sends
      // its own (better-formatted) receipt for hosted Checkout.
      break;

    case "invoice.payment_failed":
      await onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
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

  // Two-phase lookup: first by processor_subscription_id (the row we
  // own), then by user_id (an auto-created free row that we need to
  // overwrite). The UNIQUE(user_id) constraint forces this — a blind
  // INSERT path would 23505 when there's already a free row for the user.
  let existing = await db
    .select({ id: subscriptions.id, plan: subscriptions.plan, userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.processorSubscriptionId, sub.id))
    .limit(1);

  if (existing.length === 0 && checkout.userId) {
    existing = await db
      .select({ id: subscriptions.id, plan: subscriptions.plan, userId: subscriptions.userId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, checkout.userId))
      .limit(1);
  }

  const nextPlan = status === "trialing" || status === "active" ? "pro" : "free";
  const userId = existing[0]?.userId ?? checkout.userId ?? null;
  const previousPlan = existing[0]?.plan ?? null;
  const isFirstWelcome = existing.length === 0;

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
      plan: nextPlan,
      status: status === "active" ? "active" : status,
    });
  } else {
    await db
      .update(subscriptions)
      .set({
        // Refresh ALL processor metadata. We may be upgrading a
        // pre-existing free row (no processor_subscription_id) into a
        // paid row.
        planId: planId ?? checkout.planId,
        currency: checkout.currency,
        processor: "stripe",
        processorSubscriptionId: sub.id,
        processorCustomerId:
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        statusV2: status,
        trialEndsAt,
        currentPeriodStartsAt: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        billingAddressId: checkout.billingAddressId,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        updatedAt: new Date(),
        plan: nextPlan,
        status: status === "active" ? "active" : status,
      })
      .where(eq(subscriptions.id, existing[0].id));
  }

  if (isFirstWelcome && (status === "trialing" || status === "active")) {
    await maybeSendWelcome({
      checkout,
      planId: (planId ?? checkout.planId) as string | null,
      trialEndsAt,
      nextChargeAt: periodEnd,
    });
  }

  if (userId) {
    await runSubscriptionSideEffects({
      userId,
      previousPlan,
      nextPlan,
      source: "stripe",
    });
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

// ---------------------------------------------------------------
// Dunning — invoice.payment_failed
// ---------------------------------------------------------------

async function onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // Stripe nests the parent subscription under `parent.subscription_details`
  // in v2025-04-30. Fall back to top-level `subscription` for older webhook
  // snapshots so we don't drop events during the migration window.
  const inv = invoice as unknown as {
    subscription?: string | { id?: string } | null;
    parent?: {
      subscription_details?: { subscription?: string | { id?: string } | null };
    } | null;
    next_payment_attempt?: number | null;
  };
  const ref =
    inv.subscription ??
    inv.parent?.subscription_details?.subscription ??
    null;
  const stripeSubId =
    typeof ref === "string" ? ref : ref?.id ?? null;
  if (!stripeSubId) return;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.processorSubscriptionId, stripeSubId))
    .limit(1);
  if (!sub) return;

  await db
    .update(subscriptions)
    .set({
      statusV2: "past_due",
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  // Notify the user. We tolerate any failure to look up the email — it's
  // better to mark the row past_due silently than to throw and lose the
  // status update.
  try {
    const email = await resolveEmailForUser(sub.userId);
    if (!email) return;
    const planId = normalizePlanId(sub.planId);
    if (!planId || !sub.currency || !isCheckoutCurrency(sub.currency)) return;
    const price = getPlanPrice(planId, sub.currency);
    const formatted = formatPlanAmount(price);
    const nextRetryAt = inv.next_payment_attempt
      ? new Date(inv.next_payment_attempt * 1000).toISOString()
      : null;
    await sendPaymentFailedEmail({
      email,
      displayName: email.split("@")[0],
      planId,
      formattedAmount: formatted,
      nextRetryAt,
    });
  } catch (err) {
    console.warn(
      "[stripe.onInvoicePaymentFailed] email send failed (non-fatal):",
      err instanceof Error ? err.message : err,
    );
  }
}

// ---------------------------------------------------------------
// Welcome email — fired once per new subscription
// ---------------------------------------------------------------

async function maybeSendWelcome(args: {
  checkout: typeof checkoutSessions.$inferSelect;
  planId: string | null;
  trialEndsAt: Date | null;
  nextChargeAt: Date | null;
}): Promise<void> {
  try {
    const meta = (args.checkout.metadata ?? {}) as Record<string, unknown>;
    const email =
      (typeof meta.email === "string" ? meta.email : null) ??
      (await resolveEmailForUser(args.checkout.userId));
    if (!email) return;

    const planId = normalizePlanId(args.planId);
    if (!planId) return;
    if (!args.checkout.currency || !isCheckoutCurrency(args.checkout.currency))
      return;

    const price = getPlanPrice(planId, args.checkout.currency);
    await sendSubscriptionWelcomeEmail({
      email,
      displayName: email.split("@")[0],
      planId,
      formattedAmount: formatPlanAmount(price),
      trialEndsAt: args.trialEndsAt?.toISOString() ?? null,
      nextChargeAt: args.nextChargeAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.warn(
      "[stripe.maybeSendWelcome] failed (non-fatal):",
      err instanceof Error ? err.message : err,
    );
  }
}

function normalizePlanId(value: string | null | undefined): CheckoutPlanId | null {
  return value && isCheckoutPlanId(value) ? value : null;
}

async function resolveEmailForUser(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  // Webhook handlers run outside an HTTP request context, so the cookie-
  // backed Supabase clients won't have a session. Use the service-role
  // admin client instead. Soft import keeps this lazy in case the module
  // isn't available at boot.
  try {
    const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
    const admin = createSupabaseAdmin();
    const { data } = await admin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}
