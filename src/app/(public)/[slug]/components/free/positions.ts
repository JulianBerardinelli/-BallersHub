// Position normalization for the Free portfolio layout.
//
// `player_profiles.positions` stores `[role, ...subs]` where:
//   - role  ∈ "ARQ" | "DEF" | "MID" | "DEL"
//   - subs are Spanish labels chosen in onboarding (e.g. "Centrodelantero",
//     "Extremo derecho"). The pitch component uses 3-letter codes (POR,
//     DFC, EI, ED, DEL, …). To render the hero pill we need both a short
//     code and a readable label, derived from whichever shape we got.

export type PositionPill = { code: string; label: string };

const PARENT_ROLES = new Set(["ARQ", "DEF", "MID", "DEL"]);

const PARENT_LABEL: Record<string, string> = {
  ARQ: "Arquero",
  DEF: "Defensor",
  MID: "Mediocampista",
  DEL: "Delantero",
};

// Onboarding sub-position label → short code + canonical label.
// Keys are normalized: lowercased, accents stripped, whitespace collapsed.
const SUB_BY_LABEL: Record<string, PositionPill> = {
  // Arquero
  arquero: { code: "POR", label: "Arquero" },
  // Defensor
  central: { code: "DFC", label: "Defensor central" },
  "lateral derecho": { code: "LD", label: "Lateral derecho" },
  "lateral izquierdo": { code: "LI", label: "Lateral izquierdo" },
  carrilero: { code: "CAR", label: "Carrilero" },
  // Mediocampista
  mediocentro: { code: "MC", label: "Mediocentro" },
  pivote: { code: "MCD", label: "Pivote" },
  interior: { code: "INT", label: "Interior" },
  "volante derecho": { code: "MD", label: "Volante derecho" },
  "volante izquierdo": { code: "MI", label: "Volante izquierdo" },
  mediapunta: { code: "MCO", label: "Mediapunta" },
  // Delantero
  centrodelantero: { code: "DC", label: "Delantero centro" },
  "extremo derecho": { code: "ED", label: "Extremo derecho" },
  "extremo izquierdo": { code: "EI", label: "Extremo izquierdo" },
  "segundo delantero": { code: "SD", label: "Segundo delantero" },
};

// Pitch / FIFA-style 3-letter code → label, for legacy values that may
// have been stored as codes instead of full labels.
const SUB_BY_CODE: Record<string, PositionPill> = {
  POR: { code: "POR", label: "Arquero" },
  DFC: { code: "DFC", label: "Defensor central" },
  LI: { code: "LI", label: "Lateral izquierdo" },
  LD: { code: "LD", label: "Lateral derecho" },
  MCD: { code: "MCD", label: "Pivote" },
  MC: { code: "MC", label: "Mediocentro" },
  MI: { code: "MI", label: "Volante izquierdo" },
  MD: { code: "MD", label: "Volante derecho" },
  MCO: { code: "MCO", label: "Mediapunta" },
  EI: { code: "EI", label: "Extremo izquierdo" },
  ED: { code: "ED", label: "Extremo derecho" },
  DEL: { code: "DC", label: "Delantero centro" },
  SD: { code: "SD", label: "Segundo delantero" },
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve a single raw entry to a `{ code, label }` pill.
 * - parent roles (ARQ/DEF/MID/DEL) when they're the only entry get the
 *   parent label; when there are subs they're filtered out by callers.
 * - unknown values fall back to themselves so we never lose information.
 */
export function resolvePosition(raw: string): PositionPill {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { code: "", label: "" };
  const upper = trimmed.toUpperCase();
  if (PARENT_ROLES.has(upper)) {
    return { code: upper, label: PARENT_LABEL[upper] ?? upper };
  }
  const byCode = SUB_BY_CODE[upper];
  if (byCode) return byCode;
  const byLabel = SUB_BY_LABEL[normalize(trimmed)];
  if (byLabel) return byLabel;
  return { code: upper.slice(0, 3), label: trimmed };
}

/**
 * Convert the player's `positions` array into a list of pills suitable
 * for the hero. Parent roles are dropped when at least one sub-position
 * is present (the sub already implies the role). When the array only
 * contains a parent role, it's kept so the pill never goes empty.
 */
export function pillsFromPositions(
  positions: string[] | null | undefined,
): PositionPill[] {
  if (!positions || positions.length === 0) return [];

  const subs: PositionPill[] = [];
  const roles: PositionPill[] = [];
  const seenCodes = new Set<string>();

  for (const raw of positions) {
    const upper = (raw ?? "").trim().toUpperCase();
    const isParent = PARENT_ROLES.has(upper);
    const pill = resolvePosition(raw);
    if (!pill.code) continue;
    if (seenCodes.has(pill.code)) continue;
    seenCodes.add(pill.code);
    if (isParent) roles.push(pill);
    else subs.push(pill);
  }

  return subs.length > 0 ? subs : roles;
}
