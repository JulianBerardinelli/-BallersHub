// Public /blog listing — editorial redesign (Claude Design handoff).
//
// Lists every status='published' post (cap 20, newest first). The most
// recent post becomes the full-bleed featured hero; the rest fall into the
// grid. Category filter + live search run client-side over this list.
// Pagination + cluster hubs land in MVP-3.

import type { Metadata } from "next";
import { ogFallbackImages } from "@/lib/og/fallback";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listPublishedPosts } from "@/lib/blog/posts";
import { hydrateAuthors } from "@/lib/blog/authors";
import { getBlogActor } from "@/lib/blog/permissions";
import { toCardVM } from "@/lib/blog/view";
import { BlogIndexClient } from "@/components/blog/BlogIndexClient";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blog.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/blog" },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "/blog",
      type: "website",
      images: ogFallbackImages,
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("twitterDescription"),
    },
  };
}

// Break out of the layout's max-w-[1200px] main into a true full-bleed band
// (same technique as the pricing detail panel).
const fullBleed = {
  marginLeft: "calc(50% - 50vw)",
  marginRight: "calc(50% - 50vw)",
  width: "100vw",
} as const;

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [posts, actor, t] = await Promise.all([
    listPublishedPosts({ locale, limit: 20 }),
    getBlogActor(),
    getTranslations("blog"),
  ]);
  const isContributor = Boolean(actor?.isBlogger || actor?.isAdmin);

  const authorIds = [...new Set(posts.map((p) => p.authorUserId))];
  const authors = await hydrateAuthors(authorIds);
  const cards = posts.map((p) => toCardVM(p, authors, locale));

  return (
    <div style={fullBleed} className="-mt-2">
      {/* SEO/a11y: the masthead uses the wordmark (a span), so keep a real
          h1 for the page — visually hidden, no layout impact. */}
      <h1 className="sr-only">{t("meta.h1")}</h1>

      {isContributor && (
        <div className="border-b border-white/[0.06]">
          <div className="mx-auto flex max-w-[1320px] items-center justify-end gap-2 px-7 py-2.5 max-md:px-5">
            <Link
              href="/blog/drafts"
              className="rounded-bh-md border border-white/[0.14] px-3.5 py-1.5 font-bh-body text-xs font-semibold uppercase tracking-[0.06em] text-bh-fg-2 transition-colors hover:border-white/30 hover:text-bh-fg-1"
            >
              {t("listing.contributorDrafts")}
            </Link>
            <Link
              href="/blog/write"
              className="rounded-bh-md bg-bh-lime px-3.5 py-1.5 font-bh-body text-xs font-semibold uppercase tracking-[0.06em] text-bh-black transition-opacity hover:opacity-90"
            >
              {t("listing.contributorWrite")}
            </Link>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="mx-auto max-w-[1320px] px-7 py-20 max-md:px-5">
          <div className="rounded-bh-lg border border-dashed border-white/[0.18] bg-bh-surface-1 p-10 text-center">
            <p className="font-bh-display text-2xl font-bold uppercase tracking-tight text-bh-fg-2">
              {t("listing.emptyTitle")}
            </p>
            <p className="mt-2 font-bh-body text-sm text-bh-fg-3">
              {t("listing.emptyBody")}
            </p>
          </div>
        </div>
      ) : (
        <BlogIndexClient posts={cards} />
      )}
    </div>
  );
}
