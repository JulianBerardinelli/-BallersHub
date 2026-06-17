import { createSupabaseAdmin } from "@/lib/supabase/admin";
import HonoursManager from "@/app/[locale]/(dashboard)/dashboard/edit-profile/football-data/components/HonoursManager";
import { fetchDashboardPublishingState } from "@/lib/dashboard/client/publishing-state";
import { loadPlayerCareerForAdmin } from "@/lib/admin/edit-data";
import { adminUpsertHonour, adminDeleteHonour } from "../actions";

export default async function AdminHonoursPage({
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
    <HonoursManager
      playerId={id}
      adminMode
      honours={publishing.honours}
      careerOptions={career.options}
      upsertAction={adminUpsertHonour}
      deleteAction={adminDeleteHonour}
    />
  );
}
