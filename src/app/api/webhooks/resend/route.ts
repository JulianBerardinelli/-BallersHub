import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  marketingCampaigns,
  marketingEmailEvents,
  marketingSends,
  marketingSubscriptions,
} from "@/db/schema";
import { suppress } from "@/lib/marketing/suppression";
import { verifyResendWebhook } from "@/lib/marketing/verify-resend-webhook";
import { recordDelivery, recordEngagement } from "@/lib/marketing/engagement";

/**
 * Resend webhook handler.
 *
 * 1. Verifies the Standard Webhooks signature (`Svix-*` headers).
 * 2. Stores the raw event in `marketing_email_events` (audit trail).
 * 3. Mutates `marketing_sends` + `marketing_campaigns` counters + the
 *    subscriber's engagement metrics.
 * 4. Auto-adds the recipient to the suppression list on hard bounces
 *    and complaints (deliverability protection).
 *
 * Resend dashboard → Webhooks → point to:
 *   POST https://ballershub.co/api/webhooks/resend
 * Then copy the signing secret into env: `RESEND_WEBHOOK_SECRET=whsec_...`.
 */

type ResendWebhookEvent = {
  type: string; // 'email.sent' | 'email.delivered' | 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.complained' | 'email.delivery_delayed'
  created_at: string;
  data: {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    bounce?: { type?: string; subType?: string; message?: string };
    [key: string]: unknown;
  };
};

const REQUIRED_HEADERS = {
  id: "svix-id",
  timestamp: "svix-timestamp",
  signature: "svix-signature",
} as const;

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not set; rejecting payload.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const body = await req.text();

  try {
    verifyResendWebhook({
      body,
      svixId: req.headers.get(REQUIRED_HEADERS.id),
      svixTimestamp: req.headers.get(REQUIRED_HEADERS.timestamp),
      svixSignature: req.headers.get(REQUIRED_HEADERS.signature),
      secret,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Signature error." },
      { status: 401 },
    );
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(body) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const messageId = event.data?.email_id ?? null;
  const recipient = (event.data?.to ?? [])[0]?.toLowerCase().trim() ?? null;

  // 1) Always log the raw event for audit / replay
  await db.insert(marketingEmailEvents).values({
    resendMessageId: messageId,
    eventType: event.type,
    payload: event as unknown as Record<string, unknown>,
  });

  if (!messageId) {
    return NextResponse.json({ ok: true, note: "No email_id present." });
  }

  // 2) Find the corresponding send (idempotent — if it doesn't exist yet, no-op)
  const send = await db.query.marketingSends.findFirst({
    where: eq(marketingSends.resendMessageId, messageId),
  });

  // Map Resend event → internal status
  const nextStatus = mapEventToStatus(event.type);

  if (send) {
    if (nextStatus) {
      await db
        .update(marketingSends)
        .set({ status: nextStatus, lastEventAt: new Date() })
        .where(eq(marketingSends.id, send.id));
    } else {
      await db
        .update(marketingSends)
        .set({ lastEventAt: new Date() })
        .where(eq(marketingSends.id, send.id));
    }

    // Bump campaign counters
    if (send.campaignId) {
      const counterField = mapEventToCampaignCounter(event.type);
      if (counterField) {
        await db
          .update(marketingCampaigns)
          .set({ [counterField]: sql`${marketingCampaigns[counterField]} + 1` })
          .where(eq(marketingCampaigns.id, send.campaignId));
      }
    }
  }

  // 3) Bump subscriber engagement metrics + tier
  if (recipient) {
    if (event.type === "email.opened") {
      await db
        .update(marketingSubscriptions)
        .set({
          lastOpenedAt: new Date(),
          totalOpens: sql`${marketingSubscriptions.totalOpens} + 1`,
        })
        .where(eq(marketingSubscriptions.email, recipient));
      // Reset skipped counter + promote tier to 'active' immediately.
      await recordEngagement(recipient);
    } else if (event.type === "email.clicked") {
      await db
        .update(marketingSubscriptions)
        .set({
          lastClickedAt: new Date(),
          totalClicks: sql`${marketingSubscriptions.totalClicks} + 1`,
        })
        .where(eq(marketingSubscriptions.email, recipient));
      await recordEngagement(recipient);
    } else if (event.type === "email.delivered") {
      await db
        .update(marketingSubscriptions)
        .set({
          lastSentAt: new Date(),
          totalSends: sql`${marketingSubscriptions.totalSends} + 1`,
        })
        .where(eq(marketingSubscriptions.email, recipient));
      // Increment skipped counter; tier recomputed inside the helper.
      await recordDelivery(recipient);
    }
  }

  // 4) Auto-suppress on hard bounce / complaint (deliverability)
  if (recipient && event.type === "email.bounced") {
    const bounceType = event.data?.bounce?.type ?? "";
    if (/hard/i.test(bounceType) || /permanent/i.test(bounceType)) {
      await suppress(recipient, "bounce_hard", send?.campaignId ?? undefined);
    }
  }

  if (recipient && event.type === "email.complained") {
    await suppress(recipient, "complaint", send?.campaignId ?? undefined);
  }

  return NextResponse.json({ ok: true });
}

function mapEventToStatus(eventType: string): string | null {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.delivery_delayed":
    default:
      return null;
  }
}

function mapEventToCampaignCounter(
  eventType: string,
):
  | "totalSent"
  | "totalDelivered"
  | "totalOpened"
  | "totalClicked"
  | "totalBounced"
  | "totalComplained"
  | null {
  switch (eventType) {
    case "email.sent":
      return "totalSent";
    case "email.delivered":
      return "totalDelivered";
    case "email.opened":
      return "totalOpened";
    case "email.clicked":
      return "totalClicked";
    case "email.bounced":
      return "totalBounced";
    case "email.complained":
      return "totalComplained";
    default:
      return null;
  }
}
