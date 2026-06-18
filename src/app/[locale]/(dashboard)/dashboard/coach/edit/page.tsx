import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import CoachProfileEditor from "./CoachProfileEditor";

export const dynamic = "force-dynamic";

export default async function CoachEditPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/edit");

  const { data: profile } = await supabase
    .from("coach_profiles")
    .select(
      "full_name, role_title, bio, career_objectives, playing_style, methodology_analysis, preferred_formations, theme_primary_color, theme_accent_color, theme_background_color",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        Tu perfil de entrenador todavía no está activo. Cuando el equipo apruebe tu
        solicitud vas a poder editarlo desde acá.
      </div>
    );
  }

  return (
    <CoachProfileEditor
      initial={{
        fullName: profile.full_name as string,
        roleTitle: (profile.role_title as string | null) ?? null,
        bio: (profile.bio as string | null) ?? null,
        careerObjectives: (profile.career_objectives as string | null) ?? null,
        playingStyle: (profile.playing_style as string | null) ?? null,
        methodologyAnalysis: (profile.methodology_analysis as string | null) ?? null,
        preferredFormations: (profile.preferred_formations as string[] | null) ?? [],
        theme: {
          primaryColor: (profile.theme_primary_color as string | null) ?? null,
          accentColor: (profile.theme_accent_color as string | null) ?? null,
          backgroundColor: (profile.theme_background_color as string | null) ?? null,
        },
      }}
    />
  );
}
