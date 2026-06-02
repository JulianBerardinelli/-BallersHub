// BallersHub /players (Scouting) — taxonomies + normalizers.
//
// The position taxonomy is built from OUR code space (the same codes
// `player_profiles.positions` uses, see `(public)/[slug]/components/free/
// positions.ts`), NOT the prototype's, so the filter dropdown codes line up
// 1:1 with each player's derived `posCode`. Group → brand color matches the
// design's chat-2 decision: arquero=violeta, defensa=rojo, medio=celeste,
// ataque=verde.

import type {
  ContractStatus,
  CountryOption,
  FootCode,
  PositionGroup,
  PositionOption,
} from "./types";

/** Parent role (stored as the first `positions` entry) → group. */
const ROLE_TO_GROUP: Record<string, PositionGroup> = {
  ARQ: "Arquero",
  DEF: "Defensa",
  MID: "Mediocampo",
  DEL: "Ataque",
};

/** Sub-position code → group. Covers every code `resolvePosition` can emit. */
const CODE_TO_GROUP: Record<string, PositionGroup> = {
  POR: "Arquero",
  DFC: "Defensa",
  LD: "Defensa",
  LI: "Defensa",
  CAR: "Defensa",
  MC: "Mediocampo",
  MCD: "Mediocampo",
  MCO: "Mediocampo",
  INT: "Mediocampo",
  MD: "Mediocampo",
  MI: "Mediocampo",
  DC: "Ataque",
  ED: "Ataque",
  EI: "Ataque",
  SD: "Ataque",
};

/** Code → readable Spanish label, for the filter dropdown + position resolver. */
const CODE_TO_LABEL: Record<string, string> = {
  POR: "Arquero",
  DFC: "Defensor central",
  LD: "Lateral derecho",
  LI: "Lateral izquierdo",
  CAR: "Carrilero",
  MC: "Mediocentro",
  MCD: "Pivote",
  MCO: "Mediapunta",
  INT: "Interior",
  MD: "Volante derecho",
  MI: "Volante izquierdo",
  DC: "Delantero centro",
  ED: "Extremo derecho",
  EI: "Extremo izquierdo",
  SD: "Segundo delantero",
};

/** Onboarding sub-label (normalized) → code, for profiles stored as labels. */
const LABEL_TO_CODE: Record<string, string> = {
  arquero: "POR",
  central: "DFC",
  "defensor central": "DFC",
  "lateral derecho": "LD",
  "lateral izquierdo": "LI",
  carrilero: "CAR",
  mediocentro: "MC",
  pivote: "MCD",
  interior: "INT",
  "volante derecho": "MD",
  "volante izquierdo": "MI",
  mediapunta: "MCO",
  centrodelantero: "DC",
  "delantero centro": "DC",
  "extremo derecho": "ED",
  "extremo izquierdo": "EI",
  "segundo delantero": "SD",
};

/** The order groups appear in the filter dropdown. */
export const POSITION_GROUP_ORDER: PositionGroup[] = [
  "Arquero",
  "Defensa",
  "Mediocampo",
  "Ataque",
];

/** Group → accent color (hex). Consumed by `--pos` in scouting.css. */
export const POSITION_GROUP_COLOR: Record<PositionGroup, string> = {
  Arquero: "#B58CFF", // violeta
  Defensa: "#FF5C5C", // rojo
  Mediocampo: "#4FC3FF", // celeste
  Ataque: "#45D483", // verde
};

/** The full position taxonomy, grouped — drives the "Posición" dropdown. */
export const SCOUT_POSITIONS: PositionOption[] = Object.entries(CODE_TO_LABEL).map(
  ([code, label]) => ({ code, label, group: CODE_TO_GROUP[code] }),
);

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve a player's `positions` array to a primary `{ code, label, group }`.
 * Strategy: skip the parent role, take the first sub-entry; resolve it whether
 * it's already a code or a Spanish label. The parent role still seeds the group
 * as a fallback when the sub is unmappable.
 */
export function resolvePrimaryPosition(positions: string[] | null | undefined): {
  code: string;
  label: string;
  group: PositionGroup | null;
} {
  if (!positions || positions.length === 0) {
    return { code: "", label: "", group: null };
  }

  // Parent role group fallback (first entry is often ARQ/DEF/MID/DEL).
  const parentGroup =
    ROLE_TO_GROUP[(positions[0] ?? "").toUpperCase().trim()] ?? null;

  // Find the first entry that resolves to a known sub-position code.
  for (const raw of positions) {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();
    // Already a code?
    if (CODE_TO_LABEL[upper]) {
      return {
        code: upper,
        label: CODE_TO_LABEL[upper],
        group: CODE_TO_GROUP[upper] ?? parentGroup,
      };
    }
    // A Spanish label?
    const code = LABEL_TO_CODE[normalizeText(trimmed)];
    if (code) {
      return { code, label: CODE_TO_LABEL[code], group: CODE_TO_GROUP[code] };
    }
  }

  // Nothing mapped — surface the raw value but keep the parent group color.
  const fallback = (positions.find((p) => p && !ROLE_TO_GROUP[p.toUpperCase()]) ??
    positions[0] ??
    "").trim();
  return {
    code: fallback.toUpperCase().slice(0, 4),
    label: fallback,
    group: parentGroup,
  };
}

