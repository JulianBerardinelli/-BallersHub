import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { filterSuppressed } from "./suppression";

/**
 * Audience resolution.
 *
 * Each function returns a deduplicated list of `email`s, with suppression
 * already applied. Callers that need a frequency cap should compose
 * `filterByFrequencyCap` on top.
 *
 * The actual SQL targets the consolidated `marketing_audience` *concept*
 * (built from `auth.users` + `player_profiles` + `portfolio_leads`).
 * For now we query the source tables directly and let the dispatcher
 * decide the segment label.
 */

export type AudienceSegment =
  | "all_subscribed"
  | "registered_no_profile"
  | "pro_players_active"
  | "leads_recent"
  | "custom";

export type AudienceFilter = {
  segment: AudienceSegment;
  /** For `leads_recent`: how many days back to include. */
  withinDays?: number;
  /** Required consent flag — sends without explicit category consent are blocked. */
  requireConsent?: "product" | "offers" | "pro_features";
  /** Custom override email list (only valid when segment === 'custom'). */
  emails?: string[];
  /**
   * If true, drop subscribers in the `cold` engagement tier (3-5 consecutive
   * skipped sends). `dormant` (6+ skipped) is ALWAYS dropped — they should
   * be in the suppression list anyway after the daily cooldown cron, but
   * we filter defensively in case the cron hasn't run yet.
   */
  excludeCold?: boolean;
};

export async function resolveAudience(filter: AudienceFilter): Promise<string[]> {
  const candidates = await fetchCandidates(filter);
  const afterSuppression = await filterSuppressed(candidates);
  return filterByEngagementTier(afterSuppression, { excludeCold: Boolean(filter.excludeCold) });
}

/**
 * Drop emails whose `engagement_tier` is dormant (always) or cold
 * (when `excludeCold` is true). Subscribers without a row in
 * `marketing_subscriptions` are kept — they haven't been classified
 * yet, treat as active.
 */
export async function filterByEngagementTier(
  emails: string[],
  opts: { excludeCold: boolean },
): Promise<string[]> {
  if (emails.length === 0) return emails;

  const droppedTiers = opts.excludeCold ? ["cold", "dormant"] : ["dormant"];
  const rows = await db.execute<{ email: string }>(sql`
    select email from marketing_subscriptions
    where email = ANY(${emails})
      and engagement_tier = ANY(${droppedTiers})
  `);
  const dropped = new Set(
    ((rows as { rows?: Array<{ email: string }> }).rows ?? (rows as Array<{ email: string }>)).map(
      (r) => r.email,
    ),
  );
  if (dropped.size === 0) return emails;
  return emails.filter((e) => !dropped.has(e));
}

async function fetchCandidates(filter: AudienceFilter): Promise<string[]> {
  switch (filter.segment) {
    case "all_subscribed": {
      const rows = await db.execute<{ email: string }>(sql`
        select distinct email from marketing_subscriptions
        ${consentClause(filter.requireConsent)}
      `);
      return rowsToEmails(rows);
    }

    case "registered_no_profile": {
      const rows = await db.execute<{ email: string }>(sql`
        select au.email
        from auth.users au
        left join public.player_profiles pp on pp.user_id = au.id
        where pp.id is null
          and au.email is not null
      `);
      return rowsToEmails(rows);
    }

    case "pro_players_active": {
      const rows = await db.execute<{ email: string }>(sql`
        select au.email
        from public.player_profiles pp
        join auth.users au on au.id = pp.user_id
        where pp.status = 'approved'
          and pp.visibility = 'public'
          and au.email is not null
      `);
      return rowsToEmails(rows);
    }

    case "leads_recent": {
      const days = Math.max(1, Math.floor(filter.withinDays ?? 30));
      const rows = await db.execute<{ email: string }>(sql`
        select distinct email
        from public.portfolio_leads
        where created_at >= now() - (${days}::int || ' days')::interval
      `);
      return rowsToEmails(rows);
    }

    case "custom": {
      const list = filter.emails ?? [];
      return Array.from(new Set(list.map((e) => e.trim().toLowerCase()).filter(Boolean)));
    }

    default: {
      const _exhaustive: never = filter.segment;
      return _exhaustive;
    }
  }
}

function consentClause(consent: AudienceFilter["requireConsent"]) {
  switch (consent) {
    case "product":
      return sql`where consent_product = true`;
    case "offers":
      return sql`where consent_offers = true`;
    case "pro_features":
      return sql`where consent_pro_features = true`;
    default:
      return sql``;
  }
}

function rowsToEmails(result: unknown): string[] {
  // postgres-js returns array-like with .rows or directly an array depending on driver path.
  const arr = (result as { rows?: Array<{ email: string }> }).rows ?? (result as Array<{ email: string }>);
  return Array.from(
    new Set((arr ?? []).map((r) => (r.email ?? "").trim().toLowerCase()).filter(Boolean)),
  );
}

/**
 * Frequency cap — drop emails that received any marketing within the
 * given window. Use this BEFORE handing the list to the dispatcher.
 */
export async function filterByFrequencyCap(emails: string[], windowDays: number): Promise<string[]> {
  if (emails.length === 0) return [];
  const window = Math.max(1, Math.floor(windowDays));
  const rows = await db.execute<{ email: string }>(sql`
    select distinct email
    from marketing_sends
    where email = ANY(${emails})
      and sent_at >= now() - (${window}::int || ' days')::interval
  `);
  const recent = new Set(((rows as { rows?: Array<{ email: string }> }).rows ?? (rows as Array<{ email: string }>)).map((r) => r.email));
  return emails.filter((e) => !recent.has(e));
}
