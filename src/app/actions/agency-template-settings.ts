"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  agencyThemeSettings,
  agencySectionsVisibility,
  userProfiles,
  agencyProfiles,
} from "@/db/schema";

async function resolveManagerAgency() {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!profile || profile.role !== "manager" || !profile.agencyId) {
    throw new Error("Solo un mánager activo de una agencia puede editar la plantilla.");
  }

  return { user, profile, agencyId: profile.agencyId };
}

export async function updateAgencyThemeSettingsAction(payload: {
  layout?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  typography?: string | null;
  heroHeadline?: string | null;
  heroTagline?: string | null;
}) {
  const { agencyId } = await resolveManagerAgency();

  const {
    layout,
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor,
    typography,
    heroHeadline,
    heroTagline,
  } = payload;

  await db
    .insert(agencyThemeSettings)
    .values({
      agencyId,
      layout: layout || "classic",
      primaryColor: primaryColor ?? null,
      secondaryColor: secondaryColor ?? null,
      accentColor: accentColor ?? null,
      backgroundColor: backgroundColor ?? null,
      typography: typography ?? null,
      heroHeadline: heroHeadline ?? null,
      heroTagline: heroTagline ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: agencyThemeSettings.agencyId,
      set: {
        layout: layout,
        primaryColor: primaryColor ?? null,
        secondaryColor: secondaryColor ?? null,
        accentColor: accentColor ?? null,
        backgroundColor: backgroundColor ?? null,
        typography: typography ?? null,
        heroHeadline: heroHeadline ?? null,
        heroTagline: heroTagline ?? null,
        updatedAt: new Date(),
      },
    });

  // Resolve slug for revalidation of the public portfolio.
  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.id, agencyId),
    columns: { slug: true },
  });

  revalidatePath("/dashboard/agency/edit-template/styles");
  revalidatePath("/dashboard/agency/edit-template/structure");
  if (agency?.slug) revalidatePath(`/agency/${agency.slug}`);

  return { success: true };
}

export async function updateAgencySectionVisibilityAction(payload: {
  section: string;
  visible: boolean;
}) {
  const { agencyId } = await resolveManagerAgency();

  const existing = await db.query.agencySectionsVisibility.findFirst({
    where: and(
      eq(agencySectionsVisibility.agencyId, agencyId),
      eq(agencySectionsVisibility.section, payload.section),
    ),
  });

  if (existing) {
    await db
      .update(agencySectionsVisibility)
      .set({ visible: payload.visible, updatedAt: new Date() })
      .where(eq(agencySectionsVisibility.id, existing.id));
  } else {
    await db.insert(agencySectionsVisibility).values({
      agencyId,
      section: payload.section,
      visible: payload.visible,
    });
  }

  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.id, agencyId),
    columns: { slug: true },
  });

  revalidatePath("/dashboard/agency/edit-template/structure");
  if (agency?.slug) revalidatePath(`/agency/${agency.slug}`);

  return { success: true };
}
