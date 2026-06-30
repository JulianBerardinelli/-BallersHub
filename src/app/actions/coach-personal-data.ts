"use server";

// Datos personales del coach: residencia, educación, idiomas + contacto
// (teléfono, WhatsApp, documento, toggle de visibilidad pública).
// Espeja el patrón del editor de players (BasicInformationSection +
// ContactInformationSection) reusando los parsers de personal-data/normalize.ts
// — pero acotado: la tabla `coach_personal_details` NO guarda altura/peso/foot
// (campos de jugador), y el coach NO tiene gender. fullName/birthDate del
// coach viven en `coach_profiles` y los edita el CoachProfileEditor; este
// editor sólo toca `coach_personal_details`.
//
// Owner: corre con el cliente de cookies, RLS coach_personal_details_*
// (mismo gateado por coach_profiles que el resto del módulo) es el gate.
// Admin (service-role + admin gate): se usa desde /admin/coaches/[id]/edit/
// datos-personales y escribe directo en otro coach (liveMode).

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { ensureAdminActor } from "@/lib/admin/auth";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import {
  fetchCountryLookup,
  mapPostgrestError,
  parseDocuments,
  parseLanguages,
  parseResidence,
  resolveCountry,
  sanitizeText,
} from "@/app/[locale]/(dashboard)/dashboard/edit-profile/personal-data/normalize";

const EDUCATION_MAX_LENGTH = 200;

const basicInfoSchema = z.object({
  coachId: z.string().uuid(),
  residence: z.string().trim().optional(),
  education: z
    .string()
    .trim()
    .max(EDUCATION_MAX_LENGTH, `La educación no puede superar los ${EDUCATION_MAX_LENGTH} caracteres.`)
    .optional(),
});

const contactInfoSchema = z.object({
  coachId: z.string().uuid(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  languages: z.string().trim().optional(),
  documents: z.string().trim().optional(),
  documentCountry: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  showContactSection: z.boolean().optional(),
});

export type CoachBasicInfoInput = z.infer<typeof basicInfoSchema>;
export type CoachContactInfoInput = z.infer<typeof contactInfoSchema>;

type ActionSuccess<T> = { success: true; data: T; message?: string; updatedFields: string[] };
type ActionFailure = { success: false; message: string; fieldErrors?: Record<string, string | undefined> };
type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export type CoachBasicInfoResponse = {
  residence: string;
  education: string;
};

export type CoachContactInfoResponse = {
  email: string;
  phone: string;
  languages: string;
  documents: string;
  documentCountry: string;
  whatsapp: string;
  showContactSection: boolean;
};

// ─────────────────────────── helpers ───────────────────────────

type CoachContextOk = {
  ok: true;
  supabase: Awaited<ReturnType<typeof createSupabaseServerRoute>>;
  coach: { id: string; slug: string | null };
  userEmail: string | null;
};
type CoachContextErr = { ok: false; error: string };

async function ensureOwnerCoach(coachId: string): Promise<CoachContextOk | CoachContextErr> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return { ok: false, error: authError.message ?? "No fue posible validar la sesión." };
  }
  if (!user) {
    return { ok: false, error: "Debés iniciar sesión para continuar." };
  }

  const { data: coach, error: profileError } = await supabase
    .from("coach_profiles")
    .select("id, user_id, slug")
    .eq("id", coachId)
    .maybeSingle<{ id: string; user_id: string; slug: string | null }>();

  if (profileError) {
    return { ok: false, error: mapPostgrestError(profileError) };
  }
  if (!coach) {
    return { ok: false, error: "No encontramos el perfil indicado." };
  }
  if (coach.user_id !== user.id) {
    return { ok: false, error: "No tenés permisos para modificar este perfil." };
  }

  return {
    ok: true,
    supabase,
    coach: { id: coach.id, slug: coach.slug },
    userEmail: user.email ?? null,
  };
}

// ─────────────────────────── owner ───────────────────────────