/** Normalize the free-text `foot` column to D / I / A (or null if unknown). */
export function normalizeFoot(raw: string | null | undefined): FootCode | null {
  if (!raw) return null;
  const s = normalizeText(raw);
  if (!s) return null;
  if (/(ambidiestr|ambos|both|both feet|amb)/.test(s) || s === "a") return "A";
  if (/(izquierd|left|zurd|lefty)/.test(s) || s === "i" || s === "l") return "I";
  if (/(derech|right|diestr|righty)/.test(s) || s === "d" || s === "r") return "D";
  return null;
}

/**
 * Normalize the free-text `contract_status` column to the binary the two
 * accents encode. Only an explicit "free/libre" signal flips to free; anything
 * else (including empty) stays contracted, so we never falsely advertise a
 * player as available.
 */
export function normalizeContract(
  raw: string | null | undefined,
): ContractStatus {
  if (!raw) return "contracted";
  const s = normalizeText(raw);
  if (/(libre|free agent|free|sin contrato|agente libre|disponible|sin club)/.test(s)) {
    return "free";
  }
  return "contracted";
}

/** ISO-2 → flag emoji via regional-indicator code points. "" if invalid. */
export function flagEmoji(cc: string | null | undefined): string {
  if (!cc || cc.length !== 2) return "";
  const code = cc.toUpperCase();
  const A = 0x1f1e6;
  const a = code.charCodeAt(0) - 65;
  const b = code.charCodeAt(1) - 65;
  if (a < 0 || a > 25 || b < 0 || b > 25) return "";
  return String.fromCodePoint(A + a) + String.fromCodePoint(A + b);
}

/** Derive 1–2 letter initials from a full name. */
export function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * ISO-2 → Spanish country name. Not exhaustive, but covers the football world;
 * unknown codes fall back to the code itself (so the UI degrades gracefully).
 */
export const COUNTRY_NAME_ES: Record<string, string> = {
  AR: "Argentina",
  BR: "Brasil",
  UY: "Uruguay",
  PY: "Paraguay",
  CL: "Chile",
  PE: "Perú",
  CO: "Colombia",
  EC: "Ecuador",
  BO: "Bolivia",
  VE: "Venezuela",
  MX: "México",
  US: "Estados Unidos",
  CA: "Canadá",
  CR: "Costa Rica",
  ES: "España",
  PT: "Portugal",
  FR: "Francia",
  IT: "Italia",
  DE: "Alemania",
  GB: "Inglaterra",
  NL: "Países Bajos",
  BE: "Bélgica",
  CH: "Suiza",
  AT: "Austria",
  TR: "Turquía",
  GR: "Grecia",
  PL: "Polonia",
  RU: "Rusia",
  UA: "Ucrania",
  HR: "Croacia",
  RS: "Serbia",
  SE: "Suecia",
  NO: "Noruega",
  DK: "Dinamarca",
  IE: "Irlanda",
  SC: "Escocia",
  CZ: "Chequia",
  RO: "Rumania",
  HU: "Hungría",
  MA: "Marruecos",
  SN: "Senegal",
  CI: "Costa de Marfil",
  NG: "Nigeria",
  GH: "Ghana",
  CM: "Camerún",
  EG: "Egipto",
  DZ: "Argelia",
  JP: "Japón",
  KR: "Corea del Sur",
  AU: "Australia",
};

/** ISO-2 → display name with fallback to the code. */
export function countryName(cc: string | null | undefined): string {
  if (!cc) return "";
  return COUNTRY_NAME_ES[cc.toUpperCase()] ?? cc.toUpperCase();
}

/**
 * Build the country option list for the nationality / play-country filters
 * from whatever ISO-2 codes actually appear in the dataset — only relevant
 * countries show, sorted by display name.
 */
export function buildCountryOptions(codes: Iterable<string>): CountryOption[] {
  const seen = new Set<string>();
  for (const c of codes) {
    if (c) seen.add(c.toUpperCase());
  }
  return [...seen]
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
