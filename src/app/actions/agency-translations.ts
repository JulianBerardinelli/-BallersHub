"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidateAgencyPublicProfile } from "@/lib/seo/revalidate";
import { CONTENT_LOCALES } from "@/lib/i18n/profile-content";
import { translationLocaleLimit } from "@/lib/i18n/translation-limits";
// Generic per-user subscription → PlanAccess loader (named for its first use in
// coaches; the subscription is keyed by user_id, role-agnostic).
import { loadCoachPlanAccess } from "@/lib/dashboard/coach-plan";

// Agency description/tagline live on agency_profiles (es, edited in the agency
// dashboard); the override locales go to agency_profile_translations. Same
// per-field es fallback model as the player profile (F5).

// Translatable (non-es) locales. es is the canonical base, edited elsewhere.
// 6 overrides → 7 total content locales, but a single plan can only PUBLISH a
// capped subset (see translationLocaleLimit).
const TRANSLATABLE_LOCALES = ["en", "it", "pt", "de", "fr", "fi"] as const;

// Tier cap (decisión 2a): es + up to 3 overrides = 4 total. Mirrors the player
// translation action. The effective cap is resolved per-profile via
// translationLocaleLimit (the unlimited allowlist lifts it). A brand-new locale
// only counts against the cap; an already-published locale can always be
// re-saved.

/**
 * Locales the agency already publishes = es (always) + every distinct locale
 * with a row in agency_profile_translations. Counted with a direct query (not
 * getAvailableAgencyLocales, which filters through the 4-value CONTENT_LOCALES
 * and would silently drop de/fr/fi). Used to enforce TIER_LIMIT before adding a
 * NEW locale; deletes never call this.
 */
async function getPublishedAgencyLocales(
  supabase: Owned["supabase"],
  agencyId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("agency_profile_translations")
    .select("locale")
    .eq("agency_id", agencyId);
  const locales = new Set<string>(["es"]);
  for (const row of data ?? []) {
    if (row.locale) locales.add(row.locale as string);
  }
  return [...locales];
}

/**
 * Reject saving a NOT-yet-published locale once the plan's TIER_LIMIT is hit.
 * Returns an error string to bubble up, or null when the save may proceed.
 * (es never reaches here — it's the base; an already-available locale passes.)
 */
async function enforceLocaleTier(
  owned: Owned,
  agencyId: string,
  locale: string,
): Promise<string | null> {
  const available = await getPublishedAgencyLocales(owned.supabase, agencyId);
  const limit = translationLocaleLimit({ slug: owned.slug, email: owned.email });
  if (!available.includes(locale) && available.length >= limit) {
    return "Tu plan permite hasta 3 idiomas además del español.";
  }
  return null;
}

const fieldsSchema = z.object({
  description: z.string().trim().max(2000).optional(),
  tagline: z.string().trim().max(300).optional(),
});

const saveSchema = z.object({
  agencyId: z.string().uuid(),
  locale: z.enum(TRANSLATABLE_LOCALES), // es is the base, edited elsewhere
  fields: fieldsSchema,
});

const deleteSchema = z.object({
  agencyId: z.string().uuid(),
  locale: z.enum(TRANSLATABLE_LOCALES),
});

export type AgencyTranslationFields = z.infer<typeof fieldsSchema>;
export type AgencyTranslationResult =
  | { success: true; message: string }
  | { success: false; message: string };

type Owned = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerRoute>>;
  slug: string | null;
  email: string | null;
};

/**
 * Auth + the user must be staff of this agency (user_profiles.agency_id) AND on
 * a Pro plan. Translations (en/it/pt) are Pro-only, so we enforce the tier
 * server-side here — the gated page UI alone isn't enough (the plan can lapse
 * with the editor open, or the action can be invoked directly). Mirrors the
 * coach/player translation actions. Every translation write path in this file
 * goes through this guard.
 */
async function ensureProAgencyStaff(
  agencyId: string,
): Promise<{ owned: Owned | null; error: string | null }> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { owned: null, error: "Debés iniciar sesión para continuar." };

  const { data: up } = await supabase
    .from("user_profiles")
    .select("agency_id")
    .eq("user_id", user.id)
    .maybeSingle<{ agency_id: string | null }>();
  if (!up || up.agency_id !== agencyId) {
    return { owned: null, error: "No tenés permisos sobre esta agencia." };
  }

  const access = await loadCoachPlanAccess(supabase, user.id);
  if (!access.isPro) {
    return { owned: null, error: "Las traducciones están disponibles en el plan Pro." };
  }

  const { data: ag } = await supabase
    .from("agency_profiles")
    .select("slug")
    .eq("id", agencyId)
    .maybeSingle<{ slug: string | null }>();

  return {
    owned: { supabase, slug: ag?.slug ?? null, email: user.email ?? null },
    error: null,
  };
}

