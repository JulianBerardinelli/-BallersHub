"use server";

import { revalidatePath } from "next/cache";
import { type PostgrestError } from "@supabase/supabase-js";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import {
  linkMutationSchema,
  honourMutationSchema,
  seasonStatMutationSchema,
  type LinkMutationInput,
  type HonourMutationInput,
  type SeasonStatMutationInput,
} from "./schemas";

const DASHBOARD_ROUTE = "/dashboard/edit-profile/football-data";

type ActionResult =
  | { success: true }
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

  return { supabase, error: null } as const;
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
