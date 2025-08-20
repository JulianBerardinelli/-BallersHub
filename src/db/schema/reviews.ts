// reviews
import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { reviewStatusEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").notNull(),
  authorUserId: uuid("author_user_id"),
  authorReviewerId: uuid("author_reviewer_id"),
  authorName: text("author_name"),
  authorEmailHash: text("author_email_hash"),
  content: text("content").notNull(),
  rating: integer("rating"),
  status: reviewStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Review = InferSelectModel<typeof reviews>;
export type NewReview = InferInsertModel<typeof reviews>;
