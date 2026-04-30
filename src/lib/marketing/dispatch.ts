import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { marketingCampaigns, marketingSends } from "@/db/schema";
import { senderFrom } from "@/emails/tokens";
import { signUnsubscribeToken } from "./unsubscribe-token";

/**
 * Campaign dispatcher.
 *
 * Phase 1 ships the SHELL only (rate-limited batched send + idempotent
 * snapshot). Phase 2 will plug template rendering + actual audience
 * resolution and trigger this from the admin UI / cron.
 *
 * Why split the snapshot from the actual send:
 *   - If the dispatch worker crashes mid-batch, re-running picks up
 *     where it left off without re-sending duplicates (the
 *     `(campaign_id, email)` unique index guards us).
 *   - The snapshot is the source of truth for "this campaign hit X
 *     people" — even if some entries fail later.
 */

const RESEND_BATCH_SIZE = 100; // Resend API limit per batch.send call
const RATE_LIMIT_PAUSE_MS = 150; // ~6 req/s — safe under Resend's 10 req/s

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type DispatchInput = {
  campaignId: string;
  recipients: string[]; // already filtered by suppression + frequency cap
  /** Function that produces the HTML body for a single recipient. */
  renderHtmlForRecipient: (recipient: { email: string; unsubscribeToken: string }) => Promise<string>;
};

export type DispatchResult = {
  totalQueued: number;
  totalSent: number;
  totalFailed: number;
  errors: Array<{ email: string; message: string }>;
};

/**
 * Snapshot recipients into `marketing_sends` (idempotent), then send
 * via `resend.batch.send` in chunks. Updates per-row status as we go.
 *
 * Throws if Resend is not configured. Per-recipient failures are
 * surfaced in `result.errors` and recorded as `status='failed'` rows.
 */
export async function runCampaign({
  campaignId,
  recipients,
  renderHtmlForRecipient,
}: DispatchInput): Promise<DispatchResult> {
  if (!resend) {
    throw new Error("[dispatch] RESEND_API_KEY is not set.");
  }

  const campaign = await db.query.marketingCampaigns.findFirst({
    where: eq(marketingCampaigns.id, campaignId),
  });
  if (!campaign) throw new Error(`[dispatch] campaign ${campaignId} not found.`);

  // 1) Idempotent snapshot — every recipient becomes a `queued` row.
  const uniqueRecipients = Array.from(new Set(recipients.map((e) => e.trim().toLowerCase()).filter(Boolean)));
  if (uniqueRecipients.length > 0) {
    await db
      .insert(marketingSends)
      .values(uniqueRecipients.map((email) => ({ campaignId, email, status: "queued" as const })))
      .onConflictDoNothing();
  }

  await db
    .update(marketingCampaigns)
    .set({
      status: "sending",
      startedAt: new Date(),
      totalRecipients: uniqueRecipients.length,
    })
    .where(eq(marketingCampaigns.id, campaignId));

  const result: DispatchResult = {
    totalQueued: uniqueRecipients.length,
    totalSent: 0,
    totalFailed: 0,
    errors: [],
  };

  // 2) Send in batches
  for (const chunk of chunked(uniqueRecipients, RESEND_BATCH_SIZE)) {
    // Render personalized HTML per recipient
    const items = await Promise.all(
      chunk.map(async (email) => {
        const unsubscribeToken = signUnsubscribeToken(email);
        const html = await renderHtmlForRecipient({ email, unsubscribeToken });
        return {
          from: senderFrom,
          to: email,
          subject: campaign.subject,
          html,
          headers: buildListUnsubscribeHeaders(unsubscribeToken),
          tags: [
            { name: "campaign", value: campaign.slug },
            { name: "campaign_id", value: campaign.id },
          ],
        };
      }),
    );

    try {
      const { data, error } = await resend.batch.send(items);
      if (error) throw new Error(error.message ?? "Resend batch error.");

      // `data.data` is an array aligned 1-1 with `items` (ids in same order).
      const ids: Array<{ id?: string }> = (data?.data ?? []) as Array<{ id?: string }>;
      const now = new Date();
      await Promise.all(
        chunk.map(async (email, i) => {
          const messageId = ids[i]?.id;
          await db
            .update(marketingSends)
            .set({
              status: messageId ? "sent" : "failed",
              resendMessageId: messageId ?? null,
              sentAt: messageId ? now : null,
              error: messageId ? null : "no message_id returned",
            })
            .where(eq(marketingSends.email, email));
          if (messageId) {
            result.totalSent++;
          } else {
            result.totalFailed++;
            result.errors.push({ email, message: "no message_id returned" });
          }
        }),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown send error";
      result.totalFailed += chunk.length;
      for (const email of chunk) {
        await db
          .update(marketingSends)
          .set({ status: "failed", error: message })
          .where(eq(marketingSends.email, email));
        result.errors.push({ email, message });
      }
    }

    if (RATE_LIMIT_PAUSE_MS > 0) await sleep(RATE_LIMIT_PAUSE_MS);
  }

  // 3) Mark campaign finished
  await db
    .update(marketingCampaigns)
    .set({
      status: result.totalFailed === uniqueRecipients.length && uniqueRecipients.length > 0 ? "failed" : "sent",
      finishedAt: new Date(),
    })
    .where(eq(marketingCampaigns.id, campaignId));

  return result;
}

/** Build RFC 8058 List-Unsubscribe headers (one-click + mailto fallback). */
function buildListUnsubscribeHeaders(token: string): Record<string, string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ballershub.co";
  const url = `${siteUrl}/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`;
  return {
    "List-Unsubscribe": `<${url}>, <mailto:info@ballershub.co?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
