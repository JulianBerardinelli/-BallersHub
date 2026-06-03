// BallersHub /players (Scouting Phase 2) — city aggregation for the globe.
//
// Groups the filtered players into `ScoutCity` pins by their club's location.
// Only players whose team carries coordinates participate (the rest still
// appear in the table, just not on the globe). Pure — recomputed via useMemo
// on the client whenever the filtered set changes.

import type { ScoutCity, ScoutPlayer } from "./types";

/** Stable city key: normalized name + country, or coords when name is blank. */
export function cityKeyOf(p: ScoutPlayer): string | null {
  if (p.latitude == null || p.longitude == null) return null;
  const name = (p.city ?? "").trim().toLowerCase();
  if (name) return `${name}|${p.clubCountryCode ?? ""}`;
  return `${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}`;
}

/**
 * Build the globe pin set from the filtered players. Cities are sorted by
 * player count desc so the densest markets are easy to find. Players inside a
 * city keep their incoming order (already Pro-first / value-sorted upstream).
 */
export function buildScoutCities(players: ScoutPlayer[]): ScoutCity[] {
  const map = new Map<string, ScoutCity>();
  for (const p of players) {
    const key = cityKeyOf(p);
    if (key == null || p.latitude == null || p.longitude == null) continue;
    let city = map.get(key);
    if (!city) {
      city = {
        key,
        name: p.city ?? "",
        countryCode: p.clubCountryCode,
        latitude: p.latitude,
        longitude: p.longitude,
        players: [],
      };
      map.set(key, city);
    }
    city.players.push(p);
  }
  return [...map.values()].sort((a, b) => b.players.length - a.players.length);
}
