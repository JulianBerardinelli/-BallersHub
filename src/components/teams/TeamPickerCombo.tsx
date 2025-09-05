"use client";

import * as React from "react";
import {
  Autocomplete,
  AutocompleteItem,
  Switch,
  Chip,
  Kbd,
  ScrollShadow,
  Input,
} from "@heroui/react";
import { supabase } from "@/lib/supabase/client";
import CountryFlag from "@/components/common/CountryFlag";
import CountrySinglePicker, { type CountryPick } from "@/components/common/CountrySinglePicker";

export type TeamLite = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  country_code: string | null;
  crest_url: string | null;
};

export type TeamPickerValue =
  | {
      mode: "approved";
      teamId: string;
      teamName: string;
      country?: string | null;
      countryCode?: string | null;
      teamCrest?: string | null; // 👈 crest para reusar abajo
    }
  | { mode: "new"; name: string; country?: string | null; countryCode?: string | null; tmUrl?: string | null }
  | { mode: "free" }
  | null;

export default function TeamPickerCombo({
  applicationId,
  defaultValue = null,
  isFreeAgent,
  onFreeAgentChange,
  onChange,
  isInvalid,
  errorMessage,
}: {
  applicationId?: string;
  defaultValue?: TeamPickerValue;
  isFreeAgent: boolean;
  onFreeAgentChange: (val: boolean) => void;
  onChange: (v: TeamPickerValue) => void;
  isInvalid?: boolean;
  errorMessage?: React.ReactNode;
}) {
  const [inputValue, setInputValue] = React.useState("");
  const [items, setItems] = React.useState<TeamLite[]>([]);
  const [loading, setLoading] = React.useState(false);

  // selección controlada
  const [picked, setPicked] = React.useState<TeamPickerValue>(defaultValue ?? null);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(
    defaultValue?.mode === "approved"
      ? (defaultValue as any).teamId
      : defaultValue?.mode === "new"
      ? `new:${(defaultValue as any).name}`
      : null
  );
  const [selectedTeam, setSelectedTeam] = React.useState<TeamLite | null>(null);
  const selectedLabelRef = React.useRef<string | null>(
    defaultValue?.mode === "approved"
      ? (defaultValue as any).teamName
      : defaultValue?.mode === "new"
      ? (defaultValue as any).name
      : null
  );

  // extras para "nuevo equipo"
  const [newCountry, setNewCountry] = React.useState<CountryPick | null>(null);
  const [newTm, setNewTm] = React.useState("");

  /** Limpia todo. Si notifyParent=true, dispara onChange(null) */
  function resetAll(notifyParent: boolean = true) {
    setInputValue("");
    setSelectedKey(null);
    setSelectedTeam(null);
    selectedLabelRef.current = null;
    setPicked(null);
    setNewCountry(null);
    setNewTm("");
    if (notifyParent) onChange(null);
  }

  // init / sync con defaultValue (incluye null)
  React.useEffect(() => {
    // padre limpia (p.ej. al eliminar la etapa “current”)
    if (defaultValue === null) {
      resetAll(false);
      return;
    }
    if (!defaultValue) return; // undefined: no tocar

    setPicked(defaultValue);

    if (defaultValue.mode === "approved") {
      setInputValue(defaultValue.teamName);
      setSelectedKey(defaultValue.teamId);
      selectedLabelRef.current = defaultValue.teamName;
      setNewCountry(null);
      setNewTm("");
    } else if (defaultValue.mode === "new") {
      setInputValue(defaultValue.name);
      setSelectedKey(`new:${defaultValue.name}`);
      selectedLabelRef.current = defaultValue.name;
      setNewCountry(
        defaultValue.countryCode
          ? { code: defaultValue.countryCode, name: defaultValue.country ?? defaultValue.countryCode }
          : null
      );
      setNewTm(defaultValue.tmUrl ?? "");
    } else if (defaultValue.mode === "free") {
      // limpiar visual pero sin notificar al padre (ya notificó)
      resetAll(false);
      setPicked({ mode: "free" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValue)]);

  // Buscar equipos (debounce)
  React.useEffect(() => {
    if (!inputValue.trim()) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_teams", {
        p_q: inputValue.trim(),
        p_limit: 10,
      });
      if (cancelled) return;
      setLoading(false);
      if (error) {
        console.error("search_teams:", error.message);
        setItems([]);
        return;
      }
      const list = (data ?? []) as TeamLite[];
      setItems(list);
      // reconstruir seleccionado aprobado si hace falta
      if (selectedKey && !String(selectedKey).startsWith("new:") && !selectedTeam) {
        const found = list.find((x) => x.id === selectedKey);
        if (found) setSelectedTeam(found);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  function selectApproved(t: TeamLite) {
    const v: TeamPickerValue = {
      mode: "approved",
      teamId: t.id,
      teamName: t.name,
      country: t.country ?? undefined,
      countryCode: t.country_code ?? undefined,
      teamCrest: t.crest_url ?? null,
    };
    setPicked(v);
    onChange(v);
  }

  async function selectNew(name: string) {
    const v: TeamPickerValue = { mode: "new", name };
    setPicked(v);
    onChange(v); // luego se propagan país/TM por efecto
    if (applicationId) {
      const { error } = await supabase.rpc("request_team_from_application", {
        p_application_id: applicationId,
        p_name: name,
        p_country: null,
        p_category: null,
        p_tm_url: null,
        p_country_code: null,
      });
      if (error) console.error("request_team_from_application:", error.message);
    }
  }

  // Propagar cambios de país/TM cuando sea "nuevo"
  React.useEffect(() => {
    if (picked?.mode !== "new") return;
    onChange({
      mode: "new",
      name: picked.name,
      country: newCountry?.name ?? null,
      countryCode: newCountry?.code ?? null,
      tmUrl: newTm?.trim() || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newCountry, newTm]);

  function toggleFree(val: boolean) {
    onFreeAgentChange(val);
    if (val) {
      // setea "free" y limpia input/selección
      setPicked({ mode: "free" });
      onChange({ mode: "free" });
      resetAll(false);
      setPicked({ mode: "free" });
    }
    // si vuelve a desactivar "free", queda listo para tipear
  }

  const filtered = items;
  const noMatches = !loading && inputValue.trim().length > 1 && filtered.length === 0;

  const placeholder = isFreeAgent
    ? "Deshabilitado por jugador libre"
    : "Escribe para buscar tu club actual";

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Club actual</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-500">Jugador libre</span>
          <Switch isSelected={isFreeAgent} onValueChange={toggleFree} />
        </div>
      </div>

      <Autocomplete
        label=" "
        labelPlacement="outside"
        menuTrigger="input"
        allowsCustomValue={false}
        inputValue={inputValue}
        onFocus={() => {
          // Si había selección y el usuario toca para escribir, limpiamos y notificamos al padre
          if (selectedKey) {
            resetAll(); // notifyParent = true
          }
        }}
        onInputChange={(v) => {
          setInputValue(v);
          // si escribe distinto al label de selección, limpiar selección (por si quedó algo)
          if (selectedKey && selectedLabelRef.current && v !== selectedLabelRef.current) {
            setSelectedKey(null);
            setSelectedTeam(null);
            selectedLabelRef.current = null;
            if (!isFreeAgent) onChange(null);
          }
        }}
        selectedKey={selectedKey ?? undefined}
        onSelectionChange={(key) => {
          const id = String(key || "");
          if (!id) return;
          if (id.startsWith("new:")) {
            const name = inputValue.trim();
            const k = `new:${name}`;
            setSelectedKey(k);
            selectedLabelRef.current = name;
            setSelectedTeam(null);
            setInputValue(name);
            setNewCountry(null);
            setNewTm("");
            selectNew(name);
          } else {
            const t = filtered.find((x) => x.id === id);
            if (t) {
              setSelectedKey(t.id);
              selectedLabelRef.current = t.name;
              setSelectedTeam(t);
              setInputValue(t.name);
              setNewCountry(null);
              setNewTm("");
              selectApproved(t);
            }
          }
        }}
        items={[
          ...(noMatches
            ? ([
                {
                  id: `new:${inputValue.trim()}`,
                  name: inputValue.trim(),
                  slug: "",
                  country: null,
                  country_code: null,
                  crest_url: null,
                },
              ] as any)
            : []),
          ...filtered,
        ]}
        isDisabled={isFreeAgent}
        isLoading={loading}
        placeholder={placeholder}
        isInvalid={isInvalid}
        errorMessage={errorMessage}
        startContent={
          selectedKey && !String(selectedKey).startsWith("new:") && selectedTeam ? (
            <img
              src={selectedTeam.crest_url || "/images/team-default.svg"}
              width={18}
              height={18}
              className="h-5 w-5 object-contain"
              alt=""
            />
          ) : selectedKey && String(selectedKey).startsWith("new:") ? (
            <span className="text-xs px-1.5 py-0.5 rounded bg-warning-100 text-warning-700 dark:bg-warning-200/10">
              Nuevo
            </span>
          ) : null
        }
        description={
          selectedKey && !String(selectedKey).startsWith("new:") && selectedTeam ? (
            <div className="flex items-center gap-1 text-foreground-500">
              {selectedTeam.country_code && <CountryFlag code={selectedTeam.country_code} size={12} />}
              {selectedTeam.country_code ? `(${selectedTeam.country_code})` : null} · @{selectedTeam.slug}
            </div>
          ) : selectedKey && String(selectedKey).startsWith("new:") ? (
            <span className="text-foreground-500 text-xs">Se propondrá como nuevo equipo</span>
          ) : undefined
        }
      >
        {(item: any) => {
          const isNew = String(item.id).startsWith("new:");
          if (isNew) {
            return (
              <AutocompleteItem key={item.id} textValue={`Crear ${item.name}`}>
                <div className="flex flex-col">
                  <span>“{item.name}” no está en la base</span>
                  <span className="text-foreground-500 text-xs">Se enviará como solicitud de nuevo equipo</span>
                </div>
              </AutocompleteItem>
            );
          }
          return (
            <AutocompleteItem
              key={item.id}
              textValue={`${item.name} ${item.slug}`}
              startContent={
                <img
                  src={item.crest_url || "/images/team-default.svg"}
                  width={18}
                  height={18}
                  className="h-5 w-5 object-contain"
                  alt=""
                />
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

      {/* Campos extra para equipo NUEVO (arriba del badge) */}
      {!isFreeAgent && picked?.mode === "new" && (
        <div className="grid auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          <CountrySinglePicker label="País del nuevo equipo" value={newCountry} onChange={setNewCountry} />
          <Input
            label="Transfermarkt del equipo (opcional)"
            labelPlacement="outside"
            placeholder="https://www.transfermarkt.com/..."
            value={newTm}
            onChange={(e) => setNewTm(e.target.value)}
            isInvalid={!!newTm && !/^https?:\/\/[^ "]+$/i.test(newTm)}
            errorMessage="URL inválida (https://...)"
          />
        </div>
      )}

      {/* Selección actual (chips) */}
      <div className="min-h-9">
        {picked?.mode === "approved" && <Chip color="success" variant="flat">Seleccionado: {picked.teamName}</Chip>}
        {picked?.mode === "new" && (
          <Chip color="warning" variant="flat" onClose={() => resetAll()}>
            Se propondrá: {picked.name}
          </Chip>
        )}
        {picked?.mode === "free" && <Chip color="default" variant="flat">Jugador libre</Chip>}
      </div>

      {/* hint */}
      <div className="flex items-center justify-between text-xs text-foreground-500">
        <span>
          Usá Enter para elegir. <Kbd>Esc</Kbd> cierra.
        </span>
        <ScrollShadow as="div" />
      </div>
    </div>
  );
}
