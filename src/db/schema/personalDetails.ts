import { pgTable, uuid, text, timestamp, char } from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { playerProfiles } from "./players";

export const playerPersonalDetails = pgTable("player_personal_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
  documentType: text("document_type"),
  documentNumber: text("document_number"),
  documentCountry: text("document_country"),
  documentCountryCode: char("document_country_code", { length: 2 }),
  languages: text("languages").array(),
  education: text("education"),
  phone: text("phone"),
  residenceCity: text("residence_city"),
  residenceCountry: text("residence_country"),
  residenceCountryCode: char("residence_country_code", { length: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PlayerPersonalDetails = InferSelectModel<typeof playerPersonalDetails>;
export type NewPlayerPersonalDetails = InferInsertModel<typeof playerPersonalDetails>;
