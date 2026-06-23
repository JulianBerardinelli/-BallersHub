// i18n per-profile content translations (F5).
//
// Native content (ES) lives on the source tables (player_profiles /
// agency_profiles). These tables hold the en/it/pt OVERRIDES of the
// free-text fields only. Structural data (birth date, positions, market
// value, etc.) is shared across locales and never duplicated here.
//
// 🔑 Row existence = that locale is PUBLISHED and indexable. The public
// route renders fallback-ES + robots:noindex for any (slug, locale) that
// has no row. hreflang is emitted ONLY for locales that exist here
// (HANDOFF §8, §17).
//
// Tier gating (Pro = native + up to 3 translations; Free = es only) is
// enforced in the server action that writes these rows, NOT here.
//
// RLS policies + GRANTs live in the complementary
// src/db/migrations/0009a_translations_rls.sql (same reason as
// blog_authors: Drizzle 0.36 keeps complex WITH CHECK policies in SQL).

import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  index,
  check,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { playerProfiles } from "./players";
import { agencyProfiles } from "./agencies";
import { agencyMedia } from "./agencyMedia";
import { agencyCountryProfiles } from "./agencyTeamRelations";
import { playerHonours } from "./profilePublishing";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Allowed locales — kept as a text CHECK (not a pgEnum) so adding a locale
// later is a non-destructive constraint swap, not an ALTER TYPE (workflow
// Tipo C). Mirrors src/i18n/routing.ts locales.
const LOCALE_CHECK = sql`locale IN ('es','en','it','pt','de','fr','fi')`;

// -------------------- player_profile_translations --------------------

export const playerProfileTranslations = pgTable(
  "player_profile_translations",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerProfiles.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    // The 8 free-text fields (parallel to player_profiles).
    bio: text("bio"),
    careerObjectives: text("career_objectives"),
    topCharacteristics: text("top_characteristics").array(),
    tacticsAnalysis: text("tactics_analysis"),
    physicalAnalysis: text("physical_analysis"),
    mentalAnalysis: text("mental_analysis"),
    techniqueAnalysis: text("technique_analysis"),
    analysisAuthor: text("analysis_author"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.playerId, t.locale] }),
    localeCheck: check("player_profile_translations_locale_check", LOCALE_CHECK),
  }),
);

export type PlayerProfileTranslation = InferSelectModel<
  typeof playerProfileTranslations
>;
export type NewPlayerProfileTranslation = InferInsertModel<
  typeof playerProfileTranslations
>;

// -------------------- player_honour_translations --------------------
//
// Per-locale overrides of a player's free-text honours (palmarés). The base
// row lives on player_honours; only the 3 free-text fields are translatable
// (season is a year, awarded_on a date — both locale-agnostic). Row existence
// per (honour, locale) = that honour is localized in that language; missing →
// es fallback (same model as player_profile_translations).

export const playerHonourTranslations = pgTable(
  "player_honour_translations",
  {
    honourId: uuid("honour_id")
      .notNull()
      .references(() => playerHonours.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title"),
    competition: text("competition"),
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.honourId, t.locale] }),
    localeCheck: check("player_honour_translations_locale_check", LOCALE_CHECK),
  }),
);

export type PlayerHonourTranslation = InferSelectModel<
  typeof playerHonourTranslations
>;
export type NewPlayerHonourTranslation = InferInsertModel<
  typeof playerHonourTranslations
>;

// -------------------- agency_profile_translations --------------------

export const agencyProfileTranslations = pgTable(
  "agency_profile_translations",
  {
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencyProfiles.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    description: text("description"),
    tagline: text("tagline"),
    // services[] is a positional JSONB array on agency_profiles WITHOUT stable
    // item ids → the locale override is stored indexed by position. Same caveat
    // the base already has (reordering services in es invalidates indices).
    // Shape: { title?: string; description?: string | null }[]
    services: jsonb("services").$type<
      Array<{ title?: string; description?: string | null }>
    >(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.agencyId, t.locale] }),
    localeCheck: check("agency_profile_translations_locale_check", LOCALE_CHECK),
  }),
);

export type AgencyProfileTranslation = InferSelectModel<
  typeof agencyProfileTranslations
>;
export type NewAgencyProfileTranslation = InferInsertModel<
  typeof agencyProfileTranslations
>;

// -------------------- agency_media_translations --------------------
//
// Per-locale overrides of agency_media free-text (title + alt_text). Stable id
// match (media id). es base on agency_media; missing row → es fallback.

export const agencyMediaTranslations = pgTable(
  "agency_media_translations",
  {
    mediaId: uuid("media_id")
      .notNull()
      .references(() => agencyMedia.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title"),
    altText: text("alt_text"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.mediaId, t.locale] }),
    localeCheck: check("agency_media_translations_locale_check", LOCALE_CHECK),
  }),
);

export type AgencyMediaTranslation = InferSelectModel<
  typeof agencyMediaTranslations
>;
export type NewAgencyMediaTranslation = InferInsertModel<
  typeof agencyMediaTranslations
>;

// -------------------- agency_country_profile_translations --------------------
//
// Per-locale override of agency_country_profiles.description (per-country
// narrative). Stable id match (country_profile id).

export const agencyCountryProfileTranslations = pgTable(
  "agency_country_profile_translations",
  {
    countryProfileId: uuid("country_profile_id")
      .notNull()
      .references(() => agencyCountryProfiles.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.countryProfileId, t.locale] }),
    localeCheck: check(
      "agency_country_profile_translations_locale_check",
      LOCALE_CHECK,
    ),
  }),
);

export type AgencyCountryProfileTranslation = InferSelectModel<
  typeof agencyCountryProfileTranslations
>;
export type NewAgencyCountryProfileTranslation = InferInsertModel<
  typeof agencyCountryProfileTranslations
>;

// -------------------- ai_translation_events --------------------
//
// Append-only audit + quota source for the "Auto-completar con Claude"
// assistant (HANDOFF §5.1). Monthly regen quota is computed live:
//   COUNT(*) WHERE player_id=? AND kind='regen'
//            AND created_at >= date_trunc('month', now())
// → no cron reset, and doubles as a cost-audit trail. The composite index
// matches that predicate. 'initial' rows (first-ever translation of a
// block→locale) do NOT consume quota.

export const aiTranslationEvents = pgTable(
  "ai_translation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerProfiles.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    // The editor block the translation targeted (e.g. 'bio', 'scouting').
    block: text("block").notNull(),
    // 'initial' (first time, free) | 'regen' (counts against quota).
    kind: text("kind").notNull(),
    // hash(ES source fields of the block) — idempotency: same hash on
    // re-click returns cache, never hits the model.
    sourceHash: text("source_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    localeCheck: check("ai_translation_events_locale_check", LOCALE_CHECK),
    kindCheck: check(
      "ai_translation_events_kind_check",
      sql`kind IN ('initial','regen')`,
    ),
    quotaIdx: index("ai_translation_events_quota_idx").on(
      t.playerId,
      t.kind,
      t.createdAt,
    ),
  }),
);

export type AiTranslationEvent = InferSelectModel<typeof aiTranslationEvents>;
export type NewAiTranslationEvent = InferInsertModel<typeof aiTranslationEvents>;
