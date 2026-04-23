// player_profiles
import { pgTable, uuid, text, timestamp, integer, date, numeric, char } from "drizzle-orm/pg-core";
import { agencyProfiles } from "./agencies";
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
  contractStatus: text("contract_status"),
  // 👇 nuevo: team relacional opcional
  currentTeamId: uuid("current_team_id").references(() => teams.id, { onDelete: "set null" }),
  agencyId: uuid("agency_id").references(() => agencyProfiles.id, { onDelete: "set null" }),
  careerObjectives: text("career_objectives"),
  // 👇 nuevos: scouting / report analysis
  topCharacteristics: text("top_characteristics").array(),
  tacticsAnalysis: text("tactics_analysis"),
  physicalAnalysis: text("physical_analysis"),
  mentalAnalysis: text("mental_analysis"),
  techniqueAnalysis: text("technique_analysis"),
  analysisAuthor: text("analysis_author"),
  planPublic: planEnum("plan_public").notNull().default("free"),
  nationalityCodes: char("nationality_codes", { length: 2 }).array(),
  transfermarktUrl: text("transfermarkt_url"),
  beSoccerUrl: text("besoccer_url"),
  bio: text("bio"),
  heroUrl: text("hero_url"),
  avatarUrl: text("avatar_url").notNull().default("/images/player-default.jpg"),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  status: playerStatusEnum("status").notNull().default("draft"),
  marketValueEur: numeric("market_value_eur", { precision: 12, scale: 2 }).$type<number | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PlayerProfile = InferSelectModel<typeof playerProfiles>;
export type NewPlayerProfile = InferInsertModel<typeof playerProfiles>;
