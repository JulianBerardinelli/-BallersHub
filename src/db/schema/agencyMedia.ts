import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { agencyProfiles } from "./agencies";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const agencyMedia = pgTable("agency_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .notNull()
    .references(() => agencyProfiles.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title"),
  altText: text("alt_text"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AgencyMedia = InferSelectModel<typeof agencyMedia>;
export type NewAgencyMedia = InferInsertModel<typeof agencyMedia>;
