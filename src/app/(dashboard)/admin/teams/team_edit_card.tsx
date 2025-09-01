"use client";

import * as React from "react";
import { Card, CardHeader, CardBody, Input, Textarea, Select, SelectItem, Button, Chip, Switch } from "@heroui/react";
import TeamCrest from "@/components/teams/TeamCrest";
import { supabase } from "@/lib/supabase/client";

export type TeamEditableInput = {
  id: string;
  name: string;
  slug?: string | null;
  country?: string | null;
  country_code?: string | null;
  category?: string | null;
  transfermarkt_url?: string | null;
  tags?: string[] | null;
  alt_names?: string[] | null;
  status: "pending" | "approved" | "rejected";
  crest_url?: string | null;
  featured?: boolean | null;
  visibility?: "public" | "private" | null;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  team: TeamEditableInput;
  onSaved?: (updated: TeamEditableInput) => void;
  onCancel?: () => void;
};

const arrToCsv = (a?: string[] | null) => (a ?? []).join(", ");
const csvToArr = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function DateClient({ iso }: { iso?: string }) {
  const [txt, setTxt] = React.useState("");
  React.useEffect(() => {
    if (!iso) return;
    setTxt(new Date(iso).toLocaleString("es-AR", { hour12: false }));
  }, [iso]);
  return <span suppressHydrationWarning>{txt || ""}</span>;
}

const statusColor: Record<Props["team"]["status"], "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export default function TeamEditCard({ team, onSaved, onCancel }: Props) {
  // estado del form
  const [name, setName] = React.useState(team.name ?? "");
  const [slug, setSlug] = React.useState(team.slug ?? "");
  const [country, setCountry] = React.useState(team.country ?? "");
  const [countryCode, setCountryCode] = React.useState(team.country_code ?? "");
  const [category, setCategory] = React.useState(team.category ?? "");
  const [tmUrl, setTmUrl] = React.useState(team.transfermarkt_url ?? "");
  const [tags, setTags] = React.useState(arrToCsv(team.tags));
  const [altNames, setAltNames] = React.useState(arrToCsv(team.alt_names));
  const [status, setStatus] = React.useState<Props["team"]["status"]>(team.status ?? "approved");
  const [featured, setFeatured] = React.useState<boolean>(!!team.featured);
  const [crestUrl, setCrestUrl] = React.useState<string>(team.crest_url ?? "/images/team-default.svg");

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  async function uploadCrest(file: File) {
    try {
      setErr(null);
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const key = `${team.id}/crest.${ext}`;

      const { error: upErr } = await supabase.storage.from("teams").upload(key, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("teams").getPublicUrl(key);
      const url = pub.publicUrl;

      const { error: updErr } = await supabase
        .from("teams")
        .update({ crest_url: url, updated_at: new Date().toISOString() })
        .eq("id", team.id);
      if (updErr) throw updErr;

      setCrestUrl(`${url}?v=${Date.now()}`); // cache-bust
      setOk("Escudo actualizado");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo subir el escudo");
    }
  }

  async function handleSave() {
    setBusy(true); setErr(null); setOk(null);
    try {
      const body = {
        name: name.trim() || team.name,
        slug: slug.trim() || null,
        country: country.trim() || null,
        country_code: countryCode.trim().toUpperCase() || null,
        category: category.trim() || null,
        transfermarkt_url: tmUrl.trim() || null,
        tags: csvToArr(tags),
        alt_names: csvToArr(altNames),
        status,
        featured,
      };

      const res = await fetch(`/api/admin/teams/${team.id}/update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo actualizar el equipo.");

      setOk("Equipo actualizado");
      onSaved?.({ ...team, ...json.data, crest_url: crestUrl });
    } catch (e: any) {
      setErr(e.message ?? "Error inesperado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card shadow="sm" radius="lg" className="bg-transparent ring-0 border-0">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TeamCrest src={crestUrl} size={40} />
          <div>
            <p className="font-semibold">{team.name}</p>
            <p className="text-xs text-neutral-500">
              {team.created_at ? <>Creado: <DateClient iso={team.created_at} /></> : null}
            </p>
          </div>
        </div>
        <Chip color={statusColor[status]} variant="flat" className="capitalize">{status}</Chip>
      </CardHeader>

      <CardBody className="grid gap-3">
        {(err || ok) && (
          <p className={`text-sm ${err ? "text-red-500" : "text-green-500"}`}>{err ?? ok}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input size="sm" label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input size="sm" label="Slug (opcional)" value={slug} onChange={(e) => setSlug(e.target.value)}
            description="Vacío: se regenera automáticamente." />
          <Input size="sm" label="País" value={country} onChange={(e) => setCountry(e.target.value)} />
          <Input size="sm" label="Código país (ISO-2)" value={countryCode ?? ""} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} placeholder="AR, ES, FI…" />
          <Input size="sm" label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Primera / Sub-20 / Amateur…" />
          <Input size="sm" label="Transfermarkt (opcional)" value={tmUrl} onChange={(e) => setTmUrl(e.target.value)} placeholder="https://www.transfermarkt..." />
          <Textarea size="sm" label="Tags (coma)" minRows={2} value={tags} onChange={(e) => setTags(e.target.value)} />
          <Textarea size="sm" label="Otros nombres (coma)" minRows={2} value={altNames} onChange={(e) => setAltNames(e.target.value)} />
          <Select label="Estado" selectedKeys={[status]} onSelectionChange={(k) => setStatus(Array.from(k)[0] as any)} size="sm">
            {["pending","approved","rejected"].map((s) => <SelectItem key={s} className="capitalize">{s}</SelectItem>)}
          </Select>
          <div className="flex items-center gap-3"><Switch isSelected={featured} onValueChange={setFeatured}>Destacado</Switch></div>
        </div>

        {/* Acciones y subida de escudo — botones abajo a la derecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="flex items-center gap-3">
            <input
              aria-label="Subir escudo"
              type="file"
              accept="image/png,image/svg+xml"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCrest(f); }}
              className="text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end md:ml-auto">
            <Button variant="flat" onPress={onCancel} className="sm:ml-auto">Cancelar</Button>
            <Button color="primary" onPress={handleSave} isLoading={busy}>Guardar cambios</Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
