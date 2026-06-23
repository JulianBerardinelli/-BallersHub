import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { loadCoachCareerForEditor } from "@/lib/coach/career-data";
import CoachCareerManager, {
  type CoachCareerRequestSnapshot,
} from "./CoachCareerManager";

export const dynamic = "force-dynamic";

export default async function CoachCareerPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/career");

  const { data: profile } = await supabase
    .from("coach_profiles")
    .select("id, full_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; full_name: string }>();

  if (!profile) {
    return (
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        Tu perfil de entrenador todavía no está activo. Cuando el equipo apruebe tu solicitud vas a
        poder cargar tu trayectoria desde acá.
      </div>
    );
  }

  const coachId = profile.id;

  const [{ stages, stats }, { data: requestRow }] = await Promise.all([
    loadCoachCareerForEditor(supabase, coachId),
    supabase
      .from("coach_career_revision_requests")
      .select("id, status, submitted_at, reviewed_at, change_summary, resolution_note")
      .eq("coach_id", coachId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        status: "pending" | "approved" | "rejected" | "cancelled";
        submitted_at: string | null;
        reviewed_at: string | null;
        change_summary: string | null;
        resolution_note: string | null;
      }>(),
  ]);

  let latestRequest: CoachCareerRequestSnapshot | null = null;
  if (requestRow) {
    let pendingStageCount = 0;
    let pendingStatCount = 0;
    if (requestRow.status === "pending") {
      const [{ count: sc }, { count: stc }] = await Promise.all([
        supabase
          .from("coach_career_revision_items")
          .select("id", { count: "exact", head: true })
          .eq("request_id", requestRow.id),
        supabase
          .from("coach_stats_revision_items")
          .select("id", { count: "exact", head: true })
          .eq("request_id", requestRow.id),
      ]);
      pendingStageCount = sc ?? 0;
      pendingStatCount = stc ?? 0;
    }
    latestRequest = {
      id: requestRow.id,
      status: requestRow.status,
      submittedAt: requestRow.submitted_at,
      reviewedAt: requestRow.reviewed_at,
      note: requestRow.change_summary,
      resolutionNote: requestRow.resolution_note,
      pendingStageCount,
      pendingStatCount,
    };
  }

  return (
    <CoachCareerManager
      coachId={coachId}
      coachName={profile.full_name}
      career={stages}
      stats={stats}
      latestRequest={latestRequest}
    />
  );
}
