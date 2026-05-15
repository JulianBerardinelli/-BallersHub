import { pgTable, uuid, text, timestamp, date } from "drizzle-orm/pg-core";
import { agencyProfiles } from "./agencies";
import { userProfiles } from "./users";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const playerInvites = pgTable("player_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencyProfiles.id, { onDelete: "cascade" })
    .notNull(),
  playerEmail: text("player_email").notNull(),
  invitedByUserId: uuid("invited_by_user_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").unique().notNull(),
  contractEndDate: date("contract_end_date"), // New field: End date of agency contract
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, expired, cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PlayerInvite = InferSelectModel<typeof playerInvites>;
export type NewPlayerInvite = InferInsertModel<typeof playerInvites>;
