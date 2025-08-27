"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import KycUploader from "../../KycUploader";
import TeamPicker, { TeamPickerValue } from "@/components/teams/TeamPicker";
import { Input, Textarea, Button, Switch, Chip } from "@heroui/react";

export default function PlayerApplyPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("");
  const [positions, setPositions] = useState("");
  // TM del jugador
  const [playerTm, setPlayerTm] = useState("");
  const [notes, setNotes] = useState("");

  const [idDocKey, setIdDocKey] = useState<string | undefined>();
  const [selfieKey, setSelfieKey] = useState<string | undefined>();

  // Equipo
  const [isFreeAgent, setIsFreeAgent] = useState(false);
  const [teamChoice, setTeamChoice] = useState<TeamPickerValue | null>(null);
  const [teamCountry, setTeamCountry] = useState("");
  const [teamCategory, setTeamCategory] = useState("");
  const [teamTmUrl, setTeamTmUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) console.error("auth getUser error", error);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Si marca "libre", limpiar selección de equipo
  useEffect(() => {
    if (isFreeAgent) {
      setTeamChoice(null);
      setTeamCountry("");
      setTeamCategory("");
      setTeamTmUrl("");
    }
  }, [isFreeAgent]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setErr("No hay sesión de usuario."); return; }

    setErr(null);
    setLoading(true);

    const natArr = nationality ? nationality.split(",").map(s => s.trim()).filter(Boolean) : null;
    const posArr = positions ? positions.split(",").map(s => s.trim()).filter(Boolean) : null;

    // Defaults
    let current_team_id: string | null = null;
    let proposed_team_name: string | null = null;
    let proposed_team_country: string | null = null;
    let proposed_team_category: string | null = null;
    let proposed_team_transfermarkt_url: string | null = null;
    let free_agent = !!isFreeAgent;
    let current_club: string | null = null;

    if (!isFreeAgent) {
      if (teamChoice?.mode === "approved") {
        current_team_id = teamChoice.teamId;
        current_club = teamChoice.teamName; // compat texto
        proposed_team_country = teamCountry || null; // visible para admin
      } else if (teamChoice?.mode === "new") {
        proposed_team_name = teamChoice.name;
        proposed_team_country = teamCountry || null;
        proposed_team_category = teamCategory || null;
        proposed_team_transfermarkt_url = teamTmUrl || null;
        current_club = teamChoice.name;
      }
    }

    // 1) Insert application
    const { data: inserted, error: insErr } = await supabase
      .from("player_applications")
      .insert({
        user_id: userId,
        plan_requested: "free",
        full_name: fullName || null,
        nationality: natArr,
        positions: posArr,
        current_club,                // legacy compat
        transfermarkt_url: playerTm || null, // TM del jugador
        id_doc_url: idDocKey || null,
        selfie_url: selfieKey || null,
        notes: notes || null,
        status: "pending",
        // nuevos
        current_team_id,
        proposed_team_name,
        proposed_team_country,
        proposed_team_category,
        proposed_team_transfermarkt_url,
        free_agent,
      })
      .select("id")
      .single();

    if (insErr || !inserted?.id) {
      setLoading(false);
      setErr(insErr?.message ?? "No se pudo crear la solicitud");
      return;
    }

    // 2) Si eligió "equipo nuevo", disparar RPC con meta completa
    if (!isFreeAgent && teamChoice?.mode === "new") {
      const { error: rpcErr } = await supabase.rpc("request_team_from_application", {
        p_application_id: inserted.id,
        p_name: teamChoice.name,
        p_country: teamCountry || null,
        p_category: teamCategory || null,
        p_tm_url: teamTmUrl || null,
        p_country_code: teamChoice.countryCode ?? null, 
      });
      if (rpcErr) {
        console.error("request_team_from_application:", rpcErr.message);
      }
    }

    setLoading(false);
    router.replace("/dashboard?applied=1");
  }

  return (
    <main className="mx-auto max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Solicitud de cuenta (Free)</h1>

      <form onSubmit={submit} className="grid gap-6">
        <Input
          label="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          isRequired
        />

        <Input
          label="Nacionalidades (separadas por coma)"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          placeholder="Argentina, Italia"
        />

        <Input
          label="Posiciones (separadas por coma)"
          value={positions}
          onChange={(e) => setPositions(e.target.value)}
          placeholder="Delantero, Extremo"
        />

        {/* Libre / con equipo */}
        <div className="flex items-center justify-between rounded-md border border-neutral-800 p-3">
          <div>
            <p className="text-sm font-medium">¿Sos jugador libre?</p>
            <p className="text-xs text-neutral-500">
              Si estás sin club actualmente, activá esta opción.
            </p>
          </div>
          <Switch isSelected={isFreeAgent} onValueChange={setIsFreeAgent}>
            Libre
          </Switch>
        </div>

        {isFreeAgent ? (
          <Chip variant="flat">Jugador libre</Chip>
        ) : (
          <div className="grid gap-4">
            <TeamPicker
              onChange={(v) => {
                setTeamChoice(v);
                if (v.mode === "approved") {
                  setTeamCountry(v.country ?? "");
                }
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="País del equipo" value={teamCountry} onChange={(e) => setTeamCountry(e.target.value)} placeholder="Argentina" />
              <Input label="Categoría" value={teamCategory} onChange={(e) => setTeamCategory(e.target.value)} placeholder="Primera / Sub-20 / Amateur…" />
              <Input label="Transfermarkt del equipo (opcional)" value={teamTmUrl} onChange={(e) => setTeamTmUrl(e.target.value)} placeholder="https://www.transfermarkt..." />
            </div>
          </div>
        )}

        <Input
          label="Link Transfermarkt del jugador (opcional)"
          value={playerTm}
          onChange={(e) => setPlayerTm(e.target.value)}
          placeholder="https://www.transfermarkt.es/..."
        />

        <Textarea
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Información adicional para verificación"
          minRows={3}
        />

        <KycUploader
          onUploaded={({ idDocKey: idk, selfieKey: sk }) => {
            if (idk) setIdDocKey(idk);
            if (sk) setSelfieKey(sk);
          }}
        />

        {err && <p className="text-sm text-red-500">{err}</p>}

        <Button type="submit" isDisabled={loading}>
          {loading ? "Enviando..." : "Enviar solicitud"}
        </Button>
      </form>

      <p className="text-xs text-neutral-500">
        Los archivos de verificación se almacenan de forma privada (KYC). Sólo el equipo de verificación podrá acceder.
      </p>
    </main>
  );
}
