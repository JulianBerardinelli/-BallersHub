// player_media
import { pgTable, uuid, text, timestamp, boolean, date, integer } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./enums";
import { playerProfiles } from "./players";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const playerMedia = pgTable("player_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
  type: mediaTypeEnum("type").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  altText: text("alt_text"),
  tags: text("tags").array(),
  provider: text("provider"),
  // Season this highlight belongs to (e.g. 2024 for the 2024-2025 season).
  // Used to order videos in the public portfolio so the newest season appears
  // first. NULL for photos and for legacy videos uploaded before this field
  // existed.
  seasonYear: integer("season_year"),
  // Manual ordering set by the player from the dashboard (videos only). Lower
  // sorts first. Default 0 keeps legacy rows in their pre-reorder relative
  // order via createdAt tiebreaker until the player drags them.
  position: integer("position").notNull().default(0),
  isPrimary: boolean("is_primary").default(false).notNull(),
  isApproved: boolean("is_approved").default(true).notNull(),
  isFlagged: boolean("is_flagged").default(false).notNull(),
  reviewedBy: uuid("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PlayerMedia = InferSelectModel<typeof playerMedia>;
export type NewPlayerMedia = InferInsertModel<typeof playerMedia>;

export const playerArticles = pgTable("player_articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  imageUrl: text("image_url"),
  publisher: text("publisher"),
  publishedAt: date("published_at"),
  // Manual ordering set by the player from the dashboard. Lower sorts first.
  // Default 0 keeps legacy rows in publishedAt order until the player reorders.
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PlayerArticle = InferSelectModel<typeof playerArticles>;
export type NewPlayerArticle = InferInsertModel<typeof playerArticles>;
