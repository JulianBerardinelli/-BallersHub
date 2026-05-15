// reviewer_profiles
import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { visibilityEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const reviewerProfiles = pgTable("reviewer_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  slug: text("slug"),
  fullName: text("full_name"),
  roleLabel: text("role_label"),
  club: text("club"),
  bio: text("bio"),
  contactEmail: text("contact_email"),
  contactPhoneEnc: text("contact_phone_enc"),
  visibility: visibilityEnum("visibility").notNull().default("private"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ReviewerProfile = InferSelectModel<typeof reviewerProfiles>;
export type NewReviewerProfile = InferInsertModel<typeof reviewerProfiles>;
