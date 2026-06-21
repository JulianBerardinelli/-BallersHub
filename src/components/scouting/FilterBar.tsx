"use client";

// BallersHub /players (Scouting) — filter top bar.
//
// Ported from `filters.jsx`: status segment, anchored dropdowns (position /
// nationality / play-country / foot), age + height dual sliders, removable
// chips, animated live count, density toggle. Adapted to real taxonomies and
// the `ScoutFilters` shape. The dual slider supports touch + mouse via Pointer
// Events (the prototype was mouse-only — see SKILLS-CLAUDE-CODE §5).

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { GenderIcon } from "./atoms";
import {
  POSITION_GROUP_ORDER,
  SCOUT_POSITIONS,
  countryName,
} from "@/lib/scouting/taxonomies";
import type {
  CountryOption,
  FootCode,
  PositionGroup,
  ScoutFilters,
} from "@/lib/scouting/types";

type DropdownKey =
  | "positions"
  | "nationality"
  | "playCountry"
  | "age"
  | "height"
  | "foot";

type SetFilters = (updater: (prev: ScoutFilters) => ScoutFilters) => void;

const FOOT_OPTIONS: FootCode[] = ["D", "I", "A"];

export function FilterBar({
  filters,
  setFilters,
  onClear,
  count,
  density,
  setDensity,
  nationalityOptions,
  playCountryOptions,
  ageBounds,
  heightBounds,
}: {
  filters: ScoutFilters;
  setFilters: SetFilters;
  onClear: () => void;
  count: number;
  density: "compact" | "comfortable";
  setDensity: (d: "compact" | "comfortable") => void;
  nationalityOptions: CountryOption[];
  playCountryOptions: CountryOption[];
  ageBounds: [number, number];
  heightBounds: [number, number];
}) {
  const t = useTranslations("scouting");
  const [open, setOpen] = useState<DropdownKey | null>(null);
  const [anchor, setAnchor] = useState({ left: 0, top: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  const DROPDOWN_TITLE: Record<DropdownKey, string> = {
    positions: t("filters.positions"),
    nationality: t("filters.nationality"),
    playCountry: t("filters.playCountry"),
    age: t("filters.age"),
    height: t("filters.height"),
    foot: t("filters.foot"),
  };

  const FOOT_LABEL: Record<FootCode, string> = {
    D: t("filters.footRight"),
    I: t("filters.footLeft"),
    A: t("filters.footBoth"),
  };

  const GENDER_LABEL: Record<ScoutFilters["gender"], string> = {
    all: t("filters.genderAll"),
    male: t("filters.genderMale"),
    female: t("filters.genderFemale"),
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!barRef.current) return;
      if (!barRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const DD_W = 420;
  const openDrop = (k: DropdownKey, e: React.MouseEvent<HTMLButtonElement>) => {
    if (open === k) {
      setOpen(null);
      return;
    }
    const btn = e.currentTarget;
    const barW = barRef.current?.clientWidth ?? 1200;
    const left = Math.max(16, Math.min(btn.offsetLeft, barW - DD_W - 16));
    const top = btn.offsetTop + btn.offsetHeight + 8;
    setAnchor({ left, top });
    setOpen(k);
  };

  const toggleSet = useCallback(
    (key: "positions" | "nationality" | "playCountry", value: string) => {
      setFilters((f) => {
        const s = new Set(f[key]);
        if (s.has(value)) s.delete(value);
        else s.add(value);
        return { ...f, [key]: [...s] };
      });
    },
    [setFilters],
  );
  const toggleFoot = useCallback(
    (value: FootCode) => {
      setFilters((f) => {
        const s = new Set(f.foot);
        if (s.has(value)) s.delete(value);
        else s.add(value);
        return { ...f, foot: [...s] };
      });
    },
    [setFilters],
  );
  const setStatus = (status: ScoutFilters["status"]) =>
    setFilters((f) => ({ ...f, status }));
  const setGender = (gender: ScoutFilters["gender"]) =>
    setFilters((f) => ({ ...f, gender }));
  const setAge = (age: [number, number]) => setFilters((f) => ({ ...f, age }));
  const setHeight = (height: [number, number]) =>
    setFilters((f) => ({ ...f, height }));

  const posGroups = POSITION_GROUP_ORDER.map((g) => ({
    group: g,
    items: SCOUT_POSITIONS.filter((p) => p.group === g),
  }));

  const FilterButton = ({
    k,
    label,
    badge,
  }: {
    k: DropdownKey;
    label: string;
    badge: number;
  }) => (
    <button
      type="button"
      onClick={(e) => openDrop(k, e)}
      className="fb-btn"
      data-active={open === k}
      data-has-value={badge > 0}
    >
      <span>{label}</span>
      {badge > 0 && <span className="fb-count">{badge}</span>}
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.5 }} aria-hidden>
        <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    </button>
  );

  const ageActive = filters.age[0] !== ageBounds[0] || filters.age[1] !== ageBounds[1];
  const heightActive =
    filters.height[0] !== heightBounds[0] || filters.height[1] !== heightBounds[1];

  // Build the active-chip list.
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  filters.positions.forEach((p) =>
    chips.push({ key: `p-${p}`, label: p, onRemove: () => toggleSet("positions", p) }),
  );
  filters.nationality.forEach((c) =>
    chips.push({
      key: `n-${c}`,
      label: t("filters.chipNationality", { country: countryName(c) }),
      onRemove: () => toggleSet("nationality", c),
    }),
  );
  filters.playCountry.forEach((c) =>
    chips.push({
      key: `pc-${c}`,
      label: t("filters.chipPlayCountry", { country: countryName(c) }),
      onRemove: () => toggleSet("playCountry", c),
    }),
  );
  if (ageActive)
    chips.push({
      key: "age",
      label: t("filters.ageRange", { lo: filters.age[0], hi: filters.age[1] }),
      onRemove: () => setAge([...ageBounds]),
    });
  if (heightActive)
    chips.push({
      key: "h",
      label: t("filters.heightRange", {
        lo: filters.height[0],
        hi: filters.height[1],
      }),
      onRemove: () => setHeight([...heightBounds]),
    });
  filters.foot.forEach((f) =>
    chips.push({ key: `f-${f}`, label: FOOT_LABEL[f], onRemove: () => toggleFoot(f) }),
  );

  return (
    <div className="filter-bar" ref={barRef}>
      <div className="status-seg">
        {(["all", "free", "contracted"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            data-active={filters.status === s}
          >
            {s === "all"
              ? t("filters.statusAll")
              : s === "free"
              ? t("filters.statusFree")
              : t("filters.statusContracted")}
          </button>
        ))}
      </div>

      <div className="fb-divider" />

      <div
        className="status-seg gender-seg"
        role="group"
        aria-label={t("filters.gender")}
      >
        {(["all", "male", "female"] as const).map((g) => (
          <button
            key={g}
            type="button"
            data-active={filters.gender === g}
            data-gender={g}
            onClick={() => setGender(g)}
            aria-label={GENDER_LABEL[g]}
            aria-pressed={filters.gender === g}
          >
            <GenderIcon gender={g} />
            <span>{GENDER_LABEL[g]}</span>
          </button>
        ))}
      </div>

      <div className="fb-divider" />

      <FilterButton k="positions" label={t("filters.positions")} badge={filters.positions.length} />
      <FilterButton k="nationality" label={t("filters.nationality")} badge={filters.nationality.length} />
      <FilterButton k="playCountry" label={t("filters.playCountry")} badge={filters.playCountry.length} />
      <FilterButton k="age" label={t("filters.age")} badge={ageActive ? 1 : 0} />
      <FilterButton k="height" label={t("filters.height")} badge={heightActive ? 1 : 0} />
      <FilterButton k="foot" label={t("filters.foot")} badge={filters.foot.length} />

      <div className="fb-right">
        <div className="live-count">
          <span className="lc-dot" />
          <span className="lc-num">{count}</span>
          <span className="lc-lbl">{t("filters.liveCount", { count })}</span>
        </div>
        <div className="density-toggle" title={t("filters.densityTitle")}>
          {(["compact", "comfortable"] as const).map((k) => (
            <button
              key={k}
              type="button"
              data-active={density === k}
              onClick={() => setDensity(k)}
            >
              {k === "compact"
                ? t("filters.densityCompact")
                : t("filters.densityComfortable")}
            </button>
          ))}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="chip-row">
          {chips.map((c) => (
            <span key={c.key} className="chip">
              {c.label}
              <button
                type="button"
                onClick={c.onRemove}
                aria-label={t("filters.chipRemove", { label: c.label })}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden>
                  <path d="M1 1 L8 8 M8 1 L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
          <button type="button" className="chip chip-clear" onClick={onClear}>
            {t("filters.clearAll")}
          </button>
        </div>
      )}

      {open && (
        <div className="fb-dropdown" style={{ left: anchor.left, top: anchor.top }}>
          <div className="dd-head">
            <span className="dd-head-title">{DROPDOWN_TITLE[open]}</span>
            <button
              type="button"
              className="dd-close"
              onClick={() => setOpen(null)}
              aria-label={t("filters.close")}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
                <path d="M1 1 L10 10 M10 1 L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {open === "positions" && (
            <div className="dd-grid">
              {posGroups.map(({ group, items }) => (
                <PositionColumn
                  key={group}
                  group={group}
                  items={items}
                  selected={filters.positions}
                  onToggle={(code) => toggleSet("positions", code)}
                />
              ))}
            </div>
          )}

          {open === "nationality" && (
            <CountryGrid
              options={nationalityOptions}
              selected={filters.nationality}
              onToggle={(code) => toggleSet("nationality", code)}
              emptyLabel={t("filters.noCountriesYet")}
            />
          )}

          {open === "playCountry" && (
            <CountryGrid
              options={playCountryOptions}
              selected={filters.playCountry}
              onToggle={(code) => toggleSet("playCountry", code)}
              emptyLabel={t("filters.noCountriesYet")}
            />
          )}

          {open === "age" && (
            <RangeControl
              min={ageBounds[0]}
              max={ageBounds[1]}
              suffix={t("filters.suffixYears")}
              rangeLabel={t("filters.rangeLabelAge")}
              minLabel={t("filters.sliderMin")}
              maxLabel={t("filters.sliderMax")}
              value={filters.age}
              onChange={setAge}
            />
          )}

          {open === "height" && (
            <RangeControl
              min={heightBounds[0]}
              max={heightBounds[1]}
              suffix={t("filters.suffixCm")}
              rangeLabel={t("filters.rangeLabelHeight")}
              minLabel={t("filters.sliderMin")}
              maxLabel={t("filters.sliderMax")}
              value={filters.height}
              onChange={setHeight}
            />
          )}

          {open === "foot" && (
            <div className="dd-grid">
              {FOOT_OPTIONS.map((f) => (
                <label key={f} className="dd-check">
                  <input
                    type="checkbox"
                    checked={filters.foot.includes(f)}
                    onChange={() => toggleFoot(f)}
                  />
                  <span className="cb" />
                  <span>{FOOT_LABEL[f]}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PositionColumn({
  group,
  items,
  selected,
  onToggle,
}: {
  group: PositionGroup;
  items: { code: string; label: string }[];
  selected: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="dd-col">
      <div className="dd-eyebrow">{group}</div>
      {items.map((p) => (
        <label key={p.code} className="dd-check">
          <input
            type="checkbox"
            checked={selected.includes(p.code)}
            onChange={() => onToggle(p.code)}
          />
          <span className="cb" />
          <span>
            {p.code} · {p.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function CountryGrid({
  options,
  selected,
  onToggle,
  emptyLabel,
}: {
  options: CountryOption[];
  selected: string[];
  onToggle: (code: string) => void;
  emptyLabel: string;
}) {
  if (options.length === 0) {
    return (
      <div>
        <span className="gl-empty">{emptyLabel}</span>
      </div>
    );
  }
  return (
    <div className="dd-grid two dd-scroll">
      {options.map((c) => (
        <label key={c.code} className="dd-check dd-check-flag">
          <input
            type="checkbox"
            checked={selected.includes(c.code)}
            onChange={() => onToggle(c.code)}
          />
          <span className="cb" />
          <span
            className={`dd-flag flag-ico fi fi-${c.code.toLowerCase()}`}
            role="img"
            aria-label={c.code}
          />
          <span className="dd-cname">{c.name}</span>
          <span className="dd-cc">{c.code}</span>
        </label>
      ))}
    </div>
  );
}

function RangeControl({
  min,
  max,
  value,
  onChange,
  suffix,
  rangeLabel,
  minLabel,
  maxLabel,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  suffix: string;
  rangeLabel: string;
  minLabel: string;
  maxLabel: string;
}) {
  const [lo, hi] = value;
  return (
    <div style={{ minWidth: 320, padding: "4px 4px 8px" }}>
      <div className="dd-eyebrow" style={{ marginBottom: 14 }}>
        {rangeLabel}:{" "}
        <span style={{ color: "var(--bh-lime-200)", fontWeight: 700 }}>
          {lo}–{hi} {suffix}
        </span>
      </div>
      <DualSlider
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        minLabel={minLabel}
        maxLabel={maxLabel}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontFamily: "var(--font-bh-mono)",
          fontSize: 11,
          color: "var(--bh-fg-3)",
        }}
      >
        <span>
          {min} {suffix}
        </span>
        <span>
          {max} {suffix}
        </span>
      </div>
    </div>
  );
}

function DualSlider({
  min,
  max,
  value,
  onChange,
  minLabel,
  maxLabel,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  minLabel: string;
  maxLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"lo" | "hi" | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current || !trackRef.current) return;
      const r = trackRef.current.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const v = Math.round(min + t * (max - min));
      const [lo, hi] = valueRef.current;
      if (dragRef.current === "lo") onChange([Math.min(v, hi - 1), hi]);
      else onChange([lo, Math.max(v, lo + 1)]);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [min, max, onChange]);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const startDrag = (which: "lo" | "hi") => (e: React.PointerEvent) => {
    dragRef.current = which;
    e.preventDefault();
  };

  return (
    <div ref={trackRef} className="ds-track">
      <div
        className="ds-fill"
        style={{ left: `${pct(value[0])}%`, right: `${100 - pct(value[1])}%` }}
      />
      <div
        className="ds-handle"
        role="slider"
        aria-label={minLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value[0]}
        tabIndex={0}
        style={{ left: `${pct(value[0])}%` }}
        onPointerDown={startDrag("lo")}
      />
      <div
        className="ds-handle"
        role="slider"
        aria-label={maxLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value[1]}
        tabIndex={0}
        style={{ left: `${pct(value[1])}%` }}
        onPointerDown={startDrag("hi")}
      />
    </div>
  );
}
