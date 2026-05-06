// Stripe webhook handler.
//
// Responsibilities (in order):
//   1. Read the raw body (required for signature verification).
//   2. Verify the Stripe signature using STRIPE_WEBHOOK_SECRET.
//   3. Persist the raw event (idempotent on processor + event id).
//   4. Dispatch to a typed handler per `event.type`.
//   5. Mark the event processed; on error, leave it unprocessed for retry
//      (Stripe will retry automatically up to 3 days).
//
// We intentionally accept Stripe retries: the recordEvent helper detects
// duplicates and short-circuits.

import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { billingEnv } from "@/lib/billing/env";
import { recordEvent, markEventProcessed } from "@/lib/billing/recordEvent";
import { handleStripeEvent } from "@/lib/billing/handlers/stripe";

// Stripe signature verification needs the raw body; opting out of body
// parsing in App Router by reading from req.text().
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      sig,
      billingEnv.stripeWebhookSecret(),
    );
  } catch (err) {
    console.warn("[stripe-webhook] signature verification failed", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  // Persist first; we want a paper trail even if processing fails.
  const { eventRowId, isFirst, needsReprocess } = await recordEvent({
    processor: "stripe",
    processorEventId: event.id,
    eventType: event.type,
    payload: event,
  });

  // Already processed AND committed successfully → ack with 200 so Stripe
  // stops retrying. If `needsReprocess` is true, the prior attempt failed
  // (handler threw / DB blip), so let it fall through and re-dispatch.
  if (!isFirst && !needsReprocess) {
    return NextResponse.json({ received: true, replay: true });
  }

  try {
    await handleStripeEvent(event, eventRowId);
    await markEventProcessed(eventRowId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] handler failed", { type: event.type, message });
    await markEventProcessed(eventRowId, message);
    // Returning 500 makes Stripe retry — desired for transient failures.
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true, replay: !isFirst });
}
