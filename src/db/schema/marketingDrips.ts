import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { marketingSends } from "./marketing";

/**
 * Drip campaign engine — automated, time-delayed emails triggered by
 * product events (signup, lead capture, etc.).
 *
 * Each `marketing_drip_configs` row represents ONE step. To build a
 * 3-step drip ("Day 3, 7, 14"), create 3 configs and enroll the user
 * in all three at signup time. The `delay_seconds` of each config
 * defines when that step fires from the enrollment timestamp.
 *
 * Why not a single config with an array of steps? Splitting per step
 * makes scheduling, analytics and exit-condition checks simpler — and
 * the admin UI lists each step as its own row, which is how non-tech
 * users actually think about this ("step 3 of the onboarding drip").
 */
export const marketingDripConfigs = pgTable(
  "marketing_drip_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    /** Reference to a template registered in /src/emails/templates/_registry.ts */
    templateKey: text("template_key").notNull(),
    /** Subject used for all emails sent via this drip step. */
    defaultSubject: text("default_subject").notNull(),
    /** Default props merged with per-recipient resolved props at send time. */
    defaultTemplateProps: jsonb("default_template_props").notNull().default({}),

    /** Time between enrollment and firing this step. */
    delaySeconds: integer("delay_seconds").notNull().default(0),

    /**
     * Documentation field for which event spawns enrollments into this drip.
     * Values today: 'player_signup' | 'agency_signup' | 'lead_capture' | 'manual'.
     */
    triggerEvent: text("trigger_event").notNull().default("manual"),

    /**
     * Optional exit predicate evaluated at send time. If true, the
     * enrollment is marked `exited` and the email is NOT sent. Values:
     *   - 'has_player_profile'  : skip if user already created their profile
     *   - 'has_completed_profile': skip if profile is approved/published
     *   - null                  : never exit
     */
    exitCondition: text("exit_condition"),

    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("marketing_drip_configs_slug_unique").on(table.slug),
    byTrigger: index("marketing_drip_configs_trigger_idx").on(table.triggerEvent),
  }),
);

export const marketingDripEnrollments = pgTable(
  "marketing_drip_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dripId: uuid("drip_id")
      .notNull()
      .references(() => marketingDripConfigs.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    userId: uuid("user_id"), // nullable when enrolling a portfolio lead

    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow().notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),

    /**
     * Lifecycle:
     *   pending   → waiting for `scheduled_for`
     *   sent      → email dispatched (linked via `sendId`)
     *   cancelled → manually cancelled (admin / user unsubscribed)
     *   exited    → exit condition was met at send time
     *   failed    → render or send raised an unrecoverable error
     */
    status: text("status").notNull().default("pending"),
    sendId: uuid("send_id").references(() => marketingSends.id, { onDelete: "set null" }),
    error: text("error"),

    /**
     * Per-recipient context resolved AT enrollment time. Things like
     * playerName / playerSlug for lead drips, firstName for completion
     * drips. Avoids re-fetching at dispatch.
     */
    context: jsonb("context").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    dueIdx: index("marketing_drip_enrollments_due_idx").on(table.status, table.scheduledFor),
    byDrip: index("marketing_drip_enrollments_drip_idx").on(table.dripId),
    byEmail: index("marketing_drip_enrollments_email_idx").on(table.email),
    byUser: index("marketing_drip_enrollments_user_idx").on(table.userId),
    // A user can only be in a given drip once at a time (unless previous one finished).
    perUserDripUnique: uniqueIndex("marketing_drip_enrollments_active_unique").on(
      table.dripId,
      table.email,
      table.status,
    ),
  }),
);

export type MarketingDripConfig = InferSelectModel<typeof marketingDripConfigs>;
export type NewMarketingDripConfig = InferInsertModel<typeof marketingDripConfigs>;
export type MarketingDripEnrollment = InferSelectModel<typeof marketingDripEnrollments>;
export type NewMarketingDripEnrollment = InferInsertModel<typeof marketingDripEnrollments>;
