// career_items
import { pgTable, uuid, text, timestamp, date } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const careerItems = pgTable("career_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull(),
  club: text("club").notNull(),
  division: text("division"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CareerItem = InferSelectModel<typeof careerItems>;
export type NewCareerItem = InferInsertModel<typeof careerItems>;
