import { pgTable, uuid, text, boolean, jsonb, timestamp, date } from "drizzle-orm/pg-core";
import { playerProfiles } from "./players";
import { careerItems } from "./career";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const profileThemeSettings = pgTable("profile_theme_settings", {
  playerId: uuid("player_id")
    .primaryKey()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  layout: text("layout").notNull().default("classic"),
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  typography: text("typography"),
  coverMode: text("cover_mode").default("photo"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profileSectionsVisibility = pgTable("profile_sections_visibility", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  section: text("section").notNull(),
  visible: boolean("visible").notNull().default(true),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const playerLinks = pgTable("player_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  label: text("label"),
  url: text("url").notNull(),
  kind: text("kind").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const playerHonours = pgTable("player_honours", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  competition: text("competition"),
  season: text("season"),
  awardedOn: date("awarded_on"),
  description: text("description"),
  careerItemId: uuid("career_item_id").references(() => careerItems.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ProfileThemeSetting = InferSelectModel<typeof profileThemeSettings>;
export type NewProfileThemeSetting = InferInsertModel<typeof profileThemeSettings>;

export type ProfileSectionVisibility = InferSelectModel<typeof profileSectionsVisibility>;
export type NewProfileSectionVisibility = InferInsertModel<typeof profileSectionsVisibility>;

export type PlayerLink = InferSelectModel<typeof playerLinks>;
export type NewPlayerLink = InferInsertModel<typeof playerLinks>;

export type PlayerHonour = InferSelectModel<typeof playerHonours>;
export type NewPlayerHonour = InferInsertModel<typeof playerHonours>;
