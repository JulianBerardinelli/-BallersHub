// payment_events
// Audit trail de cada webhook recibido (Stripe + Mercado Pago).
// Idempotencia garantizada por UNIQUE (processor, processor_event_id).

import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { checkoutProcessorEnum } from "./enums";
import { checkoutSessions } from "./checkoutSessions";
import { subscriptions } from "./subscriptions";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    processor: checkoutProcessorEnum("processor").notNull(),
    processorEventId: text("processor_event_id").notNull(),
    eventType: text("event_type").notNull(),

    checkoutSessionId: uuid("checkout_session_id").references(
      () => checkoutSessions.id,
      { onDelete: "set null" },
    ),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),

    payload: jsonb("payload").notNull(),

    processed: boolean("processed").notNull().default(false),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    errorMessage: text("error_message"),

    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: uniqueIndex("payment_events_processor_event_idx").on(
      table.processor,
      table.processorEventId,
    ),
    subscriptionIdx: index("payment_events_subscription_idx").on(table.subscriptionId),
  }),
);

export type PaymentEvent = InferSelectModel<typeof paymentEvents>;
export type NewPaymentEvent = InferInsertModel<typeof paymentEvents>;
