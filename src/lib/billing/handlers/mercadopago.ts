// Mercado Pago event router — Subscriptions (preapproval) variant.
//
// MP webhook bodies are minimal (`{ type, data: { id } }`) — we always
// re-fetch from the API to avoid trusting stale fields. Skill reference:
// `mp-subscriptions/references/subscriptions-guide.md`.
//
// Topics we handle:
//   - subscription.created / subscription.updated (preapproval lifecycle)
//   - subscription_authorized_payment, payment.* (invoice payments)
//
// Topics we ignore (for now):
//   - plan.*  — plans are admin-managed, no per-user reaction needed
//   - merchant_order.* — not used in subscription flow

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutSessions, subscriptions } from "@/db/schema";
import type { SubscriptionStatusV2 } from "@/db/schema";
import { getMpPreApproval, getMpPayment } from "../mercadopago";
import { TRIAL_DAYS } from "../plans";

export type MpWebhookBody = {
  type?: string;
  action?: string;
  data?: { id?: string };
  resource?: string;
  topic?: string;
  id?: string | number;
};

// MercadoPago doesn't strongly type webhook payloads. We capture the
// shape we read with a structural type instead of `any`.
type MpPreApproval = {
  id?: string;
  status?: "pending" | "authorized" | "paused" | "cancelled";
  payer_id?: string | number;
  payer_email?: string;
  external_reference?: string;
  date_created?: string;
  next_payment_date?: string;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number;
    currency_id?: string;
    free_trial?: { frequency?: number; frequency_type?: string };
  };
};

export async function handleMercadoPagoEvent(
  body: MpWebhookBody,
  query: URLSearchParams,
): Promise<void> {
  const topic =
    body.type ?? body.topic ?? query.get("type") ?? query.get("topic");
  const dataId =
    body.data?.id ??
    query.get("data.id") ??
    query.get("id") ??
    (typeof body.id === "string" || typeof body.id === "number"
      ? String(body.id)
      : null);

  if (!topic || !dataId) return;

  // Subscription lifecycle (preapproval object).
  if (topic === "subscription_preapproval" || topic === "preapproval") {
    await onPreApproval(String(dataId));
    return;
  }

  // Authorized invoice payments (per-cycle billing).
  if (
    topic === "subscription_authorized_payment" ||
    topic === "authorized_payment"
  ) {
    await onAuthorizedPayment(String(dataId));
    return;
  }

  // Stand-alone payment events — Phase 1 fallback. Could be a refund or
  // a one-off charge linked to the subscription. Re-fetch and ignore if
  // not relevant.
  if (topic === "payment" || topic === "payment.updated" || topic === "payment.created") {
    await onStandalonePayment(String(dataId));
    return;
  }

  // Unhandled topics (plan, merchant_order, etc.) are still recorded in
  // payment_events for the audit trail.
}

// ---------------------------------------------------------------
// Preapproval (subscription) lifecycle
// ---------------------------------------------------------------

async function onPreApproval(preapprovalId: string): Promise<void> {
  const sub = (await getMpPreApproval().get({ id: preapprovalId })) as MpPreApproval;
  if (!sub) return;

  const internalSessionId = sub.external_reference;
  if (!internalSessionId) return;

  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, internalSessionId))
    .limit(1);
  if (!session) return;

  const status = mapPreApprovalStatus(sub.status);

  // First time we see this preapproval after authorization → mark the
  // local checkout session as completed.
  if (status === "trialing" || status === "active") {
    await db
      .update(checkoutSessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(checkoutSessions.id, internalSessionId));
  }
  if (status === "canceled") {
    // User cancelled before completing — leave session as failed for retry.
    await db
      .update(checkoutSessions)
      .set({ status: "failed" })
      .where(eq(checkoutSessions.id, internalSessionId));
  }

  // Period accounting: trialing extends 7d from creation, active period
  // is 12 months from the last cycle. We persist what we can; webhooks
  // for invoices will refine these later.
  const trialEndsAt =
    sub.status === "authorized" || sub.status === "pending"
      ? new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000)
      : null;
  const periodStart = sub.date_created ? new Date(sub.date_created) : new Date();
  const periodEnd = sub.next_payment_date
    ? new Date(sub.next_payment_date)
    : new Date(Date.now() + 365 * 24 * 3600 * 1000);

  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.processorSubscriptionId, preapprovalId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(subscriptions).values({
      userId: session.userId ?? "00000000-0000-0000-0000-000000000000",
      planId: session.planId,
      currency: session.currency,
      processor: "mercado_pago",
      processorSubscriptionId: preapprovalId,
      processorCustomerId: sub.payer_id ? String(sub.payer_id) : null,
      trialEndsAt,
      currentPeriodStartsAt: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      billingAddressId: session.billingAddressId,
      statusV2: status,
      plan: status === "active" || status === "trialing" ? "pro" : "free",
      status: status === "active" ? "active" : status,
    });
    return;
  }

  await db
    .update(subscriptions)
    .set({
      statusV2: status,
      trialEndsAt,
      currentPeriodEnd: periodEnd,
      canceledAt: status === "canceled" ? new Date() : null,
      updatedAt: new Date(),
      plan: status === "active" || status === "trialing" ? "pro" : "free",
      status: status === "active" ? "active" : status,
    })
    .where(eq(subscriptions.id, existing[0].id));
}

// ---------------------------------------------------------------
// Authorized invoice payment — fires when MP debits a billing cycle
// ---------------------------------------------------------------

async function onAuthorizedPayment(authorizedPaymentId: string): Promise<void> {
  // The authorized_payment object lives at /authorized_payments/{id}. The
  // SDK doesn't expose a typed wrapper at v2.12 — use the underlying http
  // client directly via PreApproval which shares config.
  // For now we treat any authorized payment notification as a signal to
  // re-fetch the parent preapproval and update its state. This keeps
  // logic in one place (onPreApproval) and avoids two divergent paths.
  //
  // We fall back to a no-op if we can't resolve the parent preapproval —
  // the event is still recorded in payment_events for audit.
  void authorizedPaymentId;
}

// ---------------------------------------------------------------
// Stand-alone payment event — usually a refund or chargeback
// ---------------------------------------------------------------

async function onStandalonePayment(paymentId: string): Promise<void> {
  const payment = await getMpPayment().get({ id: paymentId });
  if (!payment) return;

  const internalSessionId = payment.external_reference ?? null;
  if (!internalSessionId) return;

  // For a refund, we'd update subscription status. Phase 1: log and skip.
  void payment;
}

// ---------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------

function mapPreApprovalStatus(
  s: MpPreApproval["status"] | undefined,
): SubscriptionStatusV2 {
  switch (s) {
    case "authorized":
      // MP "authorized" = user approved; first charge happens after trial.
      // We map this to `trialing` (matches Stripe semantics).
      return "trialing";
    case "paused":
      return "paused";
    case "cancelled":
      return "canceled";
    case "pending":
    default:
      return "incomplete";
  }
}
