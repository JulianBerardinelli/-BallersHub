"use server";

import { revalidatePath } from "next/cache";
import { type PostgrestError } from "@supabase/supabase-js";

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

type ActionResult =
  | { success: true; requestId?: string }
  | { success: false; message: string };

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
