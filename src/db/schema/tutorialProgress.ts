// Tutorial Assistant — persistent state per user.
// Schema: see `docs/db/tutorial-assistant.sql` (idempotent).

import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const userTutorialProgress = pgTable("user_tutorial_progress", {
  userId: uuid("user_id").primaryKey(),
  audience: text("audience").notNull(),
  planAtStart: text("plan_at_start").notNull(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserTutorialProgress = InferSelectModel<typeof userTutorialProgress>;
export type NewUserTutorialProgress = InferInsertModel<typeof userTutorialProgress>;
