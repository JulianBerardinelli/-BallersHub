"use server";

import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { loadCoachPlanAccess } from "@/lib/dashboard/coach-plan";
import { translationLocaleLimit } from "@/lib/i18n/translation-limits";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import { revalidatePath } from "next/cache";

export type CoachTranslationActionResult = { success: boolean; message?: string };

// es is the native locale (stored on coach_profiles); the override locales are
// held in coach_profile_translations.
const TRANSLATABLE_LOCALES = ["en", "it", "pt", "de", "fr", "fi"] as const;
type TranslatableLocale = (typeof TRANSLATABLE_LOCALES)[number];

// Tier cap (decisión 2a): es + up to 3 overrides = 4 total. Mirrors the player
// translation action. The effective cap is resolved per-profile via
// translationLocaleLimit (the unlimited allowlist lifts it). A brand-new locale
// only counts against the cap; an already-published locale can always be
// re-saved, and deletes are never gated.

/**
 * Locales the coach already publishes = es (always) + every distinct locale
 * with a row in coach_profile_translations. Direct query (not
 * getAvailableCoachLocales, which filters through the 4-value CONTENT_LOCALES
 * and would silently drop de/fr/fi). Used only when ADDING a new locale.
 */
async function getPublishedCoachLocales(
  supabase: Awaited<ReturnType<typeof createSupabaseServerRoute>>,
  coachId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("coach_profile_translations")
    .select("locale")
    .eq("coach_id", coachId);
  const locales = new Set<string>(["es"]);
  for (const row of data ?? []) {
    if (row.locale) locales.add(row.locale as string);
  }
  return [...locales];
}

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
  if (!user) return { error: "No autenticado." as const, supabase: null, coach: null, email: null };

  const access = await loadCoachPlanAccess(supabase, user.id);
  if (!access.isPro) {
    return {
      error: "Las traducciones están disponibles en el plan Pro.",
      supabase: null,
      coach: null,
      email: null,
    };
  }

  const { data: coach, error } = await supabase
    .from("coach_profiles")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; slug: string | null }>();
  if (error) return { error: error.message, supabase: null, coach: null, email: null };
  if (!coach) return { error: "No tenés un perfil de entrenador.", supabase: null, coach: null, email: null };
  return { error: null, supabase, coach, email: user.email ?? null };
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
  const { supabase, coach, email } = ctx;
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
    // Tier-cap guard (decisión 2a): publishing a brand-new locale counts
    // against TIER_LIMIT. Re-saving an already-published locale is allowed;
    // the all-empty (unpublish/delete) branch above is never gated.
    const available = await getPublishedCoachLocales(supabase, coach.id);
    const limit = translationLocaleLimit({ slug: coach.slug, email });
    if (!available.includes(locale) && available.length >= limit) {
      return { success: false, message: "Tu plan permite hasta 3 idiomas además del español." };
    }

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
