// agency_invites
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { agencyProfiles } from "./agencies";
import { userProfiles } from "./users";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const agencyInvites = pgTable("agency_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencyProfiles.id, { onDelete: "cascade" })
    .notNull(),
  email: text("email").notNull(),
  invitedByUserId: uuid("invited_by_user_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").unique().notNull(),
  role: text("role").notNull().default("manager"), // manager, scout, etc.
  status: text("status").notNull().default("pending"), // pending, accepted, cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AgencyInvite = InferSelectModel<typeof agencyInvites>;
export type NewAgencyInvite = InferInsertModel<typeof agencyInvites>;
