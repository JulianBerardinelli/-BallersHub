"use server";

import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────── result type ───────────────────────────

export type CoachCareerActionResult = {
  success: boolean;
  message?: string;
  requestId?: string;
};

// ─────────────────────────── field helpers ──────────────────────────

const optionalText = (max: number, msg: string) =>
  z
    .union([z.string().trim().max(max, msg), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable();

const numericField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isNaN(value) ? 0 : Math.trunc(value);
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? 0 : Math.trunc(numeric);
  })
  .refine((value) => value >= 0 && value <= 10000, { message: "Valor fuera de rango." });

const yearField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isNaN(value) ? null : Math.trunc(value);
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? NaN : Math.trunc(numeric);
  })
  .refine(
    (value) =>
      value === null ||
      (!Number.isNaN(value) && value >= 1900 && value <= new Date().getFullYear() + 1),
    { message: "Ingresá un año válido." },
  )
  .nullable();

const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? value : null))
  .nullable();

// ─────────────────────────── schemas ───────────────────────────────

// Optional proposed-team payload (when the coach proposes a team not yet in the
// catalog). Accepted so validation passes; persisting it as a proposed-team row
// is deferred — v1 stores the club text for proposed teams.
const proposedTeamInputSchema = z
  .object({
    name: z.string().trim().max(160).optional().nullable(),
    countryCode: z.string().trim().max(2).optional().nullable(),
    countryName: z.string().trim().max(120).optional().nullable(),
    transfermarktUrl: z.string().trim().max(500).optional().nullable(),
  })
  .nullable()
  .optional();

// A coach career stage. Now carries the catalog links (team_id, division_id,
// secondary division) produced by the shared CareerEditor's team/division
// pickers, mirroring the player career stage. Free-text club/division stays as
// the legacy cache. NOTE: not exported — this is a "use server" module, which
// may only export async functions. The derived input type below is exported.
const coachCareerStageSchema = z.object({
  id: z.string().uuid().optional(),
  originalId: optionalUuid,
  club: z
    .string({ message: "Ingresá el nombre del club." })
    .trim()
    .min(2, "El club debe tener al menos 2 caracteres."),
  roleTitle: optionalText(120, "Máximo 120 caracteres."),
  division: optionalText(120, "Máximo 120 caracteres."),
  divisionId: optionalUuid,
  secondaryDivision: optionalText(120, "Máximo 120 caracteres."),
  secondaryDivisionId: optionalUuid,
  startYear: yearField,
  endYear: yearField,
  teamId: optionalUuid,
  proposedTeam: proposedTeamInputSchema,
});

export type CoachCareerStageInput = z.infer<typeof coachCareerStageSchema>;

// A coach season stat row: results-based (matches / W-D-L / goals for-against),
// per D6. Percentages are derived in the front-end, not stored.
const coachSeasonStatSchema = z
  .object({
    id: z.string().uuid().optional(),
    originalStatId: optionalUuid,
    season: z
      .string({ message: "Indicá la temporada." })
      .trim()
      .min(3, "La temporada debe tener al menos 3 caracteres."),
    competition: optionalText(120, "Máximo 120 caracteres."),
    team: optionalText(120, "Máximo 120 caracteres."),
    matches: numericField,
    wins: numericField,
    draws: numericField,
    losses: numericField,
    goalsFor: numericField,
    goalsAgainst: numericField,
  })
  .superRefine((data, ctx) => {
    if (data.wins + data.draws + data.losses > data.matches) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ganados + empatados + perdidos no pueden superar los partidos dirigidos.",
        path: ["matches"],
      });
    }
  });

export type CoachSeasonStatInput = z.infer<typeof coachSeasonStatSchema>;

const coachCareerRevisionSubmissionSchema = z
  .object({
    coachId: z.string().uuid({ message: "Entrenador no reconocido." }),
    items: z.array(coachCareerStageSchema),
    note: optionalText(500, "Máximo 500 caracteres."),
    stats: z.array(coachSeasonStatSchema).optional(),
  })
  .refine((data) => data.items.length > 0 || (data.stats?.length ?? 0) > 0, {
    message: "Agregá al menos una etapa de trayectoria o una temporada para enviar a revisión.",
    path: ["items"],
  });

export type CoachCareerRevisionSubmissionInput = z.infer<
  typeof coachCareerRevisionSubmissionSchema
>;

// ─────────────────────────── ownership gate ────────────────────────

async function ensureAuthenticatedCoach(coachId: string) {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "No autenticado." as const, supabase: null, userId: null };
  }

  const { data: profile, error } = await supabase
    .from("coach_profiles")
    .select("id, user_id, slug")
    .eq("id", coachId)
    .maybeSingle<{ id: string; user_id: string; slug: string | null }>();

  if (error) return { error: error.message, supabase: null, userId: null };
  if (!profile || profile.user_id !== user.id) {
    return { error: "No tenés permisos sobre este perfil.", supabase: null, userId: null };
  }

  return { error: null, supabase, userId: user.id, slug: profile.slug };
}

