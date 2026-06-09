// AI translation for the "Auto-completar con Claude" assistant (F5.4).
//
// Vercel AI Gateway + AI SDK v6 generateObject() with a Zod schema per block.
// The gateway is the default provider, so the model is a plain
// "provider/model" string and auth comes from AI_GATEWAY_API_KEY (local) or
// OIDC (Vercel). Model IDs are verified against the gateway, never memorized —
// `curl https://ai-gateway.vercel.sh/v1/models`.
//
// This module ONLY produces a draft. It never writes to
// player_profile_translations — the player edits and saves it explicitly
// (HANDOFF §5: never auto-save, never auto-publish).

import { generateObject } from "ai";
import { z } from "zod";

// Gemini 2.5 Flash: strong multilingual quality + structured-output capable +
// ~7x cheaper than Sonnet — the right tier for assisted translation that the
// player edits anyway (chosen by the owner over the HANDOFF's Sonnet default).
// Override via AI_TRANSLATION_MODEL. Verify ids with
// `curl https://ai-gateway.vercel.sh/v1/models`.
const MODEL = process.env.AI_TRANSLATION_MODEL ?? "google/gemini-2.5-flash";

// Source AND target can be any content locale — the editor is adaptive: the
// player authors in their preferred_locale and the assistant translates FROM
// it into the rest, es included (model B1). es-AR stays the canonical /slug,
// but it can itself be a TARGET when the player writes in another language.
export type TranslateLocale = "es" | "en" | "it" | "pt";
export type TranslationBlock = "bio" | "scouting";

const LOCALE_NAME: Record<TranslateLocale, string> = {
  es: "Argentine Spanish (es-AR)",
  en: "English",
  it: "Italian (it-IT, football register)",
  pt: "Brazilian Portuguese (pt-BR)",
};

// Mirror of src/i18n/glossary.md (football + positions + rules). Embedded
// rather than read from disk so it always bundles into the server function.
const GLOSSARY = `
Football terms — ES | EN | IT | PT-BR:
Futbolista | Footballer | Calciatore | Futebolista
Trayectoria | Career history | Carriera | Trajetória
Objetivos de carrera | Career objectives | Obiettivi di carriera | Objetivos de carreira
Análisis táctico | Tactical analysis | Analisi tattica | Análise tática
Análisis físico | Physical analysis | Analisi fisica | Análise física
Análisis mental | Mental analysis | Analisi mentale | Análise mental
Análisis técnico | Technical analysis | Analisi tecnica | Análise técnica
Pie hábil | Preferred foot | Piede preferito | Pé dominante
Club actual | Current club | Squadra attuale | Clube atual
Mercado de pases | Transfer market | Calciomercato | Mercado de transferências
Selección | National team | Nazionale | Seleção
Positions — Arquero/Portero | Goalkeeper | Portiere | Goleiro · Defensa central | Center back | Difensore centrale | Zagueiro · Lateral | Full back | Terzino | Lateral · Mediocampista central | Central midfielder | Centrocampista centrale | Meio-campo · Volante | Defensive midfielder | Mediano | Volante · Extremo | Winger | Esterno | Ponta · Delantero | Forward | Attaccante | Atacante · Centrodelantero | Striker | Centravanti | Centroavante
Rules: pt = pt-BR (Brazil, e.g. "Goleiro" not "Guarda-redes"). it = it-IT (e.g. "Calciomercato", "Attaccante"). Never translate "BallersHub" or proper nouns (clubs, names).
`.trim();

const bioBlockSchema = z.object({
  bio: z.string(),
  careerObjectives: z.string(),
  topCharacteristics: z.array(z.string()),
});

const scoutingBlockSchema = z.object({
  tacticsAnalysis: z.string(),
  physicalAnalysis: z.string(),
  mentalAnalysis: z.string(),
  techniqueAnalysis: z.string(),
  analysisAuthor: z.string(),
});

const SCHEMAS = { bio: bioBlockSchema, scouting: scoutingBlockSchema } as const;

export type BioBlock = z.infer<typeof bioBlockSchema>;
export type ScoutingBlock = z.infer<typeof scoutingBlockSchema>;

/**
 * Translate one editor block from the player's source locale into the target
 * locale. Returns the structured object (same keys as the source block).
 * Throws on model/gateway error — the caller surfaces a friendly message.
 */
export async function translateBlock(
  block: TranslationBlock,
  source: Record<string, unknown>,
  sourceLocale: TranslateLocale,
  targetLocale: TranslateLocale,
): Promise<BioBlock | ScoutingBlock> {
  const schema = SCHEMAS[block];

  const system = [
    "You are a professional sports translator for BallersHub, a football scouting platform.",
    `Translate the player's own profile copy from ${LOCALE_NAME[sourceLocale]} into ${LOCALE_NAME[targetLocale]}.`,
    "Keep the player's voice and meaning; professional, sporting, concise register; avoid literal machine-translation phrasing.",
    "If a source field is empty, return an empty string (and an empty array for lists). Do not invent content.",
    "Use this glossary EXACTLY whenever a term appears:",
    GLOSSARY,
  ].join("\n");

  const prompt = `Translate every field below into ${LOCALE_NAME[targetLocale]}. Return the same keys with translated values:\n\n${JSON.stringify(
    source,
    null,
    2,
  )}`;

  const { object } = await generateObject({ model: MODEL, schema, system, prompt });
  return object as BioBlock | ScoutingBlock;
}
