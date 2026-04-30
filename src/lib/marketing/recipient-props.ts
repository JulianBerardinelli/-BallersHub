import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteUrl } from "@/emails/tokens";
import type { TemplateKey } from "@/emails";

/**
 * Resolve the per-recipient props a template needs at SEND TIME.
 *
 * Drips and campaigns store `defaultTemplateProps` (admin-controlled)
 * but most templates also need data that varies per recipient
 * (`firstName`, `dashboardUrl`, …). This module looks those up from
 * `auth.users` + `player_profiles` so the dispatcher doesn't have to.
 *
 * Each resolver returns ONLY the recipient-scoped fields. The caller
 * merges them with `defaultTemplateProps` and the unsubscribe token.
 */

type Resolved = Record<string, unknown>;

type RecipientLookup = {
  email: string;
  userId?: string | null;
};

/**
 * Resolve recipient-scoped props for a given template + email/userId.
 * Returns an empty object when the template has no recipient-scoped fields.
 */
export async function resolveRecipientProps(
  templateKey: TemplateKey,
  recipient: RecipientLookup,
): Promise<Resolved> {
  switch (templateKey) {
    case "welcome_player":
    case "profile_completion":
      return resolvePlayerOnboardingProps(recipient);
    case "welcome_agency":
      return resolveAgencyOnboardingProps(recipient);
    case "lead_welcome":
      // lead_welcome props are entirely captured at enrollment time
      // (`playerName`, `portfolioUrl`, `signUpUrl` go into context.json).
      return {};
    default:
      return {};
  }
}

// ----------------------------------------------------------------------------
// Player onboarding (welcome_player + profile_completion)
// ----------------------------------------------------------------------------
async function resolvePlayerOnboardingProps(recipient: RecipientLookup) {
  const dashboardUrl = `${siteUrl}/dashboard/edit-profile/personal-data`;

  const userRow = await fetchAuthUserMeta(recipient);
  const firstName = pickFirstName(userRow, recipient.email);

  // For `profile_completion`, surface how many sections are still
  // missing so the email leads with a concrete number. Cheap query
  // that returns 0 if no profile exists yet.
  const missing = await fetchMissingSectionsForUser(recipient);

  return {
    firstName,
    playerName: firstName, // alias used by welcome_player
    dashboardUrl,
    missingSections: missing,
  };
}

async function resolveAgencyOnboardingProps(recipient: RecipientLookup) {
  const dashboardUrl = `${siteUrl}/dashboard`;
  const userRow = await fetchAuthUserMeta(recipient);
  const managerName = pickFirstName(userRow, recipient.email);
  return { managerName, dashboardUrl };
}

// ----------------------------------------------------------------------------
// Lookups
// ----------------------------------------------------------------------------

type AuthUserMetaRow = {
  raw_user_meta_data: Record<string, unknown> | null;
  email: string | null;
};

async function fetchAuthUserMeta(recipient: RecipientLookup): Promise<AuthUserMetaRow | null> {
  const where = recipient.userId
    ? sql`id = ${recipient.userId}`
    : sql`lower(email) = lower(${recipient.email})`;

  const rows = await db.execute<AuthUserMetaRow>(
    sql`select raw_user_meta_data, email from auth.users where ${where} limit 1`,
  );
  const arr = (rows as { rows?: AuthUserMetaRow[] }).rows ?? (rows as AuthUserMetaRow[]);
  return arr[0] ?? null;
}

function pickFirstName(row: AuthUserMetaRow | null, fallbackEmail: string): string {
  const meta = row?.raw_user_meta_data ?? {};
  const candidates = [
    typeof meta.first_name === "string" ? meta.first_name : null,
    typeof meta.firstName === "string" ? (meta.firstName as string) : null,
    typeof meta.full_name === "string" ? (meta.full_name as string).split(" ")[0] : null,
    typeof meta.name === "string" ? (meta.name as string).split(" ")[0] : null,
  ].filter((v): v is string => Boolean(v && v.trim().length > 0));

  if (candidates[0]) return candidates[0];
  // Fallback to the local-part of the email, capitalized.
  const local = (row?.email ?? fallbackEmail).split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

async function fetchMissingSectionsForUser(recipient: RecipientLookup): Promise<number> {
  // Cheap heuristic: count how many of the 4 core sections are
  // missing (basic info / personal details / career / media). If the
  // user has no `player_profiles` row at all, return 4.
  const where = recipient.userId
    ? sql`pp.user_id = ${recipient.userId}`
    : sql`au.email = ${recipient.email}`;

  const rows = await db.execute<{
    has_profile: boolean;
    has_personal_details: boolean;
    has_career: boolean;
    has_media: boolean;
  }>(sql`
    select
      (pp.id is not null)                                  as has_profile,
      (pd.id is not null)                                  as has_personal_details,
      exists(select 1 from public.career_items ci where ci.player_id = pp.id) as has_career,
      exists(select 1 from public.player_media pm
             where pm.player_id = pp.id and pm.is_approved = true) as has_media
    from auth.users au
    left join public.player_profiles pp on pp.user_id = au.id
    left join public.player_personal_details pd on pd.player_id = pp.id
    where ${where}
    limit 1
  `);
  const arr =
    (rows as { rows?: typeof rows extends unknown ? Array<{ has_profile: boolean; has_personal_details: boolean; has_career: boolean; has_media: boolean }> : never }).rows ??
    (rows as Array<{ has_profile: boolean; has_personal_details: boolean; has_career: boolean; has_media: boolean }>);

  if (!arr || arr.length === 0) return 4;
  const r = arr[0];
  let missing = 0;
  if (!r.has_profile) missing++;
  if (!r.has_personal_details) missing++;
  if (!r.has_career) missing++;
  if (!r.has_media) missing++;
  return missing;
}

// ----------------------------------------------------------------------------
// Exit condition checks
// ----------------------------------------------------------------------------

export async function evaluateExitCondition(
  condition: string | null,
  recipient: RecipientLookup,
): Promise<boolean> {
  if (!condition) return false;

  switch (condition) {
    case "has_player_profile": {
      const where = recipient.userId
        ? sql`user_id = ${recipient.userId}`
        : sql`user_id = (select id from auth.users where email = ${recipient.email} limit 1)`;
      const rows = await db.execute<{ exists: boolean }>(
        sql`select exists(select 1 from public.player_profiles where ${where}) as exists`,
      );
      const arr = (rows as { rows?: Array<{ exists: boolean }> }).rows ?? (rows as Array<{ exists: boolean }>);
      return Boolean(arr[0]?.exists);
    }

    case "has_completed_profile": {
      const where = recipient.userId
        ? sql`user_id = ${recipient.userId}`
        : sql`user_id = (select id from auth.users where email = ${recipient.email} limit 1)`;
      const rows = await db.execute<{ exists: boolean }>(sql`
        select exists(
          select 1 from public.player_profiles
          where ${where} and status = 'approved' and visibility = 'public'
        ) as exists
      `);
      const arr = (rows as { rows?: Array<{ exists: boolean }> }).rows ?? (rows as Array<{ exists: boolean }>);
      return Boolean(arr[0]?.exists);
    }

    default:
      // Unknown predicate — fail safe (don't exit, send the email).
      console.warn(`[drips] unknown exit_condition: ${condition}`);
      return false;
  }
}
