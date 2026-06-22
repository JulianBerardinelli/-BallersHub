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
