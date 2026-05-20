// /blog/write/[id] — edit existing draft (or rejected post).
//
// Verifies that the caller is the author + status allows editing
// (draft or rejected). Admin can also access via /admin/blog/[id].

import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getBlogActor } from "@/lib/blog/permissions";
import { getPostById } from "@/lib/blog/posts";
import { BlogPostForm } from "@/components/blog/BlogPostForm";

export const metadata: Metadata = {
  title: "Editar artículo",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function EditPostPage({ params }: { params: Params }) {
  const { id } = await params;

  const actor = await getBlogActor();
  if (!actor) redirect(`/auth/sign-in?next=/blog/write/${id}`);

  const post = await getPostById(id);
  if (!post) return notFound();

  const isOwner = post.authorUserId === actor.userId;
  if (!isOwner && !actor.isAdmin) {
    redirect("/blog?gated=1");
  }

  if (post.status === "published") {
    redirect(`/blog/${post.slug}?msg=published-readonly`);
  }
  if (post.status === "pending_review" && !actor.isAdmin) {
    redirect("/blog/drafts?msg=in-review");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
      <header className="mb-8 space-y-2">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-lime/30 bg-bh-lime/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-lime">
          Editar borrador
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-tight tracking-tight text-bh-fg-1 md:text-4xl">
          {post.title || "Sin título"}
        </h1>
      </header>

      <BlogPostForm
        mode={{
          kind: "edit",
          postId: post.id,
          currentStatus: post.status,
          rejectionReason: post.rejectionReason,
        }}
        initialValues={{
          title: post.title,
          description: post.description,
          contentHtml: post.contentHtml,
          heroImageUrl: post.heroImageUrl,
          cluster: post.cluster,
          tags: post.tags,
        }}
      />
    </main>
  );
}