// ─────────────────────────── action ────────────────────────────────

// Submits a moderated revision of the coach's trayectoria + season stats.
// Mirrors the player submitCareerRevision: builds an envelope row, snapshots
// the live career/stats, and stores the proposed set as child rows. Runs as
// the user's session client so RLS (envelope INSERT requires
// submitted_by = auth.uid() AND owns coach) is the gate. An admin later
// approves and materializes it into coach_career_items / coach_stats_seasons.
export async function submitCoachCareerRevision(
  input: CoachCareerRevisionSubmissionInput,
): Promise<CoachCareerActionResult> {
  const parsed = coachCareerRevisionSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const auth = await ensureAuthenticatedCoach(parsed.data.coachId);
  if (auth.error || !auth.supabase || !auth.userId) {
    return { success: false, message: auth.error ?? "No autorizado." };
  }
  const supabase = auth.supabase;
  const coachId = parsed.data.coachId;

  // Block a second concurrent request — one in-flight revision at a time.
  const { data: pending } = await supabase
    .from("coach_career_revision_requests")
    .select("id")
    .eq("coach_id", coachId)
    .eq("submitted_by_user_id", auth.userId)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) {
    return {
      success: false,
      message: "Ya tenés una solicitud de trayectoria en revisión. Esperá la respuesta del equipo.",
    };
  }

  // Snapshot the current live state for the admin diff (PR-4c).
  const [{ data: careerSnap }, { data: statsSnap }] = await Promise.all([
    supabase
      .from("coach_career_items")
      .select("id, club, role_title, division, start_date, end_date")
      .eq("coach_id", coachId)
      .order("start_date", { ascending: false }),
    supabase
      .from("coach_stats_seasons")
      .select("id, season, matches, wins, draws, losses, goals_for, goals_against, competition, team")
      .eq("coach_id", coachId),
  ]);

  const { data: created, error: envelopeError } = await supabase
    .from("coach_career_revision_requests")
    .insert({
      coach_id: coachId,
      submitted_by_user_id: auth.userId,
      change_summary: parsed.data.note,
      current_snapshot: { career: careerSnap ?? [], stats: statsSnap ?? [] },
    })
    .select("id")
    .single<{ id: string }>();

  if (envelopeError || !created) {
    return { success: false, message: envelopeError?.message ?? "No se pudo crear la solicitud." };
  }
  const requestId = created.id;

  // Roll back the whole envelope (cascades to children) on any child failure.
  const rollback = async () => {
    await supabase.from("coach_career_revision_requests").delete().eq("id", requestId);
  };

  if (parsed.data.items.length > 0) {
    const itemRows = parsed.data.items.map((stage, index) => ({
      request_id: requestId,
      original_item_id: stage.originalId ?? null,
      club: stage.club,
      role_title: stage.roleTitle,
      division: stage.division,
      division_id: stage.divisionId ?? null,
      secondary_division: stage.secondaryDivision ?? null,
      secondary_division_id: stage.secondaryDivisionId ?? null,
      start_year: stage.startYear,
      end_year: stage.endYear,
      team_id: stage.teamId ?? null,
      order_index: index,
    }));
    const { error: itemsError } = await supabase
      .from("coach_career_revision_items")
      .insert(itemRows);
    if (itemsError) {
      await rollback();
      return { success: false, message: itemsError.message };
    }
  }

  const stats = parsed.data.stats ?? [];
  if (stats.length > 0) {
    const statRows = stats.map((stat, index) => ({
      request_id: requestId,
      original_stat_id: stat.originalStatId ?? null,
      season: stat.season,
      matches: stat.matches,
      wins: stat.wins,
      draws: stat.draws,
      losses: stat.losses,
      goals_for: stat.goalsFor,
      goals_against: stat.goalsAgainst,
      competition: stat.competition,
      team: stat.team,
      order_index: index,
    }));
    const { error: statsError } = await supabase
      .from("coach_stats_revision_items")
      .insert(statRows);
    if (statsError) {
      await rollback();
      return { success: false, message: statsError.message };
    }
  }

  revalidatePath("/dashboard/coach/career");
  return { success: true, requestId };
}

// Lets the coach cancel their own pending revision so they can edit again.
export async function cancelCoachCareerRevision(
  requestId: string,
): Promise<CoachCareerActionResult> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado." };

  const { error } = await supabase
    .from("coach_career_revision_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("submitted_by_user_id", user.id)
    .eq("status", "pending");
  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard/coach/career");
  return { success: true };
}
