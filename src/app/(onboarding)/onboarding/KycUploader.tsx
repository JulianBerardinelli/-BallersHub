// src/app/onboarding/KycUploader.tsx
"use client";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Props = { onUploaded: (p: { idDocKey?: string; selfieKey?: string }) => void };

const FILE_INPUT_CLS =
  "w-full text-sm text-bh-fg-3 file:mr-3 file:rounded-bh-md file:border file:border-white/[0.08] file:bg-white/[0.04] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-bh-fg-2 hover:file:bg-white/[0.08]";

const LABEL_CLS =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2";

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
    <div className="grid gap-4">
      <div>
        <label className={LABEL_CLS}>Documento (frente o PDF)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setLoadingDoc(true);
              upload(f, "id").finally(() => setLoadingDoc(false));
            }
          }}
          className={FILE_INPUT_CLS}
        />
        {loadingDoc && <p className="mt-1 text-[11px] text-bh-fg-4">Subiendo documento...</p>}
      </div>
      <div>
        <label className={LABEL_CLS}>Selfie</label>
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setLoadingSelfie(true);
              upload(f, "selfie").finally(() => setLoadingSelfie(false));
            }
          }}
          className={FILE_INPUT_CLS}
        />
        {loadingSelfie && <p className="mt-1 text-[11px] text-bh-fg-4">Subiendo selfie...</p>}
      </div>
      {error && <p className="text-sm text-bh-danger">{error}</p>}
      <p className="text-[11px] text-bh-fg-4">
        Los archivos se guardan de forma privada y solo los verá el equipo de
        verificación.
      </p>
    </div>
  );
}
