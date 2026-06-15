// /blog/write — create a new post.
//
// Gated by requireBlogger() at server-render time. Renders the
// BlogPostForm in "create" mode. Submit creates a draft and redirects
// to /blog/write/[id].

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getBlogActor } from "@/lib/blog/permissions";
import { BlogPostForm } from "@/components/blog/BlogPostForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blog.meta");
  return {
    title: t("writeTitle"),
    robots: { index: false, follow: false }, // privado del autor
  };
}

export default async function NewPostPage() {
  const actor = await getBlogActor();
  if (!actor) redirect("/auth/sign-in?next=/blog/write");
  if (!actor.isBlogger && !actor.isAdmin) redirect("/blog?gated=1");

  const t = await getTranslations("blog.editor");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
      <header className="mb-8 space-y-2">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-lime/30 bg-bh-lime/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-lime">
          {t("createBadge")}
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-tight tracking-tight text-bh-fg-1 md:text-4xl">
          {t("createHeading")}
        </h1>
        <p className="text-sm text-bh-fg-3">
          {t("createIntro")}
        </p>
      </header>

      <BlogPostForm mode={{ kind: "create" }} />
    </main>
  );
}
