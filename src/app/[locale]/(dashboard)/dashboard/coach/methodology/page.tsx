import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { loadCoachPlanAccess } from "@/lib/dashboard/coach-plan";
import { loadCoachMethodologyForEditor } from "@/lib/coach/methodology-data";
import CoachMethodologyManager from "./CoachMethodologyManager";

export const dynamic = "force-dynamic";

export default async function CoachMethodologyPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/methodology");

  const { data: profile } = await supabase
    .from("coach_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!profile) {
    return (
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        Tu perfil todavía no está activo. Cuando el equipo apruebe tu solicitud vas a poder cargar tu
        metodología desde acá.
      </div>
    );
  }

  const [rubros, access] = await Promise.all([
    loadCoachMethodologyForEditor(supabase, profile.id),
    loadCoachPlanAccess(supabase, user.id),
  ]);

  return <CoachMethodologyManager rubros={rubros} isPro={access.isPro} />;
}
