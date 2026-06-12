// /admin/blog — list ALL posts across every status (admin overview).

import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getBlogActor } from "@/lib/blog/permissions";
import { listPostsByStatus } from "@/lib/blog/posts";
import { StatusBadge } from "@/components/blog/StatusBadge";
import { CLUSTER_LABELS } from "@/lib/blog/labels";

export const metadata: Metadata = {
  title: "Blog · admin",
  robots: { index: false, follow: false },
};

export default async function AdminBlogPage() {
  const actor = await getBlogActor();
  if (!actor) redirect("/auth/sign-in?next=/admin/blog");
  if (!actor.isAdmin) redirect("/dashboard?noadmin=1");

  const posts = await listPostsByStatus([
    "pending_review",
    "published",
    "draft",
    "rejected",
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="font-bh-display text-3xl font-bold uppercase leading-tight tracking-tight text-bh-fg-1">
            Blog · admin
          </h1>
          <p className="text-sm text-bh-fg-3">
            Vista completa. Para revisar pendientes ve a{" "}
            <Link href="/admin/blog/pending" className="text-bh-lime hover:underline">
              /admin/blog/pending
            </Link>
            .
          </p>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-bh-fg-3">No hay posts todavía.</p>
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
                    {CLUSTER_LABELS[post.cluster]}
                  </span>
                  <span className="text-[10px] text-bh-fg-3">
                    {post.readingTimeMin} min
                  </span>
                </div>
                <p className="truncate font-bh-display text-base font-bold uppercase tracking-tight text-bh-fg-1">
                  {post.title || "Sin título"}
                </p>
                <p className="line-clamp-1 text-xs text-bh-fg-3">{post.slug}</p>
              </div>
              <Link
                href={`/admin/blog/${post.id}`}
                className="rounded-bh-md border border-bh-fg-4 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2 hover:border-bh-fg-3 hover:text-bh-fg-1"
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
