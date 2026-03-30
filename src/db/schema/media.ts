// player_media
import { pgTable, uuid, text, timestamp, boolean, date } from "drizzle-orm/pg-core";
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
  publisher: text("publisher"),
  publishedAt: date("published_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PlayerArticle = InferSelectModel<typeof playerArticles>;
export type NewPlayerArticle = InferInsertModel<typeof playerArticles>;
