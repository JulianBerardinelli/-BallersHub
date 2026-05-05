// Mercado Pago event router.
//
// MP webhook bodies are minimal (`{ type, action, data: { id } }`) — the
// real state lives behind a fetch to `Payment.get(id)` or
// `Preference.get(id)`. We always re-fetch to avoid trusting unverified
// fields and to handle edge cases where the body lags reality.

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutSessions, subscriptions } from "@/db/schema";
import { getMpPayment, getMpPreference } from "../mercadopago";
import { TRIAL_DAYS } from "../plans";

export type MpWebhookBody = {
  type?: string;
  action?: string;
  data?: { id?: string };
  resource?: string;
  topic?: string;
  id?: string | number;
};

export async function handleMercadoPagoEvent(
  body: MpWebhookBody,
  query: URLSearchParams,
): Promise<void> {
  const topic = body.type ?? body.topic ?? query.get("type") ?? query.get("topic");
  const dataId =
    body.data?.id ??
    query.get("data.id") ??
    query.get("id") ??
    (typeof body.id === "string" || typeof body.id === "number"
      ? String(body.id)
      : null);

  if (!topic || !dataId) {
    // Nothing actionable. Recorded in payment_events for auditing.
    return;
  }

  if (topic === "payment" || topic === "payment.updated" || topic === "payment.created") {
    await onPayment(String(dataId));
    return;
  }

  if (topic === "merchant_order") {
    // Phase 1: ignore — the payment notification is what we act on.
    return;
  }
}

async function onPayment(paymentId: string): Promise<void> {
  const payment = await getMpPayment().get({ id: paymentId });
  if (!payment) return;

  // `external_reference` is what we set when we created the preference —
  // it's our internal checkout_sessions id.
  const internalSessionId = payment.external_reference ?? null;
  if (!internalSessionId) return;

  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, internalSessionId))
    .limit(1);
  if (!session) return;

  // Update the checkout_session status based on the payment outcome.
  const status = payment.status;
  if (status === "approved") {
    await db
      .update(checkoutSessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(checkoutSessions.id, internalSessionId));

    await upsertMpSubscription({
      session,
      paymentId,
      paymentPayerId:
        typeof payment.payer === "object"
          ? (payment.payer?.id ? String(payment.payer.id) : null)
          : null,
    });
    return;
  }

  if (status === "rejected" || status === "cancelled") {
    await db
      .update(checkoutSessions)
      .set({ status: "failed" })
      .where(eq(checkoutSessions.id, internalSessionId));
    return;
  }

  // pending / in_process — leave as 'redirected' so the user can retry.
}

async function upsertMpSubscription(args: {
  session: typeof checkoutSessions.$inferSelect;
  paymentId: string;
  paymentPayerId: string | null;
}): Promise<void> {
  const { session, paymentId, paymentPayerId } = args;

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000);
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.processorSubscriptionId, paymentId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(subscriptions).values({
      userId: session.userId ?? "00000000-0000-0000-0000-000000000000",
      planId: session.planId,
      currency: session.currency,
      processor: "mercado_pago",
      processorSubscriptionId: paymentId,
      processorCustomerId: paymentPayerId,
      trialEndsAt,
      currentPeriodStartsAt: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      billingAddressId: session.billingAddressId,
      statusV2: "active",
      plan: "pro",
      status: "active",
    });
  } else {
    await db
      .update(subscriptions)
      .set({
        statusV2: "active",
        plan: "pro",
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing[0].id));
  }
}

// Stub: kept for future preference-level events.
export const __preferenceLookup = getMpPreference;
