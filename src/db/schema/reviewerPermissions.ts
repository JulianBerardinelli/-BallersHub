// reviewer_permissions
import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { reviewerPermStatusEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const reviewerPermissions = pgTable("reviewer_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull(),
  reviewerId: uuid("reviewer_id").notNull(),
  grantedByUserId: uuid("granted_by_user_id").notNull(),
  status: reviewerPermStatusEnum("status").notNull().default("granted"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ReviewerPermission = InferSelectModel<typeof reviewerPermissions>;
export type NewReviewerPermission = InferInsertModel<typeof reviewerPermissions>;
