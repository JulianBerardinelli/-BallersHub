// /admin/blog/pending — queue of pending_review posts. FIFO.

import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getBlogActor } from "@/lib/blog/permissions";
import { listPendingPosts } from "@/lib/blog/posts";
import { CLUSTER_LABELS } from "@/lib/blog/labels";

export const metadata: Metadata = {
  title: "Blog · pendientes",
  robots: { index: false, follow: false },
};

export default async function AdminBlogPendingPage() {
  const actor = await getBlogActor();
  if (!actor) redirect("/auth/sign-in?next=/admin/blog/pending");
  if (!actor.isAdmin) redirect("/dashboard?noadmin=1");

  const posts = await listPendingPosts();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-tight tracking-tight text-bh-fg-1">
          Cola de revisión
        </h1>
        <p className="text-sm text-bh-fg-3">
          {posts.length === 0
            ? "No hay posts pendientes ahora."
            : `${posts.length} post${posts.length === 1 ? "" : "s"} esperando review (FIFO).`}
        </p>
      </header>

      {posts.length === 0 ? (
        <Link
          href="/admin/blog"
          className="inline-block rounded-bh-md border border-bh-fg-4 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-bh-fg-2 hover:border-bh-fg-3 hover:text-bh-fg-1"
        >
          Ver todos los posts
        </Link>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-bh-lg border border-amber-500/40 bg-amber-500/[0.05] p-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-bh-fg-3">
                  <span>{CLUSTER_LABELS[post.cluster]}</span>
                  <span aria-hidden>·</span>
                  <span>{post.readingTimeMin} min</span>
                  <span aria-hidden>·</span>
                  <time dateTime={post.createdAt.toISOString()}>
                    {formatDate(post.createdAt)}
                  </time>
                </div>
                <p className="truncate font-bh-display text-lg font-bold uppercase tracking-tight text-bh-fg-1">
                  {post.title || "Sin título"}
                </p>
                <p className="line-clamp-2 text-sm text-bh-fg-3">{post.description}</p>
              </div>
              <Link
                href={`/admin/blog/${post.id}`}
                className="rounded-bh-md bg-bh-lime px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-bh-black hover:opacity-90"
              >
                Revisar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
