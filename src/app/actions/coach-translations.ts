"use server";

import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { loadCoachPlanAccess } from "@/lib/dashboard/coach-plan";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import { revalidatePath } from "next/cache";

export type CoachTranslationActionResult = { success: boolean; message?: string };

// es is the native locale (stored on coach_profiles); only en/it/pt are
// overrides held in coach_profile_translations.
const TRANSLATABLE_LOCALES = ["en", "it", "pt"] as const;
type TranslatableLocale = (typeof TRANSLATABLE_LOCALES)[number];

const fieldText = z
  .union([z.string().trim().max(5000, "Texto demasiado largo."), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .nullable();

const saveSchema = z.object({
  locale: z.enum(TRANSLATABLE_LOCALES),
  bio: fieldText,
  careerObjectives: fieldText,
  playingStyle: fieldText,
  methodologyAnalysis: fieldText,
  analysisAuthor: fieldText,
});

export type CoachTranslationInput = z.infer<typeof saveSchema>;

async function resolveProCoach() {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." as const, supabase: null, coach: null };

  const access = await loadCoachPlanAccess(supabase, user.id);
  if (!access.isPro) {
    return {
      error: "Las traducciones están disponibles en el plan Pro.",
      supabase: null,
      coach: null,
    };
  }

  const { data: coach, error } = await supabase
    .from("coach_profiles")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; slug: string | null }>();
  if (error) return { error: error.message, supabase: null, coach: null };
  if (!coach) return { error: "No tenés un perfil de entrenador.", supabase: null, coach: null };
  return { error: null, supabase, coach };
}

export async function saveCoachTranslation(
  input: CoachTranslationInput,
): Promise<CoachTranslationActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const ctx = await resolveProCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;
  const { locale, bio, careerObjectives, playingStyle, methodologyAnalysis, analysisAuthor } =
    parsed.data;

  const allEmpty =
    !bio && !careerObjectives && !playingStyle && !methodologyAnalysis && !analysisAuthor;

  // An all-empty save unpublishes that locale: deleting the row drops it from
  // hreflang + the locale switcher (row existence = published).
  if (allEmpty) {
    const { error } = await supabase
      .from("coach_profile_translations")
      .delete()
      .eq("coach_id", coach.id)
      .eq("locale", locale);
    if (error) return { success: false, message: error.message };
  } else {
    const { error } = await supabase.from("coach_profile_translations").upsert(
      {
        coach_id: coach.id,
        locale,
        bio,
        career_objectives: careerObjectives,
        playing_style: playingStyle,
        methodology_analysis: methodologyAnalysis,
        analysis_author: analysisAuthor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "coach_id,locale" },
    );
    if (error) return { success: false, message: error.message };
  }

  revalidateCoachPublicProfile(coach.slug);
  revalidatePath("/dashboard/coach/translations");
  return { success: true };
}

export async function deleteCoachTranslation(
  locale: TranslatableLocale,
): Promise<CoachTranslationActionResult> {
  const ctx = await resolveProCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;
  const { error } = await supabase
    .from("coach_profile_translations")
    .delete()
    .eq("coach_id", coach.id)
    .eq("locale", locale);
  if (error) return { success: false, message: error.message };
  revalidateCoachPublicProfile(coach.slug);
  revalidatePath("/dashboard/coach/translations");
  return { success: true };
}
