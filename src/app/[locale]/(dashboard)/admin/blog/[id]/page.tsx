// /admin/blog/[id] — admin review detail.
// Renders the post content + meta + admin actions panel.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBlogActor } from "@/lib/blog/permissions";
import { getPostById } from "@/lib/blog/posts";
import { StatusBadge } from "@/components/blog/StatusBadge";
import { AdminReviewActions } from "@/components/blog/AdminReviewActions";
import { CLUSTER_LABELS } from "@/lib/blog/labels";

export const metadata: Metadata = {
  title: "Revisión",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function AdminBlogDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const actor = await getBlogActor();
  if (!actor) redirect(`/auth/sign-in?next=/admin/blog/${id}`);
  if (!actor.isAdmin) redirect("/dashboard?noadmin=1");

  const post = await getPostById(id);
  if (!post) return notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-12">
      <nav className="mb-6 text-[11px] uppercase tracking-[0.12em] text-bh-fg-3">
        <Link href="/admin/blog" className="hover:text-bh-fg-2">Admin · Blog</Link>
        <span aria-hidden className="mx-2">/</span>
        <span className="text-bh-fg-2">{post.slug}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={post.status} />
              <span className="text-[10px] uppercase tracking-[0.08em] text-bh-fg-3">
                {CLUSTER_LABELS[post.cluster]}
              </span>
              <span className="text-[10px] uppercase tracking-[0.08em] text-bh-fg-3">
                {post.readingTimeMin} min
              </span>
            </div>
            <h1 className="font-bh-display text-2xl font-bold uppercase leading-tight tracking-tight text-bh-fg-1 md:text-3xl">
              {post.title || "Sin título"}
            </h1>
            <p className="text-base leading-[1.6] text-bh-fg-2">{post.description}</p>
            <p className="text-[11px] text-bh-fg-3">Slug: {post.slug}</p>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-bh-pill border border-bh-fg-4 bg-bh-surface-1 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-bh-fg-3"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </header>

          {post.heroImageUrl && (
            <div className="overflow-hidden rounded-bh-lg border border-bh-fg-4">
              {/* Plain img instead of next/image — admin preview, no LCP impact */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.heroImageUrl}
                alt={post.title}
                className="w-full"
              />
            </div>
          )}

          <article
            className="prose prose-invert prose-headings:font-bh-display prose-headings:uppercase max-w-none rounded-bh-lg border border-bh-fg-4 bg-bh-surface-1 p-6 text-bh-fg-1"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </div>

        <aside className="space-y-4">
          <AdminReviewActions postId={post.id} currentStatus={post.status} />

          <div className="space-y-2 rounded-bh-lg border border-bh-fg-4 bg-bh-surface-1 p-5 text-[11px] uppercase tracking-[0.08em] text-bh-fg-3">
            <p>
              <span className="text-bh-fg-2">Autor user_id:</span>{" "}
              <span className="break-all normal-case tracking-normal">{post.authorUserId}</span>
            </p>
            <p>Creado: {formatDate(post.createdAt)}</p>
            <p>Actualizado: {formatDate(post.updatedAt)}</p>
            {post.reviewedAt && <p>Reviewed: {formatDate(post.reviewedAt)}</p>}
            {post.publishedAt && <p>Published: {formatDate(post.publishedAt)}</p>}
          </div>

          {post.rejectionReason && (
            <div className="rounded-bh-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
              <p className="font-semibold uppercase tracking-[0.08em] text-red-300">
                Último rechazo
              </p>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed">{post.rejectionReason}</p>
            </div>
          )}

          <Link
            href={`/blog/write/${post.id}`}
            className="block rounded-bh-md border border-bh-fg-4 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-bh-fg-2 hover:border-bh-fg-3 hover:text-bh-fg-1"
          >
            Editar contenido
          </Link>
        </aside>
      </div>
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
