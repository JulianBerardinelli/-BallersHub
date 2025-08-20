// player_media
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const playerMedia = pgTable("player_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull(),
  type: mediaTypeEnum("type").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  provider: text("provider"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PlayerMedia = InferSelectModel<typeof playerMedia>;
export type NewPlayerMedia = InferInsertModel<typeof playerMedia>;
