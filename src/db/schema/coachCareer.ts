// coach_career_items + coach_career_item_proposals
import { pgTable, uuid, text, timestamp, integer, date } from "drizzle-orm/pg-core";
import { coachProfiles } from "./coaches";
import { coachApplications } from "./coachApplications";
import { teams } from "./teams";
import { divisions } from "./divisions";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const coachCareerItems = pgTable("coach_career_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id").notNull().references(() => coachProfiles.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }), // 👈 FK
  club: text("club").notNull(),                // nombre libre legacy (mantener por ahora)
  // Cargo del DT en esa etapa, ej "DT principal", "Asistente técnico".
  roleTitle: text("role_title"),
  division: text("division"),
  divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "set null" }),
  // Categoría/liga adicional opcional para etapas que en el mismo club
  // disputaron una segunda competencia (reserva, equipo II, U20, etc).
  // `secondary_division` guarda el nombre libre (cuando la liga aún no
  // existe en el catálogo o como caché del nombre), `secondary_division_id`
  // enlaza al catálogo cuando hay match. Simétrico con division.
  secondaryDivision: text("secondary_division"),
  secondaryDivisionId: uuid("secondary_division_id").references(() => divisions.id, { onDelete: "set null" }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type CoachCareerItem = InferSelectModel<typeof coachCareerItems>;
export type NewCoachCareerItem = InferInsertModel<typeof coachCareerItems>;

export const coachCareerItemProposals = pgTable("coach_career_item_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").notNull().references(() => coachApplications.id, { onDelete: "cascade" }),
  club: text("club").notNull(),
  // Cargo del DT en esa etapa (espejo de coach_career_items.role_title).
  roleTitle: text("role_title"),
  division: text("division"),
  divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "set null" }),
  secondaryDivisionId: uuid("secondary_division_id").references(() => divisions.id, { onDelete: "set null" }), // categoría/liga adicional opcional
  startYear: integer("start_year"),
  endYear: integer("end_year"),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
  proposedTeamName: text("proposed_team_name"),
  proposedTeamCountry: text("proposed_team_country"),
  proposedTeamCountryCode: text("proposed_team_country_code"),
  proposedTeamTransfermarktUrl: text("proposed_team_transfermarkt_url"),
  status: text("status").notNull().default("pending"),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  materializedAt: timestamp("materialized_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachCareerItemProposal = InferSelectModel<typeof coachCareerItemProposals>;
export type NewCoachCareerItemProposal = InferInsertModel<typeof coachCareerItemProposals>;
