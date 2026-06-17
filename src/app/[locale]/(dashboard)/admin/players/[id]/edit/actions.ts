"use server";

// Admin player CRUD — direct, review-bypassing edits of ANY player's data.
// Gated to role === "admin" (ensureAdminActor) and written with a service-role
// client. Every action funnels its after-write side-effects (change log, audit,
// in-app notification, correction email, revalidate) through
// recordAdminPlayerEdit so each one stays small. Return shapes mirror the
// player-facing football-data / personal-data actions so the SAME dashboard
// components can be reused by injecting these as the `action` prop.

import { z } from "zod";

import { ensureAdminActor } from "@/lib/admin/auth";
import { recordAdminPlayerEdit, type ChangeLogEntry } from "@/lib/admin/notify";
import { syncPlayerCareerLive } from "@/lib/admin/career-sync";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import {
  sportProfileSchema,
  marketProjectionSchema,
  scoutingAnalysisSchema,
  seasonStatMutationSchema,
  honourMutationSchema,
  careerRevisionSubmissionSchema,
  type SeasonStatMutationInput,
  type HonourMutationInput,
  type CareerRevisionSubmissionInput,
} from "@/app/[locale]/(dashboard)/dashboard/edit-profile/football-data/schemas";
import {
  sanitizeText as ftSanitize,
  parseMarketValue,
} from "@/app/[locale]/(dashboard)/dashboard/edit-profile/football-data/normalize";
import {
  fetchCountryLookup,
  parseBirthDate,
  parseResidence,
  parseMeasurement,
  parseLanguages,
  parseDocuments,
  resolveCountry,
  formatStoredNationalities,
  sanitizeText as pdSanitize,
} from "@/app/[locale]/(dashboard)/dashboard/edit-profile/personal-data/normalize";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = ReturnType<typeof import("@/lib/supabase/admin").createSupabaseAdmin>;

type FormResult<T> =
  | { success: true; data: T; message?: string; updatedFields: string[] }
  | { success: false; message: string; fieldErrors?: Record<string, string | undefined> };

type SimpleResult = { success: true; requestId?: string } | { success: false; message: string };

type TargetPlayer = { id: string; userId: string; fullName: string };

// ---------------------------------------------------------------------------
// Shared per-action preamble
// ---------------------------------------------------------------------------

async function loadTargetPlayer(
  admin: AdminClient,
  playerId: string,
): Promise<TargetPlayer | null> {
  const { data } = await admin
    .from("player_profiles")
    .select("id, user_id, full_name")
    .eq("id", playerId)
    .maybeSingle<{ id: string; user_id: string; full_name: string | null }>();
  if (!data) return null;
  return { id: data.id, userId: data.user_id, fullName: data.full_name ?? "" };
}

async function targetIsPro(admin: AdminClient, userId: string): Promise<boolean> {
  try {
    const state = await fetchDashboardState(admin, userId);
    return resolvePlanAccess(state.subscription ?? null).isPro;
  } catch {
    return false;
  }
}

const PRO_REQUIRED_MESSAGE =
  "Esta sección es parte del plan Pro. Este jugador es Free — otorgale una cuenta de cortesía en /admin/comp-accounts para editarla.";

// ---------------------------------------------------------------------------
// Datos — sport profile (foot / contract status)
// ---------------------------------------------------------------------------

