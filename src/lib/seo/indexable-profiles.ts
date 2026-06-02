// Single source of truth for "which public profiles are indexable".
//
// Three SEO surfaces must agree on this set or Google sees conflicting
// signals (the classic "Discovered – currently not indexed" trap):
//
//   1. /sitemap.xml          — what we *submit* to Google
//   2. /jugadores, /agencias — the crawlable index pages (internal links)
//   3. /<slug> robots meta   — the per-page index/noindex directive
//
// Before this module those three drifted: the sitemap listed every
// approved+public player (including thin Free profiles that the page
// itself marked `robots: noindex`). Submitting a URL you simultaneously
// tell Google not to index is a contradiction that wastes crawl budget
// and is a prime cause of pages getting stuck in "Discovered – not
// indexed". Centralizing the predicate here keeps all three honest.
//
// Indexability rule:
//   • Pro / pro_plus players → always indexable (rich, paid profiles).
//   • Free players           → indexable only if their bio clears the
//                              `FREE_BIO_INDEX_MIN_CHARS` floor, i.e.
//                              there's enough unique content to rank.
//   • Agencies               → indexable when approved.
//
// Pro detection mirrors `sitemap.ts` (and `resolvePlanAccess`): a user
// is Pro when they have a subscription with `plan IN ('pro','pro_plus')`
// AND `status_v2 IN ('trialing','active')`. We duplicate the predicate
// rather than import the per-user dashboard helper because that one
// reads a single row; here we resolve a batch by userId Set.

import { db } from "@/lib/db";
import { playerProfiles } from "@/db/schema/players";
import { agencyProfiles } from "@/db/schema/agencies";
import { subscriptions } from "@/db/schema/subscriptions";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Minimum bio length (trimmed chars) for a Free player profile to be
 * considered "thick enough" to index. Kept in sync with the per-page
 * soft-noindex threshold in `(public)/[slug]/page.tsx`, which imports
 * this constant so the two never drift.
 */
export const FREE_BIO_INDEX_MIN_CHARS = 100;

export type IndexablePlayer = {
  slug: string;
  fullName: string;
  positions: string[] | null;
  currentClub: string | null;
  avatarUrl: string | null;
  updatedAt: Date;
  isPro: boolean;
};

export type IndexableAgency = {
  slug: string;
  name: string;
  logoUrl: string | null;
  updatedAt: Date;
};

/**
 * The single indexability predicate for a player. Pro profiles are
 * always indexable; Free profiles need a bio that clears the floor.
 *
 * Pure and synchronous so the page-level `generateMetadata`, the
 * sitemap, and the index page can all call it with the same inputs and
 * always agree.
 */
export function isPlayerIndexable(input: {
  isPro: boolean;
  bio: string | null;
}): boolean {
  if (input.isPro) return true;
  return (input.bio?.trim().length ?? 0) >= FREE_BIO_INDEX_MIN_CHARS;
}

/**
 * Resolve the set of Pro userIds for a batch of players. Lenient
 * predicate matching `sitemap.ts`: plan in (pro, pro_plus) AND
 * status_v2 in (trialing, active).
 */
async function resolveProUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const subs = await db
    .select({
      userId: subscriptions.userId,
      plan: subscriptions.plan,
      statusV2: subscriptions.statusV2,
    })
    .from(subscriptions)
    .where(inArray(subscriptions.userId, userIds));

  return new Set(
    subs
      .filter(
        (s) =>
          (s.plan === "pro" || s.plan === "pro_plus") &&
          (s.statusV2 === "trialing" || s.statusV2 === "active"),
      )
      .map((s) => s.userId),
  );
}

/**
 * Fetch every player profile that should be indexed: approved + public,
 * then filtered through `isPlayerIndexable`. The `bio` is read only to
 * evaluate the predicate and is intentionally stripped from the result
 * — callers (sitemap, index page) render name/positions/club, not the
 * bio, and we don't want a heavy text column flowing through the cache.
 *
 * Sorted Pro-first, then most-recently-updated, so the index page and
 * sitemap surface the strongest profiles at the top.
 */
export async function getIndexablePlayers(): Promise<IndexablePlayer[]> {
  const rows = await db
    .select({
      slug: playerProfiles.slug,
      userId: playerProfiles.userId,
      fullName: playerProfiles.fullName,
      positions: playerProfiles.positions,
      currentClub: playerProfiles.currentClub,
      avatarUrl: playerProfiles.avatarUrl,
      bio: playerProfiles.bio,
      updatedAt: playerProfiles.updatedAt,
    })
    .from(playerProfiles)
    .where(
      and(
        eq(playerProfiles.status, "approved"),
        eq(playerProfiles.visibility, "public"),
      ),
    );

  if (rows.length === 0) return [];

  const proUserIds = await resolveProUserIds(rows.map((r) => r.userId));

  return rows
    .map((r) => ({ ...r, isPro: proUserIds.has(r.userId) }))
    .filter((r) => isPlayerIndexable({ isPro: r.isPro, bio: r.bio }))
    .map<IndexablePlayer>((r) => ({
      slug: r.slug,
      fullName: r.fullName,
      positions: r.positions ?? null,
      currentClub: r.currentClub,
      avatarUrl: r.avatarUrl,
      updatedAt: r.updatedAt,
      isPro: r.isPro,
    }))
    .sort((a, b) => {
      if (a.isPro !== b.isPro) return a.isPro ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
}

/**
 * Fetch every approved agency. Agencies have no thin-content gate —
 * approval is the editorial bar — so this is a straight filtered select,
 * sorted most-recently-updated first.
 */
export async function getIndexableAgencies(): Promise<IndexableAgency[]> {
  const rows = await db
    .select({
      slug: agencyProfiles.slug,
      name: agencyProfiles.name,
      logoUrl: agencyProfiles.logoUrl,
      updatedAt: agencyProfiles.updatedAt,
    })
    .from(agencyProfiles)
    .where(eq(agencyProfiles.isApproved, true));

  return rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
