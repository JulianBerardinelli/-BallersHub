// coach_stats_seasons
import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { coachProfiles } from "./coaches";
import { coachCareerItems } from "./coachCareer";

export const coachStatsSeasons = pgTable("coach_stats_seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id")
    .notNull()
    .references(() => coachProfiles.id, { onDelete: "cascade" }),
  season: text("season").notNull(),
  matches: integer("matches").default(0).notNull(),
  wins: integer("wins").default(0).notNull(),
  draws: integer("draws").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  goalsFor: integer("goals_for").default(0).notNull(),
  goalsAgainst: integer("goals_against").default(0).notNull(),
  competition: text("competition"),
  team: text("team"),
  careerItemId: uuid("career_item_id").references(() => coachCareerItems.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type CoachStatsSeason = InferSelectModel<typeof coachStatsSeasons>;
export type NewCoachStatsSeason = InferInsertModel<typeof coachStatsSeasons>;
