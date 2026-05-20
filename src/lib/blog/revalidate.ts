// Cache invalidation helpers for blog content.
//
// When a post transitions (publish, unpublish, edit-published), we
// need to bust:
//   - /blog (listing)
//   - /blog/[slug] (detail)
//   - /sitemap.xml (so Google sees the lastmod update)
//   - /llms.txt (AI crawlers see the new content)
//
// Mirrors src/lib/seo/revalidate.ts for player profiles.

import { revalidatePath } from "next/cache";

export async function revalidateBlogSurfaces(slug: string | null): Promise<void> {
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}
