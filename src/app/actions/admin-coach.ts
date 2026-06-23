"use server";

// Admin coach CRUD — direct, review-bypassing edits of ANY coach's profile.
// Gated to role='admin' (ensureAdminActor) and written with the service-role
// client. Mirrors the player admin edit convention.

import { z } from "zod";
import { ensureAdminActor } from "@/lib/admin/auth";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import { ensureUniqueTeamSlug, findExistingTeamIdByName, slugify } from "@/lib/admin/teams";
import { revalidatePath } from "next/cache";
import {
  recordAdminCoachEdit,
  sendAdminCoachReviewNotification,
} from "@/lib/admin/coach-notify";
import {
  COACH_ADMIN_EDIT_DOMAINS,
  type CoachAdminEditDomain,
} from "@/lib/admin/coach-edit-sections";
import type { CoachProfileInput } from "./coach-profile";
import type {
  CoachCareerRevisionSubmissionInput,
  CoachCareerActionResult,
} from "./coach-career";
import type { CoachLicenseInput, CoachLicenseActionResult } from "./coach-licenses";
import type {
  CoachTranslationInput,
  CoachTranslationActionResult,
} from "./coach-translations";

const normHexValue = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return /^#[0-9a-fA-F]{6}$/.test(t) ? t.toLowerCase() : null;
};

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

const optUuid = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v ? v : null))
  .nullable();

// Proposed-team payload (team not yet in the catalog). Accepted for shape
// parity with the owner submit; live materialization stores the club text.
const proposedTeamSchema = z
  .object({
    name: z.string().trim().max(160).optional().nullable(),
    countryCode: z.string().trim().max(2).optional().nullable(),
    countryName: z.string().trim().max(120).optional().nullable(),
    transfermarktUrl: z.string().trim().max(500).optional().nullable(),
  })
  .nullable()
  .optional();