export async function adminUpdateSportProfile(
  input: z.infer<typeof sportProfileSchema>,
): Promise<FormResult<{ positions: string; foot: string; currentClub: string; contractStatus: string; agencyId: string | null }>> {
  const parsed = sportProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá los datos ingresados e intentá nuevamente." };
  }
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, parsed.data.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };

  const { data: before } = await admin
    .from("player_profiles")
    .select("positions, current_club, foot, contract_status, agency_id")
    .eq("id", parsed.data.playerId)
    .maybeSingle<{
      positions: string[] | null;
      current_club: string | null;
      foot: string | null;
      contract_status: string | null;
      agency_id: string | null;
    }>();
  if (!before) return { success: false, message: "No encontramos el perfil indicado." };

  const foot = ftSanitize(parsed.data.foot);
  const contractStatus = ftSanitize(parsed.data.contractStatus);
  const rawAgencyId = parsed.data.agencyId === undefined ? before.agency_id : parsed.data.agencyId;
  const agencyId = rawAgencyId === "" ? null : rawAgencyId;

  const changeLog: ChangeLogEntry[] = [];
  const updatedFields: string[] = [];
  if ((before.foot ?? null) !== (foot ?? null)) {
    changeLog.push({ field: "foot", oldValue: before.foot, newValue: foot });
    updatedFields.push("Perfil dominante");
  }
  if ((before.contract_status ?? null) !== (contractStatus ?? null)) {
    changeLog.push({ field: "contract_status", oldValue: before.contract_status, newValue: contractStatus });
    updatedFields.push("Situación contractual");
  }
  if (before.agency_id !== agencyId) {
    changeLog.push({ field: "agency_id", oldValue: before.agency_id, newValue: agencyId });
    updatedFields.push("Agencia representante");
  }

  const { error } = await admin
    .from("player_profiles")
    .update({ foot, contract_status: contractStatus, agency_id: agencyId })
    .eq("id", parsed.data.playerId);
  if (error) return { success: false, message: error.message };

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: "datos",
    changedFields: updatedFields,
    changeLog,
  });

  return {
    success: true,
    message: "Perfil deportivo actualizado correctamente.",
    data: {
      positions: (before.positions ?? []).filter(Boolean).join(", "),
      foot: foot ?? "",
      currentClub: ftSanitize(before.current_club) ?? "",
      contractStatus: contractStatus ?? "",
      agencyId,
    },
    updatedFields,
  };
}

// ---------------------------------------------------------------------------
// Valor de mercado (Pro-gated by the TARGET player's plan)
// ---------------------------------------------------------------------------

export async function adminUpdateMarketValue(
  input: z.infer<typeof marketProjectionSchema>,
): Promise<FormResult<{ marketValue: string; careerObjectives: string }>> {
  const parsed = marketProjectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá los datos ingresados e intentá nuevamente." };
  }
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, parsed.data.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };
  if (!(await targetIsPro(admin, target.userId))) {
    return { success: false, message: PRO_REQUIRED_MESSAGE };
  }

  const { data: before } = await admin
    .from("player_profiles")
    .select("market_value_eur, career_objectives")
    .eq("id", parsed.data.playerId)
    .maybeSingle<{ market_value_eur: string | number | null; career_objectives: string | null }>();
  if (!before) return { success: false, message: "No encontramos el perfil indicado." };

  const mv = parseMarketValue(parsed.data.marketValue ?? null);
  if (mv.error) {
    return { success: false, message: mv.error, fieldErrors: { marketValue: mv.error } };
  }
  const careerObjectives = ftSanitize(parsed.data.careerObjectives);

  const prev = before.market_value_eur == null ? null : Number(before.market_value_eur);
  const next = mv.dbValue == null ? null : Number(mv.dbValue);

  const changeLog: ChangeLogEntry[] = [];
  const updatedFields: string[] = [];
  if (prev !== next) {
    changeLog.push({ field: "market_value_eur", oldValue: before.market_value_eur, newValue: mv.dbValue });
    updatedFields.push("Valor de mercado");
  }
  if ((before.career_objectives ?? null) !== (careerObjectives ?? null)) {
    changeLog.push({ field: "career_objectives", oldValue: before.career_objectives, newValue: careerObjectives });
    updatedFields.push("Objetivos de carrera");
  }

  const { error } = await admin
    .from("player_profiles")
    .update({ market_value_eur: mv.dbValue, career_objectives: careerObjectives })
    .eq("id", parsed.data.playerId);
  if (error) return { success: false, message: error.message };

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: "valor",
    changedFields: updatedFields,
    changeLog,
  });

  return {
    success: true,
    message: "Valor de mercado actualizado correctamente.",
    data: { marketValue: mv.display, careerObjectives: careerObjectives ?? "" },
    updatedFields,
  };
}

