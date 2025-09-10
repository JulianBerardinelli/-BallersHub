// career_item_proposals
import { pgTable, uuid, text, timestamp, integer, char } from "drizzle-orm/pg-core";
import { playerApplications } from "./applications";
import { teams } from "./teams";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const careerItemProposals = pgTable("career_item_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").notNull().references(() => playerApplications.id, { onDelete: "cascade" }),
  club: text("club").notNull(),
  division: text("division"),
  startYear: integer("start_year"),
  endYear: integer("end_year"),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
  proposedTeamName: text("proposed_team_name"),
  proposedTeamCountry: text("proposed_team_country"),
  proposedTeamCountryCode: char("proposed_team_country_code", { length: 2 }),
  proposedTeamTransfermarktUrl: text("proposed_team_transfermarkt_url"),
  status: text("status").notNull().default("pending"),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  materializedAt: timestamp("materialized_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CareerItemProposal = InferSelectModel<typeof careerItemProposals>;
export type NewCareerItemProposal = InferInsertModel<typeof careerItemProposals>;
