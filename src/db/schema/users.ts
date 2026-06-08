// user_profiles
import { pgTable, uuid, timestamp, boolean, text, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { roleEnum } from "./enums";
import { agencyProfiles } from "./agencies";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    role: roleEnum("role").notNull().default("member"),
    agencyId: uuid("agency_id").references(() => agencyProfiles.id, { onDelete: "set null" }),
    // Editorial blog whitelist flag. When true, the user can write posts
    // via /blog/write and submit them for admin review. Toggled manually
    // via SQL in MVP-1 (UI for admins to toggle this lives in MVP-3).
    isBlogger: boolean("is_blogger").notNull().default(false),
    // Native locale of the user (es default). Seeds home auto-detect and
    // Resend email templates per locale (HANDOFF §7); the dashboard editor
    // uses it to label the "native" language tab.
    preferredLocale: text("preferred_locale").notNull().default("es"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    preferredLocaleCheck: check(
      "user_profiles_preferred_locale_check",
      sql`preferred_locale IN ('es','en','it','pt')`,
    ),
  }),
);

export type UserProfile = InferSelectModel<typeof userProfiles>;
export type NewUserProfile = InferInsertModel<typeof userProfiles>;
