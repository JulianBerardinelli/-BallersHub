"use client";

import { useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AvatarUploader({
  playerId,
  currentAvatarUrl,
}: {
  playerId: string;
  currentAvatarUrl?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setBusy(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const key = `avatars/${playerId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("player-media")
        .upload(key, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage.from("player-media").getPublicUrl(key);
      const publicUrl = publicUrlData?.publicUrl ?? null;
      if (!publicUrl) throw new Error("No se pudo obtener la URL pública de la imagen subida.");

      await supabase
        .from("player_media")
        .delete()
        .eq("player_id", playerId)
        .eq("type", "photo")
        .eq("is_primary", true);

      const { error: mediaInsertError } = await supabase.from("player_media").insert({
        player_id: playerId,
        type: "photo",
        url: publicUrl,
        title: "Avatar principal",
        provider: "upload",
        is_primary: true,
      });
      if (mediaInsertError) throw new Error(mediaInsertError.message);

      const { error: profileUpdateError } = await supabase
        .from("player_profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", playerId);
      if (profileUpdateError) throw new Error(profileUpdateError.message);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      if (userId) {
        await supabase.from("profile_change_logs").insert({
          player_id: playerId,
          user_id: userId,
          field: "avatar_url",
          old_value: currentAvatarUrl ? { url: currentAvatarUrl } : null,
          new_value: { url: publicUrl },
        });
      }

      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (uploadErr) {
      const message = uploadErr instanceof Error ? uploadErr.message : "Ocurrió un error al subir el avatar.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm">Actualizar avatar</label>
      <input type="file" accept="image/*" onChange={onChange} disabled={busy} />
      {busy && <p className="text-xs text-neutral-500">Subiendo...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
