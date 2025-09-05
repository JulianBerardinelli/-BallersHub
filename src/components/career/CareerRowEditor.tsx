"use client";

import * as React from "react";
import {
  Button,
  Input,
  Autocomplete,
  AutocompleteItem,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { supabase } from "@/lib/supabase/client";
import CountrySinglePicker, { type CountryPick } from "@/components/common/CountrySinglePicker";
import CountryFlag from "@/components/common/CountryFlag";
import { validateYears, YEAR_MIN, YEAR_MAX } from "./career-utils";

export type TeamLite = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  country_code: string | null;
  crest_url: string | null;
};

export type RowDraft = {
  id: string;
  club: string;
  division?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  team_id?: string | null;
  team_meta?: { slug?: string | null; country_code?: string | null; crest_url?: string | null } | null;
  proposed?: { country?: CountryPick | null; tmUrl?: string | null } | null;

  // flags de UI/UX
  lockEnd?: boolean;     // si true, “Hasta” bloqueado (= Actual)
  lockDelete?: boolean;  // si true, no mostrar acciones de eliminar/cancelar
  source?: "current" | "manual";
};

export default function CareerRowEditor({
  value,
  onPatch,
  onConfirm,
  onCancel,
  onRemove,
  overlapError,
}: {
  value: RowDraft;
  onPatch: (patch: Partial<RowDraft>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRemove: () => void;
  overlapError?: string | null;
}) {
  // --- Autocomplete club ---
  const [q, setQ] = React.useState(value.club ?? "");
  const [items, setItems] = React.useState<TeamLite[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(
    value.team_id ? value.team_id : value.proposed ? `new:${value.club}` : null
  );
  const [selectedTeam, setSelectedTeam] = React.useState<TeamLite | null>(null);
  const selectedLabelRef = React.useRef<string | null>(value.club || null);

  // --- Años: strings locales para evitar “pelea” de inputs ---
  const [startStr, setStartStr] = React.useState<string>(value.start_year ? String(value.start_year) : "");
  const [endStr, setEndStr] = React.useState<string>(value.end_year ? String(value.end_year) : "");

  const [touchedStart, setTouchedStart] = React.useState(false);
  const [touchedEnd, setTouchedEnd] = React.useState(false);
  const [triedConfirm, setTriedConfirm] = React.useState(false);

  React.useEffect(() => { setStartStr(value.start_year ? String(value.start_year) : ""); }, [value.start_year]);
  React.useEffect(() => { setEndStr(value.end_year ? String(value.end_year) : ""); }, [value.end_year]);

  // --- Modal detalles de equipo propuesto ---
  const [modalOpen, setModalOpen] = React.useState(false);
  const [tmpCountry, setTmpCountry] = React.useState<CountryPick | null>(value.proposed?.country ?? null);
  const [tmpTm, setTmpTm] = React.useState<string>(value.proposed?.tmUrl ?? "");

  // Buscar equipos (debounce)
  React.useEffect(() => {
    if (!q.trim()) { setItems([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_teams", { p_q: q.trim(), p_limit: 8 });
      if (cancelled) return;
      setLoading(false);
      if (error) { console.error("search_teams:", error.message); setItems([]); return; }
      const list = (data ?? []) as TeamLite[];
      setItems(list);
      if (selectedKey && !String(selectedKey).startsWith("new:") && !selectedTeam) {
        const found = list.find((i) => i.id === selectedKey);
        if (found) setSelectedTeam(found);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function selectApproved(t: TeamLite) {
    setSelectedKey(t.id);
    selectedLabelRef.current = t.name;
    setSelectedTeam(t);
    setQ(t.name);
    onPatch({
      club: t.name,
      team_id: t.id,
      team_meta: { slug: t.slug, country_code: t.country_code, crest_url: t.crest_url },
      proposed: null,
    });
  }

  function selectCreate() {
    const label = q.trim();
    const key = `new:${label}`;
    setSelectedKey(key);
    selectedLabelRef.current = label;
    setSelectedTeam(null);
    onPatch({ club: label, team_id: null, team_meta: null, proposed: { country: tmpCountry, tmUrl: tmpTm || null } });
    setModalOpen(true);
  }

  function handleInputChange(v: string) {
    setQ(v);
    if (selectedKey && selectedLabelRef.current && v !== selectedLabelRef.current) {
      setSelectedKey(null);
      setSelectedTeam(null);
      onPatch({ team_id: null, team_meta: null, proposed: null });
    }
    onPatch({ club: v });
  }

  function saveModal() {
    onPatch({ proposed: { country: tmpCountry ?? null, tmUrl: tmpTm || null } });
    setModalOpen(false);
  }

  // Validaciones de años
  const yMsgs = validateYears(
    startStr.length === 4 ? Number(startStr) : null,
    value.lockEnd ? null : (endStr.length === 4 ? Number(endStr) : null)
  );
  const showErrors = triedConfirm || touchedStart || touchedEnd;
  const startInvalid = showErrors && yMsgs.some(m => m.toLowerCase().includes("desde"));
  const endInvalid   = !value.lockEnd && showErrors && yMsgs.some(m => m.toLowerCase().includes("hasta"));

  const urlOk = !tmpTm || /^https?:\/\/[^ "]+$/i.test(tmpTm);
  const canConfirm =
    (value.club?.trim()?.length ?? 0) > 1 &&
    yMsgs.length === 0 &&
    (!value.proposed || (value.proposed && value.proposed.country)) &&
    !overlapError;

  // Handlers de años (independientes)
  function onStartChange(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 4);
    setStartStr(clean);
    onPatch({ start_year: clean.length === 4 ? Number(clean) : null });
  }
  function onEndChange(v: string) {
    if (value.lockEnd) return; // “Actual”
    const clean = v.replace(/\D/g, "").slice(0, 4);
    setEndStr(clean);
    onPatch({ end_year: clean.length === 4 ? Number(clean) : null });
  }

  function handleConfirm() {
    if (canConfirm && !overlapError) onConfirm();
    else setTriedConfirm(true);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 items-end rounded-lg border p-3">
      <div className="lg:col-span-2">
        <Autocomplete
          label="Club"
          labelPlacement="outside"
          menuTrigger="input"
          inputValue={q}
          onInputChange={handleInputChange}
          isLoading={loading}
          selectedKey={selectedKey ?? undefined}
          onSelectionChange={(key) => {
            const k = String(key || "");
            if (!k) return;
            if (k.startsWith("new:")) selectCreate();
            else {
              const t = items.find((i) => i.id === k);
              if (t) selectApproved(t);
            }
          }}
          items={[
            ...(!loading && q.trim().length > 1 && items.length === 0
              ? ([{ id: `new:${q.trim()}`, name: q.trim(), slug: "", country: null, country_code: null, crest_url: null }] as any)
              : []),
            ...items,
          ]}
          startContent={
            selectedKey && !String(selectedKey).startsWith("new:") && selectedTeam
              ? <img src={selectedTeam.crest_url || "/images/team-default.svg"} width={18} height={18} className="h-5 w-5 object-contain" alt="" />
              : null
          }
        >
          {(item: any) => {
            const isNew = String(item.id).startsWith("new:");
            if (isNew) {
              return (
                <AutocompleteItem key={item.id} textValue={`Crear ${item.name}`}>
                  <div className="flex flex-col">
                    <span>“{item.name}” no está en la base</span>
                    <span className="text-foreground-500 text-xs">Proponer nuevo equipo</span>
                  </div>
                </AutocompleteItem>
              );
            }
            return (
              <AutocompleteItem
                key={item.id}
                textValue={`${item.name} ${item.slug}`}
                startContent={
                  <img src={item.crest_url || "/images/team-default.svg"} width={18} height={18} className="h-5 w-5 object-contain" alt="" />
                }
                description={
                  <div className="flex items-center gap-1 text-foreground-500">
                    {item.country_code && <CountryFlag code={item.country_code} size={12} />}
                    {item.country_code ? `(${item.country_code})` : null} · @{item.slug}
                  </div>
                }
              >
                {item.name}
              </AutocompleteItem>
            );
          }}
        </Autocomplete>
      </div>

      <Input
        label="División/Categoría"
        labelPlacement="outside"
        value={value.division ?? ""}
        onChange={(e) => onPatch({ division: e.target.value })}
        placeholder="Primera / Sub-20 / Amateur…"
        classNames={{ label: "whitespace-nowrap" }}
      />

      <Input
        type="text"
        inputMode="numeric"
        pattern="\d*"
        label="Desde (año)"
        labelPlacement="outside"
        placeholder="2019"
        value={startStr}
        onValueChange={onStartChange}
        onBlur={() => setTouchedStart(true)}
        min={YEAR_MIN}
        max={YEAR_MAX}
        isInvalid={startInvalid}
      />

      <Input
        type="text"
        inputMode="numeric"
        pattern="\d*"
        label={value.lockEnd ? "Hasta (Actual)" : "Hasta (año)"}
        labelPlacement="outside"
        placeholder={value.lockEnd ? "Actual" : "2024"}
        value={value.lockEnd ? "" : endStr}
        onValueChange={onEndChange}
        onBlur={() => setTouchedEnd(true)}
        min={YEAR_MIN}
        max={YEAR_MAX}
        isDisabled={!!value.lockEnd}
        isInvalid={endInvalid}
      />

      <div className="lg:col-span-5 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {value.team_id && <Chip color="success" variant="flat">Equipo verificado</Chip>}
          {!value.team_id && value.proposed?.country && (
            <Chip variant="flat" startContent={<CountryFlag code={value.proposed.country.code} size={12} />}>
              {value.proposed.country.name}
            </Chip>
          )}
          {!value.team_id && value.proposed?.tmUrl && <Chip variant="flat">TM OK</Chip>}
          {showErrors && yMsgs.length > 0 && <span className="text-danger text-sm">{yMsgs[0]}</span>}
          {overlapError && <span className="text-danger text-sm">{overlapError}</span>}
        </div>

        <div className="flex gap-2">
          {!value.team_id && (
            <Button size="sm" variant="flat" onPress={() => setModalOpen(true)}>
              {value.proposed?.country || value.proposed?.tmUrl ? "Editar detalles" : "Completar detalles"}
            </Button>
          )}
          {!value.lockDelete && <Button size="sm" variant="light" onPress={onCancel}>Cancelar</Button>}
          <Button size="sm" color="primary" onPress={handleConfirm}>
            Confirmar etapa
          </Button>
          {!value.lockDelete && (
            <Button size="sm" variant="light" color="danger" onPress={onRemove}>Eliminar</Button>
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onOpenChange={(o) => !o && setModalOpen(false)}
        size="md"
        backdrop="blur"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="pr-12">Equipo propuesto: {value.club || "Nuevo equipo"}</ModalHeader>
          <ModalBody className="grid gap-3">
            <CountrySinglePicker
              label="País"
              value={tmpCountry}
              onChange={setTmpCountry}
              isInvalid={!!value.club && !tmpCountry}
              errorMessage="Elegí un país"
            />
            <Input
              label="Transfermarkt (opcional)"
              labelPlacement="outside"
              value={tmpTm}
              onChange={(e) => setTmpTm(e.target.value)}
              isInvalid={!!tmpTm && !/^https?:\/\/[^ "]+$/i.test(tmpTm)}
              errorMessage="URL inválida (https://...)"
              placeholder="https://www.transfermarkt.com/..."
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setModalOpen(false)}>Cancelar</Button>
            <Button color="primary" onPress={saveModal} isDisabled={!urlOk || !tmpCountry}>
              Guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
