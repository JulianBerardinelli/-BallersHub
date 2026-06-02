"use client";

// BallersHub /players (Scouting) — client island root.
//
// Receives the already-fetched, already-normalized players from the server
// component and owns all interaction state (filters, sort, density). Pure
// derivations via useMemo. This component IS server-rendered for the initial
// HTML (it's a normal client component, not ssr:false), so the table's
// <Link href="/slug"> rows ship in the first paint → the SEO internal-link
// surface from PR #135 is preserved. Only the globe inside the hero is
// ssr:false.

import { useCallback, useMemo, useState } from "react";

import { FilterBar } from "./FilterBar";
import { PlayersTable } from "./PlayersTable";
import { ScoutingHero } from "./ScoutingHero";
import { matchPlayer, sortPlayers } from "@/lib/scouting/filter";
import { buildCountryOptions, countryName } from "@/lib/scouting/taxonomies";
import {
  AGE_BOUNDS,
  HEIGHT_BOUNDS,
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

/** Columns that default to descending when first clicked (numbers/recency). */
const DESC_FIRST = new Set<ScoutSortKey>([
  "age",
  "heightCm",
  "marketValueEur",
]);

export function ScoutingExperience({ players }: { players: ScoutPlayer[] }) {
  const [filters, setFilters] = useState<ScoutFilters>(freshFilters);
  const [sort, setSort] = useState<ScoutSort>({
    key: "marketValueEur",
    dir: "desc",
  });
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");

  const filtered = useMemo(
    () => sortPlayers(players.filter((p) => matchPlayer(p, filters)), sort),
    [players, filters, sort],
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
  const totalCountries = useMemo(
    () => new Set(players.map((p) => p.nationality).filter(Boolean)).size,
    [players],
  );
  const proCount = useMemo(
    () => players.filter((p) => p.isPro).length,
    [players],
  );

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

  return (
    <div className="scouting-root">
      <ScoutingHero
        countryDensity={countryDensity}
        onCountryClick={onCountryClick}
        topCountries={topCountries}
        liveCount={filtered.length}
        liveCountries={liveCountries}
        stats={{ total: players.length, countries: totalCountries, pro: proCount }}
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
        />
      </div>
    </div>
  );
}
