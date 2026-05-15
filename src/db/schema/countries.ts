// countries catalog
import { pgTable, char, text } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const countries = pgTable("countries", {
  code: char("code", { length: 2 }).primaryKey(),
  nameEn: text("name_en").notNull(),
  nameEs: text("name_es"),
});

export type Country = InferSelectModel<typeof countries>;
export type NewCountry = InferInsertModel<typeof countries>;
