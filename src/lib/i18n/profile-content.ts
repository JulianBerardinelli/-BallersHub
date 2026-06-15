// Read layer for per-profile content translations (F5).
//
// Native ES content lives on player_profiles / agency_profiles. The en/it/pt
// OVERRIDES live in *_translations. Row existence per (id, locale) = that
// locale is PUBLISHED and indexable — this is what drives per-player hreflang
// (HANDOFF §8/§17) and the noindex fallback in the public route.
//
// Server actions enforce the tier limit (Pro=4, Free=1) on WRITE; this module
// is read-only and safe to call from RSC / generateMetadata.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { playerProfiles } from "@/db/schema/players";
import { agencyProfiles } from "@/db/schema/agencies";
import {
  playerProfileTranslations,
  agencyProfileTranslations,
  playerHonourTranslations,
  type PlayerProfileTranslation,
  type AgencyProfileTranslation,
} from "@/db/schema/translations";
import { coachProfiles } from "@/db/schema/coaches";
import {
  coachProfileTranslations,
  coachHonourTranslations,
  type CoachProfileTranslation,
} from "@/db/schema/coachTranslations";

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

// ============================ player honours ============================

export type HonourLocalizedFields = {
  title: string | null;
  competition: string | null;
  description: string | null;
};

/**
 * Per-locale overrides for a set of honours, keyed by honour id. Empty for es
 * (the base) or when the translations table isn't present yet (migration
 * pending) — the caller then renders the es base, never throwing on the public
 * route.
 */
export async function getHonourTranslations(
  honourIds: string[],
  locale: string,
): Promise<Map<string, HonourLocalizedFields>> {
  if (locale === "es" || !isContentLocale(locale) || honourIds.length === 0) {
    return new Map();
  }
  try {
    const rows = await db
      .select()
      .from(playerHonourTranslations)
      .where(
        and(
          inArray(playerHonourTranslations.honourId, honourIds),
          eq(playerHonourTranslations.locale, locale),
        ),
      );
    const map = new Map<string, HonourLocalizedFields>();
    for (const r of rows) {
      map.set(r.honourId, {
        title: r.title,
        competition: r.competition,
        description: r.description,
      });
    }
    return map;
  } catch {
    // Table not migrated yet → es fallback. Cache invalidation/render must
    // never break because the honours-translations migration is pending.
    return new Map();
  }
}

/**
 * All locale translations for a set of honours, keyed by honour id → locale →
 * fields. For the dashboard editor (prefills every locale's inputs). Defensive:
 * empty if the table isn't migrated yet.
 */
export async function getHonourTranslationsAllLocales(
  honourIds: string[],
): Promise<Map<string, Partial<Record<ContentLocale, HonourLocalizedFields>>>> {
  const map = new Map<string, Partial<Record<ContentLocale, HonourLocalizedFields>>>();
  if (honourIds.length === 0) return map;
  try {
    const rows = await db
      .select()
      .from(playerHonourTranslations)
      .where(inArray(playerHonourTranslations.honourId, honourIds));
    for (const r of rows) {
      if (!isContentLocale(r.locale)) continue;
      const entry = map.get(r.honourId) ?? {};
      entry[r.locale] = {
        title: r.title,
        competition: r.competition,
        description: r.description,
      };
      map.set(r.honourId, entry);
    }
    return map;
  } catch {
    return map;
  }
}

/** Merge one honour's translation over its base, field by field (es fallback). */
export function mergeHonourContent<
  T extends { title: string; competition: string | null; description: string | null },