// ---------------------------------------------------------------------------
// Scouting analysis (Pro-gated by the TARGET player's plan)
// ---------------------------------------------------------------------------

export async function adminUpdateScouting(
  input: z.infer<typeof scoutingAnalysisSchema>,
): Promise<FormResult<{ topCharacteristics: string; tacticsAnalysis: string; physicalAnalysis: string; mentalAnalysis: string; techniqueAnalysis: string; analysisAuthor: string }>> {
  const parsed = scoutingAnalysisSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá los datos ingresados e intentá nuevamente." };
  }
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, parsed.data.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };
  if (!(await targetIsPro(admin, target.userId))) {
    return { success: false, message: PRO_REQUIRED_MESSAGE };
  }

  const { data: before } = await admin
    .from("player_profiles")
    .select("top_characteristics, tactics_analysis, physical_analysis, mental_analysis, technique_analysis, analysis_author")
    .eq("id", parsed.data.playerId)
    .maybeSingle<{
      top_characteristics: string[] | null;
      tactics_analysis: string | null;
      physical_analysis: string | null;
      mental_analysis: string | null;
      technique_analysis: string | null;
      analysis_author: string | null;
    }>();
  if (!before) return { success: false, message: "No encontramos el perfil indicado." };

  const topChars = (parsed.data.topCharacteristics ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const tactics = ftSanitize(parsed.data.tacticsAnalysis);
  const physical = ftSanitize(parsed.data.physicalAnalysis);
  const mental = ftSanitize(parsed.data.mentalAnalysis);
  const technique = ftSanitize(parsed.data.techniqueAnalysis);
  const author = ftSanitize(parsed.data.analysisAuthor);

  const arraysEqual = (a: string[] | null, b: string[]) =>
    a ? a.length === b.length && a.every((v, i) => v === b[i]) : b.length === 0;

  const changeLog: ChangeLogEntry[] = [];
  const updatedFields: string[] = [];
  if (!arraysEqual(before.top_characteristics, topChars)) {
    changeLog.push({ field: "top_characteristics", oldValue: before.top_characteristics, newValue: topChars });
    updatedFields.push("Características principales");
  }
  if ((before.tactics_analysis ?? null) !== (tactics ?? null)) {
    changeLog.push({ field: "tactics_analysis", oldValue: before.tactics_analysis, newValue: tactics });
    updatedFields.push("Análisis táctico");
  }
  if ((before.physical_analysis ?? null) !== (physical ?? null)) {
    changeLog.push({ field: "physical_analysis", oldValue: before.physical_analysis, newValue: physical });
    updatedFields.push("Análisis físico");
  }
  if ((before.mental_analysis ?? null) !== (mental ?? null)) {
    changeLog.push({ field: "mental_analysis", oldValue: before.mental_analysis, newValue: mental });
    updatedFields.push("Análisis mental");
  }
  if ((before.technique_analysis ?? null) !== (technique ?? null)) {
    changeLog.push({ field: "technique_analysis", oldValue: before.technique_analysis, newValue: technique });
    updatedFields.push("Análisis técnico");
  }
  if ((before.analysis_author ?? null) !== (author ?? null)) {
    changeLog.push({ field: "analysis_author", oldValue: before.analysis_author, newValue: author });
    updatedFields.push("Autor del análisis");
  }

  const { error } = await admin
    .from("player_profiles")
    .update({
      top_characteristics: topChars.length ? topChars : null,
      tactics_analysis: tactics,
      physical_analysis: physical,
      mental_analysis: mental,
      technique_analysis: technique,
      analysis_author: author,
    })
    .eq("id", parsed.data.playerId);
  if (error) return { success: false, message: error.message };

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: "scouting",
    changedFields: updatedFields,
    changeLog,
  });

  return {
    success: true,
    message: "Reporte de Scouting actualizado correctamente.",
    data: {
      topCharacteristics: topChars.join(", "),
      tacticsAnalysis: tactics ?? "",
      physicalAnalysis: physical ?? "",
      mentalAnalysis: mental ?? "",
      techniqueAnalysis: technique ?? "",
      analysisAuthor: author ?? "",
    },
    updatedFields,
  };
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

