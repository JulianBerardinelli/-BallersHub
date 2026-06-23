"use server";

import { revalidatePath } from "next/cache";
import { type PostgrestError } from "@supabase/supabase-js";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfileById } from "@/lib/seo/revalidate";
import {
  upsertNationalTeamStintSchema,
  deleteNationalTeamStintSchema,
  reorderNationalTeamStintsSchema,
  type UpsertNationalTeamStintInput,
} from "./schemas";

const DASHBOARD_ROUTE = "/dashboard/edit-profile/national-team";

type ActionResult = { success: true; id?: string } | { success: false; message: string };

function mapPostgrestError(error: PostgrestError): string {
  if (error.code === "42501") return "No tenés permisos para esta acción.";
  if (error.code === "23505") return "Ya existe un registro igual.";
  return error.message ?? "Ocurrió un error inesperado.";
}

// Auth + guard de ownership del player (espeja football-data/actions.ts).
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

/**
 * Crea o actualiza UNA etapa de selección. Status-on-row: toda alta/edición
 * vuelve la fila a `pending_review` y resetea el estado de revisión, así el
 * admin la valida antes de que sea pública. No toca las demás etapas (las ya
 * aprobadas siguen visibles), a diferencia del flujo de trayectoria.
 */
export async function upsertNationalTeamStint(
  input: UpsertNationalTeamStintInput,
): Promise<ActionResult> {
  const parsed = upsertNationalTeamStintSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return { success: false, message: first ?? "Revisá los datos de la etapa." };
  }

  const { playerId, stint } = parsed.data;
  const { supabase, error, userId } = await ensureAuthenticatedPlayer(playerId);
  if (error || !userId) {
    return { success: false, message: error ?? "No fue posible validar la sesión." };
  }

  const fields = {
    team_id: stint.teamId,
    proposed_team_name: stint.proposedTeamName,
    country_code: stint.countryCode,
    age_category: stint.ageCategory,
    participation: stint.participation,
    highlights: stint.highlights && stint.highlights.length > 0 ? stint.highlights : null,
    start_year: stint.startYear,
    end_year: stint.endYear,
    description: stint.description,
    caps: stint.caps,
    goals: stint.goals,
    assists: stint.assists,
    minutes: stint.minutes,
    reference_url: stint.referenceUrl,
  };

  if (stint.id) {
    // Edición: vuelve a pending_review y limpia la revisión anterior.
    const { error: updateError } = await supabase
      .from("national_team_stints")
      .update({
        ...fields,
        status: "pending_review",
        submitted_by_user_id: userId,
        reviewed_by_user_id: null,
        reviewed_at: null,
        resolution_note: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stint.id)
      .eq("player_id", playerId);

    if (updateError) {
      return { success: false, message: mapPostgrestError(updateError) };
    }

    revalidatePath(DASHBOARD_ROUTE);
    await revalidatePlayerPublicProfileById(supabase, playerId);
    return { success: true, id: stint.id };
  }

  // Alta: order_index al final.
  const { data: maxRow } = await supabase
    .from("national_team_stints")
    .select("order_index")
    .eq("player_id", playerId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle<{ order_index: number }>();
  const nextOrder = (maxRow?.order_index ?? -1) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("national_team_stints")
    .insert({
      player_id: playerId,
      ...fields,
      order_index: nextOrder,
      status: "pending_review",
      submitted_by_user_id: userId,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (insertError) {
    return { success: false, message: mapPostgrestError(insertError) };
  }

  revalidatePath(DASHBOARD_ROUTE);
  await revalidatePlayerPublicProfileById(supabase, playerId);
  return { success: true, id: inserted?.id };
}

export async function deleteNationalTeamStint(input: {
  playerId: string;
  id: string;
}): Promise<ActionResult> {
  const parsed = deleteNationalTeamStintSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Datos inválidos." };
  }

  const { playerId, id } = parsed.data;
  const { supabase, error } = await ensureAuthenticatedPlayer(playerId);
  if (error) {
    return { success: false, message: error };
  }

  const { error: deleteError } = await supabase
    .from("national_team_stints")
    .delete()
    .eq("id", id)
    .eq("player_id", playerId);

  if (deleteError) {
    return { success: false, message: mapPostgrestError(deleteError) };
  }

  revalidatePath(DASHBOARD_ROUTE);
  await revalidatePlayerPublicProfileById(supabase, playerId);
  return { success: true, id };
}

export async function reorderNationalTeamStints(input: {
  playerId: string;
  ids: string[];
}): Promise<ActionResult> {
  const parsed = reorderNationalTeamStintsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Orden inválido." };
  }

  const { playerId, ids } = parsed.data;
  const { supabase, error } = await ensureAuthenticatedPlayer(playerId);
  if (error) {
    return { success: false, message: error };
  }

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("national_team_stints")
        .update({ order_index: index })
        .eq("id", id)
        .eq("player_id", playerId),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { success: false, message: mapPostgrestError(failed.error) };
  }

  revalidatePath(DASHBOARD_ROUTE);
  await revalidatePlayerPublicProfileById(supabase, playerId);
  return { success: true };
}
