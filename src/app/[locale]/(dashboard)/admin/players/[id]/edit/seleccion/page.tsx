import { createSupabaseAdmin } from "@/lib/supabase/admin";
import SectionCard from "@/components/dashboard/client/SectionCard";
import NationalTeamManager, {
  type NationalTeamStintView,
} from "@/app/[locale]/(dashboard)/dashboard/edit-profile/national-team/components/NationalTeamManager";
import { adminUpsertNationalTeamStint, adminDeleteNationalTeamStint } from "../actions";

export default async function AdminNationalTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: rawStints } = await admin
    .from("national_team_stints")
    .select("*")
    .eq("player_id", id)
    .order("order_index", { ascending: true })
    .order("start_year", { ascending: false, nullsFirst: false });

  const stints: NationalTeamStintView[] = (rawStints ?? []).map((r) => ({
    id: r.id,
    teamId: r.team_id ?? null,
    proposedTeamName: r.proposed_team_name ?? null,
    countryCode: r.country_code ?? null,
    ageCategory: r.age_category,
    participation: r.participation,
    highlights: r.highlights ?? null,
    startYear: r.start_year ?? null,
    endYear: r.end_year ?? null,
    description: r.description ?? null,
    caps: r.caps ?? null,
    goals: r.goals ?? null,
    assists: r.assists ?? null,
    minutes: r.minutes ?? null,
    referenceUrl: r.reference_url ?? null,
    status: r.status,
    resolutionNote: r.resolution_note ?? null,
  }));

  return (
    <SectionCard
      title="Selección Nacional"
      description="Editás las etapas en vivo: al guardar quedan aprobadas y visibles de inmediato en el perfil Pro. Para avisarle al jugador, usá «Finalizar revisión»."
    >
      <NationalTeamManager
        playerId={id}
        // Admin writes live; the Pro soft-save gate is bypassed via adminMode.
        isPro
        adminMode
        stints={stints}
        upsertAction={adminUpsertNationalTeamStint}
        deleteAction={adminDeleteNationalTeamStint}
      />
    </SectionCard>
  );
}
