"use server";

import { revalidatePath } from "next/cache";
import { type PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import {
  linkMutationSchema,
  honourMutationSchema,
  seasonStatMutationSchema,
  careerRevisionSubmissionSchema,
  type LinkMutationInput,
  type HonourMutationInput,
  type SeasonStatMutationInput,
  type CareerRevisionSubmissionInput,
  type CareerStageInput,
} from "./schemas";

const DASHBOARD_ROUTE = "/dashboard/edit-profile/football-data";
const RUN_CAREER_SCRIPT_MESSAGE =
  "Actualizá tu base ejecutando docs/db/client-dashboard-career-requests.sql antes de continuar.";

const sportProfileSchema = z.object({
  playerId: z.string().uuid(),
  foot: z.string().trim().max(50, "Ingresá un perfil válido.").optional(),
  contractStatus: z.string().trim().max(120, "La situación contractual es muy extensa.").optional(),
});

const marketProjectionSchema = z.object({
  playerId: z.string().uuid(),
  marketValue: z
    .string()
    .trim()
    .max(32, "El valor de mercado es demasiado largo.")
    .optional(),
  careerObjectives: z
    .string()
    .trim()
    .max(600, "Los objetivos deben tener menos de 600 caracteres.")
    .optional(),
});

type FormActionSuccess<T> = { success: true; data: T; message?: string; updatedFields: string[] };
type FormActionFailure = { success: false; message: string; fieldErrors?: Record<string, string | undefined> };
type FormActionResult<T> = FormActionSuccess<T> | FormActionFailure;

type SportProfileResponse = {
  positions: string;
  foot: string;
  currentClub: string;
  contractStatus: string;
};

type MarketProjectionResponse = {
  marketValue: string;
  careerObjectives: string;
};

type ActionResult =
  | { success: true; requestId?: string }
  | { success: false; message: string };

type ChangeLogEntry = { field: string; oldValue: unknown; newValue: unknown };

function sanitizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function formatPositions(positions: string[] | null | undefined): string {
  if (!Array.isArray(positions) || positions.length === 0) return "";
  return positions
    .map((position) => sanitizeText(position) ?? null)
    .filter((position): position is string => Boolean(position))
    .join(", ");
}

function parseMarketValue(
  value: string | null | undefined,
): { dbValue: string | null; display: string; error?: string } {
  const sanitized = sanitizeText(value);
  if (!sanitized) {
    return { dbValue: null, display: "" };
  }

  const stripped = sanitized.replace(/[^0-9.,]/g, "").replace(/\s+/g, "");
  if (!stripped) {
    return { dbValue: null, display: "", error: "Ingresá un valor numérico válido." };
  }

  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");
  let normalized = stripped;

  if (lastComma > lastDot) {
    const integerPart = stripped.slice(0, lastComma).replace(/[^0-9]/g, "");
    const decimalPart = stripped.slice(lastComma + 1).replace(/[^0-9]/g, "");
    normalized = decimalPart ? `${integerPart}.${decimalPart.slice(0, 2)}` : integerPart;
  } else if (lastDot > lastComma) {
    const integerPart = stripped.slice(0, lastDot).replace(/[^0-9]/g, "");
    const decimalPart = stripped.slice(lastDot + 1).replace(/[^0-9]/g, "");
    normalized = decimalPart ? `${integerPart}.${decimalPart.slice(0, 2)}` : integerPart;
  } else {
    normalized = stripped.replace(/[^0-9]/g, "");
  }

  if (!normalized) {
    return { dbValue: null, display: "", error: "Ingresá un valor numérico válido." };
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return { dbValue: null, display: "", error: "Ingresá un valor numérico válido." };
  }

  if (numeric < 0) {
    return { dbValue: null, display: "", error: "El valor no puede ser negativo." };
  }

  const dbValue = numeric.toFixed(2);
  const display = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(numeric);
  return { dbValue, display };
}

async function recordChanges(
  supabase: Awaited<ReturnType<typeof createSupabaseServerRoute>>,
  playerId: string,
  userId: string | undefined,
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

function mapPostgrestError(error: PostgrestError | null): string {
  if (!error) return "Error desconocido";
  if (error.code === "42501") {
    return "No tenés permisos para modificar este perfil.";
  }
  return error.message ?? "No fue posible completar la operación.";
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

  return { supabase, error: null, userId: user.id } as const;
}

function isMissingCareerSchema(error: PostgrestError | null) {
  return error?.code === "42P01";
}

export async function updateSportProfile(
  input: z.infer<typeof sportProfileSchema>,
): Promise<FormActionResult<SportProfileResponse>> {
  const parsed = sportProfileSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Revisá los datos ingresados e intentá nuevamente.",
      fieldErrors: {
        foot: errors.foot?.[0],
        contractStatus: errors.contractStatus?.[0],
      },
    };
  }

  const ownership = await ensureAuthenticatedPlayer(parsed.data.playerId);
  if (ownership.error) {
    return { success: false, message: ownership.error };
  }

  const { data: profileBefore, error: fetchError } = await ownership.supabase
    .from("player_profiles")
    .select("positions, current_club, foot, contract_status")
    .eq("id", parsed.data.playerId)
    .maybeSingle<{
      positions: string[] | null;
      current_club: string | null;
      foot: string | null;
      contract_status: string | null;
    }>();

  if (fetchError) {
    return { success: false, message: mapPostgrestError(fetchError) };
  }

  if (!profileBefore) {
    return { success: false, message: "No encontramos el perfil indicado." };
  }

  const foot = sanitizeText(parsed.data.foot);
  const contractStatus = sanitizeText(parsed.data.contractStatus);

  const changes: ChangeLogEntry[] = [];
  const updatedFields = new Set<string>();

  if ((profileBefore.foot ?? null) !== (foot ?? null)) {
    changes.push({ field: "foot", oldValue: profileBefore.foot, newValue: foot });
    updatedFields.add("Perfil dominante");
  }

  if ((profileBefore.contract_status ?? null) !== (contractStatus ?? null)) {
    changes.push({
      field: "contract_status",
      oldValue: profileBefore.contract_status,
      newValue: contractStatus,
    });
    updatedFields.add("Situación contractual");
  }

  const { error: updateError } = await ownership.supabase
    .from("player_profiles")
    .update({ foot, contract_status: contractStatus })
    .eq("id", parsed.data.playerId);

  if (updateError) {
    return { success: false, message: mapPostgrestError(updateError) };
  }

  await recordChanges(ownership.supabase, parsed.data.playerId, ownership.userId, changes);
  revalidatePath(DASHBOARD_ROUTE);

  return {
    success: true,
    data: {
      positions: formatPositions(profileBefore.positions),
      foot: foot ?? "",
      currentClub: sanitizeText(profileBefore.current_club) ?? "",
      contractStatus: contractStatus ?? "",
    },
    message: "Perfil deportivo actualizado correctamente.",
    updatedFields: Array.from(updatedFields),
  };
}

