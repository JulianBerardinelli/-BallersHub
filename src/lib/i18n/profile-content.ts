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
  agencyMediaTranslations,
  agencyCountryProfileTranslations,
  type PlayerProfileTranslation,
  type AgencyProfileTranslation,
} from "@/db/schema/translations";
import { coachProfiles } from "@/db/schema/coaches";
import {
  coachProfileTranslations,
  coachHonourTranslations,
  coachMethodologyRubroTranslations,
  type CoachProfileTranslation,
} from "@/db/schema/coachTranslations";

export const CONTENT_LOCALES = ["es", "en", "it", "pt", "de", "fr", "fi"] as const;
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

// Legacy column projection — what existed BEFORE the `services jsonb` addition
// landed. Reads use this explicit projection so the public agency page and the
// dashboard keep working in a window where the schema TS already references the
// new column but the migration hasn't reached the deployed database yet (review
// Codex P1 on #216). The `services` field is fetched separately in a defensive
// try/catch so a pending migration only degrades that one feature.
const AGENCY_TRANSLATION_LEGACY_COLUMNS = {
  agencyId: agencyProfileTranslations.agencyId,
  locale: agencyProfileTranslations.locale,
  description: agencyProfileTranslations.description,
  tagline: agencyProfileTranslations.tagline,
  updatedAt: agencyProfileTranslations.updatedAt,
} as const;

type AgencyTranslationLegacyRow = {
  agencyId: string;
  locale: string;
  description: string | null;
  tagline: string | null;
  updatedAt: Date;
};

/** Defensive fetch of the new `services` jsonb override for one (agency,locale). */
async function fetchAgencyServicesOverride(
  agencyId: string,
  locale: string,
): Promise<Array<{ title?: string; description?: string | null }> | null> {
  try {
    const [row] = await db
      .select({ services: agencyProfileTranslations.services })
      .from(agencyProfileTranslations)
      .where(
        and(
          eq(agencyProfileTranslations.agencyId, agencyId),
          eq(agencyProfileTranslations.locale, locale),
        ),
      )
      .limit(1);
    return row?.services ?? null;
  } catch {
    // Column not migrated yet — degrade gracefully.
    return null;
  }
}

export async function getAgencyTranslations(
  agencyId: string,
): Promise<Map<ContentLocale, AgencyProfileTranslation>> {
  // Explicit projection of legacy columns so a pending `services` migration
  // doesn't blow up the page (Codex P1 on #216).
  const rows = (await db
    .select(AGENCY_TRANSLATION_LEGACY_COLUMNS)
    .from(agencyProfileTranslations)
    .where(eq(agencyProfileTranslations.agencyId, agencyId))) as AgencyTranslationLegacyRow[];

  const map = new Map<ContentLocale, AgencyProfileTranslation>();
  // Best-effort services hydration (one row per locale; reads each defensively).
  await Promise.all(
    rows
      .filter((r) => isContentLocale(r.locale))
      .map(async (r) => {
        const services = await fetchAgencyServicesOverride(agencyId, r.locale);
        map.set(r.locale as ContentLocale, {
          ...r,
          services,
        } as AgencyProfileTranslation);
      }),
  );
  return map;
}

