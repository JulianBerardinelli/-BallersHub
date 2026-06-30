"use server";

// Server actions del módulo "Logros" (coach_honours). Pre-moderado como
// methodology/game-ideas. Universal (cualquier oficio del staff tiene logros).
// Reglas de oro:
//  - el dueño NUNCA setea status='approved' (RLS WITH CHECK lo bloquea); en
//    create se omite (default 'pending'), en update se fuerza 'pending'.
//  - el video es un link http(s) opcional (YouTube/Vimeo); se valida.
//  - careerItemId opcional: vincula el logro a una etapa del coach (validado).
import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import { revalidatePath } from "next/cache";

export type HonourActionResult = {
  success: boolean;
  message?: string;
  id?: string;
};

const MAX_HONOURS = 30;
const URL_RE = /^https?:\/\//i;

const honourSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string({ message: "Ingresá un título." }).trim().min(1, "Ingresá un título.").max(120, "Máximo 120 caracteres."),
  competition: z
    .union([z.string().trim().max(120), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  season: z
    .union([z.string().trim().max(40), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  description: z
    .union([z.string().trim().max(2000, "Máximo 2000 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  careerItemId: z
    .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v ? v : null)),
  videoUrl: z
    .union([z.string().trim().max(500), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .refine((v) => v === null || URL_RE.test(v), {
      message: "El video debe ser un enlace http:// o https://.",
    }),
});

export type HonourInput = z.input<typeof honourSchema>;

const REVALIDATE = "/dashboard/coach/honours";

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

// El careerItemId, si viene, debe pertenecer al coach (anti cross-coach link).
async function validCareerItem(
  supabase: NonNullable<Awaited<ReturnType<typeof resolveOwnCoach>>["supabase"]>,
  coachId: string,
  careerItemId: string | null,
): Promise<boolean> {
  if (!careerItemId) return true;
  const { data } = await supabase
    .from("coach_career_items")
    .select("id")
    .eq("id", careerItemId)
    .eq("coach_id", coachId)
    .maybeSingle<{ id: string }>();
  return !!data;
}

export async function upsertHonour(input: HonourInput): Promise<HonourActionResult> {
  const parsed = honourSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;
  const d = parsed.data;

  if (!(await validCareerItem(supabase, coach.id, d.careerItemId))) {
    return { success: false, message: "La etapa seleccionada no es válida." };
  }

  // EDIT: cualquier cambio re-entra a moderación.
  if (d.id) {
    const { data, error } = await supabase
      .from("coach_honours")
      .update({
        title: d.title,
        competition: d.competition,
        season: d.season,
        description: d.description,
        career_item_id: d.careerItemId,
        video_url: d.videoUrl,
        status: "pending",
        reviewed_by_user_id: null,
        reviewed_at: null,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", d.id)
      .eq("coach_id", coach.id)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "No se encontró el logro." };
    revalidateCoachPublicProfile(coach.slug);
    revalidatePath(REVALIDATE);
    return { success: true, id: data.id };
  }

  // CREATE: cap de seguridad.
  const { count } = await supabase
    .from("coach_honours")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coach.id);
  if ((count ?? 0) >= MAX_HONOURS) {
    return { success: false, message: `Podés tener hasta ${MAX_HONOURS} logros.` };
  }

  const { data: maxRow } = await supabase
    .from("coach_honours")
    .select("position")
    .eq("coach_id", coach.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();
  const nextPosition = (maxRow?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("coach_honours")
    .insert({
      coach_id: coach.id,
      title: d.title,
      competition: d.competition,
      season: d.season,
      description: d.description,
      career_item_id: d.careerItemId,
      video_url: d.videoUrl,
      position: nextPosition,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { success: false, message: error.message };
  revalidatePath(REVALIDATE);
  return { success: true, id: data.id };
}

export async function deleteHonour(id: string): Promise<HonourActionResult> {
  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;

  const { error } = await supabase
    .from("coach_honours")
    .delete()
    .eq("id", id)
    .eq("coach_id", coach.id);
  if (error) return { success: false, message: error.message };
  revalidateCoachPublicProfile(coach.slug);
  revalidatePath(REVALIDATE);
  return { success: true };
}
