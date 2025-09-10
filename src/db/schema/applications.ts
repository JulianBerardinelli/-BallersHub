// player_applications
import { pgTable, uuid, text, timestamp, boolean, char } from "drizzle-orm/pg-core";
import { planEnum } from "./enums";
import { teams } from "./teams";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const playerApplications = pgTable("player_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  planRequested: planEnum("plan_requested").notNull().default("free"),
  fullName: text("full_name"),
  nationality: text("nationality").array(),
  positions: text("positions").array(),
  currentClub: text("current_club"),
  transfermarktUrl: text("transfermarkt_url"),
  externalProfileUrl: text("external_profile_url"),
  idDocUrl: text("id_doc_url"),
  selfieUrl: text("selfie_url"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  currentTeamId: uuid("current_team_id").references(() => teams.id, { onDelete: "set null" }),
  proposedTeamName: text("proposed_team_name"),
  proposedTeamCountry: text("proposed_team_country"),
  freeAgent: boolean("free_agent").notNull().default(false),
  proposedTeamCategory: text("proposed_team_category"),
  proposedTeamTransfermarktUrl: text("proposed_team_transfermarkt_url"),
  proposedTeamCountryCode: char("proposed_team_country_code", { length: 2 }),
});

export type PlayerApplication = InferSelectModel<typeof playerApplications>;
export type NewPlayerApplication = InferInsertModel<typeof playerApplications>;
