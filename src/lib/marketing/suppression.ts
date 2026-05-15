import { db } from "@/lib/db";
import { marketingUnsubscribes } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { marketingDripEnrollments } from "@/db/schema";

/**
 * Suppression list helpers. Every send must call `filterSuppressed`
 * before dispatching to Resend.
 */

export type UnsubscribeReason = "user_request" | "bounce_hard" | "complaint" | "global_pause";

/** Add an email to the global suppression list (idempotent). */
export async function suppress(
  email: string,
  reason: UnsubscribeReason = "user_request",
  campaignId?: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  await db
    .insert(marketingUnsubscribes)
    .values({
      email: normalized,
      reason,
      campaignId: campaignId ?? null,
    })
    .onConflictDoNothing({ target: marketingUnsubscribes.email });

  // Also cancel any pending drip enrollments for this address — no
  // point queueing emails we'll never send. Keeps the audit trail of
  // already-sent rows intact.
  await db
    .update(marketingDripEnrollments)
    .set({ status: "cancelled", error: `suppressed: ${reason}`, updatedAt: new Date() })
    .where(
      and(
        eq(marketingDripEnrollments.email, normalized),
        eq(marketingDripEnrollments.status, "pending"),
      ),
    );
}

/** Remove from suppression — used by re-opt-in flows. Use with care. */
export async function unsuppress(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await db.delete(marketingUnsubscribes).where(eq(marketingUnsubscribes.email, normalized));
}

/** Returns the subset of `emails` that are NOT in the suppression list. */
export async function filterSuppressed(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const normalized = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
  if (normalized.length === 0) return [];

  const rows = await db
    .select({ email: marketingUnsubscribes.email })
    .from(marketingUnsubscribes)
    .where(sql`${marketingUnsubscribes.email} = ANY(${normalized})`);

  const suppressed = new Set(rows.map((r) => r.email));
  return normalized.filter((email) => !suppressed.has(email));
}

export async function isSuppressed(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const row = await db.query.marketingUnsubscribes.findFirst({
    where: eq(marketingUnsubscribes.email, normalized),
  });
  return Boolean(row);
}