export async function getAgencyTranslation(
  agencyId: string,
  locale: string,
): Promise<AgencyProfileTranslation | null> {
  if (locale === "es" || !isContentLocale(locale)) return null;
  const [row] = (await db
    .select(AGENCY_TRANSLATION_LEGACY_COLUMNS)
    .from(agencyProfileTranslations)
    .where(
      and(
        eq(agencyProfileTranslations.agencyId, agencyId),
        eq(agencyProfileTranslations.locale, locale),
      ),
    )
    .limit(1)) as AgencyTranslationLegacyRow[];
  if (!row) return null;
  const services = await fetchAgencyServicesOverride(agencyId, locale);
  return { ...row, services } as AgencyProfileTranslation;
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

// ============================ agency services (positional JSONB) ============================

type AgencyServiceBase = {
  title: string;
  icon: string;
  color: string | null;
  description: string | null;
};
type AgencyServiceOverride = { title?: string; description?: string | null };

/**
 * Merge a positional services array with its per-locale overrides. Override
 * matches by INDEX (services don't have stable ids in the JSONB). Missing or
 * empty fields fall back to the es base — never duplicate icons/colors (those
 * are locale-agnostic).
 */
export function mergeAgencyServices(
  base: AgencyServiceBase[],
  overrides: AgencyServiceOverride[] | null | undefined,
): AgencyServiceBase[] {
  if (!base) return [];
  if (!overrides || overrides.length === 0) return base;
  return base.map((b, i) => {
    const o = overrides[i];
    if (!o) return b;
    return {
      ...b,
      title: pick(o.title ?? null, b.title) ?? b.title,
      description: pick(o.description ?? null, b.description),
    };
  });
}

// ============================ agency media ============================

export type AgencyMediaLocalizedFields = {
  title: string | null;
  altText: string | null;
};

/**
 * Per-locale overrides for a set of agency media, keyed by media id. Empty for
 * es or when the translations table isn't present yet (defensive: the public
 * route never breaks because the migration is pending).
 */
export async function getAgencyMediaTranslations(
  mediaIds: string[],
  locale: string,
): Promise<Map<string, AgencyMediaLocalizedFields>> {
  if (locale === "es" || !isContentLocale(locale) || mediaIds.length === 0) {
    return new Map();
  }
  try {
    const rows = await db
      .select()
      .from(agencyMediaTranslations)
      .where(
        and(
          inArray(agencyMediaTranslations.mediaId, mediaIds),
          eq(agencyMediaTranslations.locale, locale),
        ),
      );
    const map = new Map<string, AgencyMediaLocalizedFields>();
    for (const r of rows) {
      map.set(r.mediaId, { title: r.title, altText: r.altText });
    }
    return map;
  } catch {
    // Table not migrated yet → es fallback.
    return new Map();
  }
}

/**
 * All locale overrides for a set of agency media (for the dashboard editor).
 * Defensive: empty if the table isn't migrated yet.
 */
export async function getAgencyMediaTranslationsAllLocales(
  mediaIds: string[],
): Promise<
  Map<string, Partial<Record<ContentLocale, AgencyMediaLocalizedFields>>>
> {
  const map = new Map<
    string,
    Partial<Record<ContentLocale, AgencyMediaLocalizedFields>>
  >();
  if (mediaIds.length === 0) return map;
  try {
    const rows = await db
      .select()
      .from(agencyMediaTranslations)
      .where(inArray(agencyMediaTranslations.mediaId, mediaIds));
    for (const r of rows) {
      if (!isContentLocale(r.locale)) continue;
      const entry = map.get(r.mediaId) ?? {};
      entry[r.locale] = { title: r.title, altText: r.altText };
      map.set(r.mediaId, entry);
    }
    return map;
  } catch {
    return map;
  }
}

export function mergeAgencyMediaContent<
  T extends { title: string | null; altText: string | null },
>(base: T, tr: AgencyMediaLocalizedFields | undefined): T {
  if (!tr) return base;
  return {
    ...base,
    title: pick(tr.title, base.title),
    altText: pick(tr.altText, base.altText),
  };
}

// ============================ agency country profiles ============================

export type AgencyCountryProfileLocalizedFields = {
  description: string | null;
};

/**
 * Per-locale overrides for a set of agency country profiles. Defensive.
 */
export async function getAgencyCountryProfileTranslations(
  countryProfileIds: string[],
  locale: string,
): Promise<Map<string, AgencyCountryProfileLocalizedFields>> {
  if (
    locale === "es" ||
    !isContentLocale(locale) ||
    countryProfileIds.length === 0
  ) {
    return new Map();
  }
  try {
    const rows = await db
      .select()
      .from(agencyCountryProfileTranslations)
      .where(
        and(
          inArray(
            agencyCountryProfileTranslations.countryProfileId,
            countryProfileIds,
          ),
          eq(agencyCountryProfileTranslations.locale, locale),
        ),
      );
    const map = new Map<string, AgencyCountryProfileLocalizedFields>();
    for (const r of rows) {
      map.set(r.countryProfileId, { description: r.description });
    }
    return map;
  } catch {
    return new Map();
  }
}

/** All-locales variant for the dashboard editor (defensive). */
export async function getAgencyCountryProfileTranslationsAllLocales(
  countryProfileIds: string[],
): Promise<
  Map<string, Partial<Record<ContentLocale, AgencyCountryProfileLocalizedFields>>>
> {
  const map = new Map<
    string,
    Partial<Record<ContentLocale, AgencyCountryProfileLocalizedFields>>
  >();
  if (countryProfileIds.length === 0) return map;
  try {
    const rows = await db
      .select()
      .from(agencyCountryProfileTranslations)
      .where(
        inArray(
          agencyCountryProfileTranslations.countryProfileId,
          countryProfileIds,
        ),
      );
    for (const r of rows) {
      if (!isContentLocale(r.locale)) continue;
      const entry = map.get(r.countryProfileId) ?? {};
      entry[r.locale] = { description: r.description };
      map.set(r.countryProfileId, entry);
    }
    return map;
  } catch {
    return map;
  }
}

export function mergeAgencyCountryProfileContent<
  T extends { description: string | null },
>(base: T, tr: AgencyCountryProfileLocalizedFields | undefined): T {
  if (!tr) return base;
  return { ...base, description: pick(tr.description, base.description) };
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

export type MethodologyRubroLocalizedFields = { title: string | null; body: string | null };

/** Per-locale overrides for a set of methodology rubros (es fallback, defensive). */
export async function getCoachMethodologyRubroTranslations(
  rubroIds: string[],
  locale: string,
): Promise<Map<string, MethodologyRubroLocalizedFields>> {
  if (locale === "es" || !isContentLocale(locale) || rubroIds.length === 0) {
    return new Map();
  }
  try {
    const rows = await db
      .select()
      .from(coachMethodologyRubroTranslations)
      .where(
        and(
          inArray(coachMethodologyRubroTranslations.rubroId, rubroIds),
          eq(coachMethodologyRubroTranslations.locale, locale),
        ),
      );
    const map = new Map<string, MethodologyRubroLocalizedFields>();
    for (const r of rows) {
      map.set(r.rubroId, { title: r.title, body: r.body });
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
