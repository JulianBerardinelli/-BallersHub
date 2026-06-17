import { createSupabaseAdmin } from "@/lib/supabase/admin";
import SeasonStatsManager from "@/app/[locale]/(dashboard)/dashboard/edit-profile/football-data/components/SeasonStatsManager";
import { fetchDashboardPublishingState } from "@/lib/dashboard/client/publishing-state";
import { loadPlayerCareerForAdmin } from "@/lib/admin/edit-data";
import { adminSubmitStatsLive, adminDeleteSeasonStat } from "../actions";

export default async function AdminStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const [publishing, career] = await Promise.all([
    fetchDashboardPublishingState(admin, id),
    loadPlayerCareerForAdmin(admin, id),
  ]);

  return (
    <SeasonStatsManager
      playerId={id}
      stats={publishing.stats}
      careerOptions={career.options}
      // Admin writes live (no revision queue) → no pending-request UI.
      latestRequest={null}
      submitAction={adminSubmitStatsLive}
      deleteAction={adminDeleteSeasonStat}
    />
  );
}
