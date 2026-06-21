"use client";

import * as React from "react";
import { Card, CardHeader, CardBody, Input, Textarea, Select, SelectItem, Button, Chip, Switch, Autocomplete, AutocompleteItem } from "@heroui/react";
import TeamCrest from "@/components/teams/TeamCrest";
import CityPicker from "@/components/teams/CityPicker";
import { supabase } from "@/lib/supabase/client";
import { createTeam } from "./actions";

export type TeamEditableInput = {
  id: string;
  name: string;
  slug?: string | null;
  country?: string | null;
  country_code?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  transfermarkt_url?: string | null;
  tags?: string[] | null;
  alt_names?: string[] | null;
  status: "pending" | "approved" | "rejected";
  crest_url?: string | null;
  featured?: boolean | null;
  visibility?: "public" | "private" | null;
  requested_in_application_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Mode = "edit" | "create" | "review";

type Props = {
  team: TeamEditableInput & { division?: { id: string, name: string } | null };
  allDivisions?: any[];
  /** "edit" (default): equipo aprobado/rechazado. "create": alta manual.
   *  "review": propuesta pendiente — añade aprobar/rechazar y oculta el select de estado. */
  mode?: Mode;
  onSaved?: (updated: TeamEditableInput) => void;
  onCreated?: (created: any) => void;
  onApproved?: () => void;
  onRejected?: () => void;
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

export default function TeamEditCard({ team, allDivisions, mode = "edit", onSaved, onCreated, onApproved, onRejected, onCancel }: Props) {
  const isCreate = mode === "create";
  const isReview = mode === "review";

  // estado del form
  const [name, setName] = React.useState(team.name ?? "");
  const [slug, setSlug] = React.useState(team.slug ?? "");
  const [country, setCountry] = React.useState(team.country ?? "");
  const [countryCode, setCountryCode] = React.useState(team.country_code ?? "");
  const [city, setCity] = React.useState(team.city ?? "");
  const [latitude, setLatitude] = React.useState<number | null>(team.latitude ?? null);
  const [longitude, setLongitude] = React.useState<number | null>(team.longitude ?? null);
  const [category, setCategory] = React.useState(team.category ?? "");
  const [divisionId, setDivisionId] = React.useState<string | null>(team.division?.id ?? null);
  const [tmUrl, setTmUrl] = React.useState(team.transfermarkt_url ?? "");
  const [tags, setTags] = React.useState(arrToCsv(team.tags));
  const [altNames, setAltNames] = React.useState(arrToCsv(team.alt_names));
  const [status, setStatus] = React.useState<Props["team"]["status"]>(team.status ?? (isCreate ? "approved" : "approved"));
  const [featured, setFeatured] = React.useState<boolean>(!!team.featured);
  const [crestUrl, setCrestUrl] = React.useState<string>(team.crest_url ?? "/images/team-default.svg");
  const [externalCrestUrl, setExternalCrestUrl] = React.useState<string>(
    team.crest_url && team.crest_url.startsWith("http") && !team.crest_url.includes("supabase.co")
      ? team.crest_url
      : ""
  );
  // En "create" no hay id todavía → el archivo no se puede subir a teams/{id}/.
  // Se difiere: se guarda el File y se sube tras crear el equipo.
  const [pendingCrestFile, setPendingCrestFile] = React.useState<File | null>(null);

  const [busy, setBusy] = React.useState(false);
  const [action, setAction] = React.useState<null | "save" | "create" | "approve" | "reject">(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const filteredDivisions = React.useMemo(() => {
    if (!allDivisions) return [];
    return allDivisions.filter(d => d.country_code === countryCode.toUpperCase());
  }, [allDivisions, countryCode]);

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
      setExternalCrestUrl(""); // reset external link if a file is uploaded
      setOk("Escudo actualizado");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo subir el escudo");
    }
  }

  // Selección de escudo: en create se difiere (preview local); en edit/review
  // (el equipo ya existe) se sube en el momento.
  function onCrestFileChange(file: File) {
    if (isCreate) {
      setErr(null);
      setPendingCrestFile(file);
      setExternalCrestUrl("");
      setCrestUrl(URL.createObjectURL(file)); // preview inmediato
    } else {
      uploadCrest(file);
    }
  }

  // Campos comunes (snake_case) que entiende /api/admin/teams/[id]/update.
  // El estado NO se incluye: cada acción lo define (o lo omite para no tocarlo).
  function buildPayload() {
    return {
      name: name.trim() || team.name,
      slug: slug.trim() || null,
      country: country.trim() || null,
      country_code: countryCode.trim().toUpperCase() || null,
      city: city.trim() || null,
      latitude,
      longitude,
      category: category.trim() || null,
      transfermarkt_url: tmUrl.trim() || null,
      tags: csvToArr(tags),
      alt_names: csvToArr(altNames),
      featured,
      division_id: divisionId,
      crest_url: externalCrestUrl.trim() ? externalCrestUrl.trim() : crestUrl,
    };
  }

  async function saveViaEndpoint(body: Record<string, any>) {
    const res = await fetch(`/api/admin/teams/${team.id}/update`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "No se pudo actualizar el equipo.");
    return json.data as Record<string, any>;
  }

  // EDIT — guarda metadatos (incluye el estado elegido en el select).
  async function handleSave() {
    setBusy(true); setAction("save"); setErr(null); setOk(null);
    try {
      const data = await saveViaEndpoint({ ...buildPayload(), status });
      setOk("Equipo actualizado");
      onSaved?.({ ...team, ...data, crest_url: externalCrestUrl.trim() ? externalCrestUrl.trim() : crestUrl });
    } catch (e: any) {
      setErr(e.message ?? "Error inesperado");
    } finally {
      setBusy(false); setAction(null);
    }
  }

  // CREATE — alta manual + subida diferida del escudo.
  async function handleCreate() {
    setBusy(true); setAction("create"); setErr(null); setOk(null);
    try {
      const res = await createTeam({
        name,
        slug,
        country,
        countryCode,
        city,
        latitude,
        longitude,
        category,
        divisionId,
        transfermarktUrl: tmUrl,
        tags: csvToArr(tags),
        altNames: csvToArr(altNames),
        status,
        featured,
        // En create el escudo por archivo se sube después; aquí sólo va el URL externo.
        crestUrl: externalCrestUrl.trim() || null,
      });
      if (!res.success || !res.team) throw new Error(res.message ?? "No se pudo crear el equipo.");

      let created = res.team;

      if (pendingCrestFile && !externalCrestUrl.trim()) {
        const ext = (pendingCrestFile.name.split(".").pop() || "png").toLowerCase();
        const key = `${created.id}/crest.${ext}`;
        const { error: upErr } = await supabase.storage.from("teams").upload(key, pendingCrestFile, { upsert: true });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("teams").getPublicUrl(key);
          const url = pub.publicUrl;
          await supabase.from("teams").update({ crest_url: url, updated_at: new Date().toISOString() }).eq("id", created.id);
          created = { ...created, crest_url: url };
        }
      }

      setOk("Equipo creado");
      onCreated?.(created);
    } catch (e: any) {
      setErr(e.message ?? "Error inesperado");
    } finally {
      setBusy(false); setAction(null);
    }
  }

  // REVIEW — guardar borrador (mantiene pendiente, no cierra).
  async function handleSaveDraft() {
    setBusy(true); setAction("save"); setErr(null); setOk(null);
    try {
      const data = await saveViaEndpoint(buildPayload());
      setOk("Cambios guardados");
      onSaved?.({ ...team, ...data, crest_url: externalCrestUrl.trim() ? externalCrestUrl.trim() : crestUrl });
    } catch (e: any) {
      setErr(e.message ?? "Error inesperado");
    } finally {
      setBusy(false); setAction(null);
    }
  }

  // REVIEW — aprobar: persiste metadatos y luego corre approve_team (genera
  // slug único, linkea la aplicación de origen y sincroniza los perfiles).
  async function handleApprove() {
    setBusy(true); setAction("approve"); setErr(null); setOk(null);
    try {
      const data = await saveViaEndpoint(buildPayload());
      const { error } = await supabase.rpc("approve_team", {
        p_team_id: team.id,
        p_slug: (data?.slug as string) || slug.trim() || null,
      });
      if (error) throw new Error(error.message);
      setOk("Equipo aprobado");
      onApproved?.();
    } catch (e: any) {
      setErr(e.message ?? "No se pudo aprobar el equipo");
    } finally {
      setBusy(false); setAction(null);
    }
  }

  // REVIEW — rechazar: persiste metadatos con estado rejected.
  async function handleReject() {
    setBusy(true); setAction("reject"); setErr(null); setOk(null);
    try {
      await saveViaEndpoint({ ...buildPayload(), status: "rejected" });
      setOk("Equipo rechazado");
      onRejected?.();
    } catch (e: any) {
      setErr(e.message ?? "No se pudo rechazar el equipo");
    } finally {
      setBusy(false); setAction(null);
    }
  }

  const headerTitle = isCreate ? "Nuevo equipo" : team.name;

  return (
    <Card shadow="sm" radius="lg" className="bg-transparent ring-0 border-0">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TeamCrest src={externalCrestUrl.trim() || crestUrl} size={40} />
          <div>
            <p className="font-semibold">{headerTitle || "Nuevo equipo"}</p>
            <p className="text-xs text-bh-fg-4">
              {team.created_at ? <>Creado: <DateClient iso={team.created_at} /></> : null}
            </p>
          </div>
        </div>
        <Chip color={isReview ? "warning" : statusColor[status]} variant="flat" className="capitalize">
          {isReview ? "pending" : status}
        </Chip>
      </CardHeader>

      <CardBody className="grid gap-3">
        {(err || ok) && (
          <p className={`text-sm ${err ? "text-red-500" : "text-green-500"}`}>{err ?? ok}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input size="sm" label="Nombre" value={name} onChange={(e) => setName(e.target.value)} isRequired={isCreate} />
          <Input size="sm" label="Slug (opcional)" value={slug} onChange={(e) => setSlug(e.target.value)}
            description="Vacío: se regenera automáticamente." />
          <Input size="sm" label="País" value={country} onChange={(e) => setCountry(e.target.value)} />
          <Input
            size="sm"
            label="Código país (ISO-2)"
            value={countryCode ?? ""}
            onChange={(e) => {
              // Changing the country invalidates the city + coords.
              setCountryCode(e.target.value.toUpperCase());
              setCity("");
              setLatitude(null);
              setLongitude(null);
            }}
            placeholder="AR, ES, FI…"
          />
          <div className="flex flex-col gap-1">
            <CityPicker
              countryCode={countryCode}
              city={city}
              onSelect={(sel) => {
                setCity(sel.city);
                setLatitude(sel.latitude);
                setLongitude(sel.longitude);
              }}
              onCityChange={(text) => {
                // Free typing / clearing keeps the name but drops the coords,
                // so we never save a city label pointing at a stale pin.
                setCity(text);
                setLatitude(null);
                setLongitude(null);
              }}
            />
            {latitude != null && longitude != null && (
              <p className="text-[10px] text-bh-fg-4">
                📍 {city} · {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            )}
          </div>
          <Autocomplete
            size="sm"
            label="Categoría / División"
            placeholder="Primera / Sub-20 / Amateur…"
            allowsCustomValue
            defaultItems={filteredDivisions}
            selectedKey={divisionId}
            onSelectionChange={(key) => {
              if (key) {
                setDivisionId(key as string);
                const div = filteredDivisions.find(d => d.id === key);
                if (div) setCategory(div.name);
              } else {
                setDivisionId(null);
              }
            }}
            onInputChange={(val) => {
              setCategory(val);
              const div = filteredDivisions.find(d => d.id === divisionId);
              if (div && div.name !== val) setDivisionId(null);
            }}
            inputValue={category}
          >
            {(div: any) => <AutocompleteItem key={div.id}>{div.name}</AutocompleteItem>}
          </Autocomplete>
          <Input size="sm" label="Transfermarkt (opcional)" value={tmUrl} onChange={(e) => setTmUrl(e.target.value)} placeholder="https://www.transfermarkt..." />
          <Textarea size="sm" label="Tags (coma)" minRows={2} value={tags} onChange={(e) => setTags(e.target.value)} />
          <Textarea size="sm" label="Otros nombres (coma)" minRows={2} value={altNames} onChange={(e) => setAltNames(e.target.value)} />
          {!isReview && (
            <Select label="Estado" selectedKeys={[status]} onSelectionChange={(k) => setStatus(Array.from(k)[0] as any)} size="sm">
              {["pending","approved","rejected"].map((s) => <SelectItem key={s} className="capitalize">{s}</SelectItem>)}
            </Select>
          )}
          <div className="flex items-center gap-3"><Switch isSelected={featured} onValueChange={setFeatured}>Destacado</Switch></div>
        </div>

        {team.requested_in_application_id && isReview && (
          <p className="text-xs text-bh-fg-4">
            Solicitado desde una aplicación de jugador.
          </p>
        )}

        {/* Acciones y subida de escudo — botones abajo a la derecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="flex flex-col gap-3 p-3 border border-default-200 rounded-medium bg-default-50/50">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Escudo del Equipo</span>
              <input
                aria-label="Subir escudo"
                type="file"
                accept="image/png,image/svg+xml"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onCrestFileChange(f); }}
                className="text-sm"
              />
            </div>

            <div className="flex items-center w-full gap-2 opacity-50">
              <hr className="flex-1 border-white/[0.08]" />
              <span className="text-[10px] text-bh-fg-4 uppercase font-semibold">O pegar enlace</span>
              <hr className="flex-1 border-white/[0.08]" />
            </div>

            <div>
              <Input type="url" size="sm" placeholder="https://wikipedia.org/.../logo.svg" value={externalCrestUrl} onChange={e => { setExternalCrestUrl(e.target.value); if (e.target.value.trim()) setPendingCrestFile(null); }} />
              <p className="text-[10px] text-bh-fg-4 mt-1">El URL reemplazará el archivo al guardar los cambios.</p>
            </div>
          </div>

          {isReview ? (
            <div className="flex flex-col gap-2 md:items-end">
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end w-full">
                <Button variant="flat" onPress={handleSaveDraft} isLoading={busy && action === "save"} isDisabled={busy}>Guardar cambios</Button>
                <Button color="success" onPress={handleApprove} isLoading={busy && action === "approve"} isDisabled={busy}>Aprobar equipo</Button>
              </div>
              <Button size="sm" color="danger" variant="light" onPress={handleReject} isLoading={busy && action === "reject"} isDisabled={busy} className="sm:self-end">
                Rechazar solicitud
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end md:ml-auto">
              <Button variant="flat" onPress={onCancel} isDisabled={busy} className="sm:ml-auto">Cancelar</Button>
              {isCreate ? (
                <Button color="primary" onPress={handleCreate} isLoading={busy && action === "create"} isDisabled={busy || !name.trim()}>Crear equipo</Button>
              ) : (
                <Button color="primary" onPress={handleSave} isLoading={busy && action === "save"} isDisabled={busy}>Guardar cambios</Button>
              )}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
