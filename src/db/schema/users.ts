// user_profiles
import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { roleEnum } from "./enums";
import { agencyProfiles } from "./agencies";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  role: roleEnum("role").notNull().default("member"),
  agencyId: uuid("agency_id").references(() => agencyProfiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserProfile = InferSelectModel<typeof userProfiles>;
export type NewUserProfile = InferInsertModel<typeof userProfiles>;