export async function updateCoachBasicInformation(
  input: CoachBasicInfoInput,
): Promise<ActionResult<CoachBasicInfoResponse>> {
  const parsed = basicInfoSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Revisá los datos ingresados e intentá nuevamente.",
      fieldErrors: {
        residence: fieldErrors.residence?.[0],
        education: fieldErrors.education?.[0],
      },
    };
  }

  const ctx = await ensureOwnerCoach(parsed.data.coachId);
  if (!ctx.ok) return { success: false, message: ctx.error };

  const lookup = await fetchCountryLookup(ctx.supabase);
  const education = sanitizeText(parsed.data.education);
  const residenceResult = parseResidence(parsed.data.residence, lookup);

  const payload = {
    coach_id: parsed.data.coachId,
    residence_city: residenceResult.city,
    residence_country: residenceResult.countryName,
    residence_country_code: residenceResult.countryCode,
    education,
  };

  const { error } = await ctx.supabase
    .from("coach_personal_details")
    .upsert(payload, { onConflict: "coach_id" });
  if (error) return { success: false, message: mapPostgrestError(error) };

  revalidatePath("/dashboard/coach/personal-data");
  revalidateCoachPublicProfile(ctx.coach.slug);

  const updatedFields: string[] = [];
  if (residenceResult.display) updatedFields.push("Residencia");
  if (education) updatedFields.push("Educación");

  return {
    success: true,
    message: "Datos personales actualizados correctamente.",
    data: {
      residence: residenceResult.display,
      education: education ?? "",
    },
    updatedFields,
  };
}

export async function updateCoachContactInformation(
  input: CoachContactInfoInput,
): Promise<ActionResult<CoachContactInfoResponse>> {
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

  const ctx = await ensureOwnerCoach(parsed.data.coachId);
  if (!ctx.ok) return { success: false, message: ctx.error };

  const lookup = await fetchCountryLookup(ctx.supabase);
  const email = sanitizeText(parsed.data.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      message: "Revisá los datos ingresados e intentá nuevamente.",
      fieldErrors: { email: "Ingresá un email válido." },
    };
  }

  const phone = sanitizeText(parsed.data.phone);
  const whatsapp = sanitizeText(parsed.data.whatsapp);
  const languagesResult = parseLanguages(parsed.data.languages);
  const documentsResult = parseDocuments(parsed.data.documents);
  const documentCountryResult = resolveCountry(parsed.data.documentCountry ?? null, lookup);

  const { data: personalBefore } = await ctx.supabase
    .from("coach_personal_details")
    .select("show_contact_section")
    .eq("coach_id", parsed.data.coachId)
    .maybeSingle<{ show_contact_section: boolean | null }>();

  const showContactSection =
    parsed.data.showContactSection ?? personalBefore?.show_contact_section ?? false;

  const payload = {
    coach_id: parsed.data.coachId,
    phone,
    languages: languagesResult.list,
    document_type: documentsResult.type,
    document_number: documentsResult.number,
    document_country: documentCountryResult.display,
    document_country_code: documentCountryResult.info?.code ?? null,
    whatsapp,
    show_contact_section: showContactSection,
  };

  const { error } = await ctx.supabase
    .from("coach_personal_details")
    .upsert(payload, { onConflict: "coach_id" });
  if (error) return { success: false, message: mapPostgrestError(error) };

  if (email && email !== (ctx.userEmail ?? null)) {
    const { error: emailError } = await ctx.supabase.auth.updateUser({ email });
    if (emailError) {
      return { success: false, message: emailError.message ?? "No fue posible actualizar el email." };
    }
  }

  revalidatePath("/dashboard/coach/personal-data");
  revalidateCoachPublicProfile(ctx.coach.slug);

  return {
    success: true,
    message: "Datos de contacto actualizados correctamente.",
    data: {
      email: email ?? (ctx.userEmail ?? ""),
      phone: phone ?? "",
      languages: languagesResult.display,
      documents: documentsResult.display,
      documentCountry: documentCountryResult.display ?? "",
      whatsapp: whatsapp ?? "",
      showContactSection,
    },
    updatedFields: [],
  };
}

// ─────────────────────────── admin (live mode) ───────────────────────────

