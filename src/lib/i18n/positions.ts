// Locale-aware position + foot labels for the public profile (audit fix B).
//
// Positions are stored on player_profiles.positions as codes ("DFC") or
// Spanish labels ("Lateral derecho"). `resolveAllPositions` (the canonical
// scouting taxonomy) normalizes either form to our code space; here we map
// those codes to a label per locale so /it, /en, /pt show the position in the
// page language instead of the Spanish default.

import type { Locale } from "@/i18n/routing";
import { resolveAllPositions, normalizeFoot } from "@/lib/scouting/taxonomies";

// code → label per locale. Codes are the 15 of src/lib/scouting/taxonomies.ts
// (CODE_TO_LABEL). es mirrors that file.
const POSITION_LABELS: Record<Locale, Record<string, string>> = {
  es: {
    POR: "Arquero", DFC: "Defensor central", LD: "Lateral derecho",
    LI: "Lateral izquierdo", CAR: "Carrilero", MC: "Mediocentro",
    MCD: "Pivote", MCO: "Mediapunta", INT: "Interior", MD: "Volante derecho",
    MI: "Volante izquierdo", DC: "Delantero centro", ED: "Extremo derecho",
    EI: "Extremo izquierdo", SD: "Segundo delantero",
  },
  en: {
    POR: "Goalkeeper", DFC: "Center back", LD: "Right back",
    LI: "Left back", CAR: "Wing back", MC: "Central midfielder",
    MCD: "Defensive midfielder", MCO: "Attacking midfielder",
    INT: "Box-to-box midfielder", MD: "Right midfielder",
    MI: "Left midfielder", DC: "Striker", ED: "Right winger",
    EI: "Left winger", SD: "Second striker",
  },
  it: {
    POR: "Portiere", DFC: "Difensore centrale", LD: "Terzino destro",
    LI: "Terzino sinistro", CAR: "Esterno", MC: "Centrocampista centrale",
    MCD: "Mediano", MCO: "Trequartista", INT: "Mezzala",
    MD: "Centrocampista destro", MI: "Centrocampista sinistro",
    DC: "Centravanti", ED: "Ala destra", EI: "Ala sinistra",
    SD: "Seconda punta",
  },
  pt: {
    POR: "Goleiro", DFC: "Zagueiro", LD: "Lateral direito",
    LI: "Lateral esquerdo", CAR: "Ala", MC: "Meio-campo central",
    MCD: "Volante", MCO: "Meia-atacante", INT: "Meia", MD: "Meia direita",
    MI: "Meia esquerda", DC: "Centroavante", ED: "Ponta direita",
    EI: "Ponta esquerda", SD: "Segundo atacante",
  },
};

/**
 * Localize a player's positions to a display string ("X / Y"). Falls back to
 * the resolved Spanish label (or the raw stored value) for any code the locale
 * map doesn't cover. Returns "N/A" when there are no positions.
 */
export function localizePlayerPositions(
  positions: string[] | null | undefined,
  locale: Locale,
): string {
  const resolved = resolveAllPositions(positions);
  if (resolved.length === 0) return "N/A";
  const labels = POSITION_LABELS[locale] ?? POSITION_LABELS.es;
  return resolved.map((p) => labels[p.code] ?? p.label).join(" / ");
}

const FOOT_LABELS: Record<Locale, { D: string; I: string; A: string }> = {
  es: { D: "Pie derecho", I: "Pie izquierdo", A: "Ambidiestro" },
  en: { D: "Right foot", I: "Left foot", A: "Two-footed" },
  it: { D: "Piede destro", I: "Piede sinistro", A: "Ambidestro" },
  pt: { D: "Pé direito", I: "Pé esquerdo", A: "Ambidestro" },
};

/** Localize the free-text `foot` column to a display label (null if unknown). */
export function localizeFoot(
  foot: string | null | undefined,
  locale: Locale,
): string | null {
  const code = normalizeFoot(foot);
  if (!code) return null;
  return (FOOT_LABELS[locale] ?? FOOT_LABELS.es)[code];
}
