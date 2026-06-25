// i18n per-profile content translations — COACH vertical (mirror of
// translations.ts for the player vertical).
//
// Native content (ES) lives on the source tables (coach_profiles /
// coach_honours). These tables hold the en/it/pt OVERRIDES of the
// free-text fields only. Structural data (career dates, divisions, etc.)
// is shared across locales and never duplicated here.
//
// 🔑 Row existence = that locale is PUBLISHED and indexable. The public
// route renders fallback-ES + robots:noindex for any (slug, locale) that
// has no row. hreflang is emitted ONLY for locales that exist here.
//
// Tier gating (Pro = native + up to 3 translations; Free = es only) is
// enforced in the server action that writes these rows, NOT here.
//
// RLS policies + GRANTs live in the complementary SQL migration (same
// reason as the player translations: Drizzle 0.36 keeps complex WITH CHECK
// policies in SQL). FKs to auth.users (reviewed_by, etc.) are also added in
// that complementary SQL — never referenced from this TS schema.

import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { coachProfiles } from "./coaches";
import { coachHonours } from "./coachPublishing";
import { coachMethodologyRubros } from "./coachMethodology";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Allowed locales — kept as a text CHECK (not a pgEnum) so adding a locale
// later is a non-destructive constraint swap, not an ALTER TYPE (workflow
// Tipo C). Mirrors src/i18n/routing.ts locales.
const LOCALE_CHECK = sql`locale IN ('es','en','it','pt','de','fr','fi')`;

// -------------------- coach_profile_translations --------------------

export const coachProfileTranslations = pgTable(
  "coach_profile_translations",
  {
    coachId: uuid("coach_id")
      .notNull()
      .references(() => coachProfiles.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    // The free-text fields (parallel to coach_profiles).
    bio: text("bio"),
    careerObjectives: text("career_objectives"),
    playingStyle: text("playing_style"),
    methodologyAnalysis: text("methodology_analysis"),
    analysisAuthor: text("analysis_author"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.coachId, t.locale] }),
    localeCheck: check("coach_profile_translations_locale_check", LOCALE_CHECK),
  }),
);

export type CoachProfileTranslation = InferSelectModel<
  typeof coachProfileTranslations
>;
export type NewCoachProfileTranslation = InferInsertModel<
  typeof coachProfileTranslations
>;

// -------------------- coach_honour_translations --------------------
//
// Per-locale overrides of a coach's free-text honours (palmarés). The base
// row lives on coach_honours; only the 3 free-text fields are translatable
// (season is a year, awarded_on a date — both locale-agnostic). Row existence
// per (honour, locale) = that honour is localized in that language; missing →
// es fallback (same model as coach_profile_translations).

export const coachHonourTranslations = pgTable(
  "coach_honour_translations",
  {
    honourId: uuid("honour_id")
      .notNull()
      .references(() => coachHonours.id, { onDelete: "cascade" }),
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
    localeCheck: check("coach_honour_translations_locale_check", LOCALE_CHECK),
  }),
);

export type CoachHonourTranslation = InferSelectModel<
  typeof coachHonourTranslations
>;
export type NewCoachHonourTranslation = InferInsertModel<
  typeof coachHonourTranslations
>;

// -------------------- coach_methodology_rubro_translations --------------------
//
// Overrides per-locale de los rubros de Metodología (contenido multi-fila, como
// honours). La fila base vive en coach_methodology_rubros; sólo title + body son
// traducibles (icon/position/status son locale-agnósticos). Existencia de fila
// (rubro, locale) = ese rubro está localizado en ese idioma; falta → fallback es.
// RLS + GRANTs en el SQL complementario (igual que coach_honour_translations).

export const coachMethodologyRubroTranslations = pgTable(
  "coach_methodology_rubro_translations",
  {
    rubroId: uuid("rubro_id")
      .notNull()
      .references(() => coachMethodologyRubros.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title"),
    body: text("body"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.rubroId, t.locale] }),
    localeCheck: check(
      "coach_methodology_rubro_translations_locale_check",
      LOCALE_CHECK,
    ),
  }),
);

export type CoachMethodologyRubroTranslation = InferSelectModel<
  typeof coachMethodologyRubroTranslations
>;
export type NewCoachMethodologyRubroTranslation = InferInsertModel<
  typeof coachMethodologyRubroTranslations
>;

// -------------------- coach_ai_translation_events --------------------
//
// Append-only audit + quota source for the "Auto-completar con Claude"
// assistant. Monthly regen quota is computed live:
//   COUNT(*) WHERE coach_id=? AND kind='regen'
//            AND created_at >= date_trunc('month', now())
// → no cron reset, and doubles as a cost-audit trail. The composite index
// matches that predicate. 'initial' rows (first-ever translation of a
// block→locale) do NOT consume quota.

export const coachAiTranslationEvents = pgTable(
  "coach_ai_translation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => coachProfiles.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    // The editor block the translation targeted (e.g. 'bio', 'methodology').
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
    localeCheck: check("coach_ai_translation_events_locale_check", LOCALE_CHECK),
    kindCheck: check(
      "coach_ai_translation_events_kind_check",
      sql`kind IN ('initial','regen')`,
    ),
    quotaIdx: index("coach_ai_translation_events_quota_idx").on(
      t.coachId,
      t.kind,
      t.createdAt,
    ),
  }),
);

export type CoachAiTranslationEvent = InferSelectModel<
  typeof coachAiTranslationEvents
>;
export type NewCoachAiTranslationEvent = InferInsertModel<
  typeof coachAiTranslationEvents
>;
