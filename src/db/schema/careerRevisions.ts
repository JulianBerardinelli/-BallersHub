import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
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
  countryCode: text("country_code"),
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
