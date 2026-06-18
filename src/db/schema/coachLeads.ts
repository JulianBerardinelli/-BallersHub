import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { coachProfiles } from "./coaches";

export const coachPortfolioLeads = pgTable(
  "coach_portfolio_leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id").references(() => coachProfiles.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    source: text("source").notNull().default("contact_unlock"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    byEmail: index("coach_portfolio_leads_email_idx").on(table.email),
    byCoach: index("coach_portfolio_leads_coach_idx").on(table.coachId),
  }),
);

export const coachContactClicks = pgTable(
  "coach_contact_clicks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id").notNull().references(() => coachProfiles.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    viewerEmail: text("viewer_email"),
    viewerUserId: uuid("viewer_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    byCoach: index("coach_contact_clicks_coach_idx").on(table.coachId),
  }),
);

export const coachChangeLogs = pgTable("coach_change_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id").notNull().references(() => coachProfiles.id, { onDelete: "cascade" }),
  userId: uuid("user_id"),
  field: text("field").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachPortfolioLead = InferSelectModel<typeof coachPortfolioLeads>;
export type NewCoachPortfolioLead = InferInsertModel<typeof coachPortfolioLeads>;
export type CoachContactClick = InferSelectModel<typeof coachContactClicks>;
export type NewCoachContactClick = InferInsertModel<typeof coachContactClicks>;
export type CoachChangeLog = InferSelectModel<typeof coachChangeLogs>;
export type NewCoachChangeLog = InferInsertModel<typeof coachChangeLogs>;
