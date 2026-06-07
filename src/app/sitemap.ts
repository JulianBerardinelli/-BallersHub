// Dynamic sitemap.xml — Next.js App Router file-route convention.
//
// Composition:
//   • Static marketing pages (home, pricing, about, blog).
//   • Public directory hubs (/players, /agencies).
//   • Every INDEXABLE player profile.
//   • Every approved agency profile.
//   • Published blog posts + author hubs with ≥1 published post.
//
// Indexability is delegated to `@/lib/seo/indexable-profiles` so the
// sitemap, the directory pages, and each profile's robots meta all agree
// on the exact same set. This is the fix for "Discovered – currently not
// indexed": we no longer submit thin Free profiles that their own page
// marks `robots: noindex`. Submitting a URL you simultaneously tell
// Google not to index is a contradiction that wastes crawl budget.
//
// Priority strategy (pricing matrix §E):
//
//   • Pro / pro_plus players → 0.9  (priority discovery)
//   • Free players (indexable) → 0.6
//   • Agencies               → 0.7
//   • Directory hubs         → 0.8  (high-value internal-link surfaces)
//   • Home                   → 1.0
//   • Static (pricing/about) → 0.5
//
// `lastModified` uses each row's `updated_at` so Google sees real
// content edits as crawl-worthy. `changeFrequency` is a soft hint;
// modern Google largely ignores it but it costs nothing to set.
//
// Performance: a handful of queries per request (players join subs via
// the helper, agencies, blog, authors). For a few hundred rows this is
// trivial. When we cross ~10k players we'll need to either (a) lean on
// `revalidate` here, (b) split into `/sitemap-index.xml`, or
// (c) materialize a `sitemap_entries` table. None of those are today's
// problem.

import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { blogPosts } from "@/db/schema/blog";
import { eq } from "drizzle-orm";
import { getSiteBaseUrl } from "@/lib/seo/baseUrl";
import { sitemapLanguages } from "@/lib/seo/hreflang";
import { listAuthorsWithPublishedPosts } from "@/lib/blog/authors";
import {
  getIndexablePlayers,
  getIndexableAgencies,
} from "@/lib/seo/indexable-profiles";

// Revalidate hourly. Sitemap doesn't need to be live-fresh — Google
// crawls it at most every few hours anyway. 1h keeps DB load minimal.
export const revalidate = 3600;

type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl();
  const now = new Date();

  // ----- Static marketing pages + directory hubs -----
  const staticEntries: SitemapEntry[] = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/players`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/agencies`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
      // /about is fully translated in all 4 locales → emit hreflang
      // alternates. Other marketing pages join as they get localized.
      alternates: { languages: sitemapLanguages("/about") },
    },
    {
      url: `${base}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  let playerEntries: SitemapEntry[] = [];
  let agencyEntries: SitemapEntry[] = [];
  let blogEntries: SitemapEntry[] = [];
  let authorEntries: SitemapEntry[] = [];

  try {
    // ----- Players + Agencies (shared indexability source of truth) -----
    const [players, agencies] = await Promise.all([
      getIndexablePlayers(),
      getIndexableAgencies(),
    ]);

    playerEntries = players.map((p) => ({
      url: `${base}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: p.isPro ? 0.9 : 0.6,
    }));

    agencyEntries = agencies.map((a) => ({
      url: `${base}/agency/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // ----- Blog posts -----
    // Solo posts publicados. updated_at refleja la última edición
    // (vía trigger set_updated_at), así Google ve cambios post-publish.
    const blogRows = await db
      .select({
        slug: blogPosts.slug,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"));

    blogEntries = blogRows.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    // ----- Author hubs -----
    // Solo authors con al menos 1 post published — un hub vacío es
    // thin content y tanka quality (anti-pattern del seo-strategy §10).
    const authorRows = await listAuthorsWithPublishedPosts();
    authorEntries = authorRows.map((a) => ({
      url: `${base}/blog/authors/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      // Authors son E-E-A-T anchors pero secundarios vs posts.
      priority: 0.6,
    }));
  } catch (err) {
    // If the DB is unreachable (build time without DATABASE_URL, or
    // misconfigured preview env), don't crash the build — return just
    // the static entries. A broken sitemap.xml is worse than a small one.
    console.error("[sitemap] db query failed:", err);
  }

  return [
    ...staticEntries,
    ...playerEntries,
    ...agencyEntries,
    ...blogEntries,
    ...authorEntries,
  ];
}
