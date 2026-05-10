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
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";

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

  return { supabase, user, profile, agencyId: profile.agencyId };
}

const VALID_LAYOUTS = ["classic", "pro"] as const;
type ValidLayout = (typeof VALID_LAYOUTS)[number];

function normalizeAgencyLayout(value: string | undefined): ValidLayout {
  return value === "pro" ? "pro" : "classic";
}

export async function updateAgencyThemeSettingsAction(payload: {
  layout?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  heroHeadline?: string | null;
  heroTagline?: string | null;
}) {
  const { supabase, user, agencyId } = await resolveManagerAgency();

  // Plan-aware coercion: a Free Agency cannot persist `layout: 'pro'` nor
  // custom colors/hero. We coerce silently.
  const dashboardState = await fetchDashboardState(supabase, user.id);
  const access = resolvePlanAccess(dashboardState.subscription);

  const requestedLayout = normalizeAgencyLayout(payload.layout);
  const layout: ValidLayout = access.isPro ? requestedLayout : "classic";

  const persisted = access.isPro
    ? {
        primaryColor: payload.primaryColor ?? null,
        secondaryColor: payload.secondaryColor ?? null,
        accentColor: payload.accentColor ?? null,
        backgroundColor: payload.backgroundColor ?? null,
        heroHeadline: payload.heroHeadline ?? null,
        heroTagline: payload.heroTagline ?? null,
      }
    : {
        primaryColor: null,
        secondaryColor: null,
        accentColor: null,
        backgroundColor: null,
        heroHeadline: null,
        heroTagline: null,
      };

  await db
    .insert(agencyThemeSettings)
    .values({
      agencyId,
      layout,
      primaryColor: persisted.primaryColor,
      secondaryColor: persisted.secondaryColor,
      accentColor: persisted.accentColor,
      backgroundColor: persisted.backgroundColor,
      typography: null,
      heroHeadline: persisted.heroHeadline,
      heroTagline: persisted.heroTagline,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: agencyThemeSettings.agencyId,
      set: {
        layout,
        primaryColor: persisted.primaryColor,
        secondaryColor: persisted.secondaryColor,
        accentColor: persisted.accentColor,
        backgroundColor: persisted.backgroundColor,
        typography: null,
        heroHeadline: persisted.heroHeadline,
        heroTagline: persisted.heroTagline,
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