// NOTA: estas variantes admin reciben el input COMPLETO (con coachId dentro),
// igual que las owner — así pueden pasarse DIRECTO como server action al editor
// cliente (action={adminUpdateCoachBasicInformation}). Un closure inline
// `(input) => adminUpdate(id, input)` NO es una server action registrada y Next
// lo rechaza al renderizar ("Functions cannot be passed to Client Components").
// El coachId del input es seguro acá: ensureAdminActor ya gatea que el actor es
// admin (puede editar cualquier coach), y el coachId target viaja en el form.
export async function adminUpdateCoachBasicInformation(
  input: CoachBasicInfoInput,
): Promise<ActionResult<CoachBasicInfoResponse>> {
  const parsed = basicInfoSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Revisá los datos ingresados e intentá nuevamente.",
      fieldErrors: {
        residence: fieldErrors.residence?.[0],
        education: fieldErrors.education?.[0],
      },
    };
  }
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;

  const lookup = await fetchCountryLookup(admin);
  const education = sanitizeText(parsed.data.education);
  const residenceResult = parseResidence(parsed.data.residence, lookup);

  const { error } = await admin.from("coach_personal_details").upsert(
    {
      coach_id: parsed.data.coachId,
      residence_city: residenceResult.city,
      residence_country: residenceResult.countryName,
      residence_country_code: residenceResult.countryCode,
      education,
    },
    { onConflict: "coach_id" },
  );
  if (error) return { success: false, message: mapPostgrestError(error) };

  const { data: coach } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", parsed.data.coachId)
    .maybeSingle<{ slug: string | null }>();
  if (coach?.slug) revalidateCoachPublicProfile(coach.slug);
  revalidatePath(`/admin/coaches/${parsed.data.coachId}/edit/datos-personales`);

  return {
    success: true,
    message: "Datos personales actualizados correctamente.",
    data: { residence: residenceResult.display, education: education ?? "" },
    updatedFields: [],
  };
}

// Misma firma que la owner (input completo) — ver nota en
// adminUpdateCoachBasicInformation. El admin IGNORA el email (auth.users es del
// owner, flujo distinto).
export async function adminUpdateCoachContactInformation(
  input: CoachContactInfoInput,
): Promise<ActionResult<CoachContactInfoResponse>> {
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
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;

  const lookup = await fetchCountryLookup(admin);
  const phone = sanitizeText(parsed.data.phone);
  const whatsapp = sanitizeText(parsed.data.whatsapp);
  const languagesResult = parseLanguages(parsed.data.languages);
  const documentsResult = parseDocuments(parsed.data.documents);
  const documentCountryResult = resolveCountry(parsed.data.documentCountry ?? null, lookup);

  // El admin NO toca el email (auth.users es del owner — flujos distintos).
  const { data: personalBefore } = await admin
    .from("coach_personal_details")
    .select("show_contact_section")
    .eq("coach_id", parsed.data.coachId)
    .maybeSingle<{ show_contact_section: boolean | null }>();
  const showContactSection =
    parsed.data.showContactSection ?? personalBefore?.show_contact_section ?? false;

  const { error } = await admin.from("coach_personal_details").upsert(
    {
      coach_id: parsed.data.coachId,
      phone,
      languages: languagesResult.list,
      document_type: documentsResult.type,
      document_number: documentsResult.number,
      document_country: documentCountryResult.display,
      document_country_code: documentCountryResult.info?.code ?? null,
      whatsapp,
      show_contact_section: showContactSection,
    },
    { onConflict: "coach_id" },
  );
  if (error) return { success: false, message: mapPostgrestError(error) };

  const { data: coach } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", parsed.data.coachId)
    .maybeSingle<{ slug: string | null }>();
  if (coach?.slug) revalidateCoachPublicProfile(coach.slug);
  revalidatePath(`/admin/coaches/${parsed.data.coachId}/edit/datos-personales`);

  return {
    success: true,
    message: "Datos de contacto actualizados correctamente.",
    data: {
      email: "",
      phone: phone ?? "",
      languages: languagesResult.display,
      documents: documentsResult.display,
      documentCountry: documentCountryResult.display ?? "",
      whatsapp: whatsapp ?? "",
      showContactSection,
    },
    updatedFields: [],
  };
}
