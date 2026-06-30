import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { loadCoachPlanAccess } from "@/lib/dashboard/coach-plan";
import { loadCoachGameIdeasForEditor } from "@/lib/coach/game-ideas-data";
import { isHeadCoachLayout, isStaffRole } from "@/lib/staff/roles";
import CoachGameIdeasManager from "./CoachGameIdeasManager";

export const dynamic = "force-dynamic";

export default async function CoachGameIdeasPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/game-ideas");

  const { data: profile } = await supabase
    .from("coach_profiles")
    .select("id, primary_role")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; primary_role: string | null }>();

  if (!profile) {
    return (
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        Tu perfil todavía no está activo. Cuando el equipo apruebe tu solicitud vas a poder cargar
        tus ideas de juego desde acá.
      </div>
    );
  }

  const [ideas, access] = await Promise.all([
    loadCoachGameIdeasForEditor(supabase, profile.id),
    loadCoachPlanAccess(supabase, user.id),
  ]);

  // null/legacy → permitido (showTactical=true por defecto, igual que el render).
  const isHeadCoach =
    profile.primary_role == null ||
    (isStaffRole(profile.primary_role) && isHeadCoachLayout(profile.primary_role));

  return <CoachGameIdeasManager ideas={ideas} isPro={access.isPro} isHeadCoach={isHeadCoach} />;
}
