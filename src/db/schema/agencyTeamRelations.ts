import {
  pgTable,
  uuid,
  text,
  timestamp,
  char,
} from "drizzle-orm/pg-core";
import { agencyProfiles } from "./agencies";
import { teams } from "./teams";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

/**
 * One row per country an agency narrates about. Edited freely by the manager
 * (no approval workflow). Lives next to operative_countries — that array
 * stays the source of truth for which countries appear at all; this table
 * just attaches a story to each one.
 */
export const agencyCountryProfiles = pgTable("agency_country_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .notNull()
    .references(() => agencyProfiles.id, { onDelete: "cascade" }),
  countryCode: char("country_code", { length: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Confirmed team relationships. Materialized only after an admin approves a
 * submission — these are the "verified experience" records shown in the
 * agency portfolio.
 */
export const agencyTeamRelations = pgTable("agency_team_relations", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .notNull()
    .references(() => agencyProfiles.id, { onDelete: "cascade" }),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  relationKind: text("relation_kind").notNull().default("past"), // "current" | "past"
  description: text("description"),
  // Denormalized for quick country-bucketed queries on the public portfolio.
  countryCode: char("country_code", { length: 2 }),
  approvedByUserId: uuid("approved_by_user_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * A batch of team proposals submitted by an agency manager. Mirrors the
 * player career_revisions pattern: one envelope, many items, single admin
 * decision (with optional per-item override).
 */
export const agencyTeamRelationSubmissions = pgTable(
  "agency_team_relation_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencyProfiles.id, { onDelete: "cascade" }),
    submittedByUserId: uuid("submitted_by_user_id").notNull(),
    // pending | approved | rejected | cancelled
    status: text("status").notNull().default("pending"),
    note: text("note"),
    resolutionNote: text("resolution_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByUserId: uuid("reviewed_by_user_id"),
  },
);

/**
 * One proposed team per row. Either references an existing team OR carries
 * the proposed team metadata so admins can validate and create it.
 */
export const agencyTeamRelationProposals = pgTable(
  "agency_team_relation_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => agencyTeamRelationSubmissions.id, { onDelete: "cascade" }),
    // If an existing team matches, use this. Otherwise fill the proposed_* fields.
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    proposedTeamName: text("proposed_team_name"),
    proposedTeamCountry: text("proposed_team_country"),
    proposedTeamCountryCode: char("proposed_team_country_code", { length: 2 }),
    proposedTeamDivision: text("proposed_team_division"),
    proposedTeamTransfermarktUrl: text("proposed_team_transfermarkt_url"),
    relationKind: text("relation_kind").notNull().default("past"),
    description: text("description"),
    // pending | approved | rejected (admin can per-item override)
    status: text("status").notNull().default("pending"),
    // Set on approval if a new team was created.
    materializedTeamId: uuid("materialized_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export type AgencyCountryProfile = InferSelectModel<typeof agencyCountryProfiles>;
export type NewAgencyCountryProfile = InferInsertModel<typeof agencyCountryProfiles>;
export type AgencyTeamRelation = InferSelectModel<typeof agencyTeamRelations>;
export type NewAgencyTeamRelation = InferInsertModel<typeof agencyTeamRelations>;
export type AgencyTeamRelationSubmission = InferSelectModel<typeof agencyTeamRelationSubmissions>;
export type NewAgencyTeamRelationSubmission = InferInsertModel<typeof agencyTeamRelationSubmissions>;
export type AgencyTeamRelationProposal = InferSelectModel<typeof agencyTeamRelationProposals>;
export type NewAgencyTeamRelationProposal = InferInsertModel<typeof agencyTeamRelationProposals>;