export async function updateMarketProjection(
  input: z.infer<typeof marketProjectionSchema>,
): Promise<FormActionResult<MarketProjectionResponse>> {
  const parsed = marketProjectionSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Revisá los datos ingresados e intentá nuevamente.",
      fieldErrors: {
        marketValue: errors.marketValue?.[0],
        careerObjectives: errors.careerObjectives?.[0],
      },
    };
  }

  const ownership = await ensureAuthenticatedPlayer(parsed.data.playerId);
  if (ownership.error) {
    return { success: false, message: ownership.error };
  }

  const { data: profileBefore, error: fetchError } = await ownership.supabase
    .from("player_profiles")
    .select("market_value_eur, career_objectives")
    .eq("id", parsed.data.playerId)
    .maybeSingle<{ market_value_eur: string | number | null; career_objectives: string | null }>();

  if (fetchError) {
    if (isMissingCareerSchema(fetchError)) {
      return {
        success: false,
        message: RUN_CAREER_SCRIPT_MESSAGE,
      };
    }

    return { success: false, message: mapPostgrestError(fetchError) };
  }

  if (!profileBefore) {
    return { success: false, message: "No encontramos el perfil indicado." };
  }

  const parsedMarketValue = parseMarketValue(parsed.data.marketValue ?? null);
  if (parsedMarketValue.error) {
    return {
      success: false,
      message: parsedMarketValue.error,
      fieldErrors: { marketValue: parsedMarketValue.error },
    };
  }

  const careerObjectives = sanitizeText(parsed.data.careerObjectives);

  const previousMarketValue =
    profileBefore.market_value_eur === null || profileBefore.market_value_eur === undefined
      ? null
      : Number(profileBefore.market_value_eur);
  const nextMarketValue = parsedMarketValue.dbValue === null ? null : Number(parsedMarketValue.dbValue);

  const changes: ChangeLogEntry[] = [];
  const updatedFields = new Set<string>();

  if (previousMarketValue !== nextMarketValue) {
    changes.push({
      field: "market_value_eur",
      oldValue: profileBefore.market_value_eur,
      newValue: parsedMarketValue.dbValue,
    });
    updatedFields.add("Valor de mercado");
  }

  if ((profileBefore.career_objectives ?? null) !== (careerObjectives ?? null)) {
    changes.push({
      field: "career_objectives",
      oldValue: profileBefore.career_objectives,
      newValue: careerObjectives,
    });
    updatedFields.add("Objetivos de carrera");
  }

  const { error: updateError } = await ownership.supabase
    .from("player_profiles")
    .update({
      market_value_eur: parsedMarketValue.dbValue,
      career_objectives: careerObjectives,
    })
    .eq("id", parsed.data.playerId);

  if (updateError) {
    if (isMissingCareerSchema(updateError)) {
      return {
        success: false,
        message: RUN_CAREER_SCRIPT_MESSAGE,
      };
    }

    return { success: false, message: mapPostgrestError(updateError) };
  }

  await recordChanges(ownership.supabase, parsed.data.playerId, ownership.userId, changes);
  revalidatePath(DASHBOARD_ROUTE);

  return {
    success: true,
    data: {
      marketValue: parsedMarketValue.display,
      careerObjectives: careerObjectives ?? "",
    },
    message: "Valor de mercado actualizado correctamente.",
    updatedFields: Array.from(updatedFields),
  };
}

