"use server";

import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import { revalidatePath } from "next/cache";

export type CoachLicenseActionResult = {
  success: boolean;
  message?: string;
  id?: string;
};

const yearOpt = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number(String(value).trim());
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  })
  .refine((v) => v === null || (!Number.isNaN(v) && v >= 1900 && v <= new Date().getFullYear() + 10), {
    message: "Ingresá un año válido.",
  })
  .nullable();

const licenseSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string({ message: "Ingresá el nombre de la licencia." }).trim().min(2, "Mínimo 2 caracteres."),
  issuer: z
    .union([z.string().trim().max(120, "Máximo 120 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .nullable(),
  awardedYear: yearOpt,
  expiresYear: yearOpt,
  // Documento de respaldo: un archivo subido a coach-media (PDF/imagen) o un
  // link externo de verificación. Se muestra en la página pública al aprobarse:
  // PDF/imagen → modal; link externo → _blank. Restringido a http(s) — un
  // doc_url se renderiza como <a href>/<iframe src> en público, así que un
  // esquema javascript:/data: sería un vector de XSS.
  docUrl: z
    .union([z.string().trim().url("Link inválido."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .refine((v) => v === null || /^https?:\/\//i.test(v), {
      message: "El enlace debe empezar con http:// o https://.",
    }),
});

export type CoachLicenseInput = z.infer<typeof licenseSchema>;

// Resolves the caller's own coach profile (id + slug) or an error. Every
// license mutation is scoped to this profile; RLS is the ultimate gate.
async function resolveOwnCoach() {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." as const, supabase: null, coach: null };

  const { data: coach, error } = await supabase
    .from("coach_profiles")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; slug: string | null }>();
  if (error) return { error: error.message, supabase: null, coach: null };
  if (!coach) return { error: "No tenés un perfil de entrenador.", supabase: null, coach: null };
  return { error: null, supabase, coach };
}

// Creates or edits a credential. New rows default to status='pending'. Editing
// an existing row (even an approved one) resets it to 'pending' for
// re-moderation — this also satisfies the RLS WITH CHECK (status <> 'approved'
// for owner writes), which is what enforces pre-moderation at the SQL layer.
export async function upsertCoachLicense(
  input: CoachLicenseInput,
): Promise<CoachLicenseActionResult> {
  const parsed = licenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;

  if (parsed.data.id) {
    const { data, error } = await supabase
      .from("coach_licenses")
      .update({
        title: parsed.data.title,
        issuer: parsed.data.issuer,
        awarded_year: parsed.data.awardedYear,
        expires_year: parsed.data.expiresYear,
        doc_url: parsed.data.docUrl,
        status: "pending",
        reviewed_by_user_id: null,
        reviewed_at: null,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("coach_id", coach.id)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "No se encontró la licencia." };
    revalidateCoachPublicProfile(coach.slug);
    revalidatePath("/dashboard/coach/licenses");
    return { success: true, id: data.id };
  }

  // New row → append at the end of the manual ordering.
  const { data: maxRow } = await supabase
    .from("coach_licenses")
    .select("position")
    .eq("coach_id", coach.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();
  const nextPosition = (maxRow?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("coach_licenses")
    .insert({
      coach_id: coach.id,
      title: parsed.data.title,
      issuer: parsed.data.issuer,
      awarded_year: parsed.data.awardedYear,
      expires_year: parsed.data.expiresYear,
      doc_url: parsed.data.docUrl,
      position: nextPosition,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/coach/licenses");
  return { success: true, id: data.id };
}

export async function deleteCoachLicense(id: string): Promise<CoachLicenseActionResult> {
  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;
  const { error } = await supabase
    .from("coach_licenses")
    .delete()
    .eq("id", id)
    .eq("coach_id", coach.id);
  if (error) return { success: false, message: error.message };
  revalidateCoachPublicProfile(coach.slug);
  revalidatePath("/dashboard/coach/licenses");
  return { success: true };
}