const careerSchema = z.object({
  coachId: z.string().uuid(),
  items: z
    .array(
      z.object({
        club: z.string().trim().min(1, "Club requerido."),
        roleTitle: optText(120),
        division: optText(120),
        divisionId: optUuid,
        secondaryDivision: optText(120),
        secondaryDivisionId: optUuid,
        startYear: yearField,
        endYear: yearField,
        teamId: optUuid,
        proposedTeam: proposedTeamSchema,
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

  // Resolve proposed teams → pending catalog teams (same as the revision
  // approve) so an admin live edit also seeds /teams for completion. Deduped by
  // name; existing teams reused.
  const createdTeams = new Map<string, string>();
  const resolved: Array<(typeof items)[number] & { resolvedTeamId: string | null }> = [];
  for (const it of items) {
    let teamId = it.teamId ?? null;
    if (!teamId && it.proposedTeam) {
      const displayName = (it.proposedTeam.name || it.club || "").trim();
      if (displayName) {
        const key = displayName.toLowerCase();
        const cached = createdTeams.get(key);
        if (cached) {
          teamId = cached;
        } else {
          let existing = await findExistingTeamIdByName(displayName, admin);
          if (!existing) {
            const slug = await ensureUniqueTeamSlug(slugify(displayName), admin);
            const ins = await admin
              .from("teams")
              .insert({
                name: displayName,
                slug,
                country: it.proposedTeam.countryName ?? null,
                country_code: it.proposedTeam.countryCode ?? null,
                category: it.division ?? null,
                transfermarkt_url: it.proposedTeam.transfermarktUrl ?? null,
                status: "pending",
                visibility: "public",
                requested_by_user_id: gate.actor.actorId,
              })
              .select("id")
              .single<{ id: string }>();
            if (ins.error) return { success: false, message: `Equipo propuesto: ${ins.error.message}` };
            existing = ins.data.id;
          }
          teamId = existing;
          createdTeams.set(key, existing);
        }
      }
    }
    resolved.push({ ...it, resolvedTeamId: teamId });
  }

  if (resolved.length > 0) {
    const { error } = await admin.from("coach_career_items").insert(
      resolved.map((it) => ({
        coach_id: coachId,
        club: it.club,
        role_title: it.roleTitle,
        division: it.division,
        division_id: it.divisionId ?? null,
        secondary_division: it.secondaryDivision ?? null,
        secondary_division_id: it.secondaryDivisionId ?? null,
        start_date: toStartDate(it.startYear),
        end_date: toEndDate(it.endYear),
        team_id: it.resolvedTeamId,
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

  await recordAdminCoachEdit({
    actor: gate.actor,
    coachId,
    slug: coachRow?.slug ?? null,
    domain: "trayectoria",
    changedFields: ["Trayectoria"],
  });
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
    await recordAdminCoachEdit({
      actor: gate.actor,
      coachId: row.coach_id,
      slug: c?.slug ?? null,
      domain: "multimedia",
      changedFields: ["Multimedia eliminada"],
    });
  }
  return { success: true };
}

// ─────────────────────────── editor reuse (admin) ───────────────────────────
// These mirror the OWNER actions' signatures so the SAME dashboard editor
// components (CoachProfileEditor, CoachCareerManager) can be reused in admin by
// injecting these via .bind(null, coachId) — exactly like the player admin.

// Same shape/return as updateCoachProfile, but service-role + target coachId.
export async function adminUpdateCoachProfileFields(
  coachId: string,
  input: CoachProfileInput,
): Promise<{ success: boolean; error?: string }> {
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, error: gate.error };
  const admin = gate.actor.adminClient;

  const formations = (input.preferredFormations ?? [])
    .map((f) => f.trim())
    .filter((f) => f.length > 0)
    .slice(0, 12);

  const { data: before } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null }>();

  const { error } = await admin
    .from("coach_profiles")
    .update({
      role_title: input.roleTitle?.trim() || null,
      bio: input.bio?.trim() || null,
      career_objectives: input.careerObjectives?.trim() || null,
      playing_style: input.playingStyle?.trim() || null,
      methodology_analysis: input.methodologyAnalysis?.trim() || null,
      preferred_formations: formations.length > 0 ? formations : null,
      ...(input.theme && {
        theme_primary_color: normHexValue(input.theme.primaryColor),
        theme_accent_color: normHexValue(input.theme.accentColor),
        theme_background_color: normHexValue(input.theme.backgroundColor),
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", coachId);
  if (error) return { success: false, error: error.message };

  await recordAdminCoachEdit({
    actor: gate.actor,
    coachId,
    slug: before?.slug ?? null,
    domain: "datos",
    changedFields: ["Datos del perfil"],
  });
  return { success: true };
}

// Same input/return as submitCoachCareerRevision, but writes LIVE (no revision).
export async function adminSubmitCoachCareerLive(
  input: CoachCareerRevisionSubmissionInput,
): Promise<CoachCareerActionResult> {
  return adminReplaceCoachCareer({
    coachId: input.coachId,
    items: (input.items ?? []).map((s) => ({
      club: s.club,
      roleTitle: s.roleTitle,
      division: s.division,
      divisionId: s.divisionId ?? null,
      secondaryDivision: s.secondaryDivision ?? null,
      secondaryDivisionId: s.secondaryDivisionId ?? null,
      startYear: s.startYear,
      endYear: s.endYear,
      teamId: s.teamId ?? null,
      proposedTeam: s.proposedTeam ?? null,
    })),
    stats: (input.stats ?? []).map((s) => ({
      season: s.season,
      team: s.team,
      competition: s.competition,
      matches: s.matches,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
    })),
  });
}

// Status + visibility only (admin meta the owner editor doesn't expose).
export async function adminSetCoachStatus(
  coachId: string,
  status: "draft" | "pending_review" | "approved" | "rejected",
  visibility: "public" | "private",
): Promise<{ success: boolean; message?: string }> {
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;
  const { data: before } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null }>();
  const { error } = await admin
    .from("coach_profiles")
    .update({ status, visibility, updated_at: new Date().toISOString() })
    .eq("id", coachId);
  if (error) return { success: false, message: error.message };
  if (before?.slug) revalidateCoachPublicProfile(before.slug);
  revalidatePath(`/admin/coaches/${coachId}/edit`);
  revalidatePath("/admin/coaches");
  return { success: true };
}

// ─────────────────────────── licencias (admin, live) ───────────────────────────
// Mirrors upsertCoachLicense's signature so CoachLicensesManager can reuse it,
// but service-role + target coachId + writes the credential APPROVED directly
// (admin is the moderator → bypasses the pre-moderation queue).

const adminLicenseSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, "Mínimo 2 caracteres.").max(160),
  issuer: optText(120),
  awardedYear: yearField,
  expiresYear: yearField,
  docUrl: z
    .union([z.string().trim().url("Link inválido."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .refine((v) => v === null || /^https?:\/\//i.test(v), {
      message: "El enlace debe empezar con http:// o https://.",
    }),
});

export async function adminUpsertCoachLicense(
  coachId: string,
  input: CoachLicenseInput,
): Promise<CoachLicenseActionResult> {
  const parsed = adminLicenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;
  const d = parsed.data;

  const { data: coach } = await admin
    .from("coach_profiles")
    .select("slug, user_id")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null; user_id: string | null }>();

  const payload = {
    title: d.title,
    issuer: d.issuer,
    awarded_year: d.awardedYear,
    expires_year: d.expiresYear,
    doc_url: d.docUrl,
    status: "approved" as const,
    reviewed_by_user_id: gate.actor.actorId,
    reviewed_at: new Date().toISOString(),
    rejection_reason: null,
    updated_at: new Date().toISOString(),
  };

  let licenseId = d.id ?? null;
  if (d.id) {
    const { data, error } = await admin
      .from("coach_licenses")
      .update(payload)
      .eq("id", d.id)
      .eq("coach_id", coachId)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "No se encontró la licencia." };
    licenseId = data.id;
  } else {
    const { data: maxRow } = await admin
      .from("coach_licenses")
      .select("position")
      .eq("coach_id", coachId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle<{ position: number }>();
    const nextPosition = (maxRow?.position ?? -1) + 1;
    const { data, error } = await admin
      .from("coach_licenses")
      .insert({ ...payload, coach_id: coachId, position: nextPosition })
      .select("id")
      .single<{ id: string }>();
    if (error) return { success: false, message: error.message };
    licenseId = data.id;
  }

  await recordAdminCoachEdit({
    actor: gate.actor,
    coachId,
    targetUserId: coach?.user_id ?? null,
    slug: coach?.slug ?? null,
    domain: "licencias",
    changedFields: [d.title],
  });
  return { success: true, id: licenseId ?? undefined };
}

export async function adminDeleteCoachLicense(
  coachId: string,
  id: string,
): Promise<CoachLicenseActionResult> {
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;
  const { data: coach } = await admin
    .from("coach_profiles")
    .select("slug, user_id")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null; user_id: string | null }>();
  const { error } = await admin
    .from("coach_licenses")
    .delete()
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { success: false, message: error.message };
  await recordAdminCoachEdit({
    actor: gate.actor,
    coachId,
    targetUserId: coach?.user_id ?? null,
    slug: coach?.slug ?? null,
    domain: "licencias",
    changedFields: ["Licencia eliminada"],
  });
  return { success: true };
}

// ─────────────────────────── idiomas (admin) ───────────────────────────
// Mirrors saveCoachTranslation/deleteCoachTranslation, service-role + target
// coachId. The admin idiomas PAGE gates Pro by the target's plan (like the
// player Pro sections); the action itself just writes.

const adminTranslationSchema = z.object({
  locale: z.enum(["en", "it", "pt"]),
  bio: optText(5000),
  careerObjectives: optText(5000),
  playingStyle: optText(5000),
  methodologyAnalysis: optText(5000),
  analysisAuthor: optText(5000),
});

export async function adminSaveCoachTranslation(
  coachId: string,
  input: CoachTranslationInput,
): Promise<CoachTranslationActionResult> {
  const parsed = adminTranslationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;
  const { locale, bio, careerObjectives, playingStyle, methodologyAnalysis, analysisAuthor } =
    parsed.data;

  const { data: coach } = await admin
    .from("coach_profiles")
    .select("slug, user_id")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null; user_id: string | null }>();

  const allEmpty =
    !bio && !careerObjectives && !playingStyle && !methodologyAnalysis && !analysisAuthor;
  if (allEmpty) {
    const { error } = await admin
      .from("coach_profile_translations")
      .delete()
      .eq("coach_id", coachId)
      .eq("locale", locale);
    if (error) return { success: false, message: error.message };
  } else {
    const { error } = await admin.from("coach_profile_translations").upsert(
      {
        coach_id: coachId,
        locale,
        bio,
        career_objectives: careerObjectives,
        playing_style: playingStyle,
        methodology_analysis: methodologyAnalysis,
        analysis_author: analysisAuthor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "coach_id,locale" },
    );
    if (error) return { success: false, message: error.message };
  }

  await recordAdminCoachEdit({
    actor: gate.actor,
    coachId,
    targetUserId: coach?.user_id ?? null,
    slug: coach?.slug ?? null,
    domain: "idiomas",
    changedFields: [`Traducción ${locale.toUpperCase()}`],
  });
  return { success: true };
}

export async function adminDeleteCoachTranslation(
  coachId: string,
  locale: "en" | "it" | "pt",
): Promise<CoachTranslationActionResult> {
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;
  const { data: coach } = await admin
    .from("coach_profiles")
    .select("slug, user_id")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null; user_id: string | null }>();
  const { error } = await admin
    .from("coach_profile_translations")
    .delete()
    .eq("coach_id", coachId)
    .eq("locale", locale);
  if (error) return { success: false, message: error.message };
  await recordAdminCoachEdit({
    actor: gate.actor,
    coachId,
    targetUserId: coach?.user_id ?? null,
    slug: coach?.slug ?? null,
    domain: "idiomas",
    changedFields: [`Traducción ${locale.toUpperCase()} despublicada`],
  });
  return { success: true };
}

// ─────────────────────────── finalizar revisión ───────────────────────────
// The deliberate "close + note" per section: saves already applied live; THIS
// sends the email + in-app notification with the admin's note to the coach.

export async function adminFinalizeCoachReview(input: {
  coachId: string;
  domain: CoachAdminEditDomain;
  note: string;
}): Promise<{ success: boolean; message?: string }> {
  const note = (input.note ?? "").trim();
  if (!note) return { success: false, message: "Escribí una nota para el entrenador." };
  if (note.length > 1000) {
    return { success: false, message: "La nota es demasiado larga (máx. 1000 caracteres)." };
  }
  if (!COACH_ADMIN_EDIT_DOMAINS.includes(input.domain)) {
    return { success: false, message: "Sección inválida." };
  }
  const gate = await ensureAdminActor();
  if (!gate.ok) return { success: false, message: gate.error };
  const admin = gate.actor.adminClient;

  const { data: coach } = await admin
    .from("coach_profiles")
    .select("user_id, full_name")
    .eq("id", input.coachId)
    .maybeSingle<{ user_id: string | null; full_name: string | null }>();
  if (!coach?.user_id) return { success: false, message: "No encontramos el perfil indicado." };

  await sendAdminCoachReviewNotification({
    actor: gate.actor,
    coachId: input.coachId,
    targetUserId: coach.user_id,
    coachName: coach.full_name ?? "",
    domain: input.domain,
    note,
  });
  return { success: true };
}
