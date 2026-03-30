// manager_profiles
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { userProfiles } from "./users";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const managerProfiles = pgTable("manager_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ManagerProfile = InferSelectModel<typeof managerProfiles>;
export type NewManagerProfile = InferInsertModel<typeof managerProfiles>;
