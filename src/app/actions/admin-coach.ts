"use server";

// Admin coach CRUD — direct, review-bypassing edits of ANY coach's profile.
// Gated to role='admin' (ensureAdminActor) and written with the service-role
// client. Mirrors the player admin edit convention.

import { z } from "zod";
import { ensureAdminActor } from "@/lib/admin/auth";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import { revalidatePath } from "next/cache";

const optText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .nullable();

const schema = z.object({
  coachId: z.string().uuid(),
  fullName: z.string().trim().min(2, "Nombre muy corto.").max(160),
  roleTitle: optText(120),
  currentClub: optText(160),
  bio: optText(6000),
  playingStyle: optText(6000),
  methodologyAnalysis: optText(8000),
  careerObjectives: optText(5000),
  preferredFormations: z.array(z.string().trim().max(20)).max(10).optional().default([]),
  status: z.enum(["draft", "pending_review", "approved", "rejected"]),
  visibility: z.enum(["public", "private"]),
});

export type AdminCoachProfileInput = z.input<typeof schema>;

export async function adminUpdateCoachProfile(
  input: AdminCoachProfileInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;
  const d = parsed.data;

  const { data: before } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", d.coachId)
    .maybeSingle<{ slug: string | null }>();

  const { error } = await admin
    .from("coach_profiles")
    .update({
      full_name: d.fullName,
      role_title: d.roleTitle,
      current_club: d.currentClub,
      bio: d.bio,
      playing_style: d.playingStyle,
      methodology_analysis: d.methodologyAnalysis,
      career_objectives: d.careerObjectives,
      preferred_formations: d.preferredFormations,
      status: d.status,
      visibility: d.visibility,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.coachId);

  if (error) return { success: false, message: error.message };

  if (before?.slug) revalidateCoachPublicProfile(before.slug);
  revalidatePath(`/admin/coaches/${d.coachId}/edit`);
  revalidatePath("/admin/coaches");
  return { success: true };
}

// ─────────────────────────── trayectoria + stats ───────────────────────────

const intField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return 0;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  });

const yearField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    return Number.isFinite(n) ? Math.trunc(n) : null;
  })
  .nullable();

const careerSchema = z.object({
  coachId: z.string().uuid(),
  items: z
    .array(
      z.object({
        club: z.string().trim().min(1, "Club requerido."),
        roleTitle: optText(120),
        division: optText(120),
        startYear: yearField,
        endYear: yearField,
      }),
    )
    .max(60),
  stats: z
    .array(
      z.object({
        season: z.string().trim().min(1, "Temporada requerida."),
        team: optText(120),
        competition: optText(120),
        matches: intField,
        wins: intField,
        draws: intField,
        losses: intField,
        goalsFor: intField,
        goalsAgainst: intField,
      }),
    )
    .max(120),
});

export type AdminCoachCareerInput = z.input<typeof careerSchema>;

const toStartDate = (y: number | null) => (y ? `${y}-01-01` : null);
const toEndDate = (y: number | null) => (y ? `${y}-12-31` : null);

// Direct (review-bypassing) replace of a coach's trayectoria + season stats.
// Mirrors the career-revision approve route's materialization, but writes the
// proposed set straight to the live tables. insert-new-then-delete-old so a
// failed insert never leaves the coach with an empty trayectoria.
export async function adminReplaceCoachCareer(
  input: AdminCoachCareerInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = careerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;
  const { coachId, items, stats } = parsed.data;

  const { data: oldCareer } = await admin.from("coach_career_items").select("id").eq("coach_id", coachId);
  const oldCareerIds = (oldCareer ?? []).map((r) => r.id as string);
  if (items.length > 0) {
    const { error } = await admin.from("coach_career_items").insert(
      items.map((it) => ({
        coach_id: coachId,
        club: it.club,
        role_title: it.roleTitle,
        division: it.division,
        start_date: toStartDate(it.startYear),
        end_date: toEndDate(it.endYear),
      })),
    );
    if (error) return { success: false, message: `Trayectoria: ${error.message}` };
  }
  if (oldCareerIds.length > 0) await admin.from("coach_career_items").delete().in("id", oldCareerIds);

  const { data: oldStats } = await admin.from("coach_stats_seasons").select("id").eq("coach_id", coachId);
  const oldStatIds = (oldStats ?? []).map((r) => r.id as string);
  if (stats.length > 0) {
    const { error } = await admin.from("coach_stats_seasons").insert(
      stats.map((s) => ({
        coach_id: coachId,
        season: s.season,
        team: s.team,
        competition: s.competition,
        matches: s.matches,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goals_for: s.goalsFor,
        goals_against: s.goalsAgainst,
      })),
    );
    if (error) return { success: false, message: `Estadísticas: ${error.message}` };
  }
  if (oldStatIds.length > 0) await admin.from("coach_stats_seasons").delete().in("id", oldStatIds);

  const openStage = items.find((it) => it.endYear === null);
  const { data: coachRow } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null }>();
  if (openStage) {
    await admin
      .from("coach_profiles")
      .update({ current_club: openStage.club, updated_at: new Date().toISOString() })
      .eq("id", coachId);
  }

  if (coachRow?.slug) revalidateCoachPublicProfile(coachRow.slug);
  revalidatePath(`/admin/coaches/${coachId}/edit/trayectoria`);
  return { success: true };
}

// ─────────────────────────── multimedia ───────────────────────────

export async function adminSetCoachMediaStatus(
  mediaId: string,
  status: "approved" | "rejected",
): Promise<{ success: boolean; message?: string }> {
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;
  const { data: row } = await admin
    .from("coach_media")
    .select("coach_id")
    .eq("id", mediaId)
    .maybeSingle<{ coach_id: string }>();
  const { error } = await admin
    .from("coach_media")
    .update({
      status,
      reviewed_by_user_id: gate.actor.actorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", mediaId);
  if (error) return { success: false, message: error.message };
  if (row?.coach_id) {
    const { data: c } = await admin
      .from("coach_profiles")
      .select("slug")
      .eq("id", row.coach_id)
      .maybeSingle<{ slug: string | null }>();
    if (c?.slug) revalidateCoachPublicProfile(c.slug);
  }
  return { success: true };
}

export async function adminDeleteCoachMedia(
  mediaId: string,
): Promise<{ success: boolean; message?: string }> {
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;
  const { data: row } = await admin
    .from("coach_media")
    .select("coach_id, url")
    .eq("id", mediaId)
    .maybeSingle<{ coach_id: string; url: string | null }>();
  const { error } = await admin.from("coach_media").delete().eq("id", mediaId);
  if (error) return { success: false, message: error.message };
  // Best-effort storage cleanup: derive the object path from the public URL
  // (.../object/public/coach-media/<path>). Only our own uploads match.
  const marker = "/coach-media/";
  const idx = row?.url?.indexOf(marker) ?? -1;
  if (row?.url && idx >= 0) {
    const path = row.url.slice(idx + marker.length).split("?")[0];
    if (path) await admin.storage.from("coach-media").remove([path]);
  }
  if (row?.coach_id) {
    const { data: c } = await admin
      .from("coach_profiles")
      .select("slug")
      .eq("id", row.coach_id)
      .maybeSingle<{ slug: string | null }>();
    if (c?.slug) revalidateCoachPublicProfile(c.slug);
  }
  return { success: true };
}
