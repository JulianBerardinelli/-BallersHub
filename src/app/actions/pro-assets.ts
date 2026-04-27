"use server";

import { db } from "@/lib/db";
import { playerProfiles, playerMedia } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export async function updateProAssetAction(formData: FormData) {
  try {
    const supabase = await createSupabaseServerRSC();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autorizado" };
    }

    const file = formData.get("file") as File | null;
    const assetType = formData.get("assetType") as string | null;

    if (!file || !assetType) {
      return { success: false, error: "Archivo o tipo de asset faltante" };
    }

    if (!["heroUrl", "modelUrl1", "modelUrl2"].includes(assetType)) {
      return { success: false, error: "Tipo de asset inválido" };
    }

    const profile = await db.query.playerProfiles.findFirst({
      where: eq(playerProfiles.userId, user.id),
      columns: { id: true }
    });

    if (!profile) {
      return { success: false, error: "Perfil no encontrado" };
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `gallery/${user.id}/${assetType}-${profile.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('player-media')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage.from('player-media').getPublicUrl(fileName);

    const updateData: any = { updatedAt: new Date() };
    updateData[assetType] = publicUrl;

    await db
      .update(playerProfiles)
      .set(updateData)
      .where(eq(playerProfiles.id, profile.id));

    // Also insert into player_media for admin moderation
    const slotNames: Record<string, string> = {
      heroUrl: "Hero Asset",
      modelUrl1: "Modelado 1",
      modelUrl2: "Modelado 2"
    };

    await db.insert(playerMedia).values({
      playerId: profile.id,
      type: "photo",
      url: publicUrl,
      provider: `pro_asset_${assetType}`,
      title: `[Pro Layout] ${slotNames[assetType] || assetType}`,
      isPrimary: false,
      isApproved: true, // Reactive mode
      isFlagged: false,
    });

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error("Error updating heroUrl:", error);
    return { success: false, error: error.message };
  }
}
