"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { basicInfoSchema, contactInfoSchema, type BasicInfoInput, type ContactInfoInput } from "./schemas";

const DASHBOARD_ROUTE = "/dashboard/edit-profile/personal-data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

type FieldErrors = Partial<Record<keyof BasicInfoInput | keyof ContactInfoInput, string>>;

type ActionResult = { success: true } | { success: false; message: string; fieldErrors?: FieldErrors };

function mapPostgrestError(error: PostgrestError | null): string {
  if (!error) return "No fue posible completar la operación.";
  if (error.code === "42501") {
    return "No tenés permisos para modificar este perfil.";
  }
  if (error.code === "22P02") {
    return "Los datos enviados no tienen el formato esperado.";
  }
  return error.message ?? "No fue posible completar la operación.";
}

function mapZodErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  error.issues.forEach((issue) => {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field as keyof FieldErrors]) {
      fieldErrors[field as keyof FieldErrors] = issue.message;
    }
  });
  return fieldErrors;
}

async function ensureAuthenticatedPlayer(playerId: string) {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return { supabase, error: authError.message ?? "No fue posible validar la sesión." } as const;
  }

  if (!user) {
    return { supabase, error: "Debés iniciar sesión para continuar." } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("player_profiles")
    .select("id, user_id")
    .eq("id", playerId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (profileError) {
    return { supabase, error: mapPostgrestError(profileError) } as const;
  }

  if (!profile) {
    return { supabase, error: "No encontramos el perfil indicado." } as const;
  }

  if (profile.user_id !== user.id) {
    return { supabase, error: "No tenés permisos para modificar este perfil." } as const;
  }

  return { supabase, userId: user.id, error: null } as const;
}

function normalizeForComparison(value: unknown) {
  if (value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForComparison(item));
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function valuesAreEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizeForComparison(a)) === JSON.stringify(normalizeForComparison(b));
}

type ChangeSet = { field: string; previous: unknown; next: unknown }[];

async function logProfileChanges(
  supabase: AnySupabaseClient,
  playerId: string,
  userId: string,
  changes: ChangeSet,
) {
  if (changes.length === 0) return;
  const payload = changes
    .filter((change) => !valuesAreEqual(change.previous, change.next))
    .map((change) => ({
      player_id: playerId,
      user_id: userId,
      field: change.field,
      old_value: change.previous ?? null,
      new_value: change.next ?? null,
    }));
  if (payload.length === 0) return;
  await supabase.from("profile_change_logs").insert(payload);
}

async function resolveCountryLabels(supabase: AnySupabaseClient, codes: string[]): Promise<Map<string, string>> {
  if (codes.length === 0) return new Map();
  const uniqueCodes = Array.from(new Set(codes.map((code) => code.toUpperCase())));
  const { data, error } = await supabase
    .from("countries")
    .select("code, name_es, name_en")
    .in("code", uniqueCodes);
  if (error) {
    throw new Error(mapPostgrestError(error));
  }
  const entries = (data ?? []).map((row) => [row.code, row.name_es ?? row.name_en ?? row.code] as const);
  return new Map(entries);
}

async function resolveCountryLabel(supabase: AnySupabaseClient, code: string | null): Promise<string | null> {
  if (!code) return null;
  const map = await resolveCountryLabels(supabase, [code]);
  return map.get(code.toUpperCase()) ?? code.toUpperCase();
}

