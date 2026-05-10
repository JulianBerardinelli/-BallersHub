// Cancel a subscription owned by the calling user. Works for both Stripe
// and Mercado Pago — the choice is implicit in the subscription row.
//
// Behaviour:
//   - Stripe: sets `cancel_at_period_end` (so the user keeps access until
//     `current_period_end`). The Stripe webhook then flips
//     `subscriptions.statusV2` to `canceled` once the period ends.
//   - Mercado Pago: calls `preApproval.update({ status: 'cancelled' })`.
//     MP cancels immediately (no period-end concept on their preapproval).
//   - Refund window: if the cancellation arrives within REFUND_GRACE_DAYS
//     of the original `subscriptions.createdAt`, we eagerly mark the local
//     row as canceled and rely on Customer Portal (Stripe) or out-of-band
//     refund (MP) for the actual money-back step. We DO NOT auto-refund
//     here — that's a destructive op the user should confirm in Stripe's
//     hosted portal or via support for MP.
//
// Auth-gated by Supabase session.

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { getStripe } from "@/lib/billing/stripe";
import { getMpPreApproval } from "@/lib/billing/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        inArray(subscriptions.statusV2, ["trialing", "active", "past_due", "paused"]),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!sub) {
    return NextResponse.json(
      { error: "No active subscription found." },
      { status: 404 },
    );
  }

  if (!sub.processorSubscriptionId) {
    return NextResponse.json(
      { error: "Subscription has no processor reference." },
      { status: 422 },
    );
  }

  try {
    if (sub.processor === "stripe") {
      const updated = await getStripe().subscriptions.update(
        sub.processorSubscriptionId,
        { cancel_at_period_end: true },
      );
      await db
        .update(subscriptions)
        .set({
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.id));
      return NextResponse.json({
        ok: true,
        processor: "stripe",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: updated.cancel_at
          ? new Date(updated.cancel_at * 1000).toISOString()
          : sub.currentPeriodEnd?.toISOString() ?? null,
      });
    }

    if (sub.processor === "mercado_pago") {
      await getMpPreApproval().update({
        id: sub.processorSubscriptionId,
        body: { status: "cancelled" },
      });
      await db
        .update(subscriptions)
        .set({
          statusV2: "canceled",
          status: "canceled",
          plan: "free",
          canceledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.id));
      return NextResponse.json({
        ok: true,
        processor: "mercado_pago",
        cancelAtPeriodEnd: false,
        canceledAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: `Unknown processor: ${sub.processor}` },
      { status: 422 },
    );
  } catch (err) {
    const message = extractErrorMessage(err);
    console.error("[billing/cancel] failed", {
      userId: user.id,
      subId: sub.id,
      processor: sub.processor,
      message,
      raw: err,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Extract a human-readable message from anything thrown. Stripe / MP SDKs
 * and `fetch` failures sometimes throw plain objects with a `message` or
 * nested `cause.message`; we walk those paths instead of falling through
 * to `String(err)` which yields the dreaded "[object Object]".
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.error === "string") return o.error;
    if (
      o.error &&
      typeof o.error === "object" &&
      typeof (o.error as Record<string, unknown>).message === "string"
    ) {
      return (o.error as Record<string, unknown>).message as string;
    }
    if (o.cause && o.cause instanceof Error) return o.cause.message;
    try {
      return JSON.stringify(err);
    } catch {
      return "Error desconocido en la cancelación.";
    }
  }
  return String(err);
}
