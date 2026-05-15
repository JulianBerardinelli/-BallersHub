"use server";

import { revalidatePath } from "next/cache";
import { type PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";

const DASHBOARD_ROUTE = "/dashboard/edit-profile/personal-data";

const basicInfoSchema = z.object({
  playerId: z.string().uuid(),
  fullName: z.string().trim().optional(),
  birthDate: z.string().trim().optional(),
  nationalities: z.string().trim().optional(),
  residence: z.string().trim().optional(),
  heightCm: z.string().trim().optional(),
  weightKg: z.string().trim().optional(),
  bio: z.string().trim().optional(),
});

const contactInfoSchema = z.object({
  playerId: z.string().uuid(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  languages: z.string().trim().optional(),
  documents: z.string().trim().optional(),
  documentCountry: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  showContactSection: z.boolean().optional(),
});

type ActionSuccess<T> = { success: true; data: T; message?: string; updatedFields: string[] };
type ActionFailure = { success: false; message: string; fieldErrors?: Record<string, string | undefined> };
type ActionResult<T> = ActionSuccess<T> | ActionFailure;

type BasicInfoResponse = {
  fullName: string;
  birthDate: string;
  nationalities: string;
  residence: string;
  heightCm: string;
  weightKg: string;
  bio: string;
};

type ContactInfoResponse = {
  email: string;
  phone: string;
  languages: string;
  documents: string;
  documentCountry: string;
  whatsapp: string;
  showContactSection: boolean;
};

type CountryRecord = { code: string | null; name_es: string | null; name_en: string | null };
type CountryLookup = {
  byCode: Map<string, CountryInfo>;
  byName: Map<string, CountryInfo>;
};

type CountryInfo = { code: string; label: string };

type OwnershipResult = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerRoute>>;
  error: string | null;
  userId: string | null;
  userEmail: string | null;
};

function mapPostgrestError(error: PostgrestError | null): string {
  if (!error) return "No fue posible completar la operación.";
  if (error.code === "42501") {
    return "No tenés permisos para modificar este perfil.";
  }
  return error.message ?? "No fue posible completar la operación.";
}

async function ensureAuthenticatedPlayer(playerId: string): Promise<OwnershipResult> {
  const supabase = await createSupabaseServerRoute();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return { supabase, error: authError.message ?? "No fue posible validar la sesión.", userId: null, userEmail: null };
  }

  if (!user) {
    return { supabase, error: "Debés iniciar sesión para continuar.", userId: null, userEmail: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("player_profiles")
    .select("id, user_id")
    .eq("id", playerId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (profileError) {
    return { supabase, error: mapPostgrestError(profileError), userId: null, userEmail: null };
  }

  if (!profile) {
    return { supabase, error: "No encontramos el perfil indicado.", userId: null, userEmail: null };
  }

  if (profile.user_id !== user.id) {
    return { supabase, error: "No tenés permisos para modificar este perfil.", userId: null, userEmail: null };
  }

  return { supabase, error: null, userId: user.id, userEmail: user.email ?? null };
}

function sanitizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
}

function buildCountryLookup(records: CountryRecord[] | null): CountryLookup {
  const byCode = new Map<string, CountryInfo>();
  const byName = new Map<string, CountryInfo>();

  (records ?? []).forEach((country) => {
    if (!country.code) return;
    const label = country.name_es ?? country.name_en ?? country.code;
    const info: CountryInfo = { code: country.code.toUpperCase(), label };
    byCode.set(info.code, info);

    const aliases = [label, country.name_en, country.name_es, country.code];
    aliases
      .map((alias) => sanitizeText(alias))
      .filter((alias): alias is string => Boolean(alias))
      .forEach((alias) => {
        byName.set(normalizeToken(alias), info);
      });
  });

  return { byCode, byName };
}

function resolveCountry(
  input: string | null,
  lookup: CountryLookup,
): { info: CountryInfo | null; display: string | null } {
  const sanitized = sanitizeText(input);
  if (!sanitized) return { info: null, display: null };

  const directCode = lookup.byCode.get(sanitized.toUpperCase());
  if (directCode) {
    return { info: directCode, display: directCode.label };
  }

  const normalized = normalizeToken(sanitized);
  const byName = lookup.byName.get(normalized);
  if (byName) {
    return { info: byName, display: byName.label };
  }

  return { info: null, display: sanitized };
}

function parseBirthDate(value: string | null | undefined): { iso: string | null; display: string; error?: string } {
  const sanitized = sanitizeText(value);
  if (!sanitized) return { iso: null, display: "" };

  const ddMmYyyy = /^([0-3]?\d)\/(0?\d|1[0-2])\/(\d{4})$/;
  const yyyyMmDd = /^(\d{4})-(0?\d|1[0-2])-(0?[0-3]?\d)$/;

  if (ddMmYyyy.test(sanitized)) {
    const [, dd, mm, yyyy] = sanitized.match(ddMmYyyy)!;
    const iso = `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    return { iso, display: `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}` };
  }

  if (yyyyMmDd.test(sanitized)) {
    const [, yyyy, mm, dd] = sanitized.match(yyyyMmDd)!;
    const iso = `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    return { iso, display: `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}` };
  }

  const parsedDate = new Date(sanitized);
  if (!Number.isNaN(parsedDate.getTime())) {
    const iso = parsedDate.toISOString().slice(0, 10);
    const [year, month, day] = iso.split("-");
    return { iso, display: `${day}/${month}/${year}` };
  }

  return { iso: null, display: sanitized, error: "Ingresá una fecha válida." };
}

function formatStoredNationalities(
  names: string[] | null | undefined,
  codes: string[] | null | undefined,
  lookup: CountryLookup,
): string {
  const tokens: string[] = [];
  const seen = new Set<string>();

  (names ?? []).forEach((name) => {
    const sanitized = sanitizeText(name);
    if (!sanitized) return;
    const normalized = sanitized;
    if (!seen.has(normalized)) {
      tokens.push(normalized);
      seen.add(normalized);
    }
  });

  (codes ?? []).forEach((code) => {
    const sanitized = sanitizeText(code);
    if (!sanitized) return;
    const normalized = sanitized.toUpperCase();
    const info = lookup.byCode.get(normalized);
    const label = info?.label ?? normalized;
    if (!seen.has(label)) {
      tokens.push(label);
      seen.add(label);
    }
  });

  return tokens.join(", ");
}

function parseResidence(
  value: string | null | undefined,
  lookup: CountryLookup,
): {
  city: string | null;
  countryName: string | null;
  countryCode: string | null;
  display: string;
} {
  const sanitized = sanitizeText(value);
  if (!sanitized) {
    return { city: null, countryName: null, countryCode: null, display: "" };
  }

  const parts = sanitized.split(",");
  const city = sanitizeText(parts.shift() ?? null);
  const countryCandidate = sanitizeText(parts.join(","));
  const { info, display } = resolveCountry(countryCandidate, lookup);
  const countryName = display ?? null;
  const countryCode = info?.code ?? null;

  const tokens = [city, countryName].filter((token): token is string => Boolean(token));

  return { city, countryName, countryCode, display: tokens.join(", ") };
}

function parseMeasurement(
  value: string | null | undefined,
  label: string,
  { min, max }: { min: number; max: number },
): { numeric: number | null; display: string; error?: string } {
  const sanitized = sanitizeText(value);
  if (!sanitized) {
    return { numeric: null, display: "" };
  }

  const normalized = sanitized.replace(",", ".");
  const numeric = Number(normalized);

  if (Number.isNaN(numeric)) {
    return { numeric: null, display: sanitized, error: `Ingresá un valor numérico válido para ${label.toLowerCase()}.` };
  }

  if (numeric < min || numeric > max) {
    return {
      numeric: null,
      display: sanitized,
      error: `${label} debe estar entre ${min} y ${max}.`,
    };
  }

  return { numeric, display: sanitized };
}

function parseLanguages(value: string | null | undefined): { list: string[] | null; display: string } {
  const sanitized = sanitizeText(value);
  if (!sanitized) return { list: null, display: "" };

  const tokens = sanitized
    .split(/[,;\n]/)
    .map((token) => sanitizeText(token))
    .filter((token): token is string => Boolean(token));

  return { list: tokens.length > 0 ? tokens : null, display: tokens.join(", ") };
}

function parseDocuments(value: string | null | undefined): {
  type: string | null;
  number: string | null;
  display: string;
} {
  const sanitized = sanitizeText(value);
  if (!sanitized) {
    return { type: null, number: null, display: "" };
  }

  const separators = ["·", "-", "|", ",", ";"];

  for (const separator of separators) {
    if (sanitized.includes(separator)) {
      const [rawType, rawNumber] = sanitized.split(separator);
      const type = sanitizeText(rawType);
      const number = sanitizeText(rawNumber);
      const tokens = [type, number].filter((token): token is string => Boolean(token));
      return { type: type ?? null, number: number ?? null, display: tokens.join(" · ") };
    }
  }

  return { type: sanitized, number: null, display: sanitized };
}

async function fetchCountryLookup(supabase: OwnershipResult["supabase"]): Promise<CountryLookup> {
  const { data } = await supabase.from("countries").select("code, name_es, name_en");
  return buildCountryLookup(data as CountryRecord[] | null);
}

type ChangeLogEntry = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

async function recordChanges(
  supabase: OwnershipResult["supabase"],
  playerId: string,
  userId: string | null,
  changes: ChangeLogEntry[],
) {
  if (!userId || changes.length === 0) return;
  await supabase.from("profile_change_logs").insert(
    changes.map((change) => ({
      player_id: playerId,
      user_id: userId,
      field: change.field,
      old_value: change.oldValue ?? null,
      new_value: change.newValue ?? null,
    })),
  );
}

export async function updateBasicInformation(input: z.infer<typeof basicInfoSchema>): Promise<ActionResult<BasicInfoResponse>> {
  const parsed = basicInfoSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Revisá los datos ingresados e intentá nuevamente.",
      fieldErrors: {
        fullName: fieldErrors.fullName?.[0],
        birthDate: fieldErrors.birthDate?.[0],
        nationalities: fieldErrors.nationalities?.[0],
        residence: fieldErrors.residence?.[0],
        heightCm: fieldErrors.heightCm?.[0],
        weightKg: fieldErrors.weightKg?.[0],
        bio: fieldErrors.bio?.[0],
      },
    };
  }

  const ownership = await ensureAuthenticatedPlayer(parsed.data.playerId);
  if (ownership.error) {
    return { success: false, message: ownership.error };
  }

  const lookup = await fetchCountryLookup(ownership.supabase);
  const fieldErrors: Record<string, string | undefined> = {};

  const bio = sanitizeText(parsed.data.bio);

  const birthDateResult = parseBirthDate(parsed.data.birthDate);
  if (birthDateResult.error) {
    fieldErrors.birthDate = birthDateResult.error;
  }

  const residenceResult = parseResidence(parsed.data.residence, lookup);

  const heightResult = parseMeasurement(parsed.data.heightCm, "Altura", { min: 120, max: 250 });
  if (heightResult.error) {
    fieldErrors.heightCm = heightResult.error;
  }

  const weightResult = parseMeasurement(parsed.data.weightKg, "Peso", { min: 40, max: 200 });
  if (weightResult.error) {
    fieldErrors.weightKg = weightResult.error;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Revisá los datos ingresados e intentá nuevamente.",
      fieldErrors,
    };
  }

  const { data: profileBefore } = await ownership.supabase
    .from("player_profiles")
    .select("slug, full_name, birth_date, nationality, nationality_codes, height_cm, weight_kg, bio")
    .eq("id", parsed.data.playerId)
    .maybeSingle<{
      slug: string | null;
      full_name: string | null;
      birth_date: string | null;
      nationality: string[] | null;
      nationality_codes: string[] | null;
      height_cm: number | null;
      weight_kg: number | null;
      bio: string | null;
    }>();

  if (!profileBefore) {
    return { success: false, message: "No encontramos el perfil indicado." };
  }

  const { data: personalBefore } = await ownership.supabase
    .from("player_personal_details")
    .select("id, residence_city, residence_country, residence_country_code")
    .eq("player_id", parsed.data.playerId)
    .maybeSingle<{
      id: string;
      residence_city: string | null;
      residence_country: string | null;
      residence_country_code: string | null;
    }>();

  const profilePayload = {
    birth_date: birthDateResult.iso,
    height_cm: heightResult.numeric,
    weight_kg: weightResult.numeric,
    bio,
  };

  const { error: profileError } = await ownership.supabase
    .from("player_profiles")
    .update(profilePayload)
    .eq("id", parsed.data.playerId);

  if (profileError) {
    return { success: false, message: mapPostgrestError(profileError) };
  }

  const personalPayload = {
    player_id: parsed.data.playerId,
    residence_city: residenceResult.city,
    residence_country: residenceResult.countryName,
    residence_country_code: residenceResult.countryCode,
  };

  const { error: personalError } = await ownership.supabase
    .from("player_personal_details")
    .upsert(personalPayload, { onConflict: "player_id" });

  if (personalError) {
    return { success: false, message: mapPostgrestError(personalError) };
  }

  const changes: ChangeLogEntry[] = [];
  const updatedFields = new Set<string>();

  if ((profileBefore?.birth_date ?? null) !== (birthDateResult.iso ?? null)) {
    changes.push({ field: "birth_date", oldValue: profileBefore?.birth_date, newValue: birthDateResult.iso });
    updatedFields.add("Fecha de nacimiento");
  }

  if ((profileBefore?.height_cm ?? null) !== (heightResult.numeric ?? null)) {
    changes.push({ field: "height_cm", oldValue: profileBefore?.height_cm, newValue: heightResult.numeric });
    updatedFields.add("Altura");
  }

  if ((profileBefore?.weight_kg ?? null) !== (weightResult.numeric ?? null)) {
    changes.push({ field: "weight_kg", oldValue: profileBefore?.weight_kg, newValue: weightResult.numeric });
    updatedFields.add("Peso");
  }

  if ((profileBefore?.bio ?? null) !== (bio ?? null)) {
    changes.push({ field: "bio", oldValue: profileBefore?.bio, newValue: bio });
    updatedFields.add("Biografía");
  }

  if (
    (personalBefore?.residence_city ?? null) !== (residenceResult.city ?? null) ||
    (personalBefore?.residence_country ?? null) !== (residenceResult.countryName ?? null) ||
    (personalBefore?.residence_country_code ?? null) !== (residenceResult.countryCode ?? null)
  ) {
    changes.push({
      field: "residence",
      oldValue: {
        city: personalBefore?.residence_city ?? null,
        country: personalBefore?.residence_country ?? null,
        countryCode: personalBefore?.residence_country_code ?? null,
      },
      newValue: {
        city: residenceResult.city ?? null,
        country: residenceResult.countryName ?? null,
        countryCode: residenceResult.countryCode ?? null,
      },
    });
    updatedFields.add("Residencia");
  }

  await recordChanges(ownership.supabase, parsed.data.playerId, ownership.userId, changes);

  revalidatePath(DASHBOARD_ROUTE);
  // Public portfolio depends on bio / height / weight / birth date —
  // bust the 1h ISR window so the player's edit is reflected
  // immediately on `/<slug>` (and re-stamps sitemap + llms.txt).
  revalidatePlayerPublicProfile(profileBefore.slug ?? null);

  return {
    success: true,
    message: "Información básica actualizada correctamente.",
    data: {
      fullName: profileBefore.full_name?.trim() ?? "",
      birthDate: birthDateResult.display,
      nationalities: formatStoredNationalities(
        profileBefore.nationality ?? null,
        profileBefore.nationality_codes ?? null,
        lookup,
      ),
      residence: residenceResult.display,
      heightCm: heightResult.display,
      weightKg: weightResult.display,
      bio: bio ?? "",
    },
    updatedFields: Array.from(updatedFields),
  };
}

