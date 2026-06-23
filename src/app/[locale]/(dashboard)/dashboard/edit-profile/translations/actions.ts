"use server";

import { revalidatePath } from "next/cache";
import { type PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";

import { createHash } from "crypto";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import {
  CONTENT_LOCALES,
  getAvailablePlayerLocales,
} from "@/lib/i18n/profile-content";
import {
  translateBlock,
  type TranslationBlock,
  type TranslateLocale,
} from "@/lib/i18n/ai-translate";

// Monthly auto-translation regen quota PER PROFILE (HANDOFF §5.1).
const REGEN_LIMIT = Number(process.env.AI_TRANSLATION_MONTHLY_REGEN_LIMIT ?? 40);

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
  // es too: the adaptive editor lets a Pro whose native language ISN'T es
  // edit/generate the canonical Spanish here. es writes to player_profiles;
  // en/it/pt/de/fr/fi write to player_profile_translations.
  locale: z.enum(["es", "en", "it", "pt", "de", "fr", "fi"]),
  fields: fieldsSchema,
});

const deleteSchema = z.object({
  playerId: z.string().uuid(),
  locale: z.enum(["en", "it", "pt", "de", "fr", "fi"]),
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

  const norm = (v: string | undefined) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  };
  const chars =
    fields.topCharacteristics && fields.topCharacteristics.length > 0
      ? fields.topCharacteristics
      : null;

  // es is the canonical content rendered at /<slug> — write the 8 free-text
  // fields straight to player_profiles (NOT *_translations). Only these
  // free-text columns are touched; structured data stays intact. es is always
  // "available" so it never counts against the tier cap.
  if (locale === "es") {
    const { error: updateError } = await owned.supabase
      .from("player_profiles")
      .update({
        bio: norm(fields.bio),
        career_objectives: norm(fields.careerObjectives),
        top_characteristics: chars,
        tactics_analysis: norm(fields.tacticsAnalysis),
        physical_analysis: norm(fields.physicalAnalysis),
        mental_analysis: norm(fields.mentalAnalysis),
        technique_analysis: norm(fields.techniqueAnalysis),
        analysis_author: norm(fields.analysisAuthor),
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId);

    if (updateError) return { success: false, message: mapPostgrestError(updateError) };

    revalidateAllLocales(owned.slug);
    return {
      success: true,
      message: "Versión en español guardada. Es tu contenido canónico, ya visible en tu perfil público.",
      availableLocales: await getAvailablePlayerLocales(playerId),
    };
  }

  // en/it/pt → player_profile_translations.
  // Tier-limit guard (HANDOFF §6): Pro = native + up to 3 (4 total),
  // Free = 1. A brand-new locale only counts against the cap.
  const available = await getAvailablePlayerLocales(playerId);
  const tierLimit = 4; // owner is Pro here; Free is rejected above
  if (!available.includes(locale as never) && available.length >= tierLimit) {
    return { success: false, message: "Alcanzaste el límite de idiomas de tu plan." };
  }

  const { error: upsertError } = await owned.supabase
    .from("player_profile_translations")
    .upsert(
      {
        player_id: playerId,
        locale,
        bio: norm(fields.bio),
        career_objectives: norm(fields.careerObjectives),
        top_characteristics: chars,
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

// ---------------------------------------------------------------------------
// "Auto-completar con Claude" — generates an editable DRAFT only. Never writes
// to player_profile_translations (HANDOFF §5: no auto-save / no auto-publish).
// Anti-abuse defense-in-depth (§5.1): the UI locks the button (anti
// double-click); here we add the hash-idempotency + first-free + monthly regen
// quota, all keyed off ai_translation_events.
// ---------------------------------------------------------------------------

export type DraftResult =
  | {
      success: true;
      cached: boolean;
      draft: Record<string, unknown> | null;
      message: string;
    }
  | { success: false; message: string };

const draftSchema = z.object({
  playerId: z.string().uuid(),
  // TARGET locale — es included (translating, e.g., pt → es).
  locale: z.enum(["es", "en", "it", "pt", "de", "fr", "fi"]),
  block: z.enum(["bio", "scouting"]),
  force: z.boolean().optional(),
});

// The 8 free-text columns, as stored (snake_case) on either player_profiles
// (es) or player_profile_translations (en/it/pt).
type RawFreeText = {
  bio: string | null;
  career_objectives: string | null;
  top_characteristics: string[] | null;
  tactics_analysis: string | null;
  physical_analysis: string | null;
  mental_analysis: string | null;
  technique_analysis: string | null;
  analysis_author: string | null;
};

const FREE_TEXT_COLS =
  "bio, career_objectives, top_characteristics, tactics_analysis, physical_analysis, mental_analysis, technique_analysis, analysis_author";

/** Shape one editor block's source object (camelCase keys) from a raw row. */
function buildBlockSource(
  raw: RawFreeText | null,
  block: "bio" | "scouting",
): Record<string, unknown> {
  const r = raw ?? ({} as Partial<RawFreeText>);
  return block === "bio"
    ? {
        bio: r.bio ?? "",
        careerObjectives: r.career_objectives ?? "",
        topCharacteristics: r.top_characteristics ?? [],
      }
    : {
        tacticsAnalysis: r.tactics_analysis ?? "",
        physicalAnalysis: r.physical_analysis ?? "",
        mentalAnalysis: r.mental_analysis ?? "",
        techniqueAnalysis: r.technique_analysis ?? "",
        analysisAuthor: r.analysis_author ?? "",
      };
}

export async function generateTranslationDraft(input: {
  playerId: string;
  locale: string;
  block: string;
  force?: boolean;
}): Promise<DraftResult> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { playerId, locale, block, force } = parsed.data;

  const { owned, error } = await ensureProOwner(playerId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };
  const { supabase } = owned;

  // Source = the canonical es base. The 8 fields live on player_profiles and are
  // written in es in Football data; this editor only translates es → en/it/pt,
  // so the source is ALWAYS Spanish — matching the "ES:" reference shown in the
  // UI. Never trust the client for the source: it's what the hash + the
  // translation are built from.
  const sourceLocale: TranslateLocale = "es";

  if (locale === sourceLocale) {
    return {
      success: false,
      message:
        "El español es tu base: se edita en Football data, no se traduce acá.",
    };
  }

  const { data: rawEs } = await supabase
    .from("player_profiles")
    .select(FREE_TEXT_COLS)
    .eq("id", playerId)
    .maybeSingle<RawFreeText>();
  if (!rawEs) return { success: false, message: "No encontramos el perfil." };
  const source = buildBlockSource(rawEs, block);

  const hasContent = Object.values(source).some((v) =>
    Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0,
  );
  if (!hasContent) {
    return {
      success: false,
      message:
        "Completá y guardá primero el contenido en tu idioma para poder traducirlo.",
    };
  }

  const sourceHash = createHash("sha256")
    .update(JSON.stringify(source))
    .digest("hex");

  const { data: events } = await supabase
    .from("ai_translation_events")
    .select("kind, source_hash, created_at")
    .eq("player_id", playerId)
    .eq("locale", locale)
    .eq("block", block)
    .order("created_at", { ascending: false });

  const hasAny = (events?.length ?? 0) > 0;
  const lastHash = events?.[0]?.source_hash as string | undefined;

  let kind: "initial" | "regen";
  if (!hasAny) {
    // First translation of this block→locale is free (HANDOFF §5.1.3).
    kind = "initial";
  } else {
    // Idempotent: same source as last generation and not forcing → no model
    // call, no quota burn ($0). The client still holds its draft.
    if (!force && lastHash === sourceHash) {
      return {
        success: true,
        cached: true,
        draft: null,
        message:
          "Tu idioma no cambió desde la última generación. Editá el borrador actual o tocá Regenerar para otra versión.",
      };
    }
    kind = "regen";
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();
    const { count } = await supabase
      .from("ai_translation_events")
      .select("*", { count: "exact", head: true })
      .eq("player_id", playerId)
      .eq("kind", "regen")
      .gte("created_at", monthStart);
    if ((count ?? 0) >= REGEN_LIMIT) {
      return {
        success: false,
        message: `Alcanzaste el límite mensual de ${REGEN_LIMIT} regeneraciones automáticas. La edición manual sigue disponible.`,
      };
    }
  }

  let draft: Record<string, unknown>;
  try {
    draft = (await translateBlock(
      block as TranslationBlock,
      source,
      sourceLocale,
      locale as TranslateLocale,
    )) as Record<string, unknown>;
  } catch {
    return {
      success: false,
      message: "No pudimos generar la traducción ahora. Probá de nuevo en un momento.",
    };
  }

  // Audit + quota event. Does NOT publish anything.
  await supabase.from("ai_translation_events").insert({
    player_id: playerId,
    locale,
    block,
    kind,
    source_hash: sourceHash,
  });

  return {
    success: true,
    cached: false,
    draft,
    message:
      kind === "initial"
        ? "Borrador generado con Claude. Revisalo y guardá cuando estés conforme."
        : "Nueva versión generada. Revisala y guardá si te gusta.",
  };
}

// ---------------------------------------------------------------------------
// Honours (palmarés) translations — F6. Base honour lives on player_honours
// (es, edited in football-data); en/it/pt overrides go to
// player_honour_translations. Same Pro gate + per-field es fallback.
// ---------------------------------------------------------------------------

const honourFieldsSchema = z.object({
  title: z.string().trim().max(200).optional(),
  competition: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
});

const honourSaveSchema = z.object({
  playerId: z.string().uuid(),
  honourId: z.string().uuid(),
  // es is the base (player_honours), edited in football-data — never here.
  locale: z.enum(["en", "it", "pt", "de", "fr", "fi"]),
  fields: honourFieldsSchema,
});

const honourDeleteSchema = z.object({
  playerId: z.string().uuid(),
  honourId: z.string().uuid(),
  locale: z.enum(["en", "it", "pt", "de", "fr", "fi"]),
});

export type HonourTranslationFields = z.infer<typeof honourFieldsSchema>;
export type HonourActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

/** Confirm the honour belongs to the (already Pro-owned) player. */
async function honourBelongsToPlayer(
  supabase: Awaited<ReturnType<typeof createSupabaseServerRoute>>,
  honourId: string,
  playerId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("player_honours")
    .select("id")
    .eq("id", honourId)
    .eq("player_id", playerId)
    .maybeSingle<{ id: string }>();
  return !!data;
}

export async function saveHonourTranslation(input: {
  playerId: string;
  honourId: string;
  locale: string;
  fields: HonourTranslationFields;
}): Promise<HonourActionResult> {
  const parsed = honourSaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { playerId, honourId, locale, fields } = parsed.data;

  const { owned, error } = await ensureProOwner(playerId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };
  if (!(await honourBelongsToPlayer(owned.supabase, honourId, playerId))) {
    return { success: false, message: "No encontramos ese palmarés en tu perfil." };
  }

  const norm = (v: string | undefined) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  };

  const { error: upsertError } = await owned.supabase
    .from("player_honour_translations")
    .upsert(
      {
        honour_id: honourId,
        locale,
        title: norm(fields.title),
        competition: norm(fields.competition),
        description: norm(fields.description),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "honour_id,locale" },
    );

  if (upsertError) return { success: false, message: mapPostgrestError(upsertError) };

  revalidateAllLocales(owned.slug);
  return {
    success: true,
    message: "Palmarés traducido. Ya es visible en ese idioma.",
  };
}

export async function deleteHonourTranslation(input: {
  playerId: string;
  honourId: string;
  locale: string;
}): Promise<HonourActionResult> {
  const parsed = honourDeleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { playerId, honourId, locale } = parsed.data;

  const { owned, error } = await ensureProOwner(playerId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };
  if (!(await honourBelongsToPlayer(owned.supabase, honourId, playerId))) {
    return { success: false, message: "No encontramos ese palmarés en tu perfil." };
  }

  const { error: delError } = await owned.supabase
    .from("player_honour_translations")
    .delete()
    .eq("honour_id", honourId)
    .eq("locale", locale);

  if (delError) return { success: false, message: mapPostgrestError(delError) };

  revalidateAllLocales(owned.slug);
  return {
    success: true,
    message: "Traducción eliminada. Ese palmarés vuelve a mostrarse en español.",
  };
}

// "Auto-completar" para un palmarés: traduce el honor es → el locale destino.
// Mismo modelo anti-abuso que los 8 campos (§5.1), con block namespaced por
// honor para que la idempotencia sea por logro; la cuota mensual es compartida.
const honourDraftSchema = z.object({
  playerId: z.string().uuid(),
  honourId: z.string().uuid(),
  locale: z.enum(["en", "it", "pt", "de", "fr", "fi"]),
  force: z.boolean().optional(),
});

export async function generateHonourTranslationDraft(input: {
  playerId: string;
  honourId: string;
  locale: string;
  force?: boolean;
}): Promise<DraftResult> {
  const parsed = honourDraftSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { playerId, honourId, locale, force } = parsed.data;

  const { owned, error } = await ensureProOwner(playerId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };
  const { supabase } = owned;

  // Source = the honour's REAL es fields (honours are written in es in
  // football-data; the translation goes es → target). Never trust the client.
  const { data: h } = await supabase
    .from("player_honours")
    .select("title, competition, description")
    .eq("id", honourId)
    .eq("player_id", playerId)
    .maybeSingle<{
      title: string | null;
      competition: string | null;
      description: string | null;
    }>();
  if (!h) return { success: false, message: "No encontramos ese palmarés en tu perfil." };

  const source: Record<string, unknown> = {
    title: h.title ?? "",
    competition: h.competition ?? "",
    description: h.description ?? "",
  };
  const hasContent = Object.values(source).some(
    (v) => String(v).trim().length > 0,
  );
  if (!hasContent) {
    return {
      success: false,
      message: "El palmarés no tiene contenido en español para traducir.",
    };
  }

  const block = `honour:${honourId}`;
  const sourceHash = createHash("sha256")
    .update(JSON.stringify(source))
    .digest("hex");

  const { data: events } = await supabase
    .from("ai_translation_events")
    .select("kind, source_hash, created_at")
    .eq("player_id", playerId)
    .eq("locale", locale)
    .eq("block", block)
    .order("created_at", { ascending: false });

  const hasAny = (events?.length ?? 0) > 0;
  const lastHash = events?.[0]?.source_hash as string | undefined;

  let kind: "initial" | "regen";
  if (!hasAny) {
    kind = "initial";
  } else {
    if (!force && lastHash === sourceHash) {
      return {
        success: true,
        cached: true,
        draft: null,
        message:
          "El palmarés no cambió desde la última generación. Editá el borrador o tocá Regenerar.",
      };
    }
    kind = "regen";
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();
    const { count } = await supabase
      .from("ai_translation_events")
      .select("*", { count: "exact", head: true })
      .eq("player_id", playerId)
      .eq("kind", "regen")
      .gte("created_at", monthStart);
    if ((count ?? 0) >= REGEN_LIMIT) {
      return {
        success: false,
        message: `Alcanzaste el límite mensual de ${REGEN_LIMIT} regeneraciones automáticas. La edición manual sigue disponible.`,
      };
    }
  }

  let draft: Record<string, unknown>;
  try {
    draft = (await translateBlock(
      "honour",
      source,
      "es",
      locale as TranslateLocale,
    )) as Record<string, unknown>;
  } catch {
    return {
      success: false,
      message: "No pudimos generar la traducción ahora. Probá de nuevo en un momento.",
    };
  }

  await supabase.from("ai_translation_events").insert({
    player_id: playerId,
    locale,
    block,
    kind,
    source_hash: sourceHash,
  });

  return {
    success: true,
    cached: false,
    draft,
    message:
      kind === "initial"
        ? "Borrador generado con IA. Revisalo y guardá cuando estés conforme."
        : "Nueva versión generada. Revisala y guardá si te gusta.",
  };
}
