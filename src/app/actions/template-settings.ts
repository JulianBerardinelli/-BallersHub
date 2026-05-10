"use server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profileThemeSettings } from "@/db/schema/profilePublishing";
import { revalidatePath } from "next/cache";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";

const VALID_LAYOUTS = ["free", "pro"] as const;
type ValidLayout = (typeof VALID_LAYOUTS)[number];

function normalizeLayout(value: string | undefined): ValidLayout {
  return value === "pro" ? "pro" : "free";
}

export async function updateThemeSettingsAction(payload: {
  layout?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  coverMode?: string | null;
}) {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const player = await db.query.playerProfiles.findFirst({
    where: (players, { eq }) => eq(players.userId, user.id),
  });

  if (!player) {
    throw new Error("Player profile not found");
  }

  // Plan-aware coercion: a Free user cannot persist `layout: 'pro'` nor
  // custom colors. We silently coerce on save so the UI doesn't have to
  // worry about being bypassed.
  const dashboardState = await fetchDashboardState(supabase, user.id);
  const access = resolvePlanAccess(dashboardState.subscription);

  const requestedLayout = normalizeLayout(payload.layout);
  const layout: ValidLayout = access.isPro ? requestedLayout : "free";

  const persistedColors = access.isPro
    ? {
        primaryColor: payload.primaryColor ?? null,
        secondaryColor: payload.secondaryColor ?? null,
        accentColor: payload.accentColor ?? null,
        backgroundColor: payload.backgroundColor ?? null,
      }
    : {
        primaryColor: null,
        secondaryColor: null,
        accentColor: null,
        backgroundColor: null,
      };

  const coverMode = payload.coverMode ?? "photo";

  await db
    .insert(profileThemeSettings)
    .values({
      playerId: player.id,
      layout,
      primaryColor: persistedColors.primaryColor,
      secondaryColor: persistedColors.secondaryColor,
      accentColor: persistedColors.accentColor,
      backgroundColor: persistedColors.backgroundColor,
      typography: null,
      coverMode,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profileThemeSettings.playerId,
      set: {
        layout,
        primaryColor: persistedColors.primaryColor,
        secondaryColor: persistedColors.secondaryColor,
        accentColor: persistedColors.accentColor,
        backgroundColor: persistedColors.backgroundColor,
        typography: null,
        coverMode,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/dashboard/edit-template/styles");
  revalidatePath("/dashboard/edit-template/structure");
  if (player.slug) {
    revalidatePath(`/${player.slug}`);
  }
  return { success: true };
}

import { eq } from "drizzle-orm";

export async function updateSectionVisibilityAction(payload: {
  section: string;
  visible: boolean;
}) {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const player = await db.query.playerProfiles.findFirst({
    where: (players, { eq }) => eq(players.userId, user.id),
  });

  if (!player) throw new Error("Player profile not found");

  const { profileSectionsVisibility } = await import("@/db/schema/profilePublishing");

  // We check if it exists or insert
  const existing = await db.query.profileSectionsVisibility.findFirst({
    where: (s, { eq, and }) => and(eq(s.playerId, player.id), eq(s.section, payload.section))
  });

  if (existing) {
    await db.update(profileSectionsVisibility)
      .set({ visible: payload.visible, updatedAt: new Date() })
      .where(eq(profileSectionsVisibility.id, existing.id)); 
  } else {
    await db.insert(profileSectionsVisibility).values({
      playerId: player.id,
      section: payload.section,
      visible: payload.visible
    });
  }

  revalidatePath("/dashboard/edit-template/structure");
  return { success: true };
}
