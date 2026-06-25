// coach_applications
import { pgTable, uuid, text, timestamp, boolean, char, date, jsonb } from "drizzle-orm/pg-core";
import { planEnum, staffRoleTypeEnum } from "./enums";
import { teams } from "./teams";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const coachApplications = pgTable("coach_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  planRequested: planEnum("plan_requested").notNull().default("free"),
  fullName: text("full_name"),
  birthDate: date("birth_date"),
  nationality: text("nationality").array(),
  roleTitle: text("role_title"),
  // Roles estructurados elegidos en el onboarding (se materializan a
  // coach_profiles.primary_role/secondary_roles al aprobar). Ver docs/staff/PLAN.md.
  primaryRole: staffRoleTypeEnum("primary_role"),
  secondaryRoles: staffRoleTypeEnum("secondary_roles").array(),
  currentClub: text("current_club"),
  transfermarktUrl: text("transfermarkt_url"),
  externalProfileUrl: text("external_profile_url"),
  idDocUrl: text("id_doc_url"),
  selfieUrl: text("selfie_url"),
  notes: text("notes"),
  // licencias declaradas en el apply: [{ title, issuer, year }]
  licensesDraft: jsonb("licenses_draft").default("[]"),
  status: text("status").notNull().default("pending"),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  currentTeamId: uuid("current_team_id").references(() => teams.id, { onDelete: "set null" }),
  proposedTeamName: text("proposed_team_name"),
  proposedTeamCountry: text("proposed_team_country"),
  proposedTeamCountryCode: char("proposed_team_country_code", { length: 2 }),
  proposedTeamCategory: text("proposed_team_category"),
  proposedTeamTransfermarktUrl: text("proposed_team_transfermarkt_url"),
  freeAgent: boolean("free_agent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachApplication = InferSelectModel<typeof coachApplications>;
export type NewCoachApplication = InferInsertModel<typeof coachApplications>;
