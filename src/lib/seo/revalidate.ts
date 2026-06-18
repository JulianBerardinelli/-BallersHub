// SEO cache invalidation helpers.
//
// Centralizes the set of paths that must be revalidated after a
// player/agency mutation so callers don't drift apart. Today the set
// is small (the public profile + sitemap + llms.txt), but as we add
// directory hubs (`/players/por-club/[club]`, etc.) this is the
// single place to expand.
//
// Why this is critical (and was buggy before this branch):
//
//   The public route is `/<slug>`, not `/<playerId>`. The previous
//   call in `personal-data/actions.ts` passed `playerId` (UUID) to
//   `revalidatePath`, which silently no-op'd because that path doesn't
//   exist in Next's route map. Result: players could edit their bio
//   in the dashboard and the public page would stay stale for an hour
//   (the ISR window). This module centralizes the correct shape.

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Invalidate every cached surface a player's public profile touches.
 * Call this after ANY mutation that affects the data rendered at
 * `/<slug>` — bio edits, photos approved, career rows changed, etc.
 *
 * Surfaces invalidated:
 *   • `/<slug>` — the portfolio page itself (1h ISR)
 *   • `/players` — the public directory that lists this player, so a
 *     newly-approved or edited profile appears/updates immediately
 *     instead of lagging up to an hour behind the ISR window
 *   • `/sitemap.xml` — `lastModified` shifts, Google should re-crawl
 *   • `/llms.txt` — same reasoning for AI crawlers
 *
 * Idempotent and cheap — Next dedupes paths within a single request.
 */
export function revalidatePlayerPublicProfile(slug: string | null | undefined): void {
  if (!slug || slug.length === 0) return;
  revalidatePath(`/${slug}`);
  revalidatePath("/players");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}

/**
 * Variant for callers that only hold the player's UUID (server
 * actions, API routes that authenticate by user_id, etc). Resolves
 * the slug in a single query, then defers to the slug-based helper.
 *
 * Silently no-ops if the player isn't found — never throws because
 * cache invalidation is a side-effect, never the success criterion
 * of the calling action.
 */
export async function revalidatePlayerPublicProfileById(
  // Supabase generic types are awkward across Auth-Helpers / SSR /
  // SDK clients; we accept the broadest shape that has `.from`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  playerId: string,
): Promise<void> {
  if (!playerId) return;
  const { data } = await supabase
    .from("player_profiles")
    .select("slug")
    .eq("id", playerId)
    .maybeSingle<{ slug: string | null }>();
  revalidatePlayerPublicProfile(data?.slug ?? null);
}

/**
 * Same as the player helper but for agency portfolios. Also busts
 * `/agencies` (the public agency directory) so approvals/edits surface
 * there immediately rather than waiting out the ISR window.
 */
export function revalidateAgencyPublicProfile(slug: string | null | undefined): void {
  if (!slug || slug.length === 0) return;
  revalidatePath(`/agency/${slug}`);
  revalidatePath("/agencies");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}

/**
 * Same as the player helper but for coach (DT) portfolios. Busts the
 * portfolio page, the coaches directory (when it lands), the sitemap and
 * llms.txt so a freshly-approved or edited coach surfaces immediately
 * instead of lagging the ISR window.
 */
export function revalidateCoachPublicProfile(slug: string | null | undefined): void {
  if (!slug || slug.length === 0) return;
  revalidatePath(`/coach/${slug}`);
  revalidatePath("/coaches");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}

/** Variant that resolves the coach slug from its UUID, then defers. */
export async function revalidateCoachPublicProfileById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  coachId: string,
): Promise<void> {
  if (!coachId) return;
  const { data } = await supabase
    .from("coach_profiles")
    .select("slug")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null }>();
  revalidateCoachPublicProfile(data?.slug ?? null);
}
