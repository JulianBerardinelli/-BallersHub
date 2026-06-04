"use client";

// BallersHub /players (Scouting) — mobile experience.
//
// Ported from the design's mobile handoff (mobile.jsx / mobile.css): a compact
// globe hero, an active-filter chip strip, a card list, a filter bottom sheet
// and a player detail sheet (opened by tapping a globe pin). Adapted to our
// real ScoutPlayer/ScoutFilters and shared with the desktop state in
// ScoutingExperience, so filtering stays in lockstep between layouts.
//
// SEO: the player cards are real <Link href="/<slug>"> — and the desktop table
// (server-rendered) still ships every link in the initial HTML.

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { ClubCrest, Flag, PlayerAvatar } from "../atoms";
import type { TopCountry } from "../GlobeLegend";
import {
  POSITION_GROUP_ORDER,
  SCOUT_POSITIONS,
  countryName,
} from "@/lib/scouting/taxonomies";
import {
  AGE_BOUNDS,
  HEIGHT_BOUNDS,
  type CountryOption,
  type FootCode,
  type ScoutCity,
  type ScoutFilters,
  type ScoutPlayer,
} from "@/lib/scouting/types";

import "./scouting-mobile.css";

const ScoutGlobe = dynamic(() => import("../ScoutGlobe"), { ssr: false });

/** Switches to the mobile layout under `breakpoint`. SSR-safe (false first). */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

