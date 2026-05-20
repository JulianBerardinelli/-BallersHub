// user_profiles
import { pgTable, uuid, timestamp, boolean } from "drizzle-orm/pg-core";
import { roleEnum } from "./enums";
import { agencyProfiles } from "./agencies";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  role: roleEnum("role").notNull().default("member"),
  agencyId: uuid("agency_id").references(() => agencyProfiles.id, { onDelete: "set null" }),
  // Editorial blog whitelist flag. When true, the user can write posts
  // via /blog/write and submit them for admin review. Toggled manually
  // via SQL in MVP-1 (UI for admins to toggle this lives in MVP-3).
  isBlogger: boolean("is_blogger").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserProfile = InferSelectModel<typeof userProfiles>;
export type NewUserProfile = InferInsertModel<typeof userProfiles>;
