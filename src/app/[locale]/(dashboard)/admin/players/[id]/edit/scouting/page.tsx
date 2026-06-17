import { createSupabaseAdmin } from "@/lib/supabase/admin";
import ScoutingAnalysisSection from "@/app/[locale]/(dashboard)/dashboard/edit-profile/football-data/components/ScoutingAnalysisSection";
import { adminUpdateScouting } from "../actions";

export default async function AdminScoutingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("player_profiles")
    .select(
      "top_characteristics, tactics_analysis, physical_analysis, mental_analysis, technique_analysis, analysis_author",
    )
    .eq("id", id)
    .maybeSingle<{
      top_characteristics: string[] | null;
      tactics_analysis: string | null;
      physical_analysis: string | null;
      mental_analysis: string | null;
      technique_analysis: string | null;
      analysis_author: string | null;
    }>();

  return (
    <ScoutingAnalysisSection
      playerId={id}
      adminMode
      action={adminUpdateScouting}
      initialValues={{
        topCharacteristics: (data?.top_characteristics ?? []).join(", "),
        tacticsAnalysis: data?.tactics_analysis ?? "",
        physicalAnalysis: data?.physical_analysis ?? "",
        mentalAnalysis: data?.mental_analysis ?? "",
        techniqueAnalysis: data?.technique_analysis ?? "",
        analysisAuthor: data?.analysis_author ?? "",
      }}
    />
  );
}
