import { createSupabaseAdmin } from "@/lib/supabase/admin";
import SectionCard from "@/components/dashboard/client/SectionCard";
import CareerManager from "@/app/[locale]/(dashboard)/dashboard/edit-profile/football-data/components/CareerManager";
import { loadPlayerCareerForAdmin } from "@/lib/admin/edit-data";
import { adminSubmitCareerLive } from "../actions";

export default async function AdminCareerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { stages } = await loadPlayerCareerForAdmin(admin, id);
  const { data: p } = await admin
    .from("player_profiles")
    .select("full_name")
    .eq("id", id)
    .maybeSingle<{ full_name: string | null }>();

  return (
    <SectionCard
      title="Trayectoria"
      description="Editás las etapas en vivo. Al guardar se reflejan de inmediato en el perfil público y se notifica al jugador. Si el jugador tenía una solicitud pendiente, se cancela."
    >
      <CareerManager
        playerId={id}
        playerName={p?.full_name ?? null}
        stages={stages}
        // Admin writes live → no pending-request lockout UI.
        latestRequest={null}
        submitAction={adminSubmitCareerLive}
      />
    </SectionCard>
  );
}
