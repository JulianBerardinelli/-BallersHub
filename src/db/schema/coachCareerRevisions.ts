import { pgTable, uuid, text, timestamp, integer, jsonb, char } from "drizzle-orm/pg-core";
import { coachProfiles } from "./coaches";
import { teams } from "./teams";
import { divisions } from "./divisions";
import { coachCareerItems } from "./coachCareer";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const coachCareerRevisionRequests = pgTable("coach_career_revision_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id")
    .notNull()
    .references(() => coachProfiles.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "approved", "rejected", "cancelled"] })
    .notNull()
    .default("pending"),
  submittedByUserId: uuid("submitted_by_user_id").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  resolutionNote: text("resolution_note"),
  changeSummary: text("change_summary"),
  currentSnapshot: jsonb("current_snapshot").default("[]").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const coachCareerRevisionProposedTeams = pgTable("coach_career_revision_proposed_teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => coachCareerRevisionRequests.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  countryName: text("country_name"),
  countryCode: char("country_code", { length: 2 }),
  transfermarktUrl: text("transfermarkt_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const coachCareerRevisionItems = pgTable("coach_career_revision_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => coachCareerRevisionRequests.id, { onDelete: "cascade" }),
  originalItemId: uuid("original_item_id").references(() => coachCareerItems.id, { onDelete: "set null" }),
  club: text("club").notNull(),
  roleTitle: text("role_title"), // cargo del DT en esa etapa (DT, asistente, etc.)
  division: text("division"),
  divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "set null" }),
  secondaryDivision: text("secondary_division"), // texto libre de la segunda categoría/liga
  secondaryDivisionId: uuid("secondary_division_id").references(() => divisions.id, {
    onDelete: "set null",
  }),
  startYear: integer("start_year"),
  endYear: integer("end_year"),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  proposedTeamId: uuid("proposed_team_id").references(() => coachCareerRevisionProposedTeams.id, {
    onDelete: "set null",
  }),
  orderIndex: integer("order_index").notNull().default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachCareerRevisionRequest = InferSelectModel<typeof coachCareerRevisionRequests>;
export type NewCoachCareerRevisionRequest = InferInsertModel<typeof coachCareerRevisionRequests>;

export type CoachCareerRevisionProposedTeam = InferSelectModel<
  typeof coachCareerRevisionProposedTeams
>;
export type NewCoachCareerRevisionProposedTeam = InferInsertModel<
  typeof coachCareerRevisionProposedTeams
>;

export type CoachCareerRevisionItem = InferSelectModel<typeof coachCareerRevisionItems>;
export type NewCoachCareerRevisionItem = InferInsertModel<typeof coachCareerRevisionItems>;

export const coachStatsRevisionItems = pgTable("coach_stats_revision_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => coachCareerRevisionRequests.id, { onDelete: "cascade" }),
  originalStatId: uuid("original_stat_id"), // Refers to coachStatsSeasons.id. FK mapped in SQL/relations to avoid circular deps at this file scope.
  season: text("season").notNull(),
  matches: integer("matches").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  goalsFor: integer("goals_for").notNull().default(0),
  goalsAgainst: integer("goals_against").notNull().default(0),
  competition: text("competition"),
  team: text("team"),
  careerItemId: uuid("career_item_id"), // Refers to coachCareerItems.id. Not adding references() here to prevent circular dependencies at this exact file scope, but it's a UUID FK.
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachStatsRevisionItem = InferSelectModel<typeof coachStatsRevisionItems>;
export type NewCoachStatsRevisionItem = InferInsertModel<typeof coachStatsRevisionItems>;
