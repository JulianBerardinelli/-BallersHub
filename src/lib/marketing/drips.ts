import { Resend } from "resend";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  marketingDripConfigs,
  marketingDripEnrollments,
  marketingSends,
  marketingSubscriptions,
} from "@/db/schema";
import {
  renderTemplate,
  type TemplateKey,
  type TemplatePropsMap,
} from "@/emails";
import { senderFrom } from "@/emails/tokens";
import { isSuppressed } from "./suppression";
import { signUnsubscribeToken } from "./unsubscribe-token";
import { evaluateExitCondition, resolveRecipientProps } from "./recipient-props";

/**
 * Drip engine.
 *
 *   enrollUserInDrip(slug, …)        → schedule a future email for one user
 *   enrollUserInTriggerEvent(event)  → enroll into ALL active drips matching
 *                                       the trigger (e.g. 'player_signup')
 *   processDueEnrollments()          → cron worker; sends pending rows
 *                                       whose `scheduled_for <= now()`
 *   cancelEnrollmentsForEmail(email) → on unsubscribe / hard bounce
 *
 * The processor handles in batches of `BATCH_SIZE` per invocation to
 * keep cron requests well within Vercel's 60s budget.
 */

const BATCH_SIZE = 50;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ----------------------------------------------------------------------------
// ENROLLMENT
// ----------------------------------------------------------------------------

export type EnrollmentInput = {
  email: string;
  userId?: string | null;
  /**
   * Per-recipient context resolved at enrollment time. Used for drips
   * whose props can't be looked up later (e.g. `lead_welcome` needs
   * the playerName/playerSlug of the portfolio that triggered it).
   */
  context?: Record<string, unknown>;
  /** Override the config's delay (rare). */
  delaySecondsOverride?: number;
};

/** Enroll a single user in a single drip step (by slug). */
export async function enrollUserInDrip(
  dripSlug: string,
  input: EnrollmentInput,
): Promise<{ enrolled: boolean; reason?: string; enrollmentId?: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { enrolled: false, reason: "missing email" };

  // Hard guards: never enroll suppressed addresses.
  if (await isSuppressed(email)) {
    return { enrolled: false, reason: "suppressed" };
  }

  const config = await db.query.marketingDripConfigs.findFirst({
    where: eq(marketingDripConfigs.slug, dripSlug),
  });
  if (!config) return { enrolled: false, reason: `unknown drip: ${dripSlug}` };
  if (!config.isActive) return { enrolled: false, reason: "drip is inactive" };

  const delay = Math.max(0, input.delaySecondsOverride ?? config.delaySeconds);
  const scheduledFor = new Date(Date.now() + delay * 1000);

  try {
    const [row] = await db
      .insert(marketingDripEnrollments)
      .values({
        dripId: config.id,
        email,
        userId: input.userId ?? null,
        scheduledFor,
        status: "pending",
        context: input.context ?? {},
      })
      .onConflictDoNothing({
        target: [
          marketingDripEnrollments.dripId,
          marketingDripEnrollments.email,
          marketingDripEnrollments.status,
        ],
      })
      .returning({ id: marketingDripEnrollments.id });

    if (!row) {
      return { enrolled: false, reason: "already enrolled (pending)" };
    }
    return { enrolled: true, enrollmentId: row.id };
  } catch (e) {
    return { enrolled: false, reason: e instanceof Error ? e.message : "insert failed" };
  }
}

/**
 * Enroll a user in EVERY active drip matching a trigger event.
 * Useful at signup: one call enrolls them in all the steps of a
 * multi-step onboarding drip.
 */
export async function enrollUserInTriggerEvent(
  triggerEvent: string,
  input: EnrollmentInput,
): Promise<Array<{ slug: string; result: Awaited<ReturnType<typeof enrollUserInDrip>> }>> {
  const configs = await db.query.marketingDripConfigs.findMany({
    where: and(eq(marketingDripConfigs.triggerEvent, triggerEvent), eq(marketingDripConfigs.isActive, true)),
  });

  const results: Array<{ slug: string; result: Awaited<ReturnType<typeof enrollUserInDrip>> }> = [];
  for (const cfg of configs) {
    const result = await enrollUserInDrip(cfg.slug, input);
    results.push({ slug: cfg.slug, result });
  }
  return results;
}

/** Cancel ALL pending enrollments for an email — used on unsubscribe. */
export async function cancelEnrollmentsForEmail(email: string): Promise<number> {
  const normalized = email.trim().toLowerCase();
  const result = await db
    .update(marketingDripEnrollments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(marketingDripEnrollments.email, normalized),
        eq(marketingDripEnrollments.status, "pending"),
      ),
    )
    .returning({ id: marketingDripEnrollments.id });
  return result.length;
}

// ----------------------------------------------------------------------------
// PROCESSOR
// ----------------------------------------------------------------------------

export type ProcessResult = {
  picked: number;
  sent: number;
  exited: number;
  cancelled: number;
  failed: number;
  errors: Array<{ enrollmentId: string; message: string }>;
};

