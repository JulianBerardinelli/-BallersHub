"use client";

// BallersHub /players (Scouting) — client island root.
//
// Receives the already-fetched, already-normalized players from the server
// component and owns all interaction state (filters, sort, density, and the
// Phase-2 globe↔table sync). This component IS server-rendered for the initial
// HTML (a normal client component, not ssr:false), so the table's
// <Link href="/slug"> rows ship in the first paint → the SEO internal-link
// surface from PR #135 is preserved. Only the globe inside the hero is
// ssr:false.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FilterBar } from "./FilterBar";
import { MAX_INLINE } from "./HoverCard";
import { PlayersTable } from "./PlayersTable";
import { ScoutingHero } from "./ScoutingHero";
import { MobileScouting, useIsMobile } from "./mobile/MobileScouting";
import { matchPlayer, sortPlayers } from "@/lib/scouting/filter";
import { buildScoutCities, cityKeyOf } from "@/lib/scouting/cities";
import { buildCountryOptions, countryName } from "@/lib/scouting/taxonomies";
import {
  AGE_BOUNDS,
  HEIGHT_BOUNDS,
  type PinPos,
  type ScoutFilters,
  type ScoutPlayer,
  type ScoutSort,
  type ScoutSortKey,
} from "@/lib/scouting/types";

import "./scouting.css";

function freshFilters(): ScoutFilters {
  return {
    status: "all",
    positions: [],
    nationality: [],
    playCountry: [],
    foot: [],
    age: [...AGE_BOUNDS],
    height: [...HEIGHT_BOUNDS],
  };
}

const DESC_FIRST = new Set<ScoutSortKey>(["age", "heightCm", "marketValueEur"]);
/** Stable empty array so the idle card panel doesn't get a new ref each render. */
const EMPTY_PLAYERS: ScoutPlayer[] = [];

