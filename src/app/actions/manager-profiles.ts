"use server";

import { db } from "@/lib/db";
import { managerProfiles } from "@/db/schema/managerProfiles";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export async function getManagerProfile() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado" };
  }

  const up = await db.query.userProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, user.id),
  });

  if (!up) {
    return { error: "Usuario no encontrado" };
  }

  let profile = await db.query.managerProfiles.findFirst({
    where: eq(managerProfiles.userId, up.id),
  });

  // Si no existe pero el usuario es manager en user_profiles (ej. cuentas de test viejas), lo creamos
  if (!profile && up.role === "manager") {
    const [newProfile] = await db.insert(managerProfiles).values({
      userId: up.id,
      fullName: user.user_metadata?.full_name || "Manager",
    }).returning();
    profile = newProfile;
  }

  if (!profile) {
    return { error: "Perfil de manager no encontrado" };
  }

  return { success: true, profile };
}

export async function updateManagerProfile(data: Partial<typeof managerProfiles.$inferInsert>) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado" };
  }

  const safeData = { ...data };
  delete safeData.id;
  delete safeData.userId;
  delete safeData.createdAt;
  delete safeData.updatedAt;

  const up = await db.query.userProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, user.id),
  });

  if (!up) {
    return { error: "Usuario no encontrado" };
  }

  try {
    await db.update(managerProfiles)
      .set({
        ...safeData,
        updatedAt: new Date(),
      })
      .where(eq(managerProfiles.userId, up.id));

    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating manager profile:", error);
    return { error: "No se pudo actualizar el perfil" };
  }
}