export async function adminUpsertSeasonStat(input: SeasonStatMutationInput): Promise<SimpleResult> {
  const parsed = seasonStatMutationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá los datos estadísticos e intentá nuevamente." };
  }
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, parsed.data.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };

  let dup = admin
    .from("stats_seasons")
    .select("id")
    .eq("player_id", parsed.data.playerId)
    .eq("season", parsed.data.season)
    .limit(1);
  if (parsed.data.id) dup = dup.neq("id", parsed.data.id);
  const { data: dupRows } = await dup;
  if (dupRows && dupRows.length > 0) {
    return {
      success: false,
      message: "Ya existen estadísticas para esa temporada. Editá la fila existente o eliminála antes de crear otra.",
    };
  }

  const payload = {
    season: parsed.data.season,
    competition: parsed.data.competition,
    team: parsed.data.team,
    matches: parsed.data.matches,
    starts: parsed.data.starts,
    minutes: parsed.data.minutes,
    goals: parsed.data.goals,
    assists: parsed.data.assists,
    yellow_cards: parsed.data.yellowCards,
    red_cards: parsed.data.redCards,
    career_item_id: parsed.data.careerItemId,
  };

  const { error } = parsed.data.id
    ? await admin.from("stats_seasons").update(payload).eq("id", parsed.data.id).eq("player_id", parsed.data.playerId)
    : await admin.from("stats_seasons").insert({ ...payload, player_id: parsed.data.playerId });
  if (error) return { success: false, message: error.message };

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: "estadisticas",
    changedFields: [`Temporada ${parsed.data.season}`],
  });

  return { success: true };
}

export async function adminDeleteSeasonStat(input: { id: string; playerId: string }): Promise<SimpleResult> {
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, input.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };

  const { error } = await admin
    .from("stats_seasons")
    .delete()
    .eq("id", input.id)
    .eq("player_id", input.playerId);
  if (error) return { success: false, message: error.message };

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: "estadisticas",
    changedFields: ["Estadística eliminada"],
  });

  return { success: true };
}

/**
 * submitCareerRevision-shaped action injected into SeasonStatsManager so the
 * admin's "submit" writes the stat drafts LIVE (bypassing the revision queue).
 * The manager only sends stats here (items: []).
 */
export async function adminSubmitStatsLive(
  input: CareerRevisionSubmissionInput,
): Promise<SimpleResult> {
  const parsed = careerRevisionSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá las estadísticas e intentá nuevamente." };
  }
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, parsed.data.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };

  const stats = parsed.data.stats ?? [];
  const seasons: string[] = [];
  for (const stat of stats) {
    let dup = admin
      .from("stats_seasons")
      .select("id")
      .eq("player_id", parsed.data.playerId)
      .eq("season", stat.season)
      .limit(1);
    if (stat.id) dup = dup.neq("id", stat.id);
    const { data: dupRows } = await dup;
    if (!stat.id && dupRows && dupRows.length > 0) {
      return { success: false, message: `Ya existen estadísticas para ${stat.season}.` };
    }

    const payload = {
      season: stat.season,
      competition: stat.competition,
      team: stat.team,
      matches: stat.matches,
      starts: stat.starts,
      minutes: stat.minutes,
      goals: stat.goals,
      assists: stat.assists,
      yellow_cards: stat.yellowCards,
      red_cards: stat.redCards,
      career_item_id: stat.careerItemId,
    };

    const { error } = stat.id
      ? await admin.from("stats_seasons").update(payload).eq("id", stat.id).eq("player_id", parsed.data.playerId)
      : await admin.from("stats_seasons").insert({ ...payload, player_id: parsed.data.playerId });
    if (error) return { success: false, message: error.message };
    seasons.push(stat.season);
  }

  if (seasons.length > 0) {
    await recordAdminPlayerEdit({
      actor: auth.actor,
      playerId: target.id,
      targetUserId: target.userId,
      playerName: target.fullName,
      domain: "estadisticas",
      changedFields: seasons.map((s) => `Temporada ${s}`),
    });
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Palmarés
// ---------------------------------------------------------------------------

export async function adminUpsertHonour(input: HonourMutationInput): Promise<SimpleResult> {
  const parsed = honourMutationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá los datos del logro e intentá nuevamente." };
  }
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, parsed.data.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };

  const payload = {
    title: parsed.data.title,
    competition: parsed.data.competition,
    season: parsed.data.season,
    awarded_on: parsed.data.awardedOn,
    description: parsed.data.description,
    career_item_id: parsed.data.careerItemId,
  };

  const { error } = parsed.data.id
    ? await admin.from("player_honours").update(payload).eq("id", parsed.data.id).eq("player_id", parsed.data.playerId)
    : await admin.from("player_honours").insert({ ...payload, player_id: parsed.data.playerId });
  if (error) return { success: false, message: error.message };

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: "palmares",
    changedFields: [parsed.data.title],
  });

  return { success: true };
}

