// career_items
import { pgTable, uuid, text, timestamp, date } from "drizzle-orm/pg-core";
import { teams } from "./teams";
import { playerProfiles } from "./players";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const careerItems = pgTable("career_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }), // 👈 nuevo FK
  club: text("club").notNull(),                // nombre libre legacy (mantener por ahora)
  division: text("division"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export type CareerItem = InferSelectModel<typeof careerItems>;
export type NewCareerItem = InferInsertModel<typeof careerItems>;
