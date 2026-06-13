// coach_licenses
import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { reviewStatusEnum } from "./enums";
import { coachProfiles } from "./coaches";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const coachLicenses = pgTable("coach_licenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id")
    .notNull()
    .references(() => coachProfiles.id, { onDelete: "cascade" }),
  // Credential name, e.g. "UEFA Pro Licence".
  title: text("title").notNull(),
  // Issuing body, e.g. "UEFA".
  issuer: text("issuer"),
  awardedYear: integer("awarded_year"),
  expiresYear: integer("expires_year"),
  // Supporting document stored in a PRIVATE bucket. Never exposed on public
  // surfaces; used only for moderation. NULL when no proof was uploaded.
  docUrl: text("doc_url"),
  status: reviewStatusEnum("status").notNull().default("pending"),
  // Moderator who reviewed the credential. FK to auth.users is added in SQL,
  // not here (mirrors the player schema convention).
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  // Manual ordering set by the coach from the dashboard. Lower sorts first.
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachLicense = InferSelectModel<typeof coachLicenses>;
export type NewCoachLicense = InferInsertModel<typeof coachLicenses>;
