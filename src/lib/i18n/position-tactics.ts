// Locale-aware tactical copy for the scouting pitch (audit fix B — pitch).
//
// POSITIONS_MAP (SoccerPitch3D) holds the pitch coordinates (top/left, layout)
// + the Spanish label/area/strengths. This module localizes ONLY the text
// (label / zone of influence / key strengths) per position code; es falls back
// to POSITIONS_MAP so there's a single source of truth for Spanish.

import type { Locale } from "@/i18n/routing";
import { POSITIONS_MAP } from "@/components/common/animations/SoccerPitch3D";

export type PositionTactics = {
  label: string;
  area: string;
  strengths: string[];
};

// en/it/pt only — es comes from POSITIONS_MAP. Codes mirror POSITIONS_MAP.
const TACTICS_I18N: Record<"en" | "it" | "pt", Record<string, PositionTactics>> = {
  en: {
    POR: { label: "Goalkeeper", area: "Own six-yard box", strengths: ["Reflexes", "Aerial ability", "Long distribution"] },
    DFC: { label: "Center back", area: "Central defense", strengths: ["Anticipation", "Interception", "Aerial ability"] },
    LI: { label: "Left back", area: "Left flank", strengths: ["Forward runs", "Stamina", "Crossing"] },
    LD: { label: "Right back", area: "Right flank", strengths: ["Pace", "Marking", "Overlapping"] },
    MCD: { label: "Defensive midfielder", area: "Central anchor zone", strengths: ["Ball recovery", "Short passing", "Positioning"] },
    MC: { label: "Central midfielder", area: "Midfield", strengths: ["Distribution", "Vision", "Work rate"] },
    MI: { label: "Left central midfielder", area: "Left midfield", strengths: ["Dribbling", "Through balls", "Link-up play"] },
    MD: { label: "Right central midfielder", area: "Right midfield", strengths: ["Ball carrying", "Crossing", "Arriving in the box"] },
    MCO: { label: "Attacking midfielder", area: "Central final third", strengths: ["Creativity", "Final pass", "Long-range shooting"] },
    EI: { label: "Left winger", area: "High left channel", strengths: ["Beating defenders", "1v1", "Crosses into the box"] },
    ED: { label: "Right winger", area: "High right channel", strengths: ["Guile", "Pace", "Cutting inside"] },
    DEL: { label: "Striker", area: "Opposition box", strengths: ["Finishing", "Aerial ability", "Positioning"] },
    SD: { label: "Second striker", area: "Edge of the box", strengths: ["Link-up play", "Off-the-ball movement", "Quick dribbling"] },
  },
  it: {
    POR: { label: "Portiere", area: "Area piccola", strengths: ["Riflessi", "Gioco aereo", "Rilancio lungo"] },
    DFC: { label: "Difensore centrale", area: "Difesa centrale", strengths: ["Anticipo", "Chiusura", "Gioco aereo"] },
    LI: { label: "Terzino sinistro", area: "Fascia sinistra", strengths: ["Spinta", "Resistenza", "Cross"] },
    LD: { label: "Terzino destro", area: "Fascia destra", strengths: ["Velocità", "Marcatura", "Sovrapposizioni"] },
    MCD: { label: "Mediano", area: "Zona mediana centrale", strengths: ["Recupero palla", "Passaggio corto", "Posizionamento"] },
    MC: { label: "Centrocampista centrale", area: "Centrocampo", strengths: ["Distribuzione", "Visione", "Dinamismo"] },
    MI: { label: "Mezzala sinistra", area: "Mezz'ala sinistra", strengths: ["Dribbling", "Passaggi filtranti", "Gioco di squadra"] },
    MD: { label: "Mezzala destra", area: "Mezz'ala destra", strengths: ["Conduzione", "Cross", "Inserimenti"] },
    MCO: { label: "Trequartista", area: "Tre quarti offensivi", strengths: ["Creatività", "Ultimo passaggio", "Tiro dalla distanza"] },
    EI: { label: "Ala sinistra", area: "Corsia sinistra alta", strengths: ["Sfondamento", "1 contro 1", "Cross in area"] },
    ED: { label: "Ala destra", area: "Corsia destra alta", strengths: ["Furbizia", "Velocità", "Rientro sul piede"] },
    DEL: { label: "Centravanti", area: "Area avversaria", strengths: ["Finalizzazione", "Gioco aereo", "Posizionamento"] },
    SD: { label: "Seconda punta", area: "Limite dell'area", strengths: ["Gioco di squadra", "Smarcamento", "Conduzione rapida"] },
  },
  pt: {
    POR: { label: "Goleiro", area: "Pequena área", strengths: ["Reflexos", "Jogo aéreo", "Lançamento longo"] },
    DFC: { label: "Zagueiro", area: "Zaga central", strengths: ["Antecipação", "Corte", "Jogo aéreo"] },
    LI: { label: "Lateral esquerdo", area: "Faixa esquerda", strengths: ["Apoio ofensivo", "Resistência", "Cruzamentos"] },
    LD: { label: "Lateral direito", area: "Faixa direita", strengths: ["Velocidade", "Marcação", "Ultrapassagens"] },
    MCD: { label: "Volante", area: "Zona central de marcação", strengths: ["Recuperação", "Passe curto", "Posicionamento"] },
    MC: { label: "Meio-campo central", area: "Meio-campo", strengths: ["Distribuição", "Visão", "Mobilidade"] },
    MI: { label: "Meia esquerda", area: "Meio esquerdo", strengths: ["Drible", "Passes em profundidade", "Tabelas"] },
    MD: { label: "Meia direita", area: "Meio direito", strengths: ["Condução", "Cruzamentos", "Chegada à área"] },
    MCO: { label: "Meia-atacante", area: "Três quartos ofensivos", strengths: ["Criação", "Último passe", "Chute de média distância"] },
    EI: { label: "Ponta esquerda", area: "Corredor esquerdo alto", strengths: ["Ultrapassagem", "1 contra 1", "Cruzamentos na área"] },
    ED: { label: "Ponta direita", area: "Corredor direito alto", strengths: ["Malícia", "Velocidade", "Corte para dentro"] },
    DEL: { label: "Centroavante", area: "Área adversária", strengths: ["Finalização", "Jogo aéreo", "Posicionamento"] },
    SD: { label: "Segundo atacante", area: "Entrada da área", strengths: ["Tabelas", "Movimentação", "Condução rápida"] },
  },
};

/**
 * Localized label / zone / strengths for a pitch position code. es (and any
 * unknown code/locale) falls back to POSITIONS_MAP's Spanish values.
 */
export function getPositionTactics(code: string, locale: Locale): PositionTactics {
  const base = POSITIONS_MAP[code.toUpperCase()];
  const es: PositionTactics = base
    ? { label: base.label, area: base.area, strengths: base.strengths }
    : { label: code, area: "", strengths: [] };
  if (locale === "es") return es;
  return TACTICS_I18N[locale]?.[code.toUpperCase()] ?? es;
}