export async function updateBasicInfo(input: BasicInfoInput): Promise<ActionResult> {
  const parsed = basicInfoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Revisá los datos e intentá nuevamente.",
      fieldErrors: mapZodErrors(parsed.error),
    };
  }

  const { supabase, userId, error } = await ensureAuthenticatedPlayer(parsed.data.playerId);
  if (error) {
    return { success: false, message: error };
  }

  const { data: profileBefore, error: profileFetchError } = await supabase
    .from("player_profiles")
    .select("full_name, birth_date, nationality, nationality_codes, height_cm, weight_kg, bio")
    .eq("id", parsed.data.playerId)
    .maybeSingle<{
      full_name: string | null;
      birth_date: string | null;
      nationality: string[] | null;
      nationality_codes: string[] | null;
      height_cm: number | null;
      weight_kg: number | null;
      bio: string | null;
    }>();

  if (profileFetchError) {
    return { success: false, message: mapPostgrestError(profileFetchError) };
  }

  if (!profileBefore) {
    return { success: false, message: "No encontramos el perfil indicado." };
  }

  const { data: personalBefore, error: personalFetchError } = await supabase
    .from("player_personal_details")
    .select("id, residence_city, residence_country, residence_country_code")
    .eq("player_id", parsed.data.playerId)
    .maybeSingle<{
      id: string;
      residence_city: string | null;
      residence_country: string | null;
      residence_country_code: string | null;
    }>();

  if (personalFetchError) {
    return { success: false, message: mapPostgrestError(personalFetchError) };
  }

  let nationalityNames: string[] = [];
  try {
    const nationalityMap = await resolveCountryLabels(supabase, parsed.data.nationalityCodes);
    nationalityNames = parsed.data.nationalityCodes.map(
      (code) => nationalityMap.get(code) ?? code.toUpperCase(),
    );
  } catch (countryError) {
    const message = countryError instanceof Error ? countryError.message : String(countryError);
    return { success: false, message };
  }

  let residenceCountryName: string | null = null;
  try {
    residenceCountryName = await resolveCountryLabel(supabase, parsed.data.residenceCountryCode);
  } catch (countryError) {
    const message = countryError instanceof Error ? countryError.message : String(countryError);
    return { success: false, message };
  }

  const profilePayload = {
    full_name: parsed.data.fullName,
    birth_date: parsed.data.birthDate,
    nationality: nationalityNames,
    nationality_codes: parsed.data.nationalityCodes,
    height_cm: parsed.data.heightCm,
    weight_kg: parsed.data.weightKg,
    bio: parsed.data.bio,
  };

  const { error: profileUpdateError } = await supabase
    .from("player_profiles")
    .update(profilePayload)
    .eq("id", parsed.data.playerId);

  if (profileUpdateError) {
    return { success: false, message: mapPostgrestError(profileUpdateError) };
  }

  const personalPayload = {
    residence_city: parsed.data.residenceCity,
    residence_country: residenceCountryName,
    residence_country_code: parsed.data.residenceCountryCode,
  };

  let personalAfter = personalBefore ?? null;

  if (personalBefore) {
    const { data, error: personalUpdateError } = await supabase
      .from("player_personal_details")
      .update(personalPayload)
      .eq("player_id", parsed.data.playerId)
      .select("id, residence_city, residence_country, residence_country_code")
      .maybeSingle<{
        id: string;
        residence_city: string | null;
        residence_country: string | null;
        residence_country_code: string | null;
      }>();

    if (personalUpdateError) {
      return { success: false, message: mapPostgrestError(personalUpdateError) };
    }
    personalAfter = data ?? personalBefore;
  } else {
    const { data, error: personalInsertError } = await supabase
      .from("player_personal_details")
      .insert({
        player_id: parsed.data.playerId,
        ...personalPayload,
      })
      .select("id, residence_city, residence_country, residence_country_code")
      .maybeSingle<{
        id: string;
        residence_city: string | null;
        residence_country: string | null;
        residence_country_code: string | null;
      }>();

    if (personalInsertError) {
      return { success: false, message: mapPostgrestError(personalInsertError) };
    }
    personalAfter = data ?? null;
  }

  const changes: ChangeSet = [
    { field: "full_name", previous: profileBefore.full_name, next: profilePayload.full_name },
    { field: "birth_date", previous: profileBefore.birth_date, next: profilePayload.birth_date },
    { field: "nationality", previous: profileBefore.nationality, next: profilePayload.nationality },
    { field: "nationality_codes", previous: profileBefore.nationality_codes, next: profilePayload.nationality_codes },
    { field: "height_cm", previous: profileBefore.height_cm, next: profilePayload.height_cm },
    { field: "weight_kg", previous: profileBefore.weight_kg, next: profilePayload.weight_kg },
    { field: "bio", previous: profileBefore.bio, next: profilePayload.bio },
    {
      field: "residence_city",
      previous: personalBefore?.residence_city ?? null,
      next: personalAfter?.residence_city ?? parsed.data.residenceCity ?? null,
    },
    {
      field: "residence_country_code",
      previous: personalBefore?.residence_country_code ?? null,
      next: personalAfter?.residence_country_code ?? parsed.data.residenceCountryCode ?? null,
    },
    {
      field: "residence_country",
      previous: personalBefore?.residence_country ?? null,
      next: personalAfter?.residence_country ?? residenceCountryName,
    },
  ];

  await logProfileChanges(supabase, parsed.data.playerId, userId, changes);

  revalidatePath(DASHBOARD_ROUTE);
  return { success: true };
}

