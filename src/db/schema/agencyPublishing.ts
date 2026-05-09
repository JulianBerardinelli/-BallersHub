import { pgTable, uuid, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { agencyProfiles } from "./agencies";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const agencyThemeSettings = pgTable("agency_theme_settings", {
  agencyId: uuid("agency_id")
    .primaryKey()
    .references(() => agencyProfiles.id, { onDelete: "cascade" }),
  layout: text("layout").notNull().default("classic"),
  primaryColor: text("primary_color").default("#10b981"),
  secondaryColor: text("secondary_color").default("#2A2A2A"),
  accentColor: text("accent_color").default("#34d399"),
  backgroundColor: text("background_color").default("#050505"),
  typography: text("typography"),
  heroHeadline: text("hero_headline"),
  heroTagline: text("hero_tagline"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agencySectionsVisibility = pgTable("agency_sections_visibility", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .notNull()
    .references(() => agencyProfiles.id, { onDelete: "cascade" }),
  section: text("section").notNull(),
  visible: boolean("visible").notNull().default(true),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AgencyThemeSetting = InferSelectModel<typeof agencyThemeSettings>;
export type NewAgencyThemeSetting = InferInsertModel<typeof agencyThemeSettings>;

export type AgencySectionVisibility = InferSelectModel<typeof agencySectionsVisibility>;
export type NewAgencySectionVisibility = InferInsertModel<typeof agencySectionsVisibility>;
