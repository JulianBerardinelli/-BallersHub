"use server";

import { db } from "@/lib/db";
import { playerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export async function updateHeroUrlAction(formData: FormData) {
  try {
    const supabase = await createSupabaseServerRSC();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autorizado" };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "Archivo faltante" };
    }

    const profile = await db.query.playerProfiles.findFirst({
      where: eq(playerProfiles.userId, user.id),
      columns: { id: true }
    });

    if (!profile) {
      return { success: false, error: "Perfil no encontrado" };
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `gallery/${user.id}/hero-${profile.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('player-media')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage.from('player-media').getPublicUrl(fileName);

    await db
      .update(playerProfiles)
      .set({ heroUrl: publicUrl, updatedAt: new Date() })
      .where(eq(playerProfiles.id, profile.id));

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error("Error updating heroUrl:", error);
    return { success: false, error: error.message };
  }
}
