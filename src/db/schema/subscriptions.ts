// subscriptions
import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { planEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  plan: planEnum("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  limitsJson: jsonb("limits_json").notNull().default({}),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Subscription = InferSelectModel<typeof subscriptions>;
export type NewSubscription = InferInsertModel<typeof subscriptions>;