/**
 * Worker called from the cron endpoint. Picks up pending enrollments
 * whose `scheduled_for <= now()` and dispatches them. Idempotent —
 * each row is locked-by-status before sending so concurrent cron runs
 * don't double-send.
 */
export async function processDueEnrollments(): Promise<ProcessResult> {
  if (!resend) {
    console.warn("[drips] RESEND_API_KEY is not set; skipping send.");
    return { picked: 0, sent: 0, exited: 0, cancelled: 0, failed: 0, errors: [] };
  }

  // Atomically pick up to BATCH_SIZE enrollments, flipping them to
  // 'processing' so any concurrent cron invocation skips them.
  const pickedRows = await db
    .update(marketingDripEnrollments)
    .set({ status: "processing", updatedAt: new Date() })
    .where(
      sql`id in (
        select id from ${marketingDripEnrollments}
        where status = 'pending' and scheduled_for <= now()
        order by scheduled_for asc
        limit ${BATCH_SIZE}
        for update skip locked
      )`,
    )
    .returning();

  const result: ProcessResult = {
    picked: pickedRows.length,
    sent: 0,
    exited: 0,
    cancelled: 0,
    failed: 0,
    errors: [],
  };
  if (pickedRows.length === 0) return result;

  // Configs we need (one query, then map by id).
  const dripIds = Array.from(new Set(pickedRows.map((r) => r.dripId)));
  const configs = await db.query.marketingDripConfigs.findMany({
    where: or(...dripIds.map((id) => eq(marketingDripConfigs.id, id))),
  });
  const configById = new Map(configs.map((c) => [c.id, c]));

  for (const enrollment of pickedRows) {
    const config = configById.get(enrollment.dripId);
    try {
      if (!config) throw new Error("drip config not found");

      // Re-check suppression at send time (cheap and important).
      if (await isSuppressed(enrollment.email)) {
        await db
          .update(marketingDripEnrollments)
          .set({ status: "cancelled", error: "suppressed", updatedAt: new Date() })
          .where(eq(marketingDripEnrollments.id, enrollment.id));
        result.cancelled++;
        continue;
      }

      // Exit predicate
      if (config.exitCondition) {
        const exited = await evaluateExitCondition(config.exitCondition, {
          email: enrollment.email,
          userId: enrollment.userId,
        });
        if (exited) {
          await db
            .update(marketingDripEnrollments)
            .set({ status: "exited", updatedAt: new Date() })
            .where(eq(marketingDripEnrollments.id, enrollment.id));
          result.exited++;
          continue;
        }
      }

      // Resolve per-recipient props
      const recipientProps = await resolveRecipientProps(
        config.templateKey as TemplateKey,
        { email: enrollment.email, userId: enrollment.userId },
      );

      const unsubscribeToken = signUnsubscribeToken(enrollment.email);
      const props = {
        ...(config.defaultTemplateProps as Record<string, unknown>),
        ...(enrollment.context as Record<string, unknown>),
        ...recipientProps,
        recipientEmail: enrollment.email,
        unsubscribeToken,
      } as TemplatePropsMap[TemplateKey];

      const html = await renderTemplate(config.templateKey as TemplateKey, props);

      // Insert a marketing_sends row (no campaign association — drip)
      const [sendRow] = await db
        .insert(marketingSends)
        .values({
          campaignId: null,
          email: enrollment.email,
          status: "queued",
        })
        .returning();

      const { data, error } = await resend.emails.send({
        from: senderFrom,
        to: [enrollment.email],
        subject: config.defaultSubject,
        html,
        headers: buildListUnsubscribeHeaders(unsubscribeToken),
        tags: [
          { name: "drip", value: config.slug },
          { name: "drip_id", value: config.id },
          { name: "trigger", value: config.triggerEvent },
        ],
      });

      if (error) throw new Error(error.message ?? "Resend send error");
      const messageId = data?.id ?? null;

      await db
        .update(marketingSends)
        .set({
          status: "sent",
          resendMessageId: messageId,
          sentAt: new Date(),
        })
        .where(eq(marketingSends.id, sendRow.id));

      // Bump subscriber metrics
      await db
        .update(marketingSubscriptions)
        .set({
          lastSentAt: new Date(),
          totalSends: sql`${marketingSubscriptions.totalSends} + 1`,
        })
        .where(eq(marketingSubscriptions.email, enrollment.email));

      await db
        .update(marketingDripEnrollments)
        .set({
          status: "sent",
          sendId: sendRow.id,
          updatedAt: new Date(),
        })
        .where(eq(marketingDripEnrollments.id, enrollment.id));

      result.sent++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "unknown error";
      await db
        .update(marketingDripEnrollments)
        .set({ status: "failed", error: message, updatedAt: new Date() })
        .where(eq(marketingDripEnrollments.id, enrollment.id));
      result.failed++;
      result.errors.push({ enrollmentId: enrollment.id, message });
    }
  }

  return result;
}

function buildListUnsubscribeHeaders(token: string): Record<string, string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ballershub.co";
  const url = `${siteUrl}/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`;
  return {
    "List-Unsubscribe": `<${url}>, <mailto:info@ballershub.co?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