function fmtValue(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `€${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (v >= 1_000) return `€${Math.round(v / 1000)}K`;
  return `€${v}`;
}

type SetFilters = (updater: (prev: ScoutFilters) => ScoutFilters) => void;

// ── Top bar ──────────────────────────────────────────────────
function MTopBar({
  filterCount,
  onFilters,
}: {
  filterCount: number;
  onFilters: () => void;
}) {
  return (
    <div className="m-topbar">
      <div className="m-topbar-left">
        <div className="m-logo">
          <span style={{ color: "var(--bh-lime-200)" }}>&apos;</span>
          <span>BH</span>
        </div>
        <div>
          <div className="m-topbar-eyebrow">Scouting</div>
          <div className="m-topbar-title">Mapa global</div>
        </div>
      </div>
      <div className="m-topbar-right">
        <button
          type="button"
          className="m-icon-btn m-filter-btn"
          aria-label="Filtros"
          onClick={onFilters}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          {filterCount > 0 && <span className="m-filter-badge">{filterCount}</span>}
        </button>
      </div>
    </div>
  );
}

// ── Card row ─────────────────────────────────────────────────
// Tapping opens the detail sheet (the "tag") rather than jumping straight to
// the profile — the sheet carries the "Ver perfil completo" CTA. (SEO is
// unaffected: the crawlable links live in the server-rendered desktop table.)
function MPlayerRow({
  player,
  onOpen,
}: {
  player: ScoutPlayer;
  onOpen: (p: ScoutPlayer) => void;
}) {
  return (
    <button
      type="button"
      className="m-prow"
      data-status={player.contract}
      onClick={() => onOpen(player)}
    >
      <PlayerAvatar player={player} size={42} />
      <div className="m-prow-body">
        <div className="m-prow-name">
          {player.name}
          {player.isPro && <span className="pt-pro">Pro</span>}
        </div>
        <div className="m-prow-meta">
          {player.positions.map((pos) => (
            <span
              key={pos.code}
              className="pos-tag"
              data-group={pos.group ?? undefined}
            >
              {pos.code}
            </span>
          ))}
          {player.age != null && <span className="m-prow-mini">{player.age}a</span>}
          {player.heightCm && <span className="m-prow-mini">{player.heightCm}cm</span>}
        </div>
        {player.club && (
          <div className="m-prow-club">
            <ClubCrest club={player.club} crestUrl={player.clubCrestUrl} size={20} />
            <span className="m-prow-club-text">
              {[player.club, player.city].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}
      </div>
      <div className="m-prow-right">
        {player.nationality && <Flag cc={player.nationality} />}
        <div className={player.contract === "free" ? "m-prow-free" : "m-prow-contract"}>
          {player.contract === "free" ? "Libre" : "Contrato"}
        </div>
      </div>
    </button>
  );
}

// ── Active chip strip ────────────────────────────────────────
type Chip = { key: string; label: string; onRemove: () => void };

function MChipStrip({ chips, onClear }: { chips: Chip[]; onClear: () => void }) {
  if (chips.length === 0) {
    return (
      <div className="m-chip-strip m-chip-strip-empty">
        <span className="m-chip-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          Sin filtros · tocá Filtros para refinar
        </span>
      </div>
    );
  }
  return (
    <div className="m-chip-strip">
      {chips.map((c) => (
        <button key={c.key} type="button" className="m-chip" onClick={c.onRemove}>
          {c.label}
          <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden>
            <path d="M1 1 L8 8 M8 1 L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      ))}
      <button type="button" className="m-chip-clear" onClick={onClear}>
        Limpiar
      </button>
    </div>
  );
}

// ── Filter bottom sheet ──────────────────────────────────────
function MFilterSheet({
  open,
  count,
  filters,
  setFilters,
  nationalityOptions,
  onApply,
  onClear,
  onClose,
}: {
  open: boolean;
  count: number;
  filters: ScoutFilters;
  setFilters: SetFilters;
  nationalityOptions: CountryOption[];
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const toggle = (key: "positions" | "nationality", val: string) =>
    setFilters((s) => {
      const next = new Set(s[key]);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return { ...s, [key]: [...next] };
    });

  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<"lo" | "hi" | null>(null);
  const ageRef = useRef(filters.age);
  ageRef.current = filters.age;
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current || !trackRef.current) return;
      const r = trackRef.current.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const v = Math.round(AGE_BOUNDS[0] + t * (AGE_BOUNDS[1] - AGE_BOUNDS[0]));
      const [lo, hi] = ageRef.current;
      setFilters((s) =>
        drag.current === "lo"
          ? { ...s, age: [Math.min(v, hi - 1), hi] }
          : { ...s, age: [lo, Math.max(v, lo + 1)] },
      );
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFilters]);
  const agePct = (v: number) =>
    ((v - AGE_BOUNDS[0]) / (AGE_BOUNDS[1] - AGE_BOUNDS[0])) * 100;

  const posGroups = POSITION_GROUP_ORDER.flatMap((g) =>
    SCOUT_POSITIONS.filter((p) => p.group === g),
  );

  return (
    <div className={`m-sheet ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="m-sheet-grabber" onClick={onClose} />
      <div className="m-sheet-head">
        <div>
          <div className="m-sheet-eyebrow">Filtros</div>
          <div className="m-sheet-title">Refinar búsqueda</div>
        </div>
        <button type="button" className="m-sheet-close" onClick={onClose} aria-label="Cerrar">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M1 1 L13 13 M13 1 L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="m-sheet-body">
        <div className="m-sheet-section">
          <div className="m-sheet-section-label">Estado contractual</div>
          <div className="m-segment">
            {(["all", "free", "contracted"] as const).map((k) => (
              <button
                key={k}
                type="button"
                data-active={filters.status === k}
                onClick={() => setFilters((s) => ({ ...s, status: k }))}
              >
                {k === "all" ? "Todos" : k === "free" ? "Libres" : "Con contrato"}
              </button>
            ))}
          </div>
        </div>

        <div className="m-sheet-section">
          <div className="m-sheet-section-label">
            Posición <span className="m-sheet-count">{filters.positions.length}</span>
          </div>
          <div className="m-pos-grid">
            {posGroups.map((p) => (
              <button
                key={p.code}
                type="button"
                className="m-pos-chip"
                data-active={filters.positions.includes(p.code)}
                data-group={p.group}
                onClick={() => toggle("positions", p.code)}
              >
                {p.code}
                <span className="m-pos-label">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="m-sheet-section">
          <div className="m-sheet-section-label">
            Edad
            <span className="m-sheet-range-val">
              {filters.age[0]}–{filters.age[1]} años
            </span>
          </div>
          <div className="m-range">
            <div className="m-range-track" ref={trackRef}>
              <div
                className="m-range-fill"
                style={{ left: `${agePct(filters.age[0])}%`, right: `${100 - agePct(filters.age[1])}%` }}
              />
              <div
                className="m-range-thumb"
                style={{ left: `${agePct(filters.age[0])}%` }}
                onPointerDown={() => (drag.current = "lo")}
              />
              <div
                className="m-range-thumb"
                style={{ left: `${agePct(filters.age[1])}%` }}
                onPointerDown={() => (drag.current = "hi")}
              />
            </div>
            <div className="m-range-ticks">
              <span>{AGE_BOUNDS[0]}</span>
              <span>25</span>
              <span>{AGE_BOUNDS[1]}</span>
            </div>
          </div>
        </div>

        {nationalityOptions.length > 0 && (
          <div className="m-sheet-section">
            <div className="m-sheet-section-label">
              Nacionalidad <span className="m-sheet-count">{filters.nationality.length}</span>
            </div>
            <div className="m-nat-grid">
              {nationalityOptions.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className="m-nat-pill"
                  data-active={filters.nationality.includes(c.code)}
                  onClick={() => toggle("nationality", c.code)}
                >
                  <span className="m-nat-flag">
                    {String.fromCodePoint(
                      0x1f1e6 + c.code.charCodeAt(0) - 65,
                      0x1f1e6 + c.code.charCodeAt(1) - 65,
                    )}
                  </span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="m-sheet-section">
          <div className="m-sheet-section-label">Pie hábil</div>
          <div className="m-segment">
            {(
              [
                ["all", "Ambos"],
                ["D", "Derecho"],
                ["I", "Izquierdo"],
              ] as const
            ).map(([k, l]) => {
              const active =
                k === "all"
                  ? filters.foot.length === 0
                  : filters.foot.length === 1 && filters.foot[0] === k;
              return (
                <button
                  key={k}
                  type="button"
                  data-active={active}
                  onClick={() =>
                    setFilters((s) => ({
                      ...s,
                      foot: k === "all" ? [] : [k as FootCode],
                    }))
                  }
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="m-sheet-cta">
        <button type="button" className="m-cta-secondary" onClick={onClear}>
          Limpiar
        </button>
        <button type="button" className="m-cta-primary" onClick={onApply}>
          Ver <strong>{count}</strong> jugadores
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── City roster sheet (globe pin tap, >1 player) ─────────────
// When a pin holds several players, list them all; tapping one opens its
// detail sheet on top.
function MCitySheet({
  city: cityProp,
  open,
  onClose,
  onOpenPlayer,
}: {
  city: ScoutCity | null;
  open: boolean;
  onClose: () => void;
  onOpenPlayer: (p: ScoutPlayer) => void;
}) {
  const [latched, setLatched] = useState<ScoutCity | null>(cityProp);
  useEffect(() => {
    if (cityProp) setLatched(cityProp);
  }, [cityProp]);
  const city = cityProp ?? latched;
  if (!city) return null;

  return (
    <div className={`m-sheet m-citysheet ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="m-sheet-grabber" onClick={onClose} />
      <div className="m-sheet-head">
        <div>
          <div className="m-sheet-eyebrow">{city.players.length} jugadores</div>
          <div className="m-sheet-title">
            {city.name || countryName(city.countryCode)}
          </div>
        </div>
        <button type="button" className="m-sheet-close" onClick={onClose} aria-label="Cerrar">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M1 1 L13 13 M13 1 L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="m-sheet-body">
        <div className="m-citysheet-list">
          {city.players.map((p) => (
            <MPlayerRow key={p.id} player={p} onOpen={onOpenPlayer} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Player detail sheet (list row or single-player pin tap) ───
function MPlayerSheet({
  player: playerProp,
  open,
  onClose,
}: {
  player: ScoutPlayer | null;
  open: boolean;
  onClose: () => void;
}) {
  const [latched, setLatched] = useState<ScoutPlayer | null>(playerProp);
  useEffect(() => {
    if (playerProp) setLatched(playerProp);
  }, [playerProp]);
  const player = playerProp ?? latched;
  if (!player) return null;

  return (
    <div className={`m-psheet ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="m-sheet-grabber" />
      <button type="button" className="m-psheet-close" onClick={onClose} aria-label="Cerrar">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M1 1 L13 13 M13 1 L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <div className="m-psheet-hero">
        <PlayerAvatar player={player} size={56} />
        <div className="m-psheet-name-block">
          <div className="m-psheet-flagrow">
            {player.nationality && <Flag cc={player.nationality} withCode />}
            <span>{countryName(player.nationality)}</span>
          </div>
          <div className="m-psheet-name">{player.name}</div>
          <div className="m-psheet-meta">
            {player.positions.map((pos) => (
              <span
                key={pos.code}
                className="pos-tag"
                data-group={pos.group ?? undefined}
              >
                {pos.code}
              </span>
            ))}
            <span>{player.posLabel}</span>
            {player.age != null && (
              <>
                <span className="m-dotsep">·</span>
                <span>{player.age}a</span>
              </>
            )}
          </div>
        </div>
        <div className="m-psheet-rating" data-status={player.contract}>
          <div className="m-psheet-rating-n">{fmtValue(player.marketValueEur)}</div>
          <div className="m-psheet-rating-l">Valor</div>
        </div>
      </div>

      {player.club && (
        <div className="m-psheet-club">
          <ClubCrest club={player.club} crestUrl={player.clubCrestUrl} size={40} />
          <div className="m-psheet-club-info">
            <div className="m-psheet-club-eyebrow">Club actual</div>
            <div className="m-psheet-club-name">{player.club}</div>
            <div className="m-psheet-club-loc">
              {player.clubCountryCode && <Flag cc={player.clubCountryCode} />}
              {[player.city, player.clubCountry ?? countryName(player.clubCountryCode)]
                .filter(Boolean)
                .join(", ")}
            </div>
          </div>
          <div className="m-psheet-status" data-status={player.contract}>
            <span className="m-status-dot" />
            {player.contract === "free" ? "Libre" : "Contrato"}
          </div>
        </div>
      )}

      <div className="m-psheet-stats">
        <div className="m-pstat">
          <div className="m-pstat-num">{player.foot ?? "—"}</div>
          <div className="m-pstat-lbl">Pie</div>
        </div>
        <div className="m-pstat">
          <div className="m-pstat-num">
            {player.heightCm ?? "—"}
            {player.heightCm && <span>cm</span>}
          </div>
          <div className="m-pstat-lbl">Altura</div>
        </div>
        <div className="m-pstat">
          <div className="m-pstat-num">{player.posCode || "—"}</div>
          <div className="m-pstat-lbl">Pos</div>
        </div>
        <div className="m-pstat">
          <div className="m-pstat-num">{player.nationality || "—"}</div>
          <div className="m-pstat-lbl">Nac</div>
        </div>
      </div>

      <div className="m-psheet-cta">
        <Link className="m-cta-primary" href={`/${player.slug}`}>
          Ver perfil completo
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────
export function MobileScouting({
  players,
  filtered,
  filters,
  setFilters,
  onClear,
  cities,
  countryDensity,
  topCountries,
  nationalityOptions,
  onCountryClick,
}: {
  players: ScoutPlayer[];
  filtered: ScoutPlayer[];
  filters: ScoutFilters;
  setFilters: SetFilters;
  onClear: () => void;
  cities: ScoutCity[];
  countryDensity: Record<string, number>;
  topCountries: TopCountry[];
  nationalityOptions: CountryOption[];
  onCountryClick: (iso: string) => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<ScoutPlayer | null>(null);
  const [selectedCity, setSelectedCity] = useState<ScoutCity | null>(null);
  const [ready, setReady] = useState(false);

  const cityByKey = useMemo(() => new Map(cities.map((c) => [c.key, c])), [cities]);
  // Países = where players play (club country), consistent with the heat/pins.
  const liveCountries = useMemo(
    () => new Set(filtered.map((p) => p.clubCountryCode).filter(Boolean)).size,
    [filtered],
  );

  const filterCount =
    filters.positions.length +
    filters.nationality.length +
    filters.playCountry.length +
    (filters.status !== "all" ? 1 : 0) +
    (filters.foot.length ? 1 : 0) +
    (filters.age[0] !== AGE_BOUNDS[0] || filters.age[1] !== AGE_BOUNDS[1] ? 1 : 0) +
    (filters.height[0] !== HEIGHT_BOUNDS[0] || filters.height[1] !== HEIGHT_BOUNDS[1]
      ? 1
      : 0);

  // Chips surface EVERY active facet — including play-country and height, which
  // the compact mobile sheet has no dedicated control for. Without them a
  // desktop-set filter would silently narrow the list with no way to see or
  // remove it on mobile (Codex review). They remain removable here.
  const chips: Chip[] = [];
  if (filters.status !== "all")
    chips.push({
      key: "status",
      label: filters.status === "free" ? "Libres" : "Con contrato",
      onRemove: () => setFilters((s) => ({ ...s, status: "all" })),
    });
  filters.positions.forEach((p) =>
    chips.push({
      key: `p-${p}`,
      label: p,
      onRemove: () =>
        setFilters((s) => ({ ...s, positions: s.positions.filter((x) => x !== p) })),
    }),
  );
  filters.nationality.forEach((c) =>
    chips.push({
      key: `n-${c}`,
      label: countryName(c),
      onRemove: () =>
        setFilters((s) => ({ ...s, nationality: s.nationality.filter((x) => x !== c) })),
    }),
  );
  filters.playCountry.forEach((c) =>
    chips.push({
      key: `pc-${c}`,
      label: `Juega en ${countryName(c)}`,
      onRemove: () =>
        setFilters((s) => ({ ...s, playCountry: s.playCountry.filter((x) => x !== c) })),
    }),
  );
  if (filters.age[0] !== AGE_BOUNDS[0] || filters.age[1] !== AGE_BOUNDS[1])
    chips.push({
      key: "age",
      label: `${filters.age[0]}–${filters.age[1]} años`,
      onRemove: () => setFilters((s) => ({ ...s, age: [...AGE_BOUNDS] })),
    });
  if (filters.height[0] !== HEIGHT_BOUNDS[0] || filters.height[1] !== HEIGHT_BOUNDS[1])
    chips.push({
      key: "height",
      label: `${filters.height[0]}–${filters.height[1]} cm`,
      onRemove: () => setFilters((s) => ({ ...s, height: [...HEIGHT_BOUNDS] })),
    });
  filters.foot.forEach((f) =>
    chips.push({
      key: `f-${f}`,
      label: f === "D" ? "Pie derecho" : f === "I" ? "Pie izquierdo" : "Ambidiestro",
      onRemove: () => setFilters((s) => ({ ...s, foot: s.foot.filter((x) => x !== f) })),
    }),
  );

  // Tapping a list row (or a single-player pin) opens the detail sheet; a pin
  // with several players opens the city roster first.
  const openPlayer = (p: ScoutPlayer) => {
    setFilterOpen(false);
    setSelectedPlayer(p);
  };
  const onClickPin = (cityKey: string) => {
    const city = cityByKey.get(cityKey);
    if (!city?.players.length) return;
    setFilterOpen(false);
    if (city.players.length === 1) {
      setSelectedCity(null);
      setSelectedPlayer(city.players[0]);
    } else {
      setSelectedPlayer(null);
      setSelectedCity(city);
    }
  };
  const closeAll = () => {
    setFilterOpen(false);
    setSelectedPlayer(null);
    setSelectedCity(null);
  };

  const sheetOpen = filterOpen || !!selectedPlayer || !!selectedCity;

  // Lock the page behind any open sheet so the background list doesn't scroll.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  return (
    <div className="m-screen">
      <MTopBar
        filterCount={filterCount}
        onFilters={() => {
          setSelectedPlayer(null);
          setSelectedCity(null);
          setFilterOpen(true);
        }}
      />

      <div className="m-hero">
        <div className="m-hero-globe">
          <ScoutGlobe
            cities={cities}
            countryDensity={countryDensity}
            onCountryClick={onCountryClick}
            onClickPin={onClickPin}
            onReady={() => setReady(true)}
            reduceMotion={reduceMotion}
            quality="low"
          />
          {!ready && (
            <div className="skel-globe">
              <div className="skel-orb" />
            </div>
          )}
        </div>

        <div className="m-float-title">
          <div className="m-ft-eyebrow">Talento en vivo</div>
          <div className="m-ft-hed">El mapa del talento</div>
          <div className="m-ft-sub">
            <span className="m-ft-dot" />
            {filtered.length} jugadores · {liveCountries} países
          </div>
        </div>

        {topCountries.length > 0 && (
          <div className="m-density-chip">
            <div className="m-density-bar" />
            <div className="m-density-top">
              <span className="m-density-flag">{topCountries[0].code}</span>
              <span className="m-density-num">{topCountries[0].count}</span>
            </div>
            <div className="m-density-label">Top zona</div>
          </div>
        )}

        <div className="m-stats-chip">
          <div className="m-stats-row">
            <div className="m-stats-num">{players.length}</div>
            <div className="m-stats-lbl">Jugadores</div>
          </div>
          <div className="m-stats-row">
            <div className="m-stats-num">{cities.length}</div>
            <div className="m-stats-lbl">Ciudades</div>
          </div>
        </div>
      </div>

      <MChipStrip chips={chips} onClear={onClear} />

      <div className="m-list-head">
        <div className="m-list-eyebrow">Top resultados</div>
        <div className="m-list-count">
          <strong>{filtered.length}</strong>jugadores
        </div>
      </div>

      <div className="m-list">
        {filtered.length === 0 ? (
          <div className="m-empty">
            <div className="m-empty-title">Ningún jugador coincide</div>
            <div className="m-empty-sub">Ajustá los filtros para ampliar la búsqueda.</div>
            <button type="button" className="m-empty-btn" onClick={onClear}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          filtered.map((p) => (
            <MPlayerRow key={p.id} player={p} onOpen={openPlayer} />
          ))
        )}
      </div>

      <button
        type="button"
        className={`m-backdrop ${sheetOpen ? "open" : ""}`}
        aria-label="Cerrar"
        tabIndex={sheetOpen ? 0 : -1}
        onClick={closeAll}
      />
      <MFilterSheet
        open={filterOpen}
        count={filtered.length}
        filters={filters}
        setFilters={setFilters}
        nationalityOptions={nationalityOptions}
        onApply={() => setFilterOpen(false)}
        onClear={onClear}
        onClose={() => setFilterOpen(false)}
      />
      <MCitySheet
        city={selectedCity}
        open={!!selectedCity}
        onClose={() => setSelectedCity(null)}
        onOpenPlayer={openPlayer}
      />
      <MPlayerSheet
        player={selectedPlayer}
        open={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}
