// /blog/drafts — list of the current user's posts (any status).

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getBlogActor } from "@/lib/blog/permissions";
import { listPostsByAuthor } from "@/lib/blog/posts";
import { StatusBadge } from "@/components/blog/StatusBadge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blog.meta");
  return {
    title: t("draftsTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function DraftsPage() {
  const actor = await getBlogActor();
  if (!actor) redirect("/auth/sign-in?next=/blog/drafts");
  if (!actor.isBlogger && !actor.isAdmin) redirect("/blog?gated=1");

  const [posts, t] = await Promise.all([
    listPostsByAuthor(actor.userId),
    getTranslations("blog"),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 md:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="font-bh-display text-3xl font-bold uppercase leading-tight tracking-tight text-bh-fg-1 md:text-4xl">
            {t("drafts.heading")}
          </h1>
          <p className="text-sm text-bh-fg-3">{t("drafts.intro")}</p>
        </div>
        <Link
          href="/blog/write"
          className="rounded-bh-md bg-bh-lime px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-bh-black hover:opacity-90"
        >
          {t("drafts.ctaWrite")}
        </Link>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-bh-lg border border-dashed border-bh-fg-4 bg-bh-surface-1 p-10 text-center">
          <p className="font-bh-display text-xl font-bold uppercase tracking-tight text-bh-fg-2">
            {t("drafts.emptyTitle")}
          </p>
          <p className="mt-2 text-sm text-bh-fg-3">{t("drafts.emptyBody")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-bh-lg border border-bh-fg-4 bg-bh-surface-1 p-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={post.status} />
                  <span className="text-[10px] uppercase tracking-[0.08em] text-bh-fg-3">
                    {t(`clusters.${post.cluster}` as const)}
                  </span>
                </div>
                <p className="truncate font-bh-display text-base font-bold uppercase tracking-tight text-bh-fg-1">
                  {post.title || t("drafts.fallbackTitle")}
                </p>
                {post.description && (
                  <p className="line-clamp-1 text-sm text-bh-fg-3">{post.description}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {post.status === "published" ? (
                  <Link
                    href={`/blog/${post.slug}`}
                    className="rounded-bh-md border border-bh-fg-4 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2 hover:border-bh-fg-3 hover:text-bh-fg-1"
                  >
                    {t("drafts.actionViewPublished")}
                  </Link>
                ) : (
                  <Link
                    href={`/blog/write/${post.id}`}
                    className="rounded-bh-md border border-bh-fg-4 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2 hover:border-bh-fg-3 hover:text-bh-fg-1"
                  >
                    {post.status === "rejected"
                      ? t("drafts.actionEditRejected")
                      : t("drafts.actionEdit")}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