>(base: T, tr: HonourLocalizedFields | undefined): T {
  if (!tr) return base;
  return {
    ...base,
    title: pick(tr.title, base.title) ?? base.title,
    competition: pick(tr.competition, base.competition),
    description: pick(tr.description, base.description),
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

// ============================ sitemap bulk ============================
//
// One-query maps of slug → real translation locales, for the sitemap to emit
// per-entry hreflang alternates without N round-trips. ES is implicit (the
// base URL); these return only the en/it/pt that actually exist.

export async function getTranslatedPlayerLocalesBySlug(): Promise<
  Map<string, ContentLocale[]>
> {
  const rows = await db
    .select({
      slug: playerProfiles.slug,
      locale: playerProfileTranslations.locale,
    })
    .from(playerProfileTranslations)
    .innerJoin(
      playerProfiles,
      eq(playerProfiles.id, playerProfileTranslations.playerId),
    );
  const map = new Map<string, ContentLocale[]>();
  for (const r of rows) {
    if (!isContentLocale(r.locale)) continue;
    const arr = map.get(r.slug) ?? [];
    arr.push(r.locale);
    map.set(r.slug, arr);
  }
  return map;
}

// ============================ coach ============================
//
// Coach translatable fields: bio, careerObjectives, playingStyle (ideas de
// juego), methodologyAnalysis, analysisAuthor. Same row-existence = published
// + indexable contract as players (drives hreflang + the noindex fallback).

export type CoachLocalizedFields = {
  bio: string | null;
  careerObjectives: string | null;
  playingStyle: string | null;
  methodologyAnalysis: string | null;
  analysisAuthor: string | null;
};

export async function getCoachTranslations(
  coachId: string,
): Promise<Map<ContentLocale, CoachProfileTranslation>> {
  const rows = await db
    .select()
    .from(coachProfileTranslations)
    .where(eq(coachProfileTranslations.coachId, coachId));
  const map = new Map<ContentLocale, CoachProfileTranslation>();
  for (const r of rows) {
    if (isContentLocale(r.locale)) map.set(r.locale, r);
  }
  return map;
}

export async function getCoachTranslation(
  coachId: string,
  locale: string,
): Promise<CoachProfileTranslation | null> {
  if (locale === "es" || !isContentLocale(locale)) return null;
  const [row] = await db
    .select()
    .from(coachProfileTranslations)
    .where(
      and(
        eq(coachProfileTranslations.coachId, coachId),
        eq(coachProfileTranslations.locale, locale),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getAvailableCoachLocales(
  coachId: string,
): Promise<ContentLocale[]> {
  const map = await getCoachTranslations(coachId);
  return [
    "es",
    ...CONTENT_LOCALES.filter((l) => l !== "es" && map.has(l)),
  ] as ContentLocale[];
}

export function mergeCoachContent(
  base: CoachLocalizedFields,
  translation: CoachProfileTranslation | null,
): CoachLocalizedFields {
  if (!translation) return { ...base };
  return {
    bio: pick(translation.bio, base.bio),
    careerObjectives: pick(translation.careerObjectives, base.careerObjectives),
    playingStyle: pick(translation.playingStyle, base.playingStyle),
    methodologyAnalysis: pick(translation.methodologyAnalysis, base.methodologyAnalysis),
    analysisAuthor: pick(translation.analysisAuthor, base.analysisAuthor),
  };
}

/** Per-locale overrides for a set of coach honours (es fallback, defensive). */
export async function getCoachHonourTranslations(
  honourIds: string[],
  locale: string,
): Promise<Map<string, HonourLocalizedFields>> {
  if (locale === "es" || !isContentLocale(locale) || honourIds.length === 0) {
    return new Map();
  }
  try {
    const rows = await db
      .select()
      .from(coachHonourTranslations)
      .where(
        and(
          inArray(coachHonourTranslations.honourId, honourIds),
          eq(coachHonourTranslations.locale, locale),
        ),
      );
    const map = new Map<string, HonourLocalizedFields>();
    for (const r of rows) {
      map.set(r.honourId, {
        title: r.title,
        competition: r.competition,
        description: r.description,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function getTranslatedCoachLocalesBySlug(): Promise<
  Map<string, ContentLocale[]>
> {
  const rows = await db
    .select({
      slug: coachProfiles.slug,
      locale: coachProfileTranslations.locale,
    })
    .from(coachProfileTranslations)
    .innerJoin(
      coachProfiles,
      eq(coachProfiles.id, coachProfileTranslations.coachId),
    );
  const map = new Map<string, ContentLocale[]>();
  for (const r of rows) {
    if (!isContentLocale(r.locale)) continue;
    const arr = map.get(r.slug) ?? [];
    arr.push(r.locale);
    map.set(r.slug, arr);
  }
  return map;
}

export async function getTranslatedAgencyLocalesBySlug(): Promise<
  Map<string, ContentLocale[]>
> {
  const rows = await db
    .select({
      slug: agencyProfiles.slug,
      locale: agencyProfileTranslations.locale,
    })
    .from(agencyProfileTranslations)
    .innerJoin(
      agencyProfiles,
      eq(agencyProfiles.id, agencyProfileTranslations.agencyId),
    );
  const map = new Map<string, ContentLocale[]>();
  for (const r of rows) {
    if (!isContentLocale(r.locale)) continue;
    const arr = map.get(r.slug) ?? [];
    arr.push(r.locale);
    map.set(r.slug, arr);
  }
  return map;
}
