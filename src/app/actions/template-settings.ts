"use server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profileThemeSettings } from "@/db/schema/profilePublishing";
import { revalidatePath } from "next/cache";

export async function updateThemeSettingsAction(payload: {
  layout?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  typography?: string | null;
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

  // Ensure default layout if missing entirely
  const { layout, primaryColor, secondaryColor, accentColor, backgroundColor, typography, coverMode } = payload;

  await db
    .insert(profileThemeSettings)
    .values({
      playerId: player.id,
      layout: layout || "futuristic",
      primaryColor: primaryColor ?? null,
      secondaryColor: secondaryColor ?? null,
      accentColor: accentColor ?? null,
      backgroundColor: backgroundColor ?? null,
      typography: typography ?? null,
      coverMode: coverMode ?? "photo",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profileThemeSettings.playerId,
      set: {
        layout: layout,
        primaryColor: primaryColor,
        secondaryColor: secondaryColor,
        accentColor: accentColor,
        backgroundColor: backgroundColor,
        typography: typography,
        coverMode: coverMode,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/dashboard/edit-template/styles");
  revalidatePath("/dashboard/edit-template/structure");
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
