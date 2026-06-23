import { revalidateTag, unstable_cache } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminCounters = Record<string, number>;

// Counters shown as badges in the admin sidebar. Computed via the
// service-role client (bypasses RLS, cookie-free) so they're safe to
// cache. Tag `admin-counters` is invalidated from admin server actions
// that change any of these underlying tables (approvals, rejections,
// new applications, etc.) so badges stay live without per-render
// re-querying Supabase.
//
// Why this matters: the previous layout fired 8 Supabase counts on
// every admin nav click. With max:1 connection per lambda + the
// postgres-js ClientRead bug, that meant every navigation was 8
// concurrent reads competing for a single slot. Caching collapses
// that to ~0 reads per nav once warm.
async function fetchAdminCounters(): Promise<AdminCounters> {
  const supabase = createSupabaseAdmin();

  const [
    { count: appCount },
    { count: coachAppCount },
    { count: managerAppCount },
    { count: careerItemCount },
    { data: revisionsData },
    { count: mediaCount },
    { count: teamsCount },
    { count: divisionsCount },
    { count: agenciesPendingCount },
    { count: coachCareerRevCount },
    { count: coachMediaCount },
    { count: coachLicenseCount },
    { count: nationalTeamCount },
  ] = await Promise.all([
    supabase
      .from("player_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("coach_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("manager_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("career_item_proposals")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("career_revision_requests")
      .select("id, career_revision_items(id), stats_revision_items(id)")
      .eq("status", "pending"),
    supabase
      .from("player_media")
      .select("id", { count: "exact", head: true })
      .is("reviewed_by", null),
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("divisions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("agency_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", false),
    supabase
      .from("coach_career_revision_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("coach_media")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("coach_licenses")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("national_team_stints")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
  ]);

  let careerRevisionsCount = 0;
  let statsRevisionsCount = 0;
  if (revisionsData) {
    for (const row of revisionsData as Array<{
      career_revision_items: { id: string }[] | null;
      stats_revision_items: { id: string }[] | null;
    }>) {
      if (row.career_revision_items && row.career_revision_items.length > 0)
        careerRevisionsCount++;
      if (row.stats_revision_items && row.stats_revision_items.length > 0)
        statsRevisionsCount++;
    }
  }

  return {
    "/admin/applications": appCount ?? 0,
    "/admin/coach-applications": coachAppCount ?? 0,
    "/admin/manager-applications": managerAppCount ?? 0,
    "/admin/career": careerItemCount ?? 0,
    "/admin/revisions": careerRevisionsCount,
    "/admin/stats-revisions": statsRevisionsCount,
    "/admin/media-moderation": mediaCount ?? 0,
    "/admin/teams": teamsCount ?? 0,
    "/admin/divisions": divisionsCount ?? 0,
    "/admin/agencies": agenciesPendingCount ?? 0,
    "/admin/coach-career-revisions": coachCareerRevCount ?? 0,
    "/admin/coach-media": coachMediaCount ?? 0,
    "/admin/coach-licenses": coachLicenseCount ?? 0,
    "/admin/national-team": nationalTeamCount ?? 0,
  };
}

export const ADMIN_COUNTERS_TAG = "admin-counters";

export const getAdminCounters = unstable_cache(
  fetchAdminCounters,
  ["admin-counters-v2"],
  { tags: [ADMIN_COUNTERS_TAG], revalidate: 60 },
);

// Call from any admin server action / route handler that mutates one
// of the tables aggregated by getAdminCounters. The TTL is already
// 60s (passive refresh), so missing the call only delays the badge
// update — it doesn't break correctness.
export function revalidateAdminCounters(): void {
  revalidateTag(ADMIN_COUNTERS_TAG);
}
