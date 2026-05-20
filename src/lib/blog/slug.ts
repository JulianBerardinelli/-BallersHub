// Slug generation + uniqueness check.
//
// Slugs come from the post title. We lowercase, strip diacritics, swap
// non-alphanumerics for hyphens, and collapse. If the resulting slug
// already exists in blog_posts, we suffix with `-2`, `-3`, etc., until
// we find a free one — author can override at edit time.

import { db } from "@/lib/db";
import { blogPosts } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

const MAX_SLUG_LENGTH = 80;

export function slugifyText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, ""); // trim trailing hyphen if slice cut mid-word
}

/**
 * Find a free slug for a new post. Pass `excludeId` when updating an
 * existing post (so its own slug doesn't count as a collision).
 */
export async function findFreeSlug(
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = slugifyText(base) || "post";
  let candidate = root;
  let suffix = 1;

  while (true) {
    const conditions = excludeId
      ? and(eq(blogPosts.slug, candidate), ne(blogPosts.id, excludeId))
      : eq(blogPosts.slug, candidate);
    const existing = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(conditions)
      .limit(1);

    if (existing.length === 0) return candidate;

    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}
