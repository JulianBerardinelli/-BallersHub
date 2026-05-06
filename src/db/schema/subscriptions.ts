// subscriptions
// Tabla original (legacy) extendida con los campos de procesador para soportar
// el checkout flow. La columna `plan` (free|pro|pro_plus) sigue siendo el
// tier coarse-grained que el resto de la app lee. `plan_id` agrega el id
// granular del pricing matrix (`pro-player`, `pro-agency`, …).

import { pgTable, uuid, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import {
  planEnum,
  checkoutCurrencyEnum,
  checkoutProcessorEnum,
  subscriptionStatusV2Enum,
} from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),

  // Legacy fields — kept for backwards compat with the rest of the app.
  plan: planEnum("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  limitsJson: jsonb("limits_json").notNull().default({}),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

  // Checkout / billing extension.
  planId: text("plan_id"),
  currency: checkoutCurrencyEnum("currency"),
  processor: checkoutProcessorEnum("processor"),
  processorSubscriptionId: text("processor_subscription_id"),
  processorCustomerId: text("processor_customer_id"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStartsAt: timestamp("current_period_starts_at", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  billingAddressId: uuid("billing_address_id"),
  statusV2: subscriptionStatusV2Enum("status_v2"),
});

export type Subscription = InferSelectModel<typeof subscriptions>;
export type NewSubscription = InferInsertModel<typeof subscriptions>;
