import { pgTable, uuid, text, timestamp, integer, jsonb, char } from "drizzle-orm/pg-core";
import { playerProfiles } from "./players";
import { teams } from "./teams";
import { careerItems } from "./career";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const careerRevisionRequests = pgTable("career_revision_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
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

export const careerRevisionProposedTeams = pgTable("career_revision_proposed_teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => careerRevisionRequests.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  countryName: text("country_name"),
  countryCode: char("country_code", { length: 2 }),
  transfermarktUrl: text("transfermarkt_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const careerRevisionItems = pgTable("career_revision_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => careerRevisionRequests.id, { onDelete: "cascade" }),
  originalItemId: uuid("original_item_id").references(() => careerItems.id, { onDelete: "set null" }),
  club: text("club").notNull(),
  division: text("division"),
  divisionId: uuid("division_id"), // Reference to divisions.id, FK mapped manually or in relations
  startYear: integer("start_year"),
  endYear: integer("end_year"),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  proposedTeamId: uuid("proposed_team_id").references(() => careerRevisionProposedTeams.id, {
    onDelete: "set null",
  }),
  orderIndex: integer("order_index").notNull().default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CareerRevisionRequest = InferSelectModel<typeof careerRevisionRequests>;
export type NewCareerRevisionRequest = InferInsertModel<typeof careerRevisionRequests>;

export type CareerRevisionProposedTeam = InferSelectModel<typeof careerRevisionProposedTeams>;
export type NewCareerRevisionProposedTeam = InferInsertModel<typeof careerRevisionProposedTeams>;

export type CareerRevisionItem = InferSelectModel<typeof careerRevisionItems>;
export type NewCareerRevisionItem = InferInsertModel<typeof careerRevisionItems>;

export const statsRevisionItems = pgTable("stats_revision_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => careerRevisionRequests.id, { onDelete: "cascade" }),
  originalStatId: uuid("original_stat_id"), // Refers to statsSeasons.id
  season: text("season").notNull(),
  matches: integer("matches").default(0),
  starts: integer("starts").default(0),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  minutes: integer("minutes").default(0),
  yellowCards: integer("yellow_cards").default(0),
  redCards: integer("red_cards").default(0),
  competition: text("competition"),
  team: text("team"),
  careerItemId: uuid("career_item_id"), // Not explicitly adding references() here to prevent circular dependencies at this exact file scope, but it's a UUID FK.
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type StatsRevisionItem = InferSelectModel<typeof statsRevisionItems>;
export type NewStatsRevisionItem = InferInsertModel<typeof statsRevisionItems>;
