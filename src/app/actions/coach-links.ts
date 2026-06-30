"use server";

// Enlaces externos del coach — actions owner + admin.
// - Owner: corren con el cliente de cookies, RLS (coach_links_manage_owner) es
//   el gate. Sin moderación: los links del coach se publican al instante (como
//   los de player_links).
// - Admin (service-role + admin gate) sirve para que `liveMode=true` en el
//   editor admin escriba directo en otro coach.

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { ensureAdminActor } from "@/lib/admin/auth";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import {
  coachLinkMutationSchema,
  type CoachLinkMutationInput,
} from "@/lib/coach/links";

export type CoachLinkActionResult = {
  success: boolean;
  message?: string;
  id?: string;
};

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

// ───────────────────────── owner ─────────────────────────

export async function upsertCoachLink(
  input: CoachLinkMutationInput,
): Promise<CoachLinkActionResult> {
  const parsed = coachLinkMutationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;
  const d = parsed.data;

  const payload = {
    label: d.label,
    url: d.url,
    kind: d.kind,
    is_primary: d.isPrimary ?? false,
  };

  let linkId = d.id ?? null;
  if (d.id) {
    const { data, error } = await supabase
      .from("coach_links")
      .update(payload)
      .eq("id", d.id)
      .eq("coach_id", coach.id)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "No encontramos el enlace." };
    linkId = data.id;
  } else {
    const { data, error } = await supabase
      .from("coach_links")
      .insert({ ...payload, coach_id: coach.id })
      .select("id")
      .single<{ id: string }>();
    if (error) return { success: false, message: error.message };
    linkId = data.id;
  }

  revalidatePath("/dashboard/coach/links");
  revalidateCoachPublicProfile(coach.slug);
  return { success: true, id: linkId ?? undefined };
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteCoachLink(input: {
  id: string;
}): Promise<CoachLinkActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Identificador inválido." };

  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;

  const { error } = await supabase
    .from("coach_links")
    .delete()
    .eq("id", parsed.data.id)
    .eq("coach_id", coach.id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard/coach/links");
  revalidateCoachPublicProfile(coach.slug);
  return { success: true };
}

// ───────────────────────── admin (live mode) ─────────────────────────

export async function adminUpsertCoachLink(
  coachId: string,
  input: CoachLinkMutationInput,
): Promise<CoachLinkActionResult> {
  const parsed = coachLinkMutationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;
  const d = parsed.data;

  const { data: coach } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null }>();

  const payload = {
    label: d.label,
    url: d.url,
    kind: d.kind,
    is_primary: d.isPrimary ?? false,
  };

  let linkId = d.id ?? null;
  if (d.id) {
    const { data, error } = await admin
      .from("coach_links")
      .update(payload)
      .eq("id", d.id)
      .eq("coach_id", coachId)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "No encontramos el enlace." };
    linkId = data.id;
  } else {
    const { data, error } = await admin
      .from("coach_links")
      .insert({ ...payload, coach_id: coachId })
      .select("id")
      .single<{ id: string }>();
    if (error) return { success: false, message: error.message };
    linkId = data.id;
  }

  if (coach?.slug) revalidateCoachPublicProfile(coach.slug);
  revalidatePath(`/admin/coaches/${coachId}/edit/enlaces`);
  return { success: true, id: linkId ?? undefined };
}

export async function adminDeleteCoachLink(
  coachId: string,
  input: { id: string },
): Promise<CoachLinkActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Identificador inválido." };

  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;

  const { data: coach } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null }>();

  const { error } = await admin
    .from("coach_links")
    .delete()
    .eq("id", parsed.data.id)
    .eq("coach_id", coachId);
  if (error) return { success: false, message: error.message };

  if (coach?.slug) revalidateCoachPublicProfile(coach.slug);
  revalidatePath(`/admin/coaches/${coachId}/edit/enlaces`);
  return { success: true };
}
