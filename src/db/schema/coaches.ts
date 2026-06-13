// coach_profiles
import { pgTable, uuid, text, timestamp, integer, date, char } from "drizzle-orm/pg-core";
import { agencyProfiles } from "./agencies";
import { playerStatusEnum, visibilityEnum, planEnum } from "./enums";
import { teams } from "./teams";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const coachProfiles = pgTable("coach_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  slug: text("slug").notNull().unique(),
  fullName: text("full_name").notNull(),
  birthDate: date("birth_date"),
  nationality: text("nationality").array(),
  nationalityCodes: char("nationality_codes", { length: 2 }).array(),
  // 👇 cargo del cuerpo técnico: "Director Técnico" / "Asistente" / etc.
  roleTitle: text("role_title"),
  coachingSince: integer("coaching_since"), // año de inicio
  currentClub: text("current_club"), // legado (texto libre)
  // 👇 team relacional opcional
  currentTeamId: uuid("current_team_id").references(() => teams.id, { onDelete: "set null" }),
  agencyId: uuid("agency_id").references(() => agencyProfiles.id, { onDelete: "set null" }),
  bio: text("bio"),
  careerObjectives: text("career_objectives"),
  // 👇 ideas de juego (texto largo)
  playingStyle: text("playing_style"),
  preferredFormations: text("preferred_formations").array(), // ["4-3-3","3-5-2"]
  // 👇 scouting / report analysis (DT)
  methodologyAnalysis: text("methodology_analysis"),
  analysisAuthor: text("analysis_author"),
  planPublic: planEnum("plan_public").notNull().default("free"),
  transfermarktUrl: text("transfermarkt_url"),
  heroUrl: text("hero_url"),
  modelUrl1: text("model_url_1"),
  modelUrl2: text("model_url_2"),
  avatarUrl: text("avatar_url").notNull().default("/images/coach-default.jpg"),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  status: playerStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachProfile = InferSelectModel<typeof coachProfiles>;
export type NewCoachProfile = InferInsertModel<typeof coachProfiles>;