export async function upsertPlayerLink(input: LinkMutationInput): Promise<ActionResult> {
  const parsed = linkMutationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá los datos del enlace e intentá nuevamente." };
  }

  const { supabase, error } = await ensureAuthenticatedPlayer(parsed.data.playerId);
  if (error) {
    return { success: false, message: error };
  }

  const payload = {
    label: parsed.data.label,
    url: parsed.data.url,
    kind: parsed.data.kind,
    is_primary: parsed.data.isPrimary ?? false,
    metadata: parsed.data.metadata ?? null,
  };

  let mutationError: PostgrestError | null = null;

  if (parsed.data.id) {
    const { error: updateError } = await supabase
      .from("player_links")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("player_id", parsed.data.playerId);
    mutationError = updateError;
  } else {
    const { error: insertError } = await supabase
      .from("player_links")
      .insert({ ...payload, player_id: parsed.data.playerId });
    mutationError = insertError;
  }

  if (mutationError) {
    return { success: false, message: mapPostgrestError(mutationError) };
  }

  revalidatePath(DASHBOARD_ROUTE);
  return { success: true };
}

export async function deletePlayerLink(input: { id: string; playerId: string }): Promise<ActionResult> {
  const { supabase, error } = await ensureAuthenticatedPlayer(input.playerId);
  if (error) {
    return { success: false, message: error };
  }

  const { error: deleteError } = await supabase
    .from("player_links")
    .delete()
    .eq("id", input.id)
    .eq("player_id", input.playerId);

  if (deleteError) {
    return { success: false, message: mapPostgrestError(deleteError) };
  }

  revalidatePath(DASHBOARD_ROUTE);
  return { success: true };
}

