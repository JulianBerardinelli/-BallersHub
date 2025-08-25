// player_profiles
import { pgTable, uuid, text, timestamp, integer, date, numeric } from "drizzle-orm/pg-core";
import { playerStatusEnum, visibilityEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";


export const playerProfiles = pgTable("player_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  slug: text("slug").notNull(),
  fullName: text("full_name").notNull(),
  birthDate: date("birth_date"),
  nationality: text("nationality").array(),
  foot: text("foot"),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),
  positions: text("positions").array(),
  currentClub: text("current_club"),
  bio: text("bio"),
  avatarUrl: text("avatar_url").notNull().default("/images/player-default.jpg"),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  status: playerStatusEnum("status").notNull().default("draft"),
  marketValueEur: numeric("market_value_eur", { precision: 12, scale: 2 }).$type<number | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PlayerProfile = InferSelectModel<typeof playerProfiles>;
export type NewPlayerProfile = InferInsertModel<typeof playerProfiles>;
