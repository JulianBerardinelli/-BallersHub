import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { loadCoachHonoursForEditor, loadCoachCareerOptions } from "@/lib/coach/honours-data";
import CoachHonoursManager from "./CoachHonoursManager";

export const dynamic = "force-dynamic";

export default async function CoachHonoursPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/honours");

  const { data: profile } = await supabase
    .from("coach_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!profile) {
    return (
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        Tu perfil todavía no está activo. Cuando el equipo apruebe tu solicitud vas a poder cargar
        tus logros desde acá.
      </div>
    );
  }

  const [honours, careerOptions] = await Promise.all([
    loadCoachHonoursForEditor(supabase, profile.id),
    loadCoachCareerOptions(supabase, profile.id),
  ]);

  return <CoachHonoursManager honours={honours} careerOptions={careerOptions} />;
}