export async function adminDeleteHonour(input: { id: string; playerId: string }): Promise<SimpleResult> {
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, input.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };

  const { error } = await admin
    .from("player_honours")
    .delete()
    .eq("id", input.id)
    .eq("player_id", input.playerId);
  if (error) return { success: false, message: error.message };

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: "palmares",
    changedFields: ["Logro eliminado"],
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Trayectoria — direct LIVE edit (bypasses the revision queue)
// ---------------------------------------------------------------------------

/**
 * submitCareerRevision-shaped action injected into CareerManager so the admin's
 * trajectory edit writes LIVE to career_items (bypassing the revision queue).
 * Auto-cancels any pending player revision so a later approval can't clobber it.
 */
export async function adminSubmitCareerLive(
  input: CareerRevisionSubmissionInput,
): Promise<SimpleResult> {
  const parsed = careerRevisionSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá las etapas de la trayectoria e intentá nuevamente." };
  }
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, parsed.data.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };

  // If the player has a pending revision request, auto-cancel it so a later
  // approval can't clobber this live edit. The player gets a cancelled toast.
  await admin
    .from("career_revision_requests")
    .update({
      status: "cancelled",
      reviewed_by_user_id: auth.actor.actorId,
      reviewed_at: new Date().toISOString(),
      resolution_note: "Reemplazado por edición directa del staff.",
    })
    .eq("player_id", parsed.data.playerId)
    .eq("status", "pending");

  const sync = await syncPlayerCareerLive(admin, parsed.data.playerId, parsed.data.items, auth.actor.actorId);
  if (!sync.ok) return { success: false, message: sync.error };

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: "trayectoria",
    changedFields: ["Trayectoria"],
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Datos — basic information (bio, birth date, height, weight, residence, education)
// ---------------------------------------------------------------------------

const adminBasicInfoSchema = z.object({
  playerId: z.string().uuid(),
  fullName: z.string().trim().optional(),
  birthDate: z.string().trim().optional(),
  nationalities: z.string().trim().optional(),
  residence: z.string().trim().optional(),
  heightCm: z.string().trim().optional(),
  weightKg: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  education: z.string().trim().max(200, "La educación no puede superar los 200 caracteres.").optional(),
});

