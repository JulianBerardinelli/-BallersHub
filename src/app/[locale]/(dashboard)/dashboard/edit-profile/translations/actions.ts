"use server";

import { revalidatePath } from "next/cache";
import { type PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import {
  CONTENT_LOCALES,
  getAvailablePlayerLocales,
} from "@/lib/i18n/profile-content";

// Same field caps as the ES editors (football-data / personal-data) so a
// translation can't grow unbounded.
const fieldsSchema = z.object({
  bio: z.string().trim().max(2000).optional(),
  careerObjectives: z.string().trim().max(600).optional(),
  topCharacteristics: z.array(z.string().trim().min(1)).max(12).optional(),
  tacticsAnalysis: z.string().trim().max(1000).optional(),
  physicalAnalysis: z.string().trim().max(1000).optional(),
  mentalAnalysis: z.string().trim().max(1000).optional(),
  techniqueAnalysis: z.string().trim().max(1000).optional(),
  analysisAuthor: z.string().trim().max(120).optional(),
});

const saveSchema = z.object({
  playerId: z.string().uuid(),
  // Native ES is edited in the normal editors, never here.
  locale: z.enum(["en", "it", "pt"]),
  fields: fieldsSchema,
});

const deleteSchema = z.object({
  playerId: z.string().uuid(),
  locale: z.enum(["en", "it", "pt"]),
});

export type TranslationFields = z.infer<typeof fieldsSchema>;

type ActionSuccess = {
  success: true;
  message: string;
  availableLocales: string[];
};
type ActionFailure = { success: false; message: string };
export type TranslationActionResult = ActionSuccess | ActionFailure;

function mapPostgrestError(error: PostgrestError | null): string {
  if (!error) return "No fue posible completar la operación.";
  if (error.code === "42501") return "No tenés permisos para modificar este perfil.";
  return error.message ?? "No fue posible completar la operación.";
}

type OwnedPlayer = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerRoute>>;
  userId: string;
  slug: string | null;
};

/** Auth + ownership + Pro gate. Returns an error string on any failure. */
async function ensureProOwner(
  playerId: string,
): Promise<{ owned: OwnedPlayer | null; error: string | null }> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) return { owned: null, error: "No fue posible validar la sesión." };
  if (!user) return { owned: null, error: "Debés iniciar sesión para continuar." };

  const { data: profile, error: profileError } = await supabase
    .from("player_profiles")
    .select("id, user_id, slug")
    .eq("id", playerId)
    .maybeSingle<{ id: string; user_id: string; slug: string | null }>();

  if (profileError) return { owned: null, error: mapPostgrestError(profileError) };
  if (!profile) return { owned: null, error: "No encontramos el perfil indicado." };
  if (profile.user_id !== user.id) {
    return { owned: null, error: "No tenés permisos para modificar este perfil." };
  }

  // Tier gate: translations are a Pro feature (HANDOFF §6).
  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "plan, plan_id, status, status_v2, processor, processor_subscription_id, current_period_end, cancel_at_period_end",
    )
    .eq("user_id", user.id)
    .maybeSingle<{
      plan: string | null;
      plan_id: string | null;
      status: string | null;
      status_v2: string | null;
      processor: string | null;
      processor_subscription_id: string | null;
      current_period_end: string | null;
      cancel_at_period_end: boolean | null;
    }>();

  const planAccess = resolvePlanAccess(
    sub
      ? {
          plan: sub.plan,
          planId: sub.plan_id,
          status: sub.status,
          statusV2: sub.status_v2,
          processor: sub.processor,
          processorSubscriptionId: sub.processor_subscription_id,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          trialEndsAt: null,
          canceledAt: null,
        }
      : null,
  );

  if (!planAccess.isPro) {
    return {
      owned: null,
      error: "Las traducciones del perfil son una función Pro. Mejorá tu plan para publicar en otros idiomas.",
    };
  }

  return { owned: { supabase, userId: user.id, slug: profile.slug }, error: null };
}

/** Revalidate every locale URL of the cluster — adding/removing a locale
 *  changes the hreflang set on ALL of them. */
function revalidateAllLocales(slug: string | null) {
  revalidatePlayerPublicProfile(slug); // es (sin prefijo) + directorios + sitemap
  if (!slug) return;
  for (const l of CONTENT_LOCALES) {
    if (l !== "es") revalidatePath(`/${l}/${slug}`);
  }
}

export async function savePlayerTranslation(input: {
  playerId: string;
  locale: string;
  fields: TranslationFields;
}): Promise<TranslationActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Datos inválidos. Revisá los campos." };
  }
  const { playerId, locale, fields } = parsed.data;

  const { owned, error } = await ensureProOwner(playerId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };

  // Tier-limit guard (HANDOFF §6): Pro = native + up to 3 (4 total),
  // Free = 1. A brand-new locale only counts against the cap.
  const available = await getAvailablePlayerLocales(playerId);
  const tierLimit = 4; // owner is Pro here; Free is rejected above
  if (!available.includes(locale as never) && available.length >= tierLimit) {
    return { success: false, message: "Alcanzaste el límite de idiomas de tu plan." };
  }

  const norm = (v: string | undefined) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  };

  const { error: upsertError } = await owned.supabase
    .from("player_profile_translations")
    .upsert(
      {
        player_id: playerId,
        locale,
        bio: norm(fields.bio),
        career_objectives: norm(fields.careerObjectives),
        top_characteristics:
          fields.topCharacteristics && fields.topCharacteristics.length > 0
            ? fields.topCharacteristics
            : null,
        tactics_analysis: norm(fields.tacticsAnalysis),
        physical_analysis: norm(fields.physicalAnalysis),
        mental_analysis: norm(fields.mentalAnalysis),
        technique_analysis: norm(fields.techniqueAnalysis),
        analysis_author: norm(fields.analysisAuthor),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_id,locale" },
    );

  if (upsertError) return { success: false, message: mapPostgrestError(upsertError) };

  revalidateAllLocales(owned.slug);
  const nextAvailable = available.includes(locale as never)
    ? available
    : [...available, locale];

  return {
    success: true,
    message: "Versión guardada. Ya es visible y indexable en ese idioma.",
    availableLocales: nextAvailable,
  };
}

export async function deletePlayerTranslation(input: {
  playerId: string;
  locale: string;
}): Promise<TranslationActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { playerId, locale } = parsed.data;

  const { owned, error } = await ensureProOwner(playerId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };

  const { error: delError } = await owned.supabase
    .from("player_profile_translations")
    .delete()
    .eq("player_id", playerId)
    .eq("locale", locale);

  if (delError) return { success: false, message: mapPostgrestError(delError) };

  revalidateAllLocales(owned.slug);
  const available = (await getAvailablePlayerLocales(playerId)).filter(
    (l) => l !== locale,
  );
  return {
    success: true,
    message: "Versión eliminada. Ese idioma vuelve a fallback en español (no indexable).",
    availableLocales: available,
  };
}
