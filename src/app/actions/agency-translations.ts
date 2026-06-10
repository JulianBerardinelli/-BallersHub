"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidateAgencyPublicProfile } from "@/lib/seo/revalidate";
import { CONTENT_LOCALES } from "@/lib/i18n/profile-content";

// Agency description/tagline live on agency_profiles (es, edited in the agency
// dashboard); en/it/pt overrides go to agency_profile_translations. Same
// per-field es fallback model as the player profile (F5).

const fieldsSchema = z.object({
  description: z.string().trim().max(2000).optional(),
  tagline: z.string().trim().max(300).optional(),
});

const saveSchema = z.object({
  agencyId: z.string().uuid(),
  locale: z.enum(["en", "it", "pt"]), // es is the base, edited elsewhere
  fields: fieldsSchema,
});

const deleteSchema = z.object({
  agencyId: z.string().uuid(),
  locale: z.enum(["en", "it", "pt"]),
});

export type AgencyTranslationFields = z.infer<typeof fieldsSchema>;
export type AgencyTranslationResult =
  | { success: true; message: string }
  | { success: false; message: string };

type Owned = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerRoute>>;
  slug: string | null;
};

/** Auth + the user must be staff of this agency (user_profiles.agency_id). */
async function ensureAgencyStaff(
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

  const { data: ag } = await supabase
    .from("agency_profiles")
    .select("slug")
    .eq("id", agencyId)
    .maybeSingle<{ slug: string | null }>();

  return { owned: { supabase, slug: ag?.slug ?? null }, error: null };
}

function revalidateAllLocales(slug: string | null) {
  revalidateAgencyPublicProfile(slug);
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

  const { owned, error } = await ensureAgencyStaff(agencyId);
  if (!owned) return { success: false, message: error ?? "No autorizado." };

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

  const { owned, error } = await ensureAgencyStaff(agencyId);
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