export async function adminUpdateBasicInformation(
  input: z.infer<typeof adminBasicInfoSchema>,
): Promise<FormResult<{ fullName: string; birthDate: string; nationalities: string; residence: string; heightCm: string; weightKg: string; bio: string; education: string }>> {
  const parsed = adminBasicInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá los datos ingresados e intentá nuevamente." };
  }
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, parsed.data.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };

  const lookup = await fetchCountryLookup(admin);
  const fieldErrors: Record<string, string | undefined> = {};

  const bio = pdSanitize(parsed.data.bio);
  const education = pdSanitize(parsed.data.education);
  const birth = parseBirthDate(parsed.data.birthDate);
  if (birth.error) fieldErrors.birthDate = birth.error;
  const residence = parseResidence(parsed.data.residence, lookup);
  const height = parseMeasurement(parsed.data.heightCm, "Altura", { min: 120, max: 250 });
  if (height.error) fieldErrors.heightCm = height.error;
  const weight = parseMeasurement(parsed.data.weightKg, "Peso", { min: 40, max: 200 });
  if (weight.error) fieldErrors.weightKg = weight.error;
  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, message: "Revisá los datos ingresados e intentá nuevamente.", fieldErrors };
  }

  const { data: before } = await admin
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
  if (!before) return { success: false, message: "No encontramos el perfil indicado." };

  const { data: personalBefore } = await admin
    .from("player_personal_details")
    .select("residence_city, residence_country, residence_country_code, education")
    .eq("player_id", parsed.data.playerId)
    .maybeSingle<{
      residence_city: string | null;
      residence_country: string | null;
      residence_country_code: string | null;
      education: string | null;
    }>();

  const { error: profileError } = await admin
    .from("player_profiles")
    .update({ birth_date: birth.iso, height_cm: height.numeric, weight_kg: weight.numeric, bio })
    .eq("id", parsed.data.playerId);
  if (profileError) return { success: false, message: profileError.message };

  const { error: personalError } = await admin
    .from("player_personal_details")
    .upsert(
      {
        player_id: parsed.data.playerId,
        residence_city: residence.city,
        residence_country: residence.countryName,
        residence_country_code: residence.countryCode,
        education,
      },
      { onConflict: "player_id" },
    );
  if (personalError) return { success: false, message: personalError.message };

  const changeLog: ChangeLogEntry[] = [];
  const updatedFields: string[] = [];
  if ((before.birth_date ?? null) !== (birth.iso ?? null)) {
    changeLog.push({ field: "birth_date", oldValue: before.birth_date, newValue: birth.iso });
    updatedFields.push("Fecha de nacimiento");
  }
  if ((before.height_cm ?? null) !== (height.numeric ?? null)) {
    changeLog.push({ field: "height_cm", oldValue: before.height_cm, newValue: height.numeric });
    updatedFields.push("Altura");
  }
  if ((before.weight_kg ?? null) !== (weight.numeric ?? null)) {
    changeLog.push({ field: "weight_kg", oldValue: before.weight_kg, newValue: weight.numeric });
    updatedFields.push("Peso");
  }
  if ((before.bio ?? null) !== (bio ?? null)) {
    changeLog.push({ field: "bio", oldValue: before.bio, newValue: bio });
    updatedFields.push("Biografía");
  }
  if ((personalBefore?.education ?? null) !== (education ?? null)) {
    changeLog.push({ field: "education", oldValue: personalBefore?.education ?? null, newValue: education });
    updatedFields.push("Educación");
  }
  if (
    (personalBefore?.residence_city ?? null) !== (residence.city ?? null) ||
    (personalBefore?.residence_country ?? null) !== (residence.countryName ?? null)
  ) {
    changeLog.push({
      field: "residence",
      oldValue: { city: personalBefore?.residence_city ?? null, country: personalBefore?.residence_country ?? null },
      newValue: { city: residence.city ?? null, country: residence.countryName ?? null },
    });
    updatedFields.push("Residencia");
  }

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: "datos",
    changedFields: updatedFields,
    changeLog,
  });

  return {
    success: true,
    message: "Información básica actualizada correctamente.",
    data: {
      fullName: before.full_name?.trim() ?? "",
      birthDate: birth.display,
      nationalities: formatStoredNationalities(before.nationality, before.nationality_codes, lookup),
      residence: residence.display,
      heightCm: height.display,
      weightKg: weight.display,
      bio: bio ?? "",
      education: education ?? "",
    },
    updatedFields,
  };
}

// ---------------------------------------------------------------------------
// Datos — contact information
// ---------------------------------------------------------------------------

