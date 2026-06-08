// Read layer for per-profile content translations (F5).
//
// Native ES content lives on player_profiles / agency_profiles. The en/it/pt
// OVERRIDES live in *_translations. Row existence per (id, locale) = that
// locale is PUBLISHED and indexable — this is what drives per-player hreflang
// (HANDOFF §8/§17) and the noindex fallback in the public route.
//
// Server actions enforce the tier limit (Pro=4, Free=1) on WRITE; this module
// is read-only and safe to call from RSC / generateMetadata.

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  playerProfileTranslations,
  agencyProfileTranslations,
  type PlayerProfileTranslation,
  type AgencyProfileTranslation,
} from "@/db/schema/translations";

export const CONTENT_LOCALES = ["es", "en", "it", "pt"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export function isContentLocale(v: string): v is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(v);
}

const pick = (t: string | null, b: string | null) =>
  t != null && t.trim() !== "" ? t : b;

// ============================ player ============================

/** The 8 translatable player fields, resolved for one locale. */
export type PlayerLocalizedFields = {
  bio: string | null;
  careerObjectives: string | null;
  topCharacteristics: string[] | null;
  tacticsAnalysis: string | null;
  physicalAnalysis: string | null;
  mentalAnalysis: string | null;
  techniqueAnalysis: string | null;
  analysisAuthor: string | null;
};

/** All translation rows for a player, keyed by locale (never 'es'). */
export async function getPlayerTranslations(
  playerId: string,
): Promise<Map<ContentLocale, PlayerProfileTranslation>> {
  const rows = await db
    .select()
    .from(playerProfileTranslations)
    .where(eq(playerProfileTranslations.playerId, playerId));
  const map = new Map<ContentLocale, PlayerProfileTranslation>();
  for (const r of rows) {
    if (isContentLocale(r.locale)) map.set(r.locale, r);
  }
  return map;
}

/** One translation row (or null) for player+locale. 'es' → null (use base). */
export async function getPlayerTranslation(
  playerId: string,
  locale: string,
): Promise<PlayerProfileTranslation | null> {
  if (locale === "es" || !isContentLocale(locale)) return null;
  const [row] = await db
    .select()
    .from(playerProfileTranslations)
    .where(
      and(
        eq(playerProfileTranslations.playerId, playerId),
        eq(playerProfileTranslations.locale, locale),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Locales that exist for a player, ES always first. Drives per-player
 * hreflang: ONLY these get a <link rel="alternate"> (HANDOFF §17). A locale
 * absent here renders fallback-ES + robots:noindex.
 */
export async function getAvailablePlayerLocales(
  playerId: string,
): Promise<ContentLocale[]> {
  const map = await getPlayerTranslations(playerId);
  return [
    "es",
    ...CONTENT_LOCALES.filter((l) => l !== "es" && map.has(l)),
  ] as ContentLocale[];
}

/**
 * Merge a translation over the ES base, field by field. A null/blank field in
 * the translation falls back to ES so a half-finished locale never renders an
 * empty section. Pass translation=null (or locale 'es') to get the base as-is.
 */
export function mergePlayerContent(
  base: PlayerLocalizedFields,
  translation: PlayerProfileTranslation | null,
): PlayerLocalizedFields {
  if (!translation) {
    return { ...base };
  }
  return {
    bio: pick(translation.bio, base.bio),
    careerObjectives: pick(translation.careerObjectives, base.careerObjectives),
    topCharacteristics:
      translation.topCharacteristics &&
      translation.topCharacteristics.length > 0
        ? translation.topCharacteristics
        : base.topCharacteristics,
    tacticsAnalysis: pick(translation.tacticsAnalysis, base.tacticsAnalysis),
    physicalAnalysis: pick(translation.physicalAnalysis, base.physicalAnalysis),
    mentalAnalysis: pick(translation.mentalAnalysis, base.mentalAnalysis),
    techniqueAnalysis: pick(
      translation.techniqueAnalysis,
      base.techniqueAnalysis,
    ),
    analysisAuthor: pick(translation.analysisAuthor, base.analysisAuthor),
  };
}

// ============================ agency ============================

export type AgencyLocalizedFields = {
  description: string | null;
  tagline: string | null;
};

export async function getAgencyTranslations(
  agencyId: string,
): Promise<Map<ContentLocale, AgencyProfileTranslation>> {
  const rows = await db
    .select()
    .from(agencyProfileTranslations)
    .where(eq(agencyProfileTranslations.agencyId, agencyId));
  const map = new Map<ContentLocale, AgencyProfileTranslation>();
  for (const r of rows) {
    if (isContentLocale(r.locale)) map.set(r.locale, r);
  }
  return map;
}

export async function getAgencyTranslation(
  agencyId: string,
  locale: string,
): Promise<AgencyProfileTranslation | null> {
  if (locale === "es" || !isContentLocale(locale)) return null;
  const [row] = await db
    .select()
    .from(agencyProfileTranslations)
    .where(
      and(
        eq(agencyProfileTranslations.agencyId, agencyId),
        eq(agencyProfileTranslations.locale, locale),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getAvailableAgencyLocales(
  agencyId: string,
): Promise<ContentLocale[]> {
  const map = await getAgencyTranslations(agencyId);
  return [
    "es",
    ...CONTENT_LOCALES.filter((l) => l !== "es" && map.has(l)),
  ] as ContentLocale[];
}

export function mergeAgencyContent(
  base: AgencyLocalizedFields,
  translation: AgencyProfileTranslation | null,
): AgencyLocalizedFields {
  if (!translation) return { ...base };
  return {
    description: pick(translation.description, base.description),
    tagline: pick(translation.tagline, base.tagline),
  };
}
