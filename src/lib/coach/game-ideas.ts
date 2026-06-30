// Modelo de datos + helpers de la pizarra táctica ("Ideas de Juego").
// Server + client safe (sin efectos). El estado vive en
// coach_game_ideas.pitch_board (jsonb) y se valida con zod al guardar.
//
// Convención de coordenadas: la cancha es vertical, x/y en % (0-100). y=0 es
// el borde superior (ataque) y y=100 el inferior (arco propio). x=0 izquierda,
// x=100 derecha. Mismo sistema en editor y render para que el tablero se vea
// idéntico en ambos.

import { z } from "zod";

export const MAX_GAME_IDEAS = 3;
export const MAX_TOKENS = 22; // 11 vs 11 como tope sano
export const MAX_ARROWS = 24;

// Una ficha en el tablero. `team` distingue equipo propio vs rival (color).
// `kind` permite balón / cono además de jugador. `label` es opcional (dorsal o
// rol corto, ej "9", "MC").
export const pitchTokenSchema = z.object({
  id: z.string().min(1).max(40),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  team: z.enum(["own", "opponent"]).default("own"),
  kind: z.enum(["player", "ball", "cone"]).default("player"),
  label: z
    .union([z.string().trim().max(4), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .nullable(),
});

export type PitchToken = z.infer<typeof pitchTokenSchema>;

// Una flecha (movimiento/pase): de un punto a otro, en % de la cancha.
// `kind`: pass (recta), run (curva/movimiento), dribble (zigzag) — el render
// elige el estilo. `curved` permite una curva simple via un punto de control.
export const pitchArrowSchema = z.object({
  id: z.string().min(1).max(40),
  fromX: z.number().min(0).max(100),
  fromY: z.number().min(0).max(100),
  toX: z.number().min(0).max(100),
  toY: z.number().min(0).max(100),
  kind: z.enum(["pass", "run", "dribble"]).default("pass"),
});

export type PitchArrow = z.infer<typeof pitchArrowSchema>;

export const pitchBoardSchema = z.object({
  tokens: z.array(pitchTokenSchema).max(MAX_TOKENS).default([]),
  arrows: z.array(pitchArrowSchema).max(MAX_ARROWS).default([]),
});

export type PitchBoard = z.infer<typeof pitchBoardSchema>;

export const EMPTY_PITCH_BOARD: PitchBoard = { tokens: [], arrows: [] };

/** Parseo defensivo del jsonb crudo de la DB → PitchBoard válido (o vacío). */
export function parsePitchBoard(raw: unknown): PitchBoard {
  const parsed = pitchBoardSchema.safeParse(raw);
  return parsed.success ? parsed.data : EMPTY_PITCH_BOARD;
}

/** True si el tablero tiene algo dibujado (para decidir si renderizar). */
export function pitchBoardHasContent(board: PitchBoard | null | undefined): boolean {
  if (!board) return false;
  return board.tokens.length > 0 || board.arrows.length > 0;
}

// ── Formaciones → coordenadas base ──────────────────────────────────────────
// Reusa la convención de parseFormation ("4-3-3" → [4,3,3], líneas de defensa→
// ataque). Genera 11 fichas propias colocadas por líneas. El arquero abajo del
// todo; las líneas suben hacia el ataque.

/** "4-3-3" → [4,3,3]. 2-5 líneas, 1-6 por línea. Inválido → []. */
export function parseFormation(raw: string): number[] {
  const parts = (raw ?? "")
    .trim()
    .split(/[-–\s]+/)
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 6);
  return parts.length >= 2 && parts.length <= 5 ? parts : [];
}

/**
 * Coloca 11 fichas propias desde una formación. Arquero en y≈92; las líneas
 * outfield se reparten entre y≈74 (defensa) y y≈20 (ataque). x distribuido
 * uniforme por línea. Devuelve [] si la formación es inválida.
 */
export function tokensFromFormation(formation: string): PitchToken[] {
  const lines = parseFormation(formation);
  if (lines.length === 0) return [];

  const tokens: PitchToken[] = [];
  // Arquero.
  tokens.push({ id: "gk", x: 50, y: 92, team: "own", kind: "player", label: "1" });

  // Líneas outfield: defensa (más abajo) → ataque (más arriba).
  const topY = 20;
  const bottomY = 74;
  const span = bottomY - topY;
  const n = lines.length;
  lines.forEach((count, lineIdx) => {
    // lineIdx 0 = defensa (abajo), último = ataque (arriba).
    const y = n === 1 ? (topY + bottomY) / 2 : bottomY - (span * lineIdx) / (n - 1);
    for (let i = 0; i < count; i++) {
      const x = ((i + 1) / (count + 1)) * 100;
      tokens.push({
        id: `l${lineIdx}-${i}`,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        team: "own",
        kind: "player",
        label: null,
      });
    }
  });

  return tokens;
}
