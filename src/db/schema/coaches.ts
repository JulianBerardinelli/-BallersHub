// coach_profiles
import { pgTable, uuid, text, timestamp, integer, date, char } from "drizzle-orm/pg-core";
import { agencyProfiles } from "./agencies";
import { playerStatusEnum, visibilityEnum, planEnum, staffRoleTypeEnum } from "./enums";
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
  // LEGACY texto libre — fuente de verdad pasa a primary_role/secondary_roles.
  roleTitle: text("role_title"),
  // 👇 roles estructurados del staff (taxonomía de 13 oficios). `primary_role`
  // gobierna el fork de layout (head-coach → DT). NULL transitorio hasta backfill
  // (3 filas en prod, ver docs/staff/PLAN.md §7). Máx 2 secundarios (validado en action).
  primaryRole: staffRoleTypeEnum("primary_role"),
  secondaryRoles: staffRoleTypeEnum("secondary_roles").array(),
  // Sabor libre opcional para el front, ej "DT principal de la cantera".
  roleTitleCustom: text("role_title_custom"),
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
  // Pro-layout theme colors chosen by the coach (hex). NULL → brand defaults
  // (lime accent / dark background). Only the Pro scrolljacking portfolio
  // reads these; the Free dossier ignores them.
  themePrimaryColor: text("theme_primary_color"),
  themeAccentColor: text("theme_accent_color"),
  themeBackgroundColor: text("theme_background_color"),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  status: playerStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachProfile = InferSelectModel<typeof coachProfiles>;
export type NewCoachProfile = InferInsertModel<typeof coachProfiles>;
