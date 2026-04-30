import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { suppress } from "./suppression";

/**
 * Engagement segmentation.
 *
 * The webhook handler increments `consecutive_skipped_sends` on every
 * delivered email and resets it on opens/clicks. The tier is recomputed
 * automatically here whenever the counter changes.
 *
 * The cron route runs `cooldownDormantSubscribers()` daily — anyone
 * with 6+ consecutive skipped sends is moved to the global suppression
 * list so we stop wasting Resend quota and protect deliverability.
 */

export type EngagementTier = "active" | "warm" | "cold" | "dormant";

/** Threshold table — change here to retune the strategy. */
export const ENGAGEMENT_THRESHOLDS = {
  warmAtSkipped: 1,
  coldAtSkipped: 3,
  dormantAtSkipped: 6,
} as const;

export function tierFor(skippedCount: number): EngagementTier {
  if (skippedCount >= ENGAGEMENT_THRESHOLDS.dormantAtSkipped) return "dormant";
  if (skippedCount >= ENGAGEMENT_THRESHOLDS.coldAtSkipped) return "cold";
  if (skippedCount >= ENGAGEMENT_THRESHOLDS.warmAtSkipped) return "warm";
  return "active";
}

// ----------------------------------------------------------------------------
// Webhook hook helpers
// ----------------------------------------------------------------------------

/**
 * Increment the skipped-send counter for an address (called from the
 * Resend webhook on `email.delivered`). Recomputes the tier in the
 * same UPDATE so it stays in sync.
 *
 * No-op if the email isn't a known subscriber (we don't track every
 * transactional address; e.g. invite emails to non-subscribers).
 */
export async function recordDelivery(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  await db.execute(sql`
    update marketing_subscriptions
    set
      consecutive_skipped_sends = consecutive_skipped_sends + 1,
      engagement_tier = case
        when consecutive_skipped_sends + 1 >= ${ENGAGEMENT_THRESHOLDS.dormantAtSkipped} then 'dormant'
        when consecutive_skipped_sends + 1 >= ${ENGAGEMENT_THRESHOLDS.coldAtSkipped}    then 'cold'
        when consecutive_skipped_sends + 1 >= ${ENGAGEMENT_THRESHOLDS.warmAtSkipped}    then 'warm'
        else 'active'
      end,
      updated_at = now()
    where email = ${normalized}
  `);
}

/**
 * Reset the skipped-send counter on engagement (called from the Resend
 * webhook on `email.opened` / `email.clicked`). Sets tier='active'
 * regardless of previous state — engagement promotes immediately.
 */
export async function recordEngagement(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  await db.execute(sql`
    update marketing_subscriptions
    set
      consecutive_skipped_sends = 0,
      engagement_tier = 'active',
      last_engaged_at = now(),
      updated_at = now()
    where email = ${normalized}
  `);
}

// ----------------------------------------------------------------------------
// Daily cooldown — runs from the cron route
// ----------------------------------------------------------------------------

export type CooldownResult = {
  scanned: number;
  suppressed: number;
};

/**
 * Move any subscriber whose `consecutive_skipped_sends >= 6` to the
 * global suppression list with reason='global_pause' (we re-use the
 * existing reason rather than introducing a new one — the dashboard
 * shows it as "auto-cooldown"). Idempotent: addresses already in
 * `marketing_unsubscribes` are skipped via the ON CONFLICT in suppress().
 */
export async function cooldownDormantSubscribers(): Promise<CooldownResult> {
  const dormantThreshold = ENGAGEMENT_THRESHOLDS.dormantAtSkipped;

  // Only scan dormant subscribers that aren't already suppressed.
  const rawCandidates = await db.execute<{ email: string }>(sql`
    select s.email
    from marketing_subscriptions s
    left join marketing_unsubscribes u on u.email = s.email
    where s.consecutive_skipped_sends >= ${dormantThreshold}
      and u.email is null
    limit 500
  `);
  const candidates =
    (rawCandidates as { rows?: Array<{ email: string }> }).rows ??
    (rawCandidates as Array<{ email: string }>);

  let suppressed = 0;
  for (const row of candidates) {
    try {
      await suppress(row.email, "global_pause");
      suppressed++;
    } catch (e) {
      console.error("[engagement] cooldown suppress failed:", row.email, e);
    }
  }

  return { scanned: candidates.length, suppressed };
}

// ----------------------------------------------------------------------------
// Stats for the admin dashboard
// ----------------------------------------------------------------------------

export type EngagementBreakdown = {
  active: number;
  warm: number;
  cold: number;
  dormant: number;
  total: number;
};

export async function fetchEngagementBreakdown(): Promise<EngagementBreakdown> {
  const rows = await db.execute<{ tier: string; count: string }>(
    sql`select engagement_tier as tier, count(*)::text as count from marketing_subscriptions group by engagement_tier`,
  );
  const arr = (rows as { rows?: Array<{ tier: string; count: string }> }).rows ??
    (rows as Array<{ tier: string; count: string }>);

  const breakdown: EngagementBreakdown = { active: 0, warm: 0, cold: 0, dormant: 0, total: 0 };
  for (const r of arr ?? []) {
    const n = Number(r.count) || 0;
    breakdown.total += n;
    if (r.tier === "active" || r.tier === "warm" || r.tier === "cold" || r.tier === "dormant") {
      breakdown[r.tier] = n;
    }
  }
  return breakdown;
}
