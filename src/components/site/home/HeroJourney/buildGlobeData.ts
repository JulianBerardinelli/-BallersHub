// Server-side adapter: real scouting players (`getScoutingPlayers()`) → the
// compact, serializable globe payload the hero hydrates with. Pure function,
// safe to run in a Server Component. Returns null when there isn't enough geo
// (the caller then falls back to MOCK_GLOBE_DATA so the hero never looks empty).

import type { ScoutPlayer as RealScoutPlayer } from "@/lib/scouting/types";

import type { HeroGlobeData, TagPlayer } from "./data";

const cityKey = (city: string, cc: string | null) =>
  `${city}__${cc ?? ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "_");

// Matches the scouting UI's value formatting (HoverCard/CityRoster `fmtValue`).
const fmtEur = (v: number | null): string => {
  if (!v || v <= 0) return "—";
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `€${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (v >= 1_000) return `€${Math.round(v / 1000)}K`;
  return `€${v}`;
};

const FOOT = (f: string | null): TagPlayer["foot"] => (f === "D" || f === "I" || f === "A" ? f : null);

/** Max number of featured cards / pins. */
const MAX_FEATURED = 8;

export function buildHeroGlobeData(players: RealScoutPlayer[]): HeroGlobeData | null {
  if (!players.length) return null;

  // heat — every player with a known nationality
  const heat = players.filter((p) => p.nationality).map((p) => ({ nationality: p.nationality }));

  // cities — every player whose club has coordinates
  const geo = players.filter((p) => p.latitude != null && p.longitude != null && p.city);
  const cities: HeroGlobeData["cities"] = {};
  for (const p of geo) {
    const key = cityKey(p.city as string, p.clubCountryCode);
    if (!cities[key]) {
      cities[key] = {
        lat: p.latitude as number,
        lon: p.longitude as number,
        name: p.city as string,
        cc: p.clubCountryCode ?? p.nationality ?? "",
      };
    }
  }

  // featured — highest market value, one card per city, capped
  const used = new Set<string>();
  const featured: HeroGlobeData["featured"] = [];
  const ranked = [...geo].sort((a, b) => (b.marketValueEur ?? 0) - (a.marketValueEur ?? 0));
  for (const p of ranked) {
    const key = cityKey(p.city as string, p.clubCountryCode);
    if (used.has(key)) continue;
    used.add(key);
    const player: TagPlayer = {
      name: p.name,
      nationality: p.nationality,
      pos: p.posCode || "",
      club: p.club,
      age: p.age,
      foot: FOOT(p.foot),
      contract: p.contract,
      init: p.initials || "?",
      marketLabel: fmtEur(p.marketValueEur),
      avatarUrl: p.avatarUrl ?? null,
      crestUrl: p.clubCrestUrl ?? null,
    };
    featured.push({ city: key, place: featured.length % 2 ? "bl" : "tr", player });
    if (featured.length >= MAX_FEATURED) break;
  }

  // Not enough geo to make the globe feel real → let the caller use the mock.
  if (featured.length < 2 || Object.keys(cities).length < 2) return null;

  return { players: heat, cities, featured };
}
