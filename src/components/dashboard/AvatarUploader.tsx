"use client";

import { supabase } from "@/lib/supabase/client";
import { useState } from "react";

export default function AvatarUploader({ playerId }: { playerId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setBusy(true);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const key = `avatars/${playerId}.jpg`; // normalizamos a .jpg; supabase hará el mime correcto

    // 1) subir (upsert)
    const { error: upErr } = await supabase.storage.from("player-media").upload(key, file, { upsert: true });
    if (upErr) { setError(upErr.message); setBusy(false); return; }

    // 2) obtener public URL y actualizar tabla
    const { data: pub } = supabase.storage.from("player-media").getPublicUrl(key);
    const url = pub?.publicUrl ?? null;

    const { error: up2 } = await supabase
      .from("player_profiles")
      .update({ avatar_url: url })
      .eq("id", playerId);
    if (up2) setError(up2.message);

    setBusy(false);
    // refrescar
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <div>
      <label className="text-sm block mb-1">Actualizar avatar</label>
      <input type="file" accept="image/*" onChange={onChange} disabled={busy} />
      {busy && <p className="text-xs text-neutral-500">Subiendo...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
