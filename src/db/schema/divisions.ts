import { pgTable, uuid, text, timestamp, integer, char, boolean } from "drizzle-orm/pg-core";
import { divisionStatusEnum } from "./enums";
import { countries } from "./countries";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const divisions = pgTable("divisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  countryCode: char("country_code", { length: 2 }).notNull(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  level: integer("level"), // 1 = Primera, 2 = Segunda, etc.
  isYouth: boolean("is_youth").default(false).notNull(),
  referenceUrl: text("reference_url"),
  crestUrl: text("crest_url").notNull().default("/images/default-division.svg"),
  status: divisionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Division = InferSelectModel<typeof divisions>;
export type NewDivision = InferInsertModel<typeof divisions>;