export async function upsertPlayerHonour(input: HonourMutationInput): Promise<ActionResult> {
  const parsed = honourMutationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá los datos del logro e intentá nuevamente." };
  }

  const { supabase, error } = await ensureAuthenticatedPlayer(parsed.data.playerId);
  if (error) {
    return { success: false, message: error };
  }

  const payload = {
    title: parsed.data.title,
    competition: parsed.data.competition,
    season: parsed.data.season,
    awarded_on: parsed.data.awardedOn,
    description: parsed.data.description,
    career_item_id: parsed.data.careerItemId,
  };

  let mutationError: PostgrestError | null = null;

  if (parsed.data.id) {
    const { error: updateError } = await supabase
      .from("player_honours")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("player_id", parsed.data.playerId);
    mutationError = updateError;
  } else {
    const { error: insertError } = await supabase
      .from("player_honours")
      .insert({ ...payload, player_id: parsed.data.playerId });
    mutationError = insertError;
  }

  if (mutationError) {
    return { success: false, message: mapPostgrestError(mutationError) };
  }

  revalidatePath(DASHBOARD_ROUTE);
  return { success: true };
}

export async function deletePlayerHonour(input: { id: string; playerId: string }): Promise<ActionResult> {
  const { supabase, error } = await ensureAuthenticatedPlayer(input.playerId);
  if (error) {
    return { success: false, message: error };
  }

  const { error: deleteError } = await supabase
    .from("player_honours")
    .delete()
    .eq("id", input.id)
    .eq("player_id", input.playerId);

  if (deleteError) {
    return { success: false, message: mapPostgrestError(deleteError) };
  }

  revalidatePath(DASHBOARD_ROUTE);
  return { success: true };
}

export async function upsertSeasonStat(input: SeasonStatMutationInput): Promise<ActionResult> {
  const parsed = seasonStatMutationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá los datos estadísticos e intentá nuevamente." };
  }

  const { supabase, error } = await ensureAuthenticatedPlayer(parsed.data.playerId);
  if (error) {
    return { success: false, message: error };
  }

  let duplicateCheck = supabase
    .from("stats_seasons")
    .select("id")
    .eq("player_id", parsed.data.playerId)
    .eq("season", parsed.data.season)
    .limit(1);

  if (parsed.data.id) {
    duplicateCheck = duplicateCheck.neq("id", parsed.data.id);
  }

  const { data: duplicateRows, error: duplicateError } = await duplicateCheck;

  if (duplicateError) {
    return { success: false, message: mapPostgrestError(duplicateError) };
  }

  if (duplicateRows && duplicateRows.length > 0) {
    return {
      success: false,
      message: "Ya cargaste estadísticas para esa temporada. Editá la fila existente o eliminála antes de crear otra.",
    };
  }

  const payload = {
    season: parsed.data.season,
    competition: parsed.data.competition,
    team: parsed.data.team,
    matches: parsed.data.matches,
    minutes: parsed.data.minutes,
    goals: parsed.data.goals,
    assists: parsed.data.assists,
    yellow_cards: parsed.data.yellowCards,
    red_cards: parsed.data.redCards,
    career_item_id: parsed.data.careerItemId,
  };

  let mutationError: PostgrestError | null = null;

  if (parsed.data.id) {
    const { error: updateError } = await supabase
      .from("stats_seasons")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("player_id", parsed.data.playerId);
    mutationError = updateError;
  } else {
    const { error: insertError } = await supabase
      .from("stats_seasons")
      .insert({ ...payload, player_id: parsed.data.playerId });
    mutationError = insertError;
  }

  if (mutationError) {
    return { success: false, message: mapPostgrestError(mutationError) };
  }

  revalidatePath(DASHBOARD_ROUTE);
  return { success: true };
}

export async function deleteSeasonStat(input: { id: string; playerId: string }): Promise<ActionResult> {
  const { supabase, error } = await ensureAuthenticatedPlayer(input.playerId);
  if (error) {
    return { success: false, message: error };
  }

  const { error: deleteError } = await supabase
    .from("stats_seasons")
    .delete()
    .eq("id", input.id)
    .eq("player_id", input.playerId);

  if (deleteError) {
    return { success: false, message: mapPostgrestError(deleteError) };
  }

  revalidatePath(DASHBOARD_ROUTE);
  return { success: true };
}

type NormalizedStage = {
  club: string;
  division: string | null;
  start_year: number | null;
  end_year: number | null;
  team_id: string | null;
  proposed_team: CareerStageInput["proposedTeam"];
  original_item_id: string | null;
};

