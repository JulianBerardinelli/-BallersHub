import { createSupabaseAdmin } from "@/lib/supabase/admin";
import SectionCard from "@/components/dashboard/client/SectionCard";
import ExternalLinksManager from "@/app/[locale]/(dashboard)/dashboard/edit-profile/football-data/components/ExternalLinksManager";
import { fetchDashboardPublishingState } from "@/lib/dashboard/client/publishing-state";
import { adminUpsertPlayerLink, adminDeletePlayerLink } from "../actions";

export default async function AdminLinksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const publishing = await fetchDashboardPublishingState(admin, id);

  return (
    <SectionCard
      title="Enlaces externos"
      description="Transfermarkt, BeSoccer, redes, highlights y enlaces personalizados del jugador."
    >
      <ExternalLinksManager
        playerId={id}
        links={publishing.links}
        suggestions={{}}
        upsertAction={adminUpsertPlayerLink}
        deleteAction={adminDeletePlayerLink}
      />
    </SectionCard>
  );
}