function revalidateAllLocales(slug: string | null) {
  revalidateAgencyPublicProfile(slug);
  // Refresh the in-dashboard editors (all agency sub-routes) so saved es-base /
  // override edits show when bouncing between routes.
  revalidatePath("/dashboard/agency", "layout");
  if (!slug) return;
  for (const l of CONTENT_LOCALES) {
    if (l !== "es") revalidatePath(`/${l}/agency/${slug}`);
  }
}

export async function saveAgencyTranslation(input: {
  agencyId: string;
  locale: string;
  fields: AgencyTranslationFields;
}): Promise<AgencyTranslationResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { agencyId, locale, fields } = parsed.data;

  const { owned, error } = await ensureProAgencyStaff(agencyId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };

  // Tier-cap guard (decisión 2a): only a NEW locale counts against TIER_LIMIT.
  const tierError = await enforceLocaleTier(owned, agencyId, locale);
  if (tierError) return { success: false, message: tierError };

  const norm = (v: string | undefined) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  };

  const { error: upsertError } = await owned.supabase
    .from("agency_profile_translations")
    .upsert(
      {
        agency_id: agencyId,
        locale,
        description: norm(fields.description),
        tagline: norm(fields.tagline),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agency_id,locale" },
    );

  if (upsertError) {
    if (upsertError.code === "42501") {
      return { success: false, message: "No tenés permisos para modificar esta agencia." };
    }
    return { success: false, message: upsertError.message ?? "No fue posible guardar." };
  }

  revalidateAllLocales(owned.slug);
  return { success: true, message: "Traducción guardada. Ya es visible en ese idioma." };
}

export async function deleteAgencyTranslation(input: {
  agencyId: string;
  locale: string;
}): Promise<AgencyTranslationResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { agencyId, locale } = parsed.data;

  const { owned, error } = await ensureProAgencyStaff(agencyId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };

  const { error: delError } = await owned.supabase
    .from("agency_profile_translations")
    .delete()
    .eq("agency_id", agencyId)
    .eq("locale", locale);

  if (delError) {
    return { success: false, message: delError.message ?? "No fue posible eliminar." };
  }

  revalidateAllLocales(owned.slug);
  return {
    success: true,
    message: "Traducción eliminada. Ese idioma vuelve a mostrarse en español.",
  };
}

// =========================================================================
// Services (positional JSONB on agency_profile_translations)
// =========================================================================
//
// Same row as the description+tagline editor (agency_profile_translations
// PK = agency_id,locale), but writes ONLY the `services` jsonb column. The
// upsert path reads the existing row's description/tagline first so we
// never blank them out when the user is just editing services.