function normalizeStage(input: CareerStageInput): NormalizedStage {
  return {
    club: input.club,
    division: input.division ?? null,
    start_year: input.startYear ?? null,
    end_year: input.endYear ?? null,
    team_id: input.teamId ?? null,
    proposed_team: input.proposedTeam ?? null,
    original_item_id: input.originalId ?? null,
  };
}

export async function submitCareerRevision(
  input: CareerRevisionSubmissionInput,
): Promise<ActionResult> {
  const parsed = careerRevisionSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Revisá las etapas confirmadas e intentá nuevamente." };
  }

  const { supabase, error, userId } = await ensureAuthenticatedPlayer(parsed.data.playerId);
  if (error || !userId) {
    return { success: false, message: error ?? "No fue posible validar la sesión." };
  }

  const { data: pendingRequest, error: pendingError } = await supabase
    .from("career_revision_requests")
    .select("id, status")
    .eq("player_id", parsed.data.playerId)
    .eq("submitted_by_user_id", userId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle<{ id: string; status: string }>();

  if (pendingError) {
    if (isMissingCareerSchema(pendingError)) {
      return { success: false, message: RUN_CAREER_SCRIPT_MESSAGE };
    }
    return { success: false, message: mapPostgrestError(pendingError) };
  }

  if (pendingRequest) {
    return { success: false, message: "Ya tenés una solicitud pendiente de revisión." };
  }

  let snapshot: unknown[] = [];
  const { data: snapshotData, error: snapshotError } = await supabase
    .from("career_items")
    .select("id, club, division, start_date, end_date, team_id")
    .eq("player_id", parsed.data.playerId)
    .order("start_date", { ascending: false });

  if (snapshotError) {
    return { success: false, message: mapPostgrestError(snapshotError) };
  }

  snapshot = snapshotData ?? [];

  const { data: requestRow, error: requestError } = await supabase
    .from("career_revision_requests")
    .insert({
      player_id: parsed.data.playerId,
      submitted_by_user_id: userId,
      current_snapshot: snapshot,
      change_summary: parsed.data.note,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (requestError) {
    if (isMissingCareerSchema(requestError)) {
      return { success: false, message: RUN_CAREER_SCRIPT_MESSAGE };
    }
    return { success: false, message: mapPostgrestError(requestError) };
  }

  if (!requestRow) {
    return { success: false, message: "No fue posible registrar la solicitud." };
  }

  const requestId = requestRow.id;

  const cleanup = async () => {
    await supabase.from("career_revision_requests").delete().eq("id", requestId);
  };

  for (const [index, stageInput] of parsed.data.items.entries()) {
    const stage = normalizeStage(stageInput);
    let proposedTeamId: string | null = null;

    if (stage.proposed_team) {
      const { data: proposedRow, error: proposedError } = await supabase
        .from("career_revision_proposed_teams")
        .insert({
          request_id: requestId,
          name: stage.proposed_team.name,
          country_code: stage.proposed_team.countryCode,
          country_name: stage.proposed_team.countryName,
          transfermarkt_url: stage.proposed_team.transfermarktUrl,
        })
        .select("id")
        .maybeSingle<{ id: string }>();

      if (proposedError) {
        if (isMissingCareerSchema(proposedError)) {
          await cleanup();
          return { success: false, message: RUN_CAREER_SCRIPT_MESSAGE };
        }
        await cleanup();
        return { success: false, message: mapPostgrestError(proposedError) };
      }

      proposedTeamId = proposedRow?.id ?? null;
    }

    const { error: itemError } = await supabase
      .from("career_revision_items")
      .insert({
        request_id: requestId,
        original_item_id: stage.original_item_id,
        club: stage.club,
        division: stage.division,
        start_year: stage.start_year,
        end_year: stage.end_year,
        team_id: stage.team_id,
        proposed_team_id: proposedTeamId,
        order_index: index,
      });

    if (itemError) {
      if (isMissingCareerSchema(itemError)) {
        await cleanup();
        return { success: false, message: RUN_CAREER_SCRIPT_MESSAGE };
      }
      await cleanup();
      return { success: false, message: mapPostgrestError(itemError) };
    }
  }

  revalidatePath(DASHBOARD_ROUTE);
  return { success: true, requestId };
}
