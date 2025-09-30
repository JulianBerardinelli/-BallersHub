import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { playerProfiles } from "./players";

export const profileChangeLogs = pgTable("profile_change_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
  userId: uuid("user_id"),
  field: text("field").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ProfileChangeLog = InferSelectModel<typeof profileChangeLogs>;
export type NewProfileChangeLog = InferInsertModel<typeof profileChangeLogs>;
