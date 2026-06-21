// BallersHub /players (Scouting) — pure filter + sort.
//
// Kept pure (no React, no DOM) so it's trivially testable and shared between
// the client island and any future server-side filtering. Mirrors the
// prototype's `matchPlayer` (`INTEGRACION.md §6`), adapted to real fields.

import type { ScoutFilters, ScoutPlayer, ScoutSort } from "./types";

/** True when `p` passes every active facet of `f`. */
export function matchPlayer(p: ScoutPlayer, f: ScoutFilters): boolean {
  if (f.status !== "all" && p.contract !== f.status) return false;
  // Sex facet: "all" passes everyone; a binary choice matches exactly. Legacy
  // "unspecified" rows only ever surface under "all" (never hidden silently
  // into the wrong bucket).
  if (f.gender !== "all" && p.gender !== f.gender) return false;
  // A player matches the position facet if ANY of its positions is selected —
  // a CB who also plays RB shows up under both, not just the primary.
  if (
    f.positions.length &&
    !p.positions.some((pos) => f.positions.includes(pos.code))
  )
    return false;
  // Match on ANY of the player's nationalities (the table stacks them all), so
  // a dual national (e.g. AR + IT) surfaces under either flag — mirroring how
  // the position facet matches any of a player's positions.
  if (
    f.nationality.length &&
    !p.nationalities.some((c) => f.nationality.includes(c))
  )
    return false;
  if (
    f.playCountry.length &&
    (!p.clubCountryCode || !f.playCountry.includes(p.clubCountryCode))
  )
    return false;
  if (f.foot.length && (!p.foot || !f.foot.includes(p.foot))) return false;
  // Range facets only exclude players whose value is known and out of range —
  // a null age/height never gets filtered out by the slider.
  if (p.age != null && (p.age < f.age[0] || p.age > f.age[1])) return false;
  if (
    p.heightCm != null &&
    (p.heightCm < f.height[0] || p.heightCm > f.height[1])
  )
    return false;
  return true;
}

/** Number of facets currently constraining the result (for the chip count). */
export function activeFilterCount(f: ScoutFilters, ageBounds: [number, number], heightBounds: [number, number]): number {
  let n = 0;
  if (f.status !== "all") n += 1;
  if (f.gender !== "all") n += 1;
  n += f.positions.length;
  n += f.nationality.length;
  n += f.playCountry.length;
  n += f.foot.length;
  if (f.age[0] !== ageBounds[0] || f.age[1] !== ageBounds[1]) n += 1;
  if (f.height[0] !== heightBounds[0] || f.height[1] !== heightBounds[1]) n += 1;
  return n;
}

const collator = new Intl.Collator("es", { sensitivity: "base" });

/**
 * Stable sort by the active column. Nulls always sink to the bottom regardless
 * of direction (a missing value is never "the best"). Falls back to Pro-first
 * then name so equal keys stay deterministic.
 */
export function sortPlayers(
  players: ScoutPlayer[],
  sort: ScoutSort,
): ScoutPlayer[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  const out = [...players];

  const numeric = (a: number | null, b: number | null): number => {
    if (a == null && b == null) return 0;
    if (a == null) return 1; // nulls last
    if (b == null) return -1;
    return (a - b) * dir;
  };
  const text = (a: string | null, b: string | null): number => {
    const av = a ?? "";
    const bv = b ?? "";
    if (!av && !bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    return collator.compare(av, bv) * dir;
  };

  out.sort((a, b) => {
    let cmp = 0;
    switch (sort.key) {
      case "name":
        cmp = text(a.name, b.name);
        break;
      case "posCode":
        cmp = text(a.posCode || null, b.posCode || null);
        break;
      case "age":
        cmp = numeric(a.age, b.age);
        break;
      case "club":
        cmp = text(a.club, b.club);
        break;
      case "nationality":
        cmp = text(a.nationality, b.nationality);
        break;
      case "contract":
        cmp = text(a.contract, b.contract);
        break;
      case "foot":
        cmp = text(a.foot, b.foot);
        break;
      case "heightCm":
        cmp = numeric(a.heightCm, b.heightCm);
        break;
      case "marketValueEur":
        cmp = numeric(a.marketValueEur, b.marketValueEur);
        break;
    }
    if (cmp !== 0) return cmp;
    // Tie-breakers: Pro first, then name asc.
    if (a.isPro !== b.isPro) return a.isPro ? -1 : 1;
    return collator.compare(a.name, b.name);
  });
  return out;
}
