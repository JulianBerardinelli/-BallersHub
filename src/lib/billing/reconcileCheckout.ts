// Reconcile a local checkout_session with the source-of-truth state at the
// processor (Stripe / MP). Used as a self-healing fallback when webhooks
// miss (stripe listen wasn't running, network blip, db pool dropped during
// handler, etc.). Called from `/api/billing/reconcile-checkout` and from
// the `/checkout/processing` page after the polling window expires.
//
// Idempotent: safe to call multiple times. If the local row is already
// `completed`, returns early.

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutSessions } from "@/db/schema";
import type { CheckoutSession } from "@/db/schema";
import { handleStripeEvent } from "./handlers/stripe";
import { getStripe } from "./stripe";
import { getMpPreApproval } from "./mercadopago";

export type ReconcileOutcome =
  | { ok: true; status: CheckoutSession["status"]; refreshed: boolean }
  | { ok: false; error: string };

export async function reconcileCheckout(
  internalSessionId: string,
): Promise<ReconcileOutcome> {
  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, internalSessionId))
    .limit(1);

  if (!session) {
    return { ok: false, error: "Session not found" };
  }
  if (session.status === "completed") {
    return { ok: true, status: "completed", refreshed: false };
  }
  if (!session.processorSessionId) {
    return { ok: false, error: "Session has no processor reference yet" };
  }

  if (session.processor === "stripe") {
    return await reconcileStripe(session);
  }
  if (session.processor === "mercado_pago") {
    return await reconcileMercadoPago(session);
  }
  return { ok: false, error: `Unknown processor: ${session.processor}` };
}

// ---------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------

async function reconcileStripe(session: CheckoutSession): Promise<ReconcileOutcome> {
  const stripe = getStripe();
  let csObj;
  try {
    csObj = await stripe.checkout.sessions.retrieve(session.processorSessionId!, {
      expand: ["subscription"],
    });
  } catch (err) {
    return {
      ok: false,
      error: `Stripe lookup failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Replay the same logic the webhook handler would, by synthesizing a
  // minimal `Stripe.Event` and dispatching through `handleStripeEvent`.
  // This keeps the upsert + status-mapping rules in a single place.

  // 1. checkout.session.completed → flips checkout_sessions.status to completed
  if (csObj.status === "complete") {
    await handleStripeEvent(
      {
        id: `evt_reconcile_cs_${session.id}`,
        object: "event",
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        data: { object: csObj },
        livemode: csObj.livemode,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
        type: "checkout.session.completed",
      } as unknown as import("stripe").Stripe.Event,
      "reconcile",
    );
  }

  // 2. customer.subscription.created → upserts the local subscriptions row
  if (
    csObj.subscription &&
    typeof csObj.subscription !== "string" &&
    "id" in csObj.subscription
  ) {
    await handleStripeEvent(
      {
        id: `evt_reconcile_sub_${session.id}`,
        object: "event",
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        data: { object: csObj.subscription },
        livemode: csObj.livemode,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
        type: "customer.subscription.created",
      } as unknown as import("stripe").Stripe.Event,
      "reconcile",
    );
  }

  // Re-read the updated session row so the caller sees the new status.
  const [refreshed] = await db
    .select({ status: checkoutSessions.status })
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, session.id))
    .limit(1);

  return {
    ok: true,
    status: refreshed?.status ?? session.status,
    refreshed: true,
  };
}

// ---------------------------------------------------------------
// Mercado Pago
// ---------------------------------------------------------------

async function reconcileMercadoPago(
  session: CheckoutSession,
): Promise<ReconcileOutcome> {
  try {
    const sub = await getMpPreApproval().get({ id: session.processorSessionId! });
    if (!sub) return { ok: false, error: "MP preapproval not found" };

    const status = (sub as { status?: string }).status;
    if (status === "authorized" || status === "active") {
      await db
        .update(checkoutSessions)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(checkoutSessions.id, session.id));
      // The MP webhook handler also creates the subscriptions row — for
      // simplicity we let the next preapproval webhook do that, since MP
      // emits one shortly after authorization. Reconcile only marks the
      // session as completed so the UI moves on.
      return { ok: true, status: "completed", refreshed: true };
    }
    if (status === "cancelled") {
      await db
        .update(checkoutSessions)
        .set({ status: "failed" })
        .where(eq(checkoutSessions.id, session.id));
      return { ok: true, status: "failed", refreshed: true };
    }
    // Still pending authorization on MP's side — leave as is.
    return { ok: true, status: session.status, refreshed: false };
  } catch (err) {
    return {
      ok: false,
      error: `MP lookup failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
