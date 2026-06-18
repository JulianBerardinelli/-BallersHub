"use server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import { revalidatePath } from "next/cache";

export type CoachProfileInput = {
  roleTitle: string | null;
  bio: string | null;
  careerObjectives: string | null;
  playingStyle: string | null;
  methodologyAnalysis: string | null;
  preferredFormations: string[];
  /** Pro-layout theme colors. Omitted by Free editors; only applied when present. */
  theme?: {
    primaryColor: string | null;
    accentColor: string | null;
    backgroundColor: string | null;
  };
};

// Accepts a #rrggbb hex (any case) → normalized lower-case; anything else → null
// (the Pro layout then falls back to the brand defaults).
function normHex(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return /^#[0-9a-fA-F]{6}$/.test(t) ? t.toLowerCase() : null;
}

// Edits the coach's own free-text profile fields (non-moderated, like the
// player's bio/scouting). Runs as the user's session client so RLS
// (coach_profiles owner UPDATE) is the gate. Career, licenses and media go
// through their own (moderated) flows — NOT here.
export async function updateCoachProfile(
  input: CoachProfileInput,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado." };

  const { data: profile, error: pErr } = await supabase
    .from("coach_profiles")
    .select("id, slug, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (pErr) return { success: false, error: pErr.message };
  if (!profile) return { success: false, error: "No tenés un perfil de entrenador." };

  const formations = (input.preferredFormations ?? [])
    .map((f) => f.trim())
    .filter((f) => f.length > 0)
    .slice(0, 12);

  const { error } = await supabase
    .from("coach_profiles")
    .update({
      role_title: input.roleTitle?.trim() || null,
      bio: input.bio?.trim() || null,
      career_objectives: input.careerObjectives?.trim() || null,
      playing_style: input.playingStyle?.trim() || null,
      methodology_analysis: input.methodologyAnalysis?.trim() || null,
      preferred_formations: formations.length > 0 ? formations : null,
      ...(input.theme && {
        theme_primary_color: normHex(input.theme.primaryColor),
        theme_accent_color: normHex(input.theme.accentColor),
        theme_background_color: normHex(input.theme.backgroundColor),
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);
  if (error) return { success: false, error: error.message };

  // Only an approved+public profile is live; revalidate its public surfaces.
  revalidateCoachPublicProfile(profile.slug);
  revalidatePath("/dashboard/coach/edit");
  return { success: true };
}
