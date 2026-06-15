// Blog posts — editorial system gated by is_blogger whitelist.
//
// Lifecycle: draft → pending_review → published | rejected.
// RLS policies enforce that:
//   - Public sees only status='published'
//   - Author sees their own posts (any status)
//   - Admin (via is_admin()) sees all + can update reviewedBy/reviewedAt
//   - Only is_blogger users can INSERT
//
// See docs/blog/README.md for the full architecture.

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { blogClusterEnum, blogStatusEnum } from "./enums";
import { userProfiles } from "./users";

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // URL: /blog/{slug}. Unique. Generated server-side from title;
    // admin can edit at review time if it collides or is too long.
    slug: text("slug").notNull(),

    // Editorial content fields.
    title: text("title").notNull(),
    description: text("description").notNull(), // meta description, ≤ 158 chars (zod-enforced)
    contentHtml: text("content_html").notNull(), // sanitized output from TipTap

    // OG image for the post. 1200×630 ideal. Nullable so drafts can be
    // saved without one, but submitForReview validates it exists.
    heroImageUrl: text("hero_image_url"),

    // SEO classification — used for sitemap priority + cluster hubs (MVP-3).
    cluster: blogClusterEnum("cluster").notNull(),
    tags: text("tags").array().notNull().default([]),

    // Authorship — references the user_profiles row of the author.
    // We point at user_id (the auth.uid()) for RLS simplicity.
    authorUserId: uuid("author_user_id").notNull(),

    // State machine for review.
    status: blogStatusEnum("status").notNull().default("draft"),

    // Set when admin rejects — surfaced to author in /blog/drafts.
    rejectionReason: text("rejection_reason"),

    // Review audit trail — who/when approved-rejected last.
    reviewedByUserId: uuid("reviewed_by_user_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

    // Set only when status flips to 'published'. Drives sitemap lastmod.
    publishedAt: timestamp("published_at", { withTimezone: true }),

    // Auto-calculated from contentHtml on submitForReview. Used for
    // reading-time chip in UI + Article schema wordCount derivation.
    readingTimeMin: integer("reading_time_min").notNull().default(0),

    // i18n (F6): mirror the player/agency translation pattern. The post body
    // is FULLY written per locale (we do not auto-translate; the author writes
    // each language). `translation_of_id` links a translated post to its source
    // (the es original); the source itself has NULL here. A self-FK with
    // ON DELETE SET NULL keeps siblings alive if the source is deleted.
    // Defaulting `locale='es'` lets the existing rows backfill automatically.
    locale: text("locale").notNull().default("es"),
    translationOfId: uuid("translation_of_id").references(
      (): AnyPgColumn => blogPosts.id,
      { onDelete: "set null" },
    ),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Public lookup by slug — UNIQUE to enforce no URL collisions.
    // Translations get a different slug (`foo`, `foo-en`) so this stays global.
    blogPostsSlugIdx: uniqueIndex("blog_posts_slug_idx").on(table.slug),
    // Listing query: WHERE status='published' ORDER BY published_at DESC.
    blogPostsStatusPublishedIdx: index("blog_posts_status_published_at_idx").on(
      table.status,
      table.publishedAt,
    ),
    // Per-locale listing: WHERE locale=$1 AND status='published'.
    blogPostsLocaleStatusIdx: index(
      "blog_posts_locale_status_published_at_idx",
    ).on(table.locale, table.status, table.publishedAt),
    // Drafts query: WHERE author_user_id = auth.uid().
    blogPostsAuthorIdx: index("blog_posts_author_user_id_idx").on(table.authorUserId),
    // Cluster hub queries (MVP-3): WHERE cluster=? AND status='published'.
    blogPostsClusterIdx: index("blog_posts_cluster_idx").on(
      table.cluster,
      table.publishedAt,
    ),
    // At most one translation per (source post, locale). NULL translation_of_id
    // (originals) are treated as distinct by Postgres, so multiple originals
    // never collide here.
    blogPostsTranslationLocaleIdx: uniqueIndex(
      "blog_posts_translation_of_locale_idx",
    ).on(table.translationOfId, table.locale),
    blogPostsLocaleCheck: check(
      "blog_posts_locale_check",
      sql`locale IN ('es','en','it','pt')`,
    ),
  }),
);

export type BlogPost = InferSelectModel<typeof blogPosts>;
export type NewBlogPost = InferInsertModel<typeof blogPosts>;
