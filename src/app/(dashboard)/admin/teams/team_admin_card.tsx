// src/app/(dashboard)/admin/teams/team_admin_card.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader, CardBody, Input, Button, Chip } from "@heroui/react";
import TeamCrest from "@/components/teams/TeamCrest";

type TeamPending = {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  category: string | null;
  transfermarkt_url: string | null;
  crest_url: string | null;
  requested_by_user_id: string | null;
  requested_in_application_id: string | null;
  tags: string[] | null;
  alt_names: string[] | null;
  created_at: string;
  status: "pending";
};

function DateClient({ iso }: { iso: string }) {
  const [txt, setTxt] = useState("");
  useEffect(() => {
    setTxt(new Date(iso).toLocaleString("es-AR", { hour12: false }));
  }, [iso]);
  return <span suppressHydrationWarning>{txt || ""}</span>;
}

export default function TeamAdminCard({ team }: { team: TeamPending }) {
  const [name, setName] = useState(team.name);
  const [slug, setSlug] = useState(team.slug ?? "");
  const [country, setCountry] = useState(team.country ?? "");
  const [category, setCategory] = useState(team.category ?? "");
  const [tmUrl, setTmUrl] = useState(team.transfermarkt_url ?? "");
  const [tags, setTags] = useState((team.tags ?? []).join(", "));
  const [altNames, setAltNames] = useState((team.alt_names ?? []).join(", "));
  const [crestUrl, setCrestUrl] = useState(team.crest_url ?? "/images/team-default.svg");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function saveMetaInternal(): Promise<boolean> {
    const tagArr = tags.split(",").map((s) => s.trim()).filter(Boolean);
    const altArr = altNames.split(",").map((s) => s.trim()).filter(Boolean);

    const { error } = await supabase
      .from("teams")
      .update({
        name: name || team.name,
        country: country || null,
        category: category || null,
        transfermarkt_url: tmUrl || null,
        tags: tagArr.length ? tagArr : null,
        alt_names: altArr.length ? altArr : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", team.id);

    if (error) {
      setErr(error.message);
      return false;
    }
    return true;
  }

  async function uploadCrest(file: File) {
    setErr(null);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const key = `${team.id}/crest.${ext}`;
    const { error: upErr } = await supabase.storage.from("teams").upload(key, file, { upsert: true });
    if (upErr) { setErr(upErr.message); return; }

    const { data: pub } = supabase.storage.from("teams").getPublicUrl(key);
    const url = pub.publicUrl;

    const { error: updErr } = await supabase
      .from("teams")
      .update({ crest_url: url, updated_at: new Date().toISOString() })
      .eq("id", team.id);
    if (updErr) { setErr(updErr.message); return; }

    setCrestUrl(`${url}?v=${Date.now()}`); // cache-bust inmediato
  }

  async function saveMeta() {
    setErr(null);
    await saveMetaInternal();
  }

  async function approve() {
    setBusy(true);
    setErr(null);

    const ok = await saveMetaInternal();
    if (!ok) { setBusy(false); return; }

    const { error } = await supabase.rpc("approve_team", { p_team_id: team.id, p_slug: slug || null });
    setBusy(false);

    if (error) {
      setErr(error.message);
      return;
    }
    window.location.reload();
  }

  return (
    <Card className="border border-neutral-800">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TeamCrest src={crestUrl} size={40} />
          <div>
            <p className="font-semibold">{team.name}</p>
            <p className="text-xs text-neutral-500">
              Creado: <DateClient iso={team.created_at} />
            </p>
          </div>
        </div>
        <Chip color="warning" variant="flat">pending</Chip>
      </CardHeader>

      <CardBody className="grid gap-3">
        {err && <p className="text-sm text-red-500">{err}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Slug (opcional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            description="Si lo dejás vacío, se genera automáticamente al aprobar."
          />
          <Input label="País" value={country} onChange={(e) => setCountry(e.target.value)} />
          <Input label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Primera / Sub-20 / Amateur…" />
          <Input label="Tags (coma)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ej: xeneize, juvenil" />
          <Input label="Otros nombres (coma)" value={altNames} onChange={(e) => setAltNames(e.target.value)} placeholder="alias/históricos" />
          <Input label="Transfermarkt del equipo (opcional)" value={tmUrl} onChange={(e) => setTmUrl(e.target.value)} placeholder="https://www.transfermarkt..." />
        </div>

        <div className="flex items-center gap-3">
          <input
            aria-label="Subir escudo"
            type="file"
            accept="image/png,image/svg+xml"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCrest(f); }}
          />
          <Button variant="flat" onPress={saveMeta}>Guardar meta</Button>
          <Button color="primary" onPress={approve} isDisabled={busy}>
            {busy ? "Aprobando..." : "Aprobar equipo"}
          </Button>
        </div>

        {team.requested_in_application_id && (
          <p className="text-xs text-neutral-500">
            Solicitado en aplicación: {team.requested_in_application_id}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
