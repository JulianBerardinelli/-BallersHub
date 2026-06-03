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
import { PlayersTable } from "./PlayersTable";
import { ScoutingHero } from "./ScoutingHero";
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

export function ScoutingExperience({ players }: { players: ScoutPlayer[] }) {
  const [filters, setFilters] = useState<ScoutFilters>(freshFilters);
  const [sort, setSort] = useState<ScoutSort>({
    key: "marketValueEur",
    dir: "desc",
  });
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");

  // Globe ↔ table sync.
  const [hoverPlayerId, setHoverPlayerId] = useState<string | null>(null);
  const [hoverPinKey, setHoverPinKey] = useState<string | null>(null);
  const [focusCity, setFocusCity] = useState<string | null>(null);
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

  const countryDensity = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of filtered) {
      if (p.nationality) m[p.nationality] = (m[p.nationality] ?? 0) + 1;
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

  const liveCountries = useMemo(
    () => new Set(filtered.map((p) => p.nationality).filter(Boolean)).size,
    [filtered],
  );
  const proCount = useMemo(
    () => players.filter((p) => p.isPro).length,
    [players],
  );
  const geoCount = useMemo(
    () => filtered.filter((p) => p.latitude != null).length,
    [filtered],
  );

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

  // The pin that's "active": an explicit pin hover wins; otherwise the city of
  // the row being hovered. Drives globe highlight, table highlight, and card.
  const activeCityKey =
    hoverPinKey ?? (hoverPlayer ? cityKeyOf(hoverPlayer) : null);

  const cardPlayer = useMemo(() => {
    if (hoverPinKey) return cityByKey.get(hoverPinKey)?.players[0] ?? null;
    return hoverPlayer;
  }, [hoverPinKey, hoverPlayer, cityByKey]);
  const activeCity = activeCityKey ? cityByKey.get(activeCityKey) ?? null : null;

  const onSort = useCallback((key: ScoutSortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: DESC_FIRST.has(key) ? "desc" : "asc" },
    );
  }, []);

  const onClear = useCallback(() => setFilters(freshFilters()), []);

  const onCountryClick = useCallback((iso: string) => {
    setFilters((f) => {
      const s = new Set(f.nationality);
      if (s.has(iso)) s.delete(iso);
      else s.add(iso);
      return { ...f, nationality: [...s] };
    });
  }, []);

  const onPinClick = useCallback((key: string) => {
    setHoverPinKey(key);
    setFocusCity(key);
  }, []);

  return (
    <div className="scouting-root">
      <ScoutingHero
        cities={cities}
        countryDensity={countryDensity}
        focusCity={focusCity}
        hoverPin={activeCityKey}
        onHoverPin={setHoverPinKey}
        onClickPin={onPinClick}
        onCountryClick={onCountryClick}
        pinPositionsRef={pinPositionsRef}
        cardPlayer={cardPlayer}
        cardCityKey={activeCityKey}
        cardCityName={activeCity?.name ?? null}
        stackedCount={activeCity?.players.length ?? 0}
        topCountries={topCountries}
        liveCount={filtered.length}
        liveCountries={liveCountries}
        stats={{ total: players.length, pro: proCount, geo: geoCount }}
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
          onRowHover={setHoverPlayerId}
          highlightCityKey={activeCityKey}
        />
      </div>
    </div>
  );
}