const servicesItemSchema = z.object({
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

const servicesSaveSchema = z.object({
  agencyId: z.string().uuid(),
  locale: z.enum(TRANSLATABLE_LOCALES),
  services: z.array(servicesItemSchema).max(12),
});

const servicesDeleteSchema = z.object({
  agencyId: z.string().uuid(),
  locale: z.enum(TRANSLATABLE_LOCALES),
});

export type AgencyServicesTranslationItem = z.infer<typeof servicesItemSchema>;

function normServiceItem(it: AgencyServicesTranslationItem) {
  const t = it.title?.trim();
  const d = it.description?.trim();
  return {
    title: t && t.length > 0 ? t : undefined,
    description: d && d.length > 0 ? d : null,
  };
}

export async function saveServicesTranslation(input: {
  agencyId: string;
  locale: string;
  services: AgencyServicesTranslationItem[];
}): Promise<AgencyTranslationResult> {
  const parsed = servicesSaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { agencyId, locale, services } = parsed.data;

  const { owned, error } = await ensureProAgencyStaff(agencyId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };

  // Tier-cap guard (decisión 2a): publishing services in a brand-new locale
  // also creates an agency_profile_translations row, so it counts against the
  // limit just like the description/tagline save path.
  const tierError = await enforceLocaleTier(owned, agencyId, locale);
  if (tierError) return { success: false, message: tierError };

  // Read the existing description+tagline so the upsert never clobbers them.
  const { data: existing } = await owned.supabase
    .from("agency_profile_translations")
    .select("description, tagline")
    .eq("agency_id", agencyId)
    .eq("locale", locale)
    .maybeSingle<{ description: string | null; tagline: string | null }>();

  const normalized = services.map(normServiceItem);

  const { error: upsertError } = await owned.supabase
    .from("agency_profile_translations")
    .upsert(
      {
        agency_id: agencyId,
        locale,
        description: existing?.description ?? null,
        tagline: existing?.tagline ?? null,
        services: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agency_id,locale" },
    );

  if (upsertError) {
    if (upsertError.code === "42501") {
      return { success: false, message: "No tenés permisos para modificar esta agencia." };
    }
    return { success: false, message: upsertError.message ?? "No fue posible guardar." };
  }

  revalidateAllLocales(owned.slug);
  return { success: true, message: "Servicios traducidos. Ya son visibles en ese idioma." };
}

export async function deleteServicesTranslation(input: {
  agencyId: string;
  locale: string;
}): Promise<AgencyTranslationResult> {
  const parsed = servicesDeleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { agencyId, locale } = parsed.data;

  const { owned, error } = await ensureProAgencyStaff(agencyId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };

  // Null out only the services column — keep description/tagline intact.
  const { error: updError } = await owned.supabase
    .from("agency_profile_translations")
    .update({ services: null, updated_at: new Date().toISOString() })
    .eq("agency_id", agencyId)
    .eq("locale", locale);

  if (updError) {
    return { success: false, message: updError.message ?? "No fue posible eliminar." };
  }

  revalidateAllLocales(owned.slug);
  return {
    success: true,
    message: "Servicios traducidos eliminados. Ese idioma vuelve a mostrarse en español.",
  };
}

// =========================================================================
// Agency media translations (per media id, per locale)
// =========================================================================

const mediaFieldsSchema = z.object({
  title: z.string().trim().max(200).optional(),
  altText: z.string().trim().max(500).optional(),
});

const mediaSaveSchema = z.object({
  agencyId: z.string().uuid(),
  mediaId: z.string().uuid(),
  locale: z.enum(TRANSLATABLE_LOCALES),
  fields: mediaFieldsSchema,
});

const mediaDeleteSchema = z.object({
  agencyId: z.string().uuid(),
  mediaId: z.string().uuid(),
  locale: z.enum(TRANSLATABLE_LOCALES),
});

export type AgencyMediaTranslationFields = z.infer<typeof mediaFieldsSchema>;

/** Confirm the media row belongs to the (already staff-owned) agency. */
async function mediaBelongsToAgency(
  supabase: Owned["supabase"],
  mediaId: string,
  agencyId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("agency_media")
    .select("id")
    .eq("id", mediaId)
    .eq("agency_id", agencyId)
    .maybeSingle<{ id: string }>();
  return !!data;
}

export async function saveAgencyMediaTranslation(input: {
  agencyId: string;
  mediaId: string;
  locale: string;
  fields: AgencyMediaTranslationFields;
}): Promise<AgencyTranslationResult> {
  const parsed = mediaSaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { agencyId, mediaId, locale, fields } = parsed.data;

  const { owned, error } = await ensureProAgencyStaff(agencyId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };
  if (!(await mediaBelongsToAgency(owned.supabase, mediaId, agencyId))) {
    return { success: false, message: "No encontramos esa imagen en tu agencia." };
  }

  // Tier-cap guard (decisión 2a): don't let media content open a new locale
  // beyond the plan limit.
  const tierError = await enforceLocaleTier(owned, agencyId, locale);
  if (tierError) return { success: false, message: tierError };

  const norm = (v: string | undefined) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  };

  const { error: upsertError } = await owned.supabase
    .from("agency_media_translations")
    .upsert(
      {
        media_id: mediaId,
        locale,
        title: norm(fields.title),
        alt_text: norm(fields.altText),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "media_id,locale" },
    );

  if (upsertError) {
    if (upsertError.code === "42501") {
      return { success: false, message: "No tenés permisos para modificar esta agencia." };
    }
    return { success: false, message: upsertError.message ?? "No fue posible guardar." };
  }

  revalidateAllLocales(owned.slug);
  return { success: true, message: "Imagen traducida. Ya es visible en ese idioma." };
}

export async function deleteAgencyMediaTranslation(input: {
  agencyId: string;
  mediaId: string;
  locale: string;
}): Promise<AgencyTranslationResult> {
  const parsed = mediaDeleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { agencyId, mediaId, locale } = parsed.data;

  const { owned, error } = await ensureProAgencyStaff(agencyId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };
  if (!(await mediaBelongsToAgency(owned.supabase, mediaId, agencyId))) {
    return { success: false, message: "No encontramos esa imagen en tu agencia." };
  }

  const { error: delError } = await owned.supabase
    .from("agency_media_translations")
    .delete()
    .eq("media_id", mediaId)
    .eq("locale", locale);

  if (delError) {
    return { success: false, message: delError.message ?? "No fue posible eliminar." };
  }

  revalidateAllLocales(owned.slug);
  return {
    success: true,
    message: "Traducción eliminada. Esa imagen vuelve a mostrarse en español.",
  };
}

// =========================================================================
// Agency country profile translations (per country profile id, per locale)
// =========================================================================

const countryFieldsSchema = z.object({
  description: z.string().trim().max(2000).optional(),
});

const countrySaveSchema = z.object({
  agencyId: z.string().uuid(),
  countryProfileId: z.string().uuid(),
  locale: z.enum(TRANSLATABLE_LOCALES),
  fields: countryFieldsSchema,
});

const countryDeleteSchema = z.object({
  agencyId: z.string().uuid(),
  countryProfileId: z.string().uuid(),
  locale: z.enum(TRANSLATABLE_LOCALES),
});

export type AgencyCountryProfileTranslationFields = z.infer<typeof countryFieldsSchema>;

/** Confirm the country profile row belongs to the (already staff-owned) agency. */
async function countryProfileBelongsToAgency(
  supabase: Owned["supabase"],
  countryProfileId: string,
  agencyId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("agency_country_profiles")
    .select("id")
    .eq("id", countryProfileId)
    .eq("agency_id", agencyId)
    .maybeSingle<{ id: string }>();
  return !!data;
}

export async function saveAgencyCountryProfileTranslation(input: {
  agencyId: string;
  countryProfileId: string;
  locale: string;
  fields: AgencyCountryProfileTranslationFields;
}): Promise<AgencyTranslationResult> {
  const parsed = countrySaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { agencyId, countryProfileId, locale, fields } = parsed.data;

  const { owned, error } = await ensureProAgencyStaff(agencyId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };
  if (!(await countryProfileBelongsToAgency(owned.supabase, countryProfileId, agencyId))) {
    return { success: false, message: "No encontramos ese país en tu agencia." };
  }

  // Tier-cap guard (decisión 2a): don't let a country profile open a new locale
  // beyond the plan limit.
  const tierError = await enforceLocaleTier(owned, agencyId, locale);
  if (tierError) return { success: false, message: tierError };

  const norm = (v: string | undefined) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  };

  const { error: upsertError } = await owned.supabase
    .from("agency_country_profile_translations")
    .upsert(
      {
        country_profile_id: countryProfileId,
        locale,
        description: norm(fields.description),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "country_profile_id,locale" },
    );

  if (upsertError) {
    if (upsertError.code === "42501") {
      return { success: false, message: "No tenés permisos para modificar esta agencia." };
    }
    return { success: false, message: upsertError.message ?? "No fue posible guardar." };
  }

  revalidateAllLocales(owned.slug);
  return { success: true, message: "País traducido. Ya es visible en ese idioma." };
}

export async function deleteAgencyCountryProfileTranslation(input: {
  agencyId: string;
  countryProfileId: string;
  locale: string;
}): Promise<AgencyTranslationResult> {
  const parsed = countryDeleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Datos inválidos." };
  const { agencyId, countryProfileId, locale } = parsed.data;

  const { owned, error } = await ensureProAgencyStaff(agencyId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };
  if (!(await countryProfileBelongsToAgency(owned.supabase, countryProfileId, agencyId))) {
    return { success: false, message: "No encontramos ese país en tu agencia." };
  }

  const { error: delError } = await owned.supabase
    .from("agency_country_profile_translations")
    .delete()
    .eq("country_profile_id", countryProfileId)
    .eq("locale", locale);

  if (delError) {
    return { success: false, message: delError.message ?? "No fue posible eliminar." };
  }

  revalidateAllLocales(owned.slug);
  return {
    success: true,
    message: "Traducción eliminada. Ese país vuelve a mostrarse en español.",
  };
}
