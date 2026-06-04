// BallersHub /players (Scouting) — shared types.
//
// Ported from the Claude Design `/scouting` handoff (`INTEGRACION.md §4`),
// adapted to the REAL data model. Fields the prototype invented but our DB
// doesn't have (numeric `rating`, contextual `stat`, `league`) are dropped;
// fields we do have that the table surfaces (`marketValueEur`) are added.
//
// Phase split (per the design's own docs):
//   • Phase 1 (this build): everything below — no geo.
//   • Phase 2 (future):     city lat/lon + globe pins, once team→city exists.

/** The two brand accents encode contract state: lime = free, blue = contracted. */
export type ContractStatus = "free" | "contracted";

/** Strong foot, normalized from the free-text `foot` column. A = ambidextrous. */
export type FootCode = "D" | "I" | "A";

/** Parent position group — drives the table's position-tag color. */
export type PositionGroup = "Arquero" | "Defensa" | "Mediocampo" | "Ataque";

/** A single resolved position: short code, readable label, parent group. */
export interface ScoutPosition {
  /** Short code, e.g. "DC", "MCO". */
  code: string;
  /** Readable label, e.g. "Delantero centro". */
  label: string;
  /** Parent group for coloring; null when unmappable. */
  group: PositionGroup | null;
}

/**
 * A player as the scouting UI consumes it. This is the contract the client
 * island (`ScoutingExperience`) and the server fetch (`getScoutingPlayers`)
 * agree on. Everything is already normalized/derived server-side so the
 * client stays pure (no DB shapes leak into the browser bundle).
 */
export interface ScoutPlayer {
  /** Profile UUID — stable React key. */
  id: string;
  /** Public slug — powers the `/<slug>` link and the `@handle`. */
  slug: string;
  name: string;
  /** Derived from `birthDate`; null when unknown. */
  age: number | null;
  /** Primary position short code, e.g. "DC", "MCO". Empty string if unknown. */
  posCode: string;
  /** Readable position label, e.g. "Delantero centro". */
  posLabel: string;
  /** Parent group for coloring; null when unmappable. */
  posGroup: PositionGroup | null;
  /**
   * EVERY resolved position the player lists (most play 1–2). The first mirrors
   * the primary `posCode/posLabel/posGroup`. The filter matches a player when
   * ANY of these codes is selected, and the cards surface every tag — a CB who
   * also plays RB shows both, instead of silently dropping the second.
   */
  positions: ScoutPosition[];
  /** Club name (team relation preferred, legacy free-text fallback). */
  club: string | null;
  /** ISO-2 of the club's country (from the `teams` relation), for the flag. */
  clubCountryCode: string | null;
  /** Human country name of the club. */
  clubCountry: string | null;
  /** Real crest URL if the team has one; null → render the default shield. */
  clubCrestUrl: string | null;
  /** Player nationality, ISO-2 (first of `nationalityCodes`). */
  nationality: string | null;
  contract: ContractStatus;
  foot: FootCode | null;
  heightCm: number | null;
  /** Market value in EUR — the table's headline number (colored by contract). */
  marketValueEur: number | null;
  /** Real photo if present and non-default; null → gradient+initials avatar. */
  avatarUrl: string | null;
  /** Pro/pro_plus with an active/trialing sub — drives Pro-first ordering. */
  isPro: boolean;
  /** 1–2 letter initials for the avatar fallback. */
  initials: string;
  // --- Phase 2 geo (inherited from the player's club / `teams` relation) ---
  /** Club city name; null until the team is backfilled with a location. */
  city: string | null;
  /** Club latitude (the player's pin on the globe); null when unknown. */
  latitude: number | null;
  /** Club longitude; null when unknown. */
  longitude: number | null;
}

/** A pin's projected position within the globe canvas (px, wrap-relative). */
export interface PinPos {
  x: number;
  y: number;
  /** True when the pin is on the near hemisphere (not behind the globe). */
  onFront: boolean;
}

/**
 * A globe pin: a city that has ≥1 indexable player, with its coordinates and
 * the players located there. Derived client-side from the filtered set.
 */
export interface ScoutCity {
  /** Stable key (normalized "city|country"). */
  key: string;
  name: string;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  /** Players whose club is in this city (within the current filter). */
  players: ScoutPlayer[];
}

/** Live filter state held by the client island. Mirrors the prototype's `sel`. */
export interface ScoutFilters {
  status: "all" | ContractStatus;
  /** Selected position codes — a player matches if ANY of its positions hits. */
  positions: string[];
  /** Selected player nationalities (ISO-2). */
  nationality: string[];
  /** Selected club countries (ISO-2) — "país de juego". */
  playCountry: string[];
  foot: FootCode[];
  /** Inclusive [min, max] age range. */
  age: [number, number];
  /** Inclusive [min, max] height range in cm. */
  height: [number, number];
}

/** Sortable table columns. */
export type ScoutSortKey =
  | "name"
  | "posCode"
  | "age"
  | "club"
  | "nationality"
  | "contract"
  | "foot"
  | "heightCm"
  | "marketValueEur";

export interface ScoutSort {
  key: ScoutSortKey;
  dir: "asc" | "desc";
}

/** A position option in the filter dropdown (grouped by `group`). */
export interface PositionOption {
  code: string;
  label: string;
  group: PositionGroup;
}

/** A country option (ISO-2 + display name) for the nationality/country filters. */
export interface CountryOption {
  code: string;
  name: string;
}

/** Default filter state — the "no filters" baseline (also the reset target). */
export const DEFAULT_SCOUT_FILTERS: ScoutFilters = {
  status: "all",
  positions: [],
  nationality: [],
  playCountry: [],
  foot: [],
  age: [15, 40],
  height: [150, 210],
};

/** Bounds for the age dual-slider. */
export const AGE_BOUNDS: [number, number] = [15, 40];
/** Bounds for the height dual-slider (cm). */
export const HEIGHT_BOUNDS: [number, number] = [150, 210];