export async function updateContactInfo(input: ContactInfoInput): Promise<ActionResult> {
  const parsed = contactInfoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Revisá los datos e intentá nuevamente.",
      fieldErrors: mapZodErrors(parsed.error),
    };
  }

  const { supabase, userId, error } = await ensureAuthenticatedPlayer(parsed.data.playerId);
  if (error) {
    return { success: false, message: error };
  }

  const { data: personalBefore, error: personalFetchError } = await supabase
    .from("player_personal_details")
    .select(
      "id, phone, languages, document_type, document_number, document_country, document_country_code, residence_city, residence_country, residence_country_code",
    )
    .eq("player_id", parsed.data.playerId)
    .maybeSingle<{
      id: string;
      phone: string | null;
      languages: string[] | null;
      document_type: string | null;
      document_number: string | null;
      document_country: string | null;
      document_country_code: string | null;
      residence_city: string | null;
      residence_country: string | null;
      residence_country_code: string | null;
    }>();

  if (personalFetchError) {
    return { success: false, message: mapPostgrestError(personalFetchError) };
  }

  let documentCountryName: string | null = null;
  try {
    documentCountryName = await resolveCountryLabel(supabase, parsed.data.documentCountryCode);
  } catch (countryError) {
    const message = countryError instanceof Error ? countryError.message : String(countryError);
    return { success: false, message };
  }

  const languagesArray = parsed.data.languages;
  const personalPayload = {
    phone: parsed.data.phone,
    languages: languagesArray.length > 0 ? languagesArray : null,
    document_type: parsed.data.documentType,
    document_number: parsed.data.documentNumber,
    document_country: documentCountryName,
    document_country_code: parsed.data.documentCountryCode,
  };

  let personalAfter = personalBefore ?? null;

  if (personalBefore) {
    const { data, error: updateError } = await supabase
      .from("player_personal_details")
      .update(personalPayload)
      .eq("player_id", parsed.data.playerId)
      .select(
        "id, phone, languages, document_type, document_number, document_country, document_country_code, residence_city, residence_country, residence_country_code",
      )
      .maybeSingle<typeof personalBefore>();

    if (updateError) {
      return { success: false, message: mapPostgrestError(updateError) };
    }
    personalAfter = data ?? personalBefore;
  } else {
    const { data, error: insertError } = await supabase
      .from("player_personal_details")
      .insert({
        player_id: parsed.data.playerId,
        ...personalPayload,
      })
      .select(
        "id, phone, languages, document_type, document_number, document_country, document_country_code, residence_city, residence_country, residence_country_code",
      )
      .maybeSingle<typeof personalBefore>();

    if (insertError) {
      return { success: false, message: mapPostgrestError(insertError) };
    }
    personalAfter = data ?? null;
  }

  const changes: ChangeSet = [
    { field: "phone", previous: personalBefore?.phone ?? null, next: personalAfter?.phone ?? personalPayload.phone ?? null },
    {
      field: "languages",
      previous: personalBefore?.languages ?? null,
      next: personalAfter?.languages ?? personalPayload.languages ?? null,
    },
    {
      field: "document_type",
      previous: personalBefore?.document_type ?? null,
      next: personalAfter?.document_type ?? personalPayload.document_type ?? null,
    },
    {
      field: "document_number",
      previous: personalBefore?.document_number ?? null,
      next: personalAfter?.document_number ?? personalPayload.document_number ?? null,
    },
    {
      field: "document_country_code",
      previous: personalBefore?.document_country_code ?? null,
      next: personalAfter?.document_country_code ?? personalPayload.document_country_code ?? null,
    },
    {
      field: "document_country",
      previous: personalBefore?.document_country ?? null,
      next: personalAfter?.document_country ?? documentCountryName,
    },
  ];

  await logProfileChanges(supabase, parsed.data.playerId, userId, changes);

  revalidatePath(DASHBOARD_ROUTE);
  return { success: true };
}
