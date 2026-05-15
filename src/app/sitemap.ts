// Dynamic sitemap.xml — Next.js App Router file-route convention.
//
// Composition:
//   • Static marketing pages (home, pricing, about).
//   • All approved + public player profiles.
//   • All approved agency profiles.
//
// Priority strategy (pricing matrix §E):
//
//   • Pro / pro_plus players → 0.9  (priority discovery)
//   • Free players           → 0.6
//   • Agencies               → 0.7
//   • Home                   → 1.0
//   • Static (pricing/about) → 0.5
//
// `lastModified` uses each row's `updated_at` so Google sees real
// content edits as crawl-worthy. `changeFrequency` is a soft hint;
// modern Google largely ignores it but it costs nothing to set.
//
// Pro detection is intentionally lenient here: we count `plan IN
// ('pro','pro_plus')` AND `status_v2 IN ('trialing','active')`. This
// mirrors `resolvePlanAccess` semantics from the dashboard. We don't
// import the helper directly because that one reads a per-user row,
// not a batch — duplicating the predicate is cheaper than refactoring
// it to operate over a Set right now.
//
// Performance: every request triggers two queries (players join subs,
// agencies). For a few hundred rows this is trivial. When we cross
// ~10k players we'll need to either (a) cache with `revalidate` here,
// (b) split into multiple sitemaps under `/sitemap-index.xml`, or
// (c) materialize a `sitemap_entries` table. None of those are
// today's problem.

import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { playerProfiles } from "@/db/schema/players";
import { agencyProfiles } from "@/db/schema/agencies";
import { subscriptions } from "@/db/schema/subscriptions";
import { and, eq, inArray } from "drizzle-orm";
import { getSiteBaseUrl } from "@/lib/seo/baseUrl";

// Revalidate hourly. Sitemap doesn't need to be live-fresh — Google
// crawls it at most every few hours anyway. 1h keeps DB load minimal.
export const revalidate = 3600;

type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl();
  const now = new Date();

  // ----- Static marketing pages -----
  const staticEntries: SitemapEntry[] = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
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
    },
  ];

  // ----- Players -----
  // Fetch approved + public players, then resolve their plan via a
  // second query keyed by userId. Doing a manual join lets us keep
  // the Drizzle types clean and the SQL self-documenting.
  let playerRows: Array<{
    slug: string;
    userId: string;
    updatedAt: Date;
  }> = [];
  let proUserIds = new Set<string>();
  let agencyRows: Array<{ slug: string; updatedAt: Date }> = [];

  try {
    playerRows = await db
      .select({
        slug: playerProfiles.slug,
        userId: playerProfiles.userId,
        updatedAt: playerProfiles.updatedAt,
      })
      .from(playerProfiles)
      .where(
        and(
          eq(playerProfiles.status, "approved"),
          eq(playerProfiles.visibility, "public"),
        ),
      );

    if (playerRows.length > 0) {
      const ids = playerRows.map((r) => r.userId);
      const subs = await db
        .select({
          userId: subscriptions.userId,
          plan: subscriptions.plan,
          statusV2: subscriptions.statusV2,
        })
        .from(subscriptions)
        .where(inArray(subscriptions.userId, ids));

      proUserIds = new Set(
        subs
          .filter(
            (s) =>
              (s.plan === "pro" || s.plan === "pro_plus") &&
              (s.statusV2 === "trialing" || s.statusV2 === "active"),
          )
          .map((s) => s.userId),
      );
    }

    // ----- Agencies -----
    agencyRows = await db
      .select({
        slug: agencyProfiles.slug,
        updatedAt: agencyProfiles.updatedAt,
      })
      .from(agencyProfiles)
      .where(eq(agencyProfiles.isApproved, true));
  } catch (err) {
    // If the DB is unreachable (build time without DATABASE_URL, or
    // misconfigured preview env), don't crash the build — return just
    // the static entries. A broken sitemap.xml is worse than a small one.
    console.error("[sitemap] db query failed:", err);
  }

  const playerEntries: SitemapEntry[] = playerRows.map((p) => ({
    url: `${base}/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: proUserIds.has(p.userId) ? 0.9 : 0.6,
  }));

  const agencyEntries: SitemapEntry[] = agencyRows.map((a) => ({
    url: `${base}/agency/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...playerEntries, ...agencyEntries];
}
