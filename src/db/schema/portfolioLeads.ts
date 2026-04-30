import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { playerProfiles } from "./players";

export const portfolioLeads = pgTable(
  "portfolio_leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id").references(() => playerProfiles.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    source: text("source").notNull().default("contact_unlock"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    byEmail: index("portfolio_leads_email_idx").on(table.email),
    byPlayer: index("portfolio_leads_player_idx").on(table.playerId),
  }),
);

export const portfolioContactClicks = pgTable(
  "portfolio_contact_clicks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    viewerEmail: text("viewer_email"),
    viewerUserId: uuid("viewer_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    byPlayer: index("portfolio_contact_clicks_player_idx").on(table.playerId),
  }),
);

export type PortfolioLead = InferSelectModel<typeof portfolioLeads>;
export type NewPortfolioLead = InferInsertModel<typeof portfolioLeads>;
export type PortfolioContactClick = InferSelectModel<typeof portfolioContactClicks>;
export type NewPortfolioContactClick = InferInsertModel<typeof portfolioContactClicks>;
