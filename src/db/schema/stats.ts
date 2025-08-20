// stats_seasons
import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const statsSeasons = pgTable("stats_seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull(),
  season: text("season").notNull(),
  matches: integer("matches").default(0),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  minutes: integer("minutes").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type StatsSeason = InferSelectModel<typeof statsSeasons>;
export type NewStatsSeason = InferInsertModel<typeof statsSeasons>;