const adminContactSchema = z.object({
  playerId: z.string().uuid(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  languages: z.string().trim().optional(),
  documents: z.string().trim().optional(),
  documentCountry: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  showContactSection: z.boolean().optional(),
});

export async function adminUpdateContactInformation(
  input: z.infer<typeof adminContactSchema>,
): Promise<FormResult<{ email: string; phone: string; languages: string; documents: string; documentCountry: string; whatsapp: string; showContactSection: boolean }>> {
  const parsed = adminContactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá los datos ingresados e intentá nuevamente." };
  }
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, message: auth.error };
  const admin = auth.actor.adminClient;

  const target = await loadTargetPlayer(admin, parsed.data.playerId);
  if (!target) return { success: false, message: "No encontramos el perfil indicado." };

  const lookup = await fetchCountryLookup(admin);
  const fieldErrors: Record<string, string | undefined> = {};

  const email = pdSanitize(parsed.data.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Ingresá un email válido.";
  const phone = pdSanitize(parsed.data.phone);
  const whatsapp = pdSanitize(parsed.data.whatsapp);
  const languages = parseLanguages(parsed.data.languages);
  const documents = parseDocuments(parsed.data.documents);
  const documentCountry = resolveCountry(parsed.data.documentCountry ?? null, lookup);
  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, message: "Revisá los datos ingresados e intentá nuevamente.", fieldErrors };
  }

  const { data: before } = await admin
    .from("player_personal_details")
    .select("phone, languages, document_type, document_number, document_country, document_country_code, whatsapp, show_contact_section")
    .eq("player_id", parsed.data.playerId)
    .maybeSingle<{
      phone: string | null;
      languages: string[] | null;
      document_type: string | null;
      document_number: string | null;
      document_country: string | null;
      document_country_code: string | null;
      whatsapp: string | null;
      show_contact_section: boolean | null;
    }>();

  const showContactSection = parsed.data.showContactSection ?? before?.show_contact_section ?? false;

  const { error } = await admin.from("player_personal_details").upsert(
    {
      player_id: parsed.data.playerId,
      phone,
      languages: languages.list,
      document_type: documents.type,
      document_number: documents.number,
      document_country: documentCountry.display,
      document_country_code: documentCountry.info?.code ?? null,
      whatsapp,
      show_contact_section: showContactSection,
    },
    { onConflict: "player_id" },
  );
  if (error) return { success: false, message: error.message };

  // Admin editing ANOTHER user's email → use the admin API (NOT auth.updateUser,
  // which would change the admin's own session email).
  if (email) {
    try {
      await admin.auth.admin.updateUserById(target.userId, { email });
    } catch {
      /* non-fatal — the rest of the contact edit still applied */
    }
  }

  const changeLog: ChangeLogEntry[] = [];
  const updatedFields: string[] = [];
  if ((before?.phone ?? null) !== (phone ?? null)) {
    changeLog.push({ field: "phone", oldValue: before?.phone ?? null, newValue: phone });
    updatedFields.push("Teléfono");
  }
  if (JSON.stringify(before?.languages ?? null) !== JSON.stringify(languages.list ?? null)) {
    changeLog.push({ field: "languages", oldValue: before?.languages ?? null, newValue: languages.list });
    updatedFields.push("Idiomas");
  }
  if ((before?.document_number ?? null) !== (documents.number ?? null) || (before?.document_type ?? null) !== (documents.type ?? null)) {
    changeLog.push({ field: "documents", oldValue: { type: before?.document_type ?? null, number: before?.document_number ?? null }, newValue: { type: documents.type, number: documents.number } });
    updatedFields.push("Documento");
  }
  if (email) updatedFields.push("Email principal");
  if ((before?.whatsapp ?? null) !== (whatsapp ?? null)) {
    changeLog.push({ field: "whatsapp", oldValue: before?.whatsapp ?? null, newValue: whatsapp });
    updatedFields.push("WhatsApp");
  }
  if ((before?.show_contact_section ?? false) !== showContactSection) {
    changeLog.push({ field: "show_contact_section", oldValue: before?.show_contact_section ?? false, newValue: showContactSection });
    updatedFields.push("Visibilidad pública");
  }

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: "datos",
    changedFields: updatedFields,
    changeLog,
  });

  return {
    success: true,
    message: "Datos de contacto actualizados correctamente.",
    data: {
      email: email ?? "",
      phone: phone ?? "",
      languages: languages.display,
      documents: documents.display,
      documentCountry: documentCountry.display ?? "",
      whatsapp: whatsapp ?? "",
      showContactSection,
    },
    updatedFields,
  };
}