export function ScoutingExperience({ players }: { players: ScoutPlayer[] }) {
  const [filters, setFilters] = useState<ScoutFilters>(freshFilters);
  const [sort, setSort] = useState<ScoutSort>({
    key: "marketValueEur",
    dir: "desc",
  });
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  // SSR-safe: false on the server + first paint (desktop tree, which carries
  // the crawlable table), flips to true on small viewports after mount.
  const isMobile = useIsMobile();

  // Globe ↔ table sync.
  const [hoverPlayerId, setHoverPlayerId] = useState<string | null>(null);
  const [hoverPinKey, setHoverPinKey] = useState<string | null>(null);
  const [focusCity, setFocusCity] = useState<string | null>(null);
  // City whose full roster MODAL is open (only the >5 overflow fallback).
  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(null);
  // City pinned by CLICKING its pin — keeps the card panel + table highlight
  // open after the pointer leaves, so you can scroll to the highlighted rows.
  const [pinnedCityKey, setPinnedCityKey] = useState<string | null>(null);
  // True while the pointer is over the card panel — keeps it open when moving
  // from the pin onto the cards.
  const [panelHover, setPanelHover] = useState(false);
  // Last real (pin/row) active city, retained while the panel itself is hovered.
  const activeKeyRef = useRef<string | null>(null);
  // Hover-intent grace timer so the pointer can bridge the gap pin → panel
  // without it flickering shut.
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Shared each-frame pin screen positions (globe writes, HoverCard reads).
  const pinPositionsRef = useRef<Map<string, PinPos>>(new Map());

  const filtered = useMemo(
    () => sortPlayers(players.filter((p) => matchPlayer(p, filters)), sort),
    [players, filters, sort],
  );

  const cities = useMemo(() => buildScoutCities(filtered), [filtered]);
  const cityByKey = useMemo(
    () => new Map(cities.map((c) => [c.key, c])),
    [cities],
  );

  // Heat map = how many players PLAY in each country (their club's country),
  // mirroring the city pins ("more pins → more color"). NOT player nationality.
  const countryDensity = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of filtered) {
      if (p.clubCountryCode) m[p.clubCountryCode] = (m[p.clubCountryCode] ?? 0) + 1;
    }
    return m;
  }, [filtered]);

  const topCountries = useMemo(
    () =>
      Object.entries(countryDensity)
        .map(([code, count]) => ({ code, name: countryName(code), count }))
        .sort((a, b) => b.count - a.count),
    [countryDensity],
  );

  const nationalityOptions = useMemo(
    () =>
      buildCountryOptions(
        players.map((p) => p.nationality).filter((c): c is string => !!c),
      ),
    [players],
  );
  const playCountryOptions = useMemo(
    () =>
      buildCountryOptions(
        players.map((p) => p.clubCountryCode).filter((c): c is string => !!c),
      ),
    [players],
  );

  // "Países" everywhere on the map = countries where players play (club country),
  // consistent with the heat + pins. Nationality stays as the flag + its filter.
  const liveCountries = useMemo(
    () => new Set(filtered.map((p) => p.clubCountryCode).filter(Boolean)).size,
    [filtered],
  );
  // Coverage stats for the bottom-right card — over the whole indexable set
  // (distinct from the live counts in the floating title).
  const countriesCount = useMemo(
    () => new Set(players.map((p) => p.clubCountryCode).filter(Boolean)).size,
    [players],
  );
  const citiesCount = useMemo(() => {
    const keys = new Set<string>();
    for (const p of players) {
      const k = cityKeyOf(p);
      if (k) keys.add(k);
    }
    return keys.size;
  }, [players]);

  // Hovering a table row flies the camera to that player's city.
  const hoverPlayer = useMemo(
    () => filtered.find((p) => p.id === hoverPlayerId) ?? null,
    [filtered, hoverPlayerId],
  );
  useEffect(() => {
    if (!hoverPlayer) {
      setFocusCity(null);
      return;
    }
    setFocusCity(cityKeyOf(hoverPlayer));
  }, [hoverPlayer]);

  // The transient hovered city: a pin hover wins, else the hovered row's city,
  // retained briefly while the pointer is over the panel itself.
  const baseCityKey =
    hoverPinKey ?? (hoverPlayer ? cityKeyOf(hoverPlayer) : null);
  // Remember it so panel-hover can retain the panel after the pin/row hover ends.
  if (baseCityKey) activeKeyRef.current = baseCityKey;
  const hoverCityKey = baseCityKey ?? (panelHover ? activeKeyRef.current : null);
  // Hover wins for the live preview; otherwise the pinned (clicked) city sticks —
  // but only while that city still exists in the filtered set. Without this guard
  // a pinned city removed by a filter would keep the globe frozen with no visible
  // panel (Codex review on #147).
  const validPinnedKey =
    pinnedCityKey && cityByKey.has(pinnedCityKey) ? pinnedCityKey : null;
  const activeCityKey = hoverCityKey ?? validPinnedKey;

  const activeCity = activeCityKey ? cityByKey.get(activeCityKey) ?? null : null;
  // The panel renders ALL of the active city's players (up to MAX_INLINE).
  const cardPlayers = activeCity?.players ?? EMPTY_PLAYERS;

  const onSort = useCallback((key: ScoutSortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: DESC_FIRST.has(key) ? "desc" : "asc" },
    );
  }, []);

  const onClear = useCallback(() => setFilters(freshFilters()), []);

  const onCountryClick = useCallback((iso: string) => {
    // The heat now encodes WHERE players play, so clicking a country toggles the
    // play-country ("País de juego") filter — matching what the color means.
    // It also dismisses any pinned panel. Nationality keeps its own filter.
    setPinnedCityKey(null);
    setFilters((f) => {
      const s = new Set(f.playCountry);
      if (s.has(iso)) s.delete(iso);
      else s.add(iso);
      return { ...f, playCountry: [...s] };
    });
  }, []);

  // Escape unpins the panel.
  useEffect(() => {
    if (!pinnedCityKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinnedCityKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinnedCityKey]);

  // Drop a pinned city once a filter removes it from the set, so the globe never
  // stays frozen pointing at an invisible panel (Codex review on #147).
  useEffect(() => {
    if (pinnedCityKey && !cityByKey.has(pinnedCityKey)) setPinnedCityKey(null);
  }, [pinnedCityKey, cityByKey]);

  const cancelClear = useCallback(() => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);
  // Globe pin hover — delayed clear so the pointer can travel onto the panel.
  const onHoverPin = useCallback(
    (key: string | null) => {
      cancelClear();
      if (key) setHoverPinKey(key);
      else clearTimer.current = setTimeout(() => setHoverPinKey(null), 160);
    },
    [cancelClear],
  );
  // Table-row hover — same grace period.
  const onRowHover = useCallback(
    (id: string | null) => {
      cancelClear();
      if (id) setHoverPlayerId(id);
      else clearTimer.current = setTimeout(() => setHoverPlayerId(null), 160);
    },
    [cancelClear],
  );
  const onPanelEnter = useCallback(() => {
    cancelClear();
    setPanelHover(true);
  }, [cancelClear]);
  const onPanelLeave = useCallback(() => {
    setPanelHover(false);
    setHoverPinKey(null);
    setHoverPlayerId(null);
  }, []);

  // Clicking a pin PINS the panel open (so it survives the pointer leaving and
  // you can scroll to the highlighted rows). Re-clicking the same pin unpins;
  // more than MAX_INLINE players opens the roster modal instead.
  const onPinClick = useCallback(
    (key: string) => {
      cancelClear();
      setFocusCity(key);
      const city = cityByKey.get(key);
      if (city && city.players.length > MAX_INLINE) {
        setHoverPinKey(null);
        setPinnedCityKey(null);
        setSelectedCityKey(key);
      } else {
        setHoverPinKey(key);
        setPinnedCityKey((prev) => (prev === key ? null : key));
      }
    },
    [cancelClear, cityByKey],
  );
  const closeRoster = useCallback(() => setSelectedCityKey(null), []);
  // The panel's "+N ver todos" tile opens the full roster modal.
  const openRoster = useCallback(() => {
    if (activeKeyRef.current) setSelectedCityKey(activeKeyRef.current);
  }, []);

  // The city behind the open roster modal — null when closed or filtered out.
  const rosterCity = selectedCityKey
    ? cityByKey.get(selectedCityKey) ?? null
    : null;

  return (
    <div className="scouting-root">
      {isMobile ? (
        <MobileScouting
          players={players}
          filtered={filtered}
          filters={filters}
          setFilters={setFilters}
          onClear={onClear}
          cities={cities}
          countryDensity={countryDensity}
          topCountries={topCountries}
          nationalityOptions={nationalityOptions}
          onCountryClick={onCountryClick}
        />
      ) : (
        <>
          <ScoutingHero
            cities={cities}
            countryDensity={countryDensity}
            focusCity={focusCity}
            hoverPin={activeCityKey}
            onHoverPin={onHoverPin}
            onClickPin={onPinClick}
            onCountryClick={onCountryClick}
            pinPositionsRef={pinPositionsRef}
            cardPlayers={cardPlayers}
            cardCityKey={activeCityKey}
            onCardOverflow={openRoster}
            onPanelEnter={onPanelEnter}
            onPanelLeave={onPanelLeave}
            freezeRotation={activeCityKey != null || selectedCityKey != null}
            rosterCity={rosterCity}
            onCloseRoster={closeRoster}
            topCountries={topCountries}
            liveCount={filtered.length}
            liveCountries={liveCountries}
            stats={{
              players: players.length,
              countries: countriesCount,
              cities: citiesCount,
            }}
          />

          <FilterBar
            filters={filters}
            setFilters={setFilters}
            onClear={onClear}
            count={filtered.length}
            density={density}
            setDensity={setDensity}
            nationalityOptions={nationalityOptions}
            playCountryOptions={playCountryOptions}
            ageBounds={AGE_BOUNDS}
            heightBounds={HEIGHT_BOUNDS}
          />

          <div className="table-stage">
            <PlayersTable
              players={filtered}
              sort={sort}
              onSort={onSort}
              density={density}
              hoverPlayerId={hoverPlayerId}
              onRowHover={onRowHover}
              highlightCityKey={activeCityKey}
            />
          </div>
        </>
      )}
    </div>
  );
}
