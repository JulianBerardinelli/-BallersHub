// billing_addresses
// Direcciones de facturación que el usuario carga durante el checkout y que
// luego se asocian a su `subscriptions.billing_address_id`. Un user puede
// tener varias direcciones pero solo una marcada como `is_default = true`.

import { pgTable, uuid, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { taxIdTypeEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const billingAddresses = pgTable(
  "billing_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),

    fullName: text("full_name").notNull(),
    taxId: text("tax_id"),
    taxIdType: taxIdTypeEnum("tax_id_type"),

    countryCode: text("country_code").notNull(),
    state: text("state"),
    city: text("city").notNull(),
    postalCode: text("postal_code").notNull(),
    streetLine1: text("street_line_1").notNull(),
    streetLine2: text("street_line_2"),
    phone: text("phone"),

    isDefault: boolean("is_default").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("billing_addresses_user_id_idx").on(table.userId),
  }),
);

export type BillingAddress = InferSelectModel<typeof billingAddresses>;
export type NewBillingAddress = InferInsertModel<typeof billingAddresses>;
