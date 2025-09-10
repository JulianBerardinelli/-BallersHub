// player_profiles
import { pgTable, uuid, text, timestamp, integer, date, numeric, char } from "drizzle-orm/pg-core";
import { playerStatusEnum, visibilityEnum, planEnum } from "./enums";
import { teams } from "./teams";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const playerProfiles = pgTable("player_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  slug: text("slug").notNull(),
  fullName: text("full_name").notNull(),
  birthDate: date("birth_date"),
  nationality: text("nationality").array(),
  foot: text("foot"),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),
  positions: text("positions").array(),
  currentClub: text("current_club"), // legado (texto libre)
  // 👇 nuevo: team relacional opcional
  currentTeamId: uuid("current_team_id").references(() => teams.id, { onDelete: "set null" }),
  planPublic: planEnum("plan_public").notNull().default("free"),
  nationalityCodes: char("nationality_codes", { length: 2 }).array(),
  bio: text("bio"),
  avatarUrl: text("avatar_url").notNull().default("/images/player-default.jpg"),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  status: playerStatusEnum("status").notNull().default("draft"),
  marketValueEur: numeric("market_value_eur", { precision: 12, scale: 2 }).$type<number | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PlayerProfile = InferSelectModel<typeof playerProfiles>;
export type NewPlayerProfile = InferInsertModel<typeof playerProfiles>;
