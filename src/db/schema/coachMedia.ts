// coach_media
import { pgTable, uuid, text, timestamp, boolean, date, integer } from "drizzle-orm/pg-core";
import { mediaTypeEnum, reviewStatusEnum } from "./enums";
import { coachProfiles } from "./coaches";
import { coachMethodologyRubros } from "./coachMethodology";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const coachMedia = pgTable("coach_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id").notNull().references(() => coachProfiles.id, { onDelete: "cascade" }),
  // Cuando está seteado, este doc es un adjunto (PDF/PPT/PPTX) de un rubro de
  // metodología, no un item de galería. NULL = media/galería normal. Solo aplica
  // a filas con type='doc'. Ver docs/staff/PLAN.md §5.2.
  rubroId: uuid("rubro_id").references(() => coachMethodologyRubros.id, { onDelete: "cascade" }),
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
  // Manual ordering set by the coach from the dashboard (videos only). Lower
  // sorts first. Default 0 keeps legacy rows in their pre-reorder relative
  // order via createdAt tiebreaker until the coach drags them.
  position: integer("position").notNull().default(0),
  isPrimary: boolean("is_primary").default(false).notNull(),
  // Pre-moderation: unlike player_media (is_approved bool default true), coach
  // media starts as 'pending' and is hidden from the public portfolio until a
  // reviewer approves it. Rejected media stays for the coach to fix/replace.
  status: reviewStatusEnum("status").default("pending").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachMedia = InferSelectModel<typeof coachMedia>;
export type NewCoachMedia = InferInsertModel<typeof coachMedia>;

export const coachArticles = pgTable("coach_articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id").notNull().references(() => coachProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  imageUrl: text("image_url"),
  publisher: text("publisher"),
  publishedAt: date("published_at"),
  // Manual ordering set by the coach from the dashboard. Lower sorts first.
  // Default 0 keeps legacy rows in publishedAt order until the coach reorders.
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachArticle = InferSelectModel<typeof coachArticles>;
export type NewCoachArticle = InferInsertModel<typeof coachArticles>;
