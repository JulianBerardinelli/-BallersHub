// Mercado Pago webhook handler.
//
// Differences vs Stripe:
//   - MP webhook signing uses x-signature + x-request-id headers (HMAC).
//   - The body is small; the real data has to be fetched from MP's API.
//   - MP retries up to 5 times with backoff if we don't return 200.
//
// We persist the raw event regardless of whether processing succeeds, so
// support has a record of every notification.

import { NextResponse, type NextRequest } from "next/server";
import { recordEvent, markEventProcessed } from "@/lib/billing/recordEvent";
import { verifyMpSignature } from "@/lib/billing/verifyMpSignature";
import {
  handleMercadoPagoEvent,
  type MpWebhookBody,
} from "@/lib/billing/handlers/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const sigHeader = req.headers.get("x-signature");
  const reqIdHeader = req.headers.get("x-request-id");
  const resourceId = params.get("data.id") ?? params.get("id");

  let body: MpWebhookBody = {};
  let rawBody = "";
  try {
    rawBody = await req.text();
    body = rawBody.length > 0 ? (JSON.parse(rawBody) as MpWebhookBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Verify signature unless we're explicitly running in a dev env without
  // a configured secret. In that case, log a loud warning but proceed —
  // makes local sandbox work without ngrok signature wrangling.
  if (process.env.MP_WEBHOOK_SECRET) {
    const ok = verifyMpSignature({
      signatureHeader: sigHeader,
      requestIdHeader: reqIdHeader,
      resourceId,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      );
    }
  } else {
    console.warn("[mp-webhook] MP_WEBHOOK_SECRET unset — skipping signature check (dev only)");
  }

  // Build a deterministic event id. MP doesn't emit one as nicely as Stripe,
  // so we synthesize from x-request-id (or fall back to data.id+ts).
  const eventId =
    reqIdHeader ??
    (resourceId
      ? `${resourceId}-${(body as { date_created?: string }).date_created ?? Date.now()}`
      : `unknown-${Date.now()}`);

  const eventType =
    body.type ?? body.topic ?? params.get("type") ?? params.get("topic") ?? "unknown";

  const { eventRowId, isFirst, needsReprocess } = await recordEvent({
    processor: "mercado_pago",
    processorEventId: eventId,
    eventType,
    payload: { body, query: Object.fromEntries(params.entries()) },
  });

  // Already seen AND committed → 200 so MP stops retrying. If the prior
  // attempt failed (`needsReprocess`), fall through and re-dispatch.
  if (!isFirst && !needsReprocess) {
    return NextResponse.json({ received: true, replay: true });
  }

  try {
    await handleMercadoPagoEvent(body, params);
    await markEventProcessed(eventRowId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mp-webhook] handler failed", { eventType, message });
    await markEventProcessed(eventRowId, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true, replay: !isFirst });
}
