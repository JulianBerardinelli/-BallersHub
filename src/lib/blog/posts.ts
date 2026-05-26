// Shared DB queries for blog_posts.
//
// These run as the Drizzle server role (bypasses RLS) so we MUST apply
// authorization at the call site. The RLS policies stay as a second
// layer of defense, but they don't fire from the postgres role.

import { db } from "@/lib/db";
import { blogPosts, userProfiles } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { BlogPost, BlogStatus } from "@/db/schema";

export type ListedBlogPost = Pick<
  BlogPost,
  | "id"
  | "slug"
  | "title"
  | "description"
  | "heroImageUrl"
  | "cluster"
  | "tags"
  | "publishedAt"
  | "readingTimeMin"
  | "authorUserId"
>;

/**
 * Listing público de posts publicados. Ordenado por published_at DESC.
 * Usa explícitamente status='published' aunque RLS también lo enforza —
 * defense-in-depth.
 */
export async function listPublishedPosts(
  limit = 20,
  offset = 0,
): Promise<ListedBlogPost[]> {
  return db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      description: blogPosts.description,
      heroImageUrl: blogPosts.heroImageUrl,
      cluster: blogPosts.cluster,
      tags: blogPosts.tags,
      publishedAt: blogPosts.publishedAt,
      readingTimeMin: blogPosts.readingTimeMin,
      authorUserId: blogPosts.authorUserId,
    })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single post by slug + status filter. Returns null when not found.
 * Used by /blog/[slug] (with status='published') and admin (with no
 * status filter).
 */
export async function getPostBySlug(
  slug: string,
  options?: { allowAnyStatus?: boolean },
): Promise<BlogPost | null> {
  const conditions = options?.allowAnyStatus
    ? eq(blogPosts.slug, slug)
    : and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published"));

  const rows = await db.select().from(blogPosts).where(conditions).limit(1);
  return rows[0] ?? null;
}

/**
 * Posts del autor logueado, cualquier estado. Para /blog/drafts.
 */
export async function listPostsByAuthor(authorUserId: string): Promise<BlogPost[]> {
  return db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.authorUserId, authorUserId))
    .orderBy(desc(blogPosts.updatedAt));
}

/**
 * Admin queue: posts en pending_review, oldest first (FIFO).
 */
export async function listPendingPosts(): Promise<BlogPost[]> {
  return db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, "pending_review"))
    .orderBy(blogPosts.createdAt);
}

/**
 * Get post by id. Used by admin review screen.
 */
export async function getPostById(id: string): Promise<BlogPost | null> {
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Posts published by a given status set (for admin filtering).
 */
export async function listPostsByStatus(statuses: BlogStatus[]): Promise<BlogPost[]> {
  if (statuses.length === 0) return [];
  return db
    .select()
    .from(blogPosts)
    .where(inArray(blogPosts.status, statuses))
    .orderBy(desc(blogPosts.updatedAt));
}

/**
 * Map de author_user_id → display data, para hidratar listings sin
 * hacer un join per-row. Devuelve por cada userId el nombre + role.
 *
 * @deprecated MVP-2: preferir `hydrateAuthors` de `@/lib/blog/authors`
 * que además trae la fila `blog_authors` (display name, slug, sameAs).
 * Esta función queda por compat con call sites legacy.
 */
export async function getAuthorsMap(
  userIds: string[],
): Promise<Map<string, { userId: string; role: string }>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ userId: userProfiles.userId, role: userProfiles.role })
    .from(userProfiles)
    .where(inArray(userProfiles.userId, userIds));
  return new Map(rows.map((r) => [r.userId, r]));
}

/**
 * Lista posts publicados por un autor específico (por user_id).
 * Usado por /blog/authors/[slug]/page.tsx — grilla de posts del hub.
 * Ordenado por published_at DESC.
 */
export async function listPublishedPostsByAuthorUserId(
  authorUserId: string,
): Promise<ListedBlogPost[]> {
  return db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      description: blogPosts.description,
      heroImageUrl: blogPosts.heroImageUrl,
      cluster: blogPosts.cluster,
      tags: blogPosts.tags,
      publishedAt: blogPosts.publishedAt,
      readingTimeMin: blogPosts.readingTimeMin,
      authorUserId: blogPosts.authorUserId,
    })
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.authorUserId, authorUserId),
        eq(blogPosts.status, "published"),
      ),
    )
    .orderBy(desc(blogPosts.publishedAt));
}
