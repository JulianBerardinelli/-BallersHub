"use client";

import * as React from "react";
import Image from "next/image";
import {
  Button,
  Autocomplete,
  AutocompleteItem,
  Chip,
  Switch,
} from "@heroui/react";
import { supabase } from "@/lib/supabase/client";
import { type CountryPick } from "@/components/common/CountrySinglePicker";
import CountryFlag from "@/components/common/CountryFlag";
import { validateYears, YEAR_MIN, YEAR_MAX } from "./career-utils";

import FormField from "@/components/dashboard/client/FormField";
import { bhButtonClass } from "@/components/ui/BhButton";
import { bhChip, bhSwitchClassNames } from "@/lib/ui/heroui-brand";
import TeamCombobox, { type TeamComboboxValue } from "@/components/teams/TeamCombobox";

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
  division_id?: string | null;
  division_meta?: { crest_url?: string | null } | null;
  // Categoría/liga adicional opcional para etapas donde el jugador disputó
  // dos competencias en simultáneo (reserva, equipo II/U20, etc).
  secondary_division?: string | null;
  secondary_division_id?: string | null;
  secondary_division_meta?: { crest_url?: string | null } | null;
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
  showCurrentToggle = true,
  onRequestCurrentChange,
}: {
  value: RowDraft;
  onPatch: (patch: Partial<RowDraft>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRemove: () => void;
  overlapError?: string | null;
  showCurrentToggle?: boolean;
  onRequestCurrentChange?: (selected: boolean) => boolean | void;
}) {
  // --- Club: shared search-or-propose combobox ---
  const teamValue: TeamComboboxValue = value.team_id
    ? {
        mode: "approved",
        teamId: value.team_id,
        teamName: value.club,
        country: null,
        countryCode: value.team_meta?.country_code ?? null,
        teamCrest: value.team_meta?.crest_url ?? null,
      }
    : value.proposed
    ? {
        mode: "new",
        name: value.club,
        country: value.proposed.country?.name ?? null,
        countryCode: value.proposed.country?.code ?? null,
        tmUrl: value.proposed.tmUrl ?? null,
      }
    : null;

  function handleTeamChange(v: TeamComboboxValue) {
    if (!v) {
      onPatch({ club: "", team_id: null, team_meta: null, proposed: null });
      return;
    }
    if (v.mode === "approved") {
      onPatch({
        club: v.teamName,
        team_id: v.teamId,
        team_meta: { slug: undefined, country_code: v.countryCode ?? null, crest_url: v.teamCrest ?? null },
        proposed: null,
      });
    } else {
      onPatch({
        club: v.name,
        team_id: null,
        team_meta: null,
        proposed: {
          country: v.countryCode ? { code: v.countryCode, name: v.country ?? v.countryCode } : null,
          tmUrl: v.tmUrl ?? null,
        },
      });
    }
  }

  // --- Autocomplete Division (principal) ---
  const [divQ, setDivQ] = React.useState(value.division ?? "");
  const [divs, setDivs] = React.useState<any[]>([]);
  const [divLoading, setDivLoading] = React.useState(false);
  const [selectedDivKey, setSelectedDivKey] = React.useState<string | null>(
    value.division_id ? value.division_id : null
  );

  // --- Autocomplete Division (secundaria opcional) ---
  // El toggle queda activo si la fila viene con secundaria persistida o si
  // el usuario lo activa manualmente. Limpiar el toggle dropea ambos campos.
  const [secondaryEnabled, setSecondaryEnabled] = React.useState<boolean>(
    Boolean(value.secondary_division_id || (value.secondary_division ?? "").trim())
  );
  const [secondaryDivQ, setSecondaryDivQ] = React.useState(value.secondary_division ?? "");
  const [selectedSecondaryDivKey, setSelectedSecondaryDivKey] = React.useState<string | null>(
    value.secondary_division_id ? value.secondary_division_id : null
  );

  React.useEffect(() => {
    let cancelled = false;
    async function loadDivs() {
      setDivLoading(true);
      let query = supabase.from("divisions").select("id, name, country_code, crest_url").eq("status", "approved");
      const c = value.team_meta?.country_code || value.proposed?.country?.code;
      if (c) query = query.eq("country_code", c);

      const { data } = await query.order("level", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      setDivs(data || []);
      setDivLoading(false);
    }
    loadDivs();
    return () => { cancelled = true; };
  }, [value.team_meta?.country_code, value.proposed?.country?.code]);

  // Backfill en cliente: si la fila vino con `division` (texto legacy) pero
  // sin `division_id`, y el texto matchea exacto con una división del
  // catálogo recién cargada, linkeamos automáticamente para que la fila se
  // guarde como enlazada al catálogo. Lo mismo para la secundaria.
  React.useEffect(() => {
    if (!divs.length) return;
    const norm = (s: string) => s.trim().toLowerCase();

    if (!value.division_id && value.division) {
      const match = divs.find((d) => norm(d.name as string) === norm(value.division as string));
      if (match) {
        setSelectedDivKey(match.id);
        onPatch({
          division: match.name,
          division_id: match.id,
          division_meta: { crest_url: match.crest_url },
        });
      }
    }

    if (!value.secondary_division_id && value.secondary_division) {
      const match = divs.find(
        (d) => norm(d.name as string) === norm(value.secondary_division as string),
      );
      if (match) {
        setSelectedSecondaryDivKey(match.id);
        onPatch({
          secondary_division: match.name,
          secondary_division_id: match.id,
          secondary_division_meta: { crest_url: match.crest_url },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divs]);

  // --- Años: strings locales para evitar “pelea” de inputs ---
  const [startStr, setStartStr] = React.useState<string>(value.start_year ? String(value.start_year) : "");
  const [endStr, setEndStr] = React.useState<string>(value.end_year ? String(value.end_year) : "");

  const [touchedStart, setTouchedStart] = React.useState(false);
  const [touchedEnd, setTouchedEnd] = React.useState(false);
  const [triedConfirm, setTriedConfirm] = React.useState(false);

  const isCurrent = value.source === "current";

  React.useEffect(() => { setStartStr(value.start_year ? String(value.start_year) : ""); }, [value.start_year]);
  React.useEffect(() => { setEndStr(value.end_year ? String(value.end_year) : ""); }, [value.end_year]);

  // Si el usuario tipea texto que matchea exacto (case-insensitive) con una
  // división del catálogo, auto-linkeamos el id para que la fila quede
  // enlazada al catálogo (crest en portfolio, filtros por liga, etc).
  // Antes esto solo pasaba al hacer click explícito en el dropdown.
  function findExactDivisionMatch(input: string) {
    const target = input.trim().toLowerCase();
    if (!target) return null;
    return divs.find((d) => (d.name as string).toLowerCase() === target) ?? null;
  }

  function handleDivChange(v: string) {
    setDivQ(v);

    const match = findExactDivisionMatch(v);
    if (match) {
      setSelectedDivKey(match.id);
      onPatch({
        division: match.name,
        division_id: match.id,
        division_meta: { crest_url: match.crest_url },
      });
      return;
    }

    if (selectedDivKey && v !== divs.find((d) => d.id === selectedDivKey)?.name) {
      setSelectedDivKey(null);
      onPatch({ division_id: null, division_meta: null });
    }
    onPatch({ division: v });
  }

  function handleSecondaryDivChange(v: string) {
    setSecondaryDivQ(v);

    const match = findExactDivisionMatch(v);
    if (match && match.id !== selectedDivKey) {
      setSelectedSecondaryDivKey(match.id);
      onPatch({
        secondary_division: match.name,
        secondary_division_id: match.id,
        secondary_division_meta: { crest_url: match.crest_url },
      });
      return;
    }

    if (
      selectedSecondaryDivKey &&
      v !== divs.find((d) => d.id === selectedSecondaryDivKey)?.name
    ) {
      setSelectedSecondaryDivKey(null);
      onPatch({ secondary_division_id: null, secondary_division_meta: null });
    }
    onPatch({ secondary_division: v });
  }

  function toggleSecondary(enabled: boolean) {
    setSecondaryEnabled(enabled);
    if (!enabled) {
      setSecondaryDivQ("");
      setSelectedSecondaryDivKey(null);
      onPatch({
        secondary_division: null,
        secondary_division_id: null,
        secondary_division_meta: null,
      });
    }
  }

  // Validaciones de años
  const yMsgs = validateYears(
    startStr.length === 4 ? Number(startStr) : null,
    value.lockEnd ? null : (endStr.length === 4 ? Number(endStr) : null)
  );
  const showErrors = triedConfirm || touchedStart || touchedEnd;
  const startInvalid = showErrors && yMsgs.some(m => m.toLowerCase().includes("desde"));
  const endInvalid   = !value.lockEnd && showErrors && yMsgs.some(m => m.toLowerCase().includes("hasta"));

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

  // shared brand classNames for both Autocompletes
  // Nota popover: la celda del grid puede ser angosta (ej. División en
  // lg:col-span-1 ≈ 180px) y trunca el listado a "Prime…"/"Segu…". Forzamos
  // un ancho mínimo en el popover para que los nombres de liga se vean
  // completos, sin agrandar la celda del input.
  const autocompleteBrandProps = {
    inputProps: {
      classNames: {
        inputWrapper:
          "bg-bh-surface-1 border border-white/[0.08] shadow-none transition-colors duration-150 hover:border-white/[0.18] data-[focus=true]:border-bh-lime data-[focus=true]:bg-bh-surface-1 data-[invalid=true]:border-bh-danger",
        input: "text-[14px] text-bh-fg-1 placeholder:text-bh-fg-4",
        label: "!text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2 whitespace-nowrap",
      },
    },
    listboxProps: {
      itemClasses: {
        base: "rounded-bh-md text-bh-fg-2 data-[hover=true]:bg-white/[0.05] data-[hover=true]:text-bh-fg-1 data-[selectable=true]:focus:bg-white/[0.05] data-[focus=true]:bg-white/[0.05]",
        title: "text-[13px] whitespace-normal",
      },
    },
    popoverProps: {
      placement: "bottom-start" as const,
      classNames: {
        content:
          "bg-bh-surface-1 border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.7)] p-1 rounded-bh-lg min-w-[320px] max-w-[420px]",
      },
    },
  };

  return (
    <div
      className={`grid grid-cols-1 items-end gap-3 rounded-bh-lg border border-[rgba(204,255,0,0.18)] bg-bh-surface-1/40 p-4 ${
        secondaryEnabled ? "lg:grid-cols-6" : "lg:grid-cols-5"
      }`}
    >
      <div className="lg:col-span-2">
        <TeamCombobox
          variant="field"
          label="Club"
          value={teamValue}
          seedText={value.club}
          onChange={handleTeamChange}
        />
      </div>

      <Autocomplete
          label="División"
          labelPlacement="outside"
          menuTrigger="input"
          {...autocompleteBrandProps}
          inputValue={divQ}
          onInputChange={handleDivChange}
          isLoading={divLoading}
          selectedKey={selectedDivKey ?? undefined}
          onSelectionChange={(key) => {
            const k = String(key || "");
            if (!k) return;
            const isNew = k.startsWith("new:");
            if (isNew) {
              setSelectedDivKey(k);
              onPatch({ division_id: null, division: divQ, division_meta: null });
            } else {
              const d = divs.find((i) => i.id === k);
              if (d) {
                setSelectedDivKey(d.id);
                setDivQ(d.name);
                onPatch({ division: d.name, division_id: d.id, division_meta: { crest_url: d.crest_url } });
              }
            }
          }}
          items={[
            ...(!divLoading && divQ.trim().length > 1 && !divs.some(d => d.name.toLowerCase() === divQ.toLowerCase())
              ? ([{ id: `new:${divQ.trim()}`, name: divQ.trim() }] as any)
              : []),
            ...divs,
          ]}
          placeholder="Primera / Sub-20…"
        >
          {(item: any) => {
            const isNew = String(item.id).startsWith("new:");
            if (isNew) {
              return (
                <AutocompleteItem key={item.id} textValue={`Proponer ${item.name}`}>
                  <div className="flex flex-col">
                    <span>“{item.name}” (Sugerir nueva liga)</span>
                  </div>
                </AutocompleteItem>
              );
            }
            return (
              <AutocompleteItem key={item.id} textValue={item.name} startContent={
                  <Image src={item.crest_url || "/images/team-default.svg"} width={16} height={16} unoptimized={!item.crest_url} className="h-4 w-4 object-contain" alt="" />
              }>
                {item.name}
              </AutocompleteItem>
            );
          }}
        </Autocomplete>

        {secondaryEnabled ? (
        <Autocomplete
            label="Otra categoría/liga"
            labelPlacement="outside"
            menuTrigger="input"
            {...autocompleteBrandProps}
            inputValue={secondaryDivQ}
            onInputChange={handleSecondaryDivChange}
            isLoading={divLoading}
            selectedKey={selectedSecondaryDivKey ?? undefined}
            onSelectionChange={(key) => {
              const k = String(key || "");
              if (!k) return;
              const isNew = k.startsWith("new:");
              if (isNew) {
                setSelectedSecondaryDivKey(k);
                onPatch({
                  secondary_division_id: null,
                  secondary_division: secondaryDivQ,
                  secondary_division_meta: null,
                });
              } else {
                const d = divs.find((i) => i.id === k);
                if (d) {
                  setSelectedSecondaryDivKey(d.id);
                  setSecondaryDivQ(d.name);
                  onPatch({
                    secondary_division: d.name,
                    secondary_division_id: d.id,
                    secondary_division_meta: { crest_url: d.crest_url },
                  });
                }
              }
            }}
            items={[
              ...(!divLoading &&
              secondaryDivQ.trim().length > 1 &&
              !divs.some((d) => d.name.toLowerCase() === secondaryDivQ.toLowerCase())
                ? ([{ id: `new:${secondaryDivQ.trim()}`, name: secondaryDivQ.trim() }] as any)
                : []),
              ...divs.filter((d) => d.id !== selectedDivKey),
            ]}
            placeholder="Reserva / U20 / Segunda…"
          >
            {(item: any) => {
              const isNew = String(item.id).startsWith("new:");
              if (isNew) {
                return (
                  <AutocompleteItem key={item.id} textValue={`Proponer ${item.name}`}>
                    <div className="flex flex-col">
                      <span>“{item.name}” (Sugerir nueva liga)</span>
                    </div>
                  </AutocompleteItem>
                );
              }
              return (
                <AutocompleteItem
                  key={item.id}
                  textValue={item.name}
                  startContent={
                    <Image
                      src={item.crest_url || "/images/team-default.svg"}
                      width={16}
                      height={16}
                      unoptimized={!item.crest_url}
                      className="h-4 w-4 object-contain"
                      alt=""
                    />
                  }
                >
                  {item.name}
                </AutocompleteItem>
              );
            }}
          </Autocomplete>
        ) : null}

      <FormField
        type="text"
        inputMode="numeric"
        pattern="\d*"
        label="Desde (año)"
        placeholder="2019"
        value={startStr}
        onChange={(e) => onStartChange(e.target.value)}
        onBlur={() => setTouchedStart(true)}
        min={YEAR_MIN}
        max={YEAR_MAX}
        isInvalid={startInvalid}
      />

      <FormField
        type="text"
        inputMode="numeric"
        pattern="\d*"
        label={value.lockEnd ? "Hasta (Actual)" : "Hasta (año)"}
        placeholder={value.lockEnd ? "Actual" : "2024"}
        value={value.lockEnd ? "" : endStr}
        onChange={(e) => onEndChange(e.target.value)}
        onBlur={() => setTouchedEnd(true)}
        min={YEAR_MIN}
        max={YEAR_MAX}
        disabled={!!value.lockEnd}
        isInvalid={endInvalid}
      />

      <div className={`flex flex-col gap-3 ${secondaryEnabled ? "lg:col-span-6" : "lg:col-span-5"}`}>
        {/* Fila de toggles — alineados a la derecha, encima de los botones. */}
        <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
            {showCurrentToggle ? (
              <Switch
                size="sm"
                isSelected={isCurrent}
                onValueChange={(selected) => {
                  if (selected) {
                    const allowed = onRequestCurrentChange ? onRequestCurrentChange(true) !== false : true;
                    if (!allowed) return;
                    onPatch({ source: "current", lockEnd: true, end_year: null });
                  } else {
                    onPatch({ source: "manual", lockEnd: false });
                    onRequestCurrentChange?.(false);
                  }
                }}
                classNames={bhSwitchClassNames}
              >
                Es mi equipo actual
              </Switch>
            ) : null}

            <Switch
              size="sm"
              isSelected={secondaryEnabled}
              onValueChange={toggleSecondary}
              classNames={bhSwitchClassNames}
            >
              Disputé otra categoría/liga
            </Switch>
        </div>

        {/* Fila inferior — chips/errores a la izquierda, botones a la derecha. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {value.team_id && (
              <Chip variant="flat" classNames={bhChip("success")}>Equipo verificado</Chip>
            )}
            {!value.team_id && value.proposed?.country && (
              <Chip
                variant="flat"
                startContent={<CountryFlag code={value.proposed.country.code} size={12} />}
                classNames={bhChip("neutral")}
              >
                {value.proposed.country.name}
              </Chip>
            )}
            {!value.team_id && value.proposed?.tmUrl && (
              <Chip variant="flat" classNames={bhChip("blue")}>TM OK</Chip>
            )}
            {/* Aviso suave si la liga quedó como texto libre (no enlazada al
                catálogo). Esa fila no aparecerá en filtros por liga ni
                mostrará crest en el portfolio. Aplica a primaria y
                secundaria. */}
            {((value.division && value.division.trim() && !value.division_id) ||
              (value.secondary_division && value.secondary_division.trim() && !value.secondary_division_id)) ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-bh-fg-3">
                <span aria-hidden>⚠</span>
                Liga sin enlazar al catálogo — usá el desplegable o se cargará como texto suelto.
              </span>
            ) : null}
            {showErrors && yMsgs.length > 0 && (
              <span className="text-[12px] text-bh-danger">{yMsgs[0]}</span>
            )}
            {overlapError && (
              <span className="text-[12px] text-bh-danger">{overlapError}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!value.lockDelete && (
              <Button
                size="sm"
                variant="light"
                onPress={onCancel}
                className={bhButtonClass({ variant: "ghost", size: "sm" })}
              >
                Cancelar
              </Button>
            )}
            <Button
              size="sm"
              onPress={handleConfirm}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              Confirmar etapa
            </Button>
            {!value.lockDelete && (
              <Button
                size="sm"
                variant="light"
                onPress={onRemove}
                className={bhButtonClass({ variant: "icon-danger", size: "sm" })}
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
