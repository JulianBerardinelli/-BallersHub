"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import KycUploader from "../../KycUploader";


export default function PlayerApplyPage() {
  const router = useRouter();

  // 🔑 user id en sesión (requerido por RLS)
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("");
  const [positions, setPositions] = useState("");
  const [currentClub, setCurrentClub] = useState("");
  const [transfermarkt, setTransfermarkt] = useState("");
  const [notes, setNotes] = useState("");

  const [idDocKey, setIdDocKey] = useState<string | undefined>();
  const [selfieKey, setSelfieKey] = useState<string | undefined>();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setErr("No hay sesión de usuario.");
      return;
    }

    setErr(null);
    setLoading(true);

    const natArr =
      nationality
        ? nationality.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

    const posArr =
      positions
        ? positions.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

    const { error } = await supabase.from("player_applications").insert({
      user_id: userId,                 // 👈 requerido por RLS y NOT NULL
      plan_requested: "free",
      full_name: fullName || null,
      nationality: natArr,
      positions: posArr,
      current_club: currentClub || null,
      transfermarkt_url: transfermarkt || null,
      id_doc_url: idDocKey || null,
      selfie_url: selfieKey || null,
      notes: notes || null,
      status: "pending",
    });

    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }

    router.replace("/dashboard?applied=1");
  }

  return (
    <main className="mx-auto max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Solicitud de cuenta (Free)</h1>

      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm">Nombre completo</span>
          <input
            className="rounded-md border bg-black px-3 py-2"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Nacionalidades (separadas por coma)</span>
          <input
            className="rounded-md border bg-black px-3 py-2"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="Argentina, Italia"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Posiciones (separadas por coma)</span>
          <input
            className="rounded-md border bg-black px-3 py-2"
            value={positions}
            onChange={(e) => setPositions(e.target.value)}
            placeholder="Delantero, Extremo"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Club actual</span>
          <input
            className="rounded-md border bg-black px-3 py-2"
            value={currentClub}
            onChange={(e) => setCurrentClub(e.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Link Transfermarkt (u otro perfil)</span>
          <input
            className="rounded-md border bg-black px-3 py-2"
            value={transfermarkt}
            onChange={(e) => setTransfermarkt(e.target.value)}
            placeholder="https://www.transfermarkt.es/..."
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Notas</span>
          <textarea
            className="rounded-md border bg-black px-3 py-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Información adicional para verificación"
          />
        </label>

        <KycUploader
          onUploaded={({ idDocKey: idk, selfieKey: sk }) => {
            if (idk) setIdDocKey(idk);
            if (sk) setSelfieKey(sk);
          }}
        />

        {err && <p className="text-sm text-red-500">{err}</p>}

        <button disabled={loading} className="rounded-md border px-4 py-2">
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>

      <p className="text-xs text-neutral-500">
        Los archivos de verificación se almacenan de forma privada (KYC). Sólo el equipo de verificación podrá acceder.
      </p>
    </main>
  );
}
