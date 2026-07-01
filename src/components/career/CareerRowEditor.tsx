"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Button,
  Autocomplete,
  AutocompleteItem,
  Chip,
  Switch,
  Select,
  SelectItem,
} from "@heroui/react";
import { supabase } from "@/lib/supabase/client";
import { type CountryPick } from "@/components/common/CountrySinglePicker";
import CountryFlag from "@/components/common/CountryFlag";
import { validateYears, YEAR_MIN, YEAR_MAX } from "./career-utils";
import {
  STAFF_ROLES,
  MAX_STAGE_ROLES,
  isStaffRole,
  type StaffRoleType,
  STAFF_EXPERIENCE_KINDS,
  normalizeExperienceKind,
  isStaffExperienceKind,
  staffExperienceKindLabel,
  type StaffExperienceKind,
} from "@/lib/staff/roles";

import FormField from "@/components/dashboard/client/FormField";
import { bhButtonClass } from "@/components/ui/BhButton";
import { bhChip, bhSwitchClassNames, bhSelectClassNames } from "@/lib/ui/heroui-brand";
import TeamCombobox, { type TeamComboboxValue } from "@/components/teams/TeamCombobox";

// Accent- and case-insensitive normalization for client-side league filtering.
const normText = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

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
  // Cargo en esa etapa (DT principal, asistente, etc.). Coach-only — el editor
  // lo muestra solo con `showRole`; el flujo de players lo ignora.
  role_title?: string | null;
  // Roles estructurados de la etapa (máx 3, enum staff_role_type). Coach/staff-only
  // — el editor lo muestra solo con `showRoles`; el flujo de players lo ignora.
  roles?: StaffRoleType[] | null;
  // Tipo de experiencia de la etapa (staff_experience_kind). Coach/staff-only —
  // el editor lo muestra solo con `showExperienceKind`. Ausente/undefined = club
  // (players + dashboard actual → comportamiento intacto: TeamCombobox + división).
  experience_kind?: StaffExperienceKind | null;
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
  showRole = false,
  showRoles = false,
  showExperienceKind = false,
  allowOverlap = false,
}: {
  value: RowDraft;
  onPatch: (patch: Partial<RowDraft>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRemove: () => void;
  overlapError?: string | null;
  showCurrentToggle?: boolean;
  onRequestCurrentChange?: (selected: boolean) => boolean | void;
  /** Coach-only: render the "Cargo" (role) free-text field above the grid. */
  showRole?: boolean;
  /** Coach/staff-only: render the structured `roles[]` multi-select (máx 3). */
  showRoles?: boolean;
  /** Staff-only: render the "tipo de experiencia" selector (club/job/project).
   *  When the kind is not `club`, the team picker + division become a free-text
   *  organization name (no team linking). */
  showExperienceKind?: boolean;
  /** When true, an overlap with another stage is a non-blocking warning instead
   *  of blocking confirm (staff can hold two roles in the same period). */
  allowOverlap?: boolean;
}) {
  const t = useTranslations("dashEditProfile");
  // Labels de los 13 oficios — namespace `staff`, clave `roles.<key>`.
  const tStaffRoles = useTranslations("staff") as unknown as (key: string) => string;
  const selectedRoles = (value.roles ?? []).filter(isStaffRole);

  // Tipo de experiencia. undefined → club (players + dashboard actual → sin cambio).
  const kind = normalizeExperienceKind(value.experience_kind);
  const isClub = kind === "club";

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

  // Validaciones de años — códigos discriminados; localizamos al renderizar.
  const yIssues = validateYears(
    startStr.length === 4 ? Number(startStr) : null,
    value.lockEnd ? null : (endStr.length === 4 ? Number(endStr) : null)
  );
  const showErrors = triedConfirm || touchedStart || touchedEnd;
  const startInvalid = showErrors && yIssues.some((i) => i.field === "start" || i.field === "both");
  const endInvalid = !value.lockEnd && showErrors && yIssues.some((i) => i.field === "end" || i.field === "both");

  function translateIssue(code: ReturnType<typeof validateYears>[number]["code"]) {
    switch (code) {
      case "atLeastOneYear":
        return t("career.utils.atLeastOneYear");
      case "startOutOfRange":
        return t("career.utils.startOutOfRange", { min: YEAR_MIN, max: YEAR_MAX });
      case "endOutOfRange":
        return t("career.utils.endOutOfRange", { min: YEAR_MIN, max: YEAR_MAX });
      case "startAfterEnd":
        return t("career.utils.startAfterEnd");
    }
  }

  const canConfirm =
    (value.club?.trim()?.length ?? 0) > 1 &&
    yIssues.length === 0 &&
    (!value.proposed || (value.proposed && value.proposed.country)) &&
    (allowOverlap || !overlapError);

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
    if (canConfirm && (allowOverlap || !overlapError)) onConfirm();
    else setTriedConfirm(true);
  }

  // Layout: sin división ni secundaria cuando la etapa NO es un club/equipo.
  const gridClass = !isClub
    ? "lg:grid-cols-4"
    : secondaryEnabled
      ? "lg:grid-cols-6"
      : "lg:grid-cols-5";
  const bottomSpan = !isClub
    ? "lg:col-span-4"
    : secondaryEnabled
      ? "lg:col-span-6"
      : "lg:col-span-5";

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
          "bg-bh-surface-1 border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.7)] p-1 rounded-bh-lg min-w-[min(92vw,320px)] max-w-[420px]",
      },
    },
  };

  // HeroUI's Autocomplete does NOT filter a controlled `items` list, so we
  // filter the catalogue ourselves as the user types — mirroring the club
  // search. Empty query (or a query still equal to the current selection)
  // shows every league of the country; typing narrows it live.
  const divFiltered = React.useMemo(() => {
    const q = normText(divQ.trim());
    const selName = selectedDivKey
      ? normText(divs.find((d) => d.id === selectedDivKey)?.name ?? "")
      : "";
    if (!q || q === selName) return divs;
    return divs.filter((d) => normText(d.name as string).includes(q));
  }, [divQ, divs, selectedDivKey]);

  const secondaryDivFiltered = React.useMemo(() => {
    const base = divs.filter((d) => d.id !== selectedDivKey);
    const q = normText(secondaryDivQ.trim());
    const selName = selectedSecondaryDivKey
      ? normText(divs.find((d) => d.id === selectedSecondaryDivKey)?.name ?? "")
      : "";
    if (!q || q === selName) return base;
    return base.filter((d) => normText(d.name as string).includes(q));
  }, [secondaryDivQ, divs, selectedDivKey, selectedSecondaryDivKey]);

  return (
    <div className="space-y-3 rounded-bh-lg border border-[rgba(204,255,0,0.18)] bg-bh-surface-1/40 p-4">
      {showExperienceKind ? (
        <Select
          aria-label={t("career.rowEditor.experienceKindLabel")}
          label={t("career.rowEditor.experienceKindLabel")}
          labelPlacement="outside"
          variant="flat"
          disallowEmptySelection
          placeholder={t("career.rowEditor.experienceKindPlaceholder")}
          selectedKeys={[kind]}
          onSelectionChange={(keys) => {
            const nextKind = Array.from(keys)[0];
            const k = isStaffExperienceKind(nextKind) ? nextKind : "club";
            if (k === "club") {
              onPatch({ experience_kind: k });
            } else {
              // Trabajo / proyecto: sin equipo verificado ni división.
              onPatch({
                experience_kind: k,
                team_id: null,
                team_meta: null,
                proposed: null,
                division: null,
                division_id: null,
                division_meta: null,
                secondary_division: null,
                secondary_division_id: null,
                secondary_division_meta: null,
              });
            }
          }}
          classNames={bhSelectClassNames}
        >
          {STAFF_EXPERIENCE_KINDS.map((k) => (
            <SelectItem key={k}>{staffExperienceKindLabel(k, tStaffRoles)}</SelectItem>
          ))}
        </Select>
      ) : null}
      {showRoles ? (
        <Select
          aria-label={t("career.rowEditor.rolesLabel")}
          label={t("career.rowEditor.rolesLabel")}
          labelPlacement="outside"
          variant="flat"
          selectionMode="multiple"
          placeholder={t("career.rowEditor.rolesPlaceholder")}
          selectedKeys={selectedRoles}
          onSelectionChange={(keys) => {
            const arr = Array.from(keys)
              .filter(isStaffRole)
              .slice(0, MAX_STAGE_ROLES);
            onPatch({ roles: arr });
          }}
          classNames={bhSelectClassNames}
        >
          {STAFF_ROLES.map((r) => (
            <SelectItem key={r}>{tStaffRoles(`roles.${r}`)}</SelectItem>
          ))}
        </Select>
      ) : null}
      {showRole ? (
        <FormField
          label="Cargo"
          placeholder="Ej: Director Técnico"
          value={value.role_title ?? ""}
          onChange={(e) => onPatch({ role_title: e.target.value })}
        />
      ) : null}
      <div className={`grid grid-cols-1 items-end gap-3 ${gridClass}`}>
        <div className="lg:col-span-2">
          {isClub ? (
            <TeamCombobox
              variant="field"
              label={t("career.rowEditor.clubLabel")}
              value={teamValue}
              seedText={value.club}
              onChange={handleTeamChange}
            />
          ) : (
            <FormField
              label={t("career.rowEditor.orgNameLabel")}
              placeholder={t("career.rowEditor.orgNamePlaceholder")}
              value={value.club}
              onChange={(e) => onPatch({ club: e.target.value })}
            />
          )}
        </div>

      {isClub ? (
      <Autocomplete
          label={t("career.rowEditor.divisionLabel")}
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
            ...divFiltered,
          ]}
          placeholder={t("career.rowEditor.divisionPlaceholder")}
        >
          {(item: any) => {
            const isNew = String(item.id).startsWith("new:");
            if (isNew) {
              return (
                <AutocompleteItem key={item.id} textValue={t("career.rowEditor.proposeNewLeague", { name: item.name })}>
                  <div className="flex flex-col">
                    <span>{t("career.rowEditor.proposeNewLeague", { name: item.name })}</span>
                  </div>
                </AutocompleteItem>
              );
            }
            return (
              <AutocompleteItem key={item.id} textValue={item.name} startContent={
                  <Image src={item.crest_url || "/images/team-default.svg"} width={16} height={16} unoptimized className="h-4 w-4 object-contain" alt="" />
              }>
                {item.name}
              </AutocompleteItem>
            );
          }}
        </Autocomplete>
      ) : null}

        {isClub && secondaryEnabled ? (
        <Autocomplete
            label={t("career.rowEditor.secondaryDivisionLabel")}
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
              ...secondaryDivFiltered,
            ]}
            placeholder={t("career.rowEditor.secondaryDivisionPlaceholder")}
          >
            {(item: any) => {
              const isNew = String(item.id).startsWith("new:");
              if (isNew) {
                return (
                  <AutocompleteItem key={item.id} textValue={t("career.rowEditor.proposeNewLeague", { name: item.name })}>
                    <div className="flex flex-col">
                      <span>{t("career.rowEditor.proposeNewLeague", { name: item.name })}</span>
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
                      unoptimized
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
        label={t("career.rowEditor.fromLabel")}
        placeholder={t("career.rowEditor.fromPlaceholder")}
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
        label={value.lockEnd ? t("career.rowEditor.toLabelCurrent") : t("career.rowEditor.toLabelYear")}
        placeholder={value.lockEnd ? t("career.rowEditor.toPlaceholderCurrent") : t("career.rowEditor.toPlaceholderYear")}
        value={value.lockEnd ? "" : endStr}
        onChange={(e) => onEndChange(e.target.value)}
        onBlur={() => setTouchedEnd(true)}
        min={YEAR_MIN}
        max={YEAR_MAX}
        disabled={!!value.lockEnd}
        isInvalid={endInvalid}
      />

      <div className={`flex flex-col gap-3 ${bottomSpan}`}>
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
                {t("career.rowEditor.toggleCurrent")}
              </Switch>
            ) : null}

            {isClub ? (
              <Switch
                size="sm"
                isSelected={secondaryEnabled}
                onValueChange={toggleSecondary}
                classNames={bhSwitchClassNames}
              >
                {t("career.rowEditor.toggleSecondary")}
              </Switch>
            ) : null}
        </div>

        {/* Fila inferior — chips/errores a la izquierda, botones a la derecha. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {value.team_id && (
              <Chip variant="flat" classNames={bhChip("success")}>{t("career.rowEditor.chipVerified")}</Chip>
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
              <Chip variant="flat" classNames={bhChip("blue")}>{t("career.rowEditor.chipTmOk")}</Chip>
            )}
            {/* Aviso suave si la liga quedó como texto libre (no enlazada al
                catálogo). Esa fila no aparecerá en filtros por liga ni
                mostrará crest en el portfolio. Aplica a primaria y
                secundaria. */}
            {((value.division && value.division.trim() && !value.division_id) ||
              (value.secondary_division && value.secondary_division.trim() && !value.secondary_division_id)) ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-bh-fg-3">
                <span aria-hidden>⚠</span>
                {t("career.rowEditor.unlinkedLeagueWarning")}
              </span>
            ) : null}
            {showErrors && yIssues.length > 0 && (
              <span className="text-[12px] text-bh-danger">{translateIssue(yIssues[0].code)}</span>
            )}
            {overlapError && (
              <span className={`text-[12px] ${allowOverlap ? "text-bh-fg-3" : "text-bh-danger"}`}>
                {allowOverlap ? "⚠ " : ""}
                {overlapError}
              </span>
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
                {t("career.rowEditor.cancel")}
              </Button>
            )}
            <Button
              size="sm"
              onPress={handleConfirm}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              {t("career.rowEditor.confirmStage")}
            </Button>
            {!value.lockDelete && (
              <Button
                size="sm"
                variant="light"
                onPress={onRemove}
                className={bhButtonClass({ variant: "icon-danger", size: "sm" })}
              >
                {t("career.rowEditor.remove")}
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
