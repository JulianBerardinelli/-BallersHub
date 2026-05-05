// checkout_sessions
// Una fila por intento de checkout. Mantenemos una copia local del
// `processor_session_id` (Stripe `cs_...` / MP preference id) y de la URL
// de redirect para poder reanudar el flow si el user vuelve.

import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  checkoutCurrencyEnum,
  checkoutProcessorEnum,
  checkoutSessionStatusEnum,
} from "./enums";
import { billingAddresses } from "./billingAddresses";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),

    planId: text("plan_id").notNull(),
    currency: checkoutCurrencyEnum("currency").notNull(),
    processor: checkoutProcessorEnum("processor").notNull(),
    status: checkoutSessionStatusEnum("status").notNull().default("pending"),

    billingAddressId: uuid("billing_address_id").references(
      () => billingAddresses.id,
      { onDelete: "set null" },
    ),

    processorSessionId: text("processor_session_id"),
    processorSessionUrl: text("processor_session_url"),
    clientSecret: text("client_secret"),

    /** Total amount in minor units (USD/EUR cents, ARS centavos). */
    amountMinor: integer("amount_minor").notNull(),
    trialDays: integer("trial_days").notNull().default(0),

    metadata: jsonb("metadata").notNull().default({}),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("checkout_sessions_user_idx").on(table.userId),
    processorIdx: uniqueIndex("checkout_sessions_processor_session_idx").on(
      table.processor,
      table.processorSessionId,
    ),
    statusIdx: index("checkout_sessions_status_idx").on(table.status),
  }),
);

export type CheckoutSession = InferSelectModel<typeof checkoutSessions>;
export type NewCheckoutSession = InferInsertModel<typeof checkoutSessions>;
