"use server";

// Server actions del módulo "Ideas de Juego" (pizarra táctica). Espeja
// coach-methodology.ts: items atómicos, PRE-MODERADOS. Reglas de oro:
//  - el dueño NUNCA setea status='approved' (RLS WITH CHECK lo bloquea); en
//    create se omite (default 'pending'), en update se fuerza 'pending'.
//  - gating: feature Pro + sólo layout DT (head-coach). Cap MAX_GAME_IDEAS (3).
//  - el pitch_board se valida con pitchBoardSchema antes de guardar.
import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { loadCoachPlanAccess } from "@/lib/dashboard/coach-plan";
import { isHeadCoachLayout, isStaffRole } from "@/lib/staff/roles";
import {
  MAX_GAME_IDEAS,
  pitchBoardSchema,
  EMPTY_PITCH_BOARD,
} from "@/lib/coach/game-ideas";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import { revalidatePath } from "next/cache";

export type GameIdeaActionResult = {
  success: boolean;
  message?: string;
  id?: string;
};

const URL_RE = /^https?:\/\//i;

const gameIdeaSchema = z.object({
  id: z.string().uuid().optional(),
  title: z
    .union([z.string().trim().max(80, "Máximo 80 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  formation: z
    .union([z.string().trim().max(20), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  blurb: z
    .union([z.string().trim().max(2000, "Máximo 2000 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  link: z
    .union([z.string().trim().max(500), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .refine((v) => v === null || URL_RE.test(v), {
      message: "El enlace debe empezar con http:// o https://.",
    }),
  pitchBoard: pitchBoardSchema,
});

export type GameIdeaInput = z.input<typeof gameIdeaSchema>;

const REVALIDATE = "/dashboard/coach/game-ideas";

async function resolveOwnCoach() {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." as const, supabase: null, coach: null, userId: null };

  const { data: coach, error } = await supabase
    .from("coach_profiles")
    .select("id, slug, primary_role")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; slug: string | null; primary_role: string | null }>();
  if (error) return { error: error.message, supabase: null, coach: null, userId: null };
  if (!coach) return { error: "No tenés un perfil de entrenador.", supabase: null, coach: null, userId: null };
  return { error: null, supabase, coach, userId: user.id };
}

/** True si el perfil monta el layout DT (head-coach) → puede usar Ideas de Juego. */
function isHeadCoach(primaryRole: string | null): boolean {
  // null/legacy → permitido (showTactical=true por defecto, igual que el render).
  if (primaryRole == null) return true;
  return isStaffRole(primaryRole) && isHeadCoachLayout(primaryRole);
}

export async function upsertGameIdea(input: GameIdeaInput): Promise<GameIdeaActionResult> {
  const parsed = gameIdeaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach || !ctx.userId) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach, userId } = ctx;

  if (!isHeadCoach(coach.primary_role)) {
    return {
      success: false,
      message: "Las Ideas de Juego son exclusivas del Cuerpo Técnico (entrenadores).",
    };
  }

  // Feature Pro.
  const access = await loadCoachPlanAccess(supabase, userId);
  if (!access.isPro) {
    return { success: false, message: "Las Ideas de Juego son una función Pro." };
  }

  const board = parsed.data.pitchBoard ?? EMPTY_PITCH_BOARD;

  // EDIT: cualquier cambio re-entra a moderación (status='pending' explícito).
  if (parsed.data.id) {
    const { data, error } = await supabase
      .from("coach_game_ideas")
      .update({
        title: parsed.data.title,
        formation: parsed.data.formation,
        blurb: parsed.data.blurb,
        link: parsed.data.link,
        pitch_board: board,
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
    if (!data) return { success: false, message: "No se encontró la idea." };
    revalidateCoachPublicProfile(coach.slug);
    revalidatePath(REVALIDATE);
    return { success: true, id: data.id };
  }

  // CREATE: cap MAX_GAME_IDEAS.
  const { count } = await supabase
    .from("coach_game_ideas")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coach.id);
  if ((count ?? 0) >= MAX_GAME_IDEAS) {
    return {
      success: false,
      message: `Podés tener hasta ${MAX_GAME_IDEAS} ideas de juego.`,
    };
  }

  const { data: maxRow } = await supabase
    .from("coach_game_ideas")
    .select("position")
    .eq("coach_id", coach.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();
  const nextPosition = (maxRow?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("coach_game_ideas")
    .insert({
      coach_id: coach.id,
      title: parsed.data.title,
      formation: parsed.data.formation,
      blurb: parsed.data.blurb,
      link: parsed.data.link,
      pitch_board: board,
      position: nextPosition,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { success: false, message: error.message };
  revalidatePath(REVALIDATE);
  return { success: true, id: data.id };
}

export async function deleteGameIdea(id: string): Promise<GameIdeaActionResult> {
  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;

  const { error } = await supabase
    .from("coach_game_ideas")
    .delete()
    .eq("id", id)
    .eq("coach_id", coach.id);
  if (error) return { success: false, message: error.message };
  revalidateCoachPublicProfile(coach.slug);
  revalidatePath(REVALIDATE);
  return { success: true };
}
