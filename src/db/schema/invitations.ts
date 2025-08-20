// review_invitations
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { inviteStatusEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const reviewInvitations = pgTable("review_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull(),
  inviteeEmailHash: text("invitee_email_hash").notNull(),
  inviteeName: text("invitee_name"),
  roleLabel: text("role_label"),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: inviteStatusEnum("status").notNull().default("sent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ReviewInvitation = InferSelectModel<typeof reviewInvitations>;
export type NewReviewInvitation = InferInsertModel<typeof reviewInvitations>;
