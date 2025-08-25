// src/app/onboarding/KycUploader.tsx
"use client";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Props = { onUploaded: (p: { idDocKey?: string; selfieKey?: string }) => void; };

export default function KycUploader({ onUploaded }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadingSelfie, setLoadingSelfie] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) console.error("auth getUser error", error);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  async function upload(file: File, kind: "id" | "selfie") {
    if (!userId) return setError("No hay usuario en sesión.");
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const key = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc").upload(key, file, { upsert: true });
    if (error) return setError(error.message);
    if (kind === "id") onUploaded({ idDocKey: key });
    if (kind === "selfie") onUploaded({ selfieKey: key });
  }

  return (
    <div className="grid gap-3">
      <div>
        <label className="text-sm block mb-1">Documento (frente o PDF)</label>
        <input type="file" accept="image/jpeg,image/png,application/pdf"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setLoadingDoc(true); upload(f, "id").finally(()=>setLoadingDoc(false)); }}} />
        {loadingDoc && <p className="text-xs text-neutral-500 mt-1">Subiendo documento...</p>}
      </div>
      <div>
        <label className="text-sm block mb-1">Selfie</label>
        <input type="file" accept="image/jpeg,image/png"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setLoadingSelfie(true); upload(f, "selfie").finally(()=>setLoadingSelfie(false)); }}} />
        {loadingSelfie && <p className="text-xs text-neutral-500 mt-1">Subiendo selfie...</p>}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <p className="text-xs text-neutral-500">Los archivos se guardan de forma privada y sólo los verá el equipo de verificación.</p>
    </div>
  );
}