export async function updateContactInformation(
  input: z.infer<typeof contactInfoSchema>,
): Promise<ActionResult<ContactInfoResponse>> {
  const parsed = contactInfoSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Revisá los datos ingresados e intentá nuevamente.",
      fieldErrors: {
        email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0],
        languages: fieldErrors.languages?.[0],
        documents: fieldErrors.documents?.[0],
        documentCountry: fieldErrors.documentCountry?.[0],
        whatsapp: fieldErrors.whatsapp?.[0],
      },
    };
  }

  const ownership = await ensureAuthenticatedPlayer(parsed.data.playerId);
  if (ownership.error) {
    return { success: false, message: ownership.error };
  }

  const lookup = await fetchCountryLookup(ownership.supabase);
  const fieldErrors: Record<string, string | undefined> = {};

  const email = sanitizeText(parsed.data.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Ingresá un email válido.";
  }

  const phone = sanitizeText(parsed.data.phone);
  const whatsapp = sanitizeText(parsed.data.whatsapp);

  const languagesResult = parseLanguages(parsed.data.languages);
  const documentsResult = parseDocuments(parsed.data.documents);
  const documentCountryResult = resolveCountry(parsed.data.documentCountry ?? null, lookup);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Revisá los datos ingresados e intentá nuevamente.",
      fieldErrors,
    };
  }

  const { data: personalBefore } = await ownership.supabase
    .from("player_personal_details")
    .select(
      "id, phone, languages, document_type, document_number, document_country, document_country_code, whatsapp, show_contact_section",
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
      whatsapp: string | null;
      show_contact_section: boolean | null;
    }>();

  const showContactSection = parsed.data.showContactSection ?? personalBefore?.show_contact_section ?? false;

  const personalPayload = {
    player_id: parsed.data.playerId,
    phone,
    languages: languagesResult.list,
    document_type: documentsResult.type,
    document_number: documentsResult.number,
    document_country: documentCountryResult.display,
    document_country_code: documentCountryResult.info?.code ?? null,
    whatsapp,
    show_contact_section: showContactSection,
  };

  const { error: personalError } = await ownership.supabase
    .from("player_personal_details")
    .upsert(personalPayload, { onConflict: "player_id" });

  if (personalError) {
    return { success: false, message: mapPostgrestError(personalError) };
  }

  const changes: ChangeLogEntry[] = [];
  const updatedFields = new Set<string>();

  if ((personalBefore?.phone ?? null) !== (phone ?? null)) {
    changes.push({ field: "phone", oldValue: personalBefore?.phone ?? null, newValue: phone ?? null });
    updatedFields.add("Teléfono");
  }

  if (JSON.stringify(personalBefore?.languages ?? null) !== JSON.stringify(languagesResult.list ?? null)) {
    changes.push({ field: "languages", oldValue: personalBefore?.languages ?? null, newValue: languagesResult.list ?? null });
    updatedFields.add("Idiomas");
  }

  if ((personalBefore?.document_type ?? null) !== (documentsResult.type ?? null)) {
    changes.push({ field: "document_type", oldValue: personalBefore?.document_type ?? null, newValue: documentsResult.type ?? null });
    updatedFields.add("Tipo de documento");
  }

  if ((personalBefore?.document_number ?? null) !== (documentsResult.number ?? null)) {
    changes.push({
      field: "document_number",
      oldValue: personalBefore?.document_number ?? null,
      newValue: documentsResult.number ?? null,
    });
    updatedFields.add("Número de documento");
  }

  if (
    (personalBefore?.document_country ?? null) !== (documentCountryResult.display ?? null) ||
    (personalBefore?.document_country_code ?? null) !== (documentCountryResult.info?.code ?? null)
  ) {
    changes.push({
      field: "document_country",
      oldValue: {
        country: personalBefore?.document_country ?? null,
        countryCode: personalBefore?.document_country_code ?? null,
      },
      newValue: {
        country: documentCountryResult.display ?? null,
        countryCode: documentCountryResult.info?.code ?? null,
      },
    });
    updatedFields.add("País del documento");
  }

  if (email && email !== (ownership.userEmail ?? null)) {
    const { error: emailError } = await ownership.supabase.auth.updateUser({ email });
    if (emailError) {
      return { success: false, message: emailError.message ?? "No fue posible actualizar el email." };
    }
    changes.push({ field: "contact_email", oldValue: ownership.userEmail ?? null, newValue: email });
    updatedFields.add("Email principal");
  }

  if ((personalBefore?.whatsapp ?? null) !== (whatsapp ?? null)) {
    changes.push({ field: "whatsapp", oldValue: personalBefore?.whatsapp ?? null, newValue: whatsapp ?? null });
    updatedFields.add("WhatsApp");
  }
  if ((personalBefore?.show_contact_section ?? false) !== showContactSection) {
    changes.push({
      field: "show_contact_section",
      oldValue: personalBefore?.show_contact_section ?? false,
      newValue: showContactSection,
    });
    updatedFields.add("Visibilidad pública");
  }

  await recordChanges(ownership.supabase, parsed.data.playerId, ownership.userId, changes);

  revalidatePath(DASHBOARD_ROUTE);
  // Fix: previous call passed `playerId` (UUID), which doesn't match
  // the `/<slug>` route. Resolve the slug from the player row so the
  // helper invalidates the correct path.
  const { data: slugRow } = await ownership.supabase
    .from("player_profiles")
    .select("slug")
    .eq("id", parsed.data.playerId)
    .maybeSingle<{ slug: string | null }>();
  revalidatePlayerPublicProfile(slugRow?.slug ?? null);

  return {
    success: true,
    message: "Datos de contacto actualizados correctamente.",
    data: {
      email: email ?? "",
      phone: phone ?? "",
      languages: languagesResult.display,
      documents: documentsResult.display,
      documentCountry: documentCountryResult.display ?? "",
      whatsapp: whatsapp ?? "",
      showContactSection,
    },
    updatedFields: Array.from(updatedFields),
  };
}