// ---------------------------------------------------------------------------
// Multimedia — avatar + Pro assets (hero / model). Service-role upload to the
// player-media bucket, scoped to the TARGET player's user id.
// ---------------------------------------------------------------------------

const ASSET_TYPES = ["avatarUrl", "heroUrl", "modelUrl1", "modelUrl2"] as const;
type AssetType = (typeof ASSET_TYPES)[number];
const ASSET_LABELS: Record<AssetType, string> = {
  avatarUrl: "Avatar",
  heroUrl: "Hero (Pro)",
  modelUrl1: "Modelado 1 (Pro)",
  modelUrl2: "Modelado 2 (Pro)",
};

export async function adminUploadPlayerAsset(
  formData: FormData,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const auth = await ensureAdminActor();
  if (!auth.ok) return { success: false, error: auth.error };
  const admin = auth.actor.adminClient;

  const playerId = String(formData.get("playerId") ?? "");
  const assetType = String(formData.get("assetType") ?? "") as AssetType;
  const file = formData.get("file") as File | null;

  if (!playerId || !ASSET_TYPES.includes(assetType) || !file) {
    return { success: false, error: "Archivo o tipo de asset faltante." };
  }

  const target = await loadTargetPlayer(admin, playerId);
  if (!target) return { success: false, error: "No encontramos el perfil indicado." };

  // Pro assets (hero / model) require the target player to be Pro; avatar is
  // allowed on any plan.
  if (assetType !== "avatarUrl" && !(await targetIsPro(admin, target.userId))) {
    return { success: false, error: PRO_REQUIRED_MESSAGE };
  }

  const ext = file.name.split(".").pop() || "png";
  const rand = Math.random().toString(36).slice(2, 9);
  const fileName = `gallery/${target.userId}/${assetType}-${target.id}-${rand}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("player-media")
    .upload(fileName, file, { upsert: true });
  if (uploadError) return { success: false, error: uploadError.message };

  const { data: { publicUrl } } = admin.storage.from("player-media").getPublicUrl(fileName);

  const column =
    assetType === "avatarUrl"
      ? "avatar_url"
      : assetType === "heroUrl"
        ? "hero_url"
        : assetType === "modelUrl1"
          ? "model_url_1"
          : "model_url_2";

  const { error: updateError } = await admin
    .from("player_profiles")
    .update({ [column]: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", target.id);
  if (updateError) return { success: false, error: updateError.message };

  // Avatar is the player's single primary photo — replace the old primary.
  if (assetType === "avatarUrl") {
    await admin
      .from("player_media")
      .delete()
      .eq("player_id", target.id)
      .eq("type", "photo")
      .eq("is_primary", true);
  }
  await admin.from("player_media").insert({
    player_id: target.id,
    type: "photo",
    url: publicUrl,
    provider: `admin_${assetType}`,
    title: assetType === "avatarUrl" ? "Avatar principal" : `[Admin] ${ASSET_LABELS[assetType]}`,
    is_primary: assetType === "avatarUrl",
    is_approved: true,
    is_flagged: false,
  });

  await recordAdminPlayerEdit({
    actor: auth.actor,
    playerId: target.id,
    targetUserId: target.userId,
    playerName: target.fullName,
    domain: assetType === "avatarUrl" ? "datos" : "multimedia",
    changedFields: [ASSET_LABELS[assetType]],
  });

  return { success: true, url: publicUrl };
}
