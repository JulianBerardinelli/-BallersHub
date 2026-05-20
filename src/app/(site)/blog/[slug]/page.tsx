// Public /blog/[slug] post detail.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getAuthorsMap } from "@/lib/blog/posts";
import { CLUSTER_LABELS } from "@/lib/blog/labels";
import { estimateWordCount } from "@/lib/blog/reading-time";
import { ArticleJsonLd } from "@/lib/seo/articleJsonLd";
import { toCanonicalUrl } from "@/lib/seo/baseUrl";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return {
      title: "Artículo no encontrado",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${slug}`,
      type: "article",
      siteName: "'BallersHub",
      locale: "es_AR",
      ...(post.heroImageUrl && {
        images: [{ url: post.heroImageUrl, alt: post.title }],
      }),
      ...(post.publishedAt && {
        publishedTime: post.publishedAt.toISOString(),
      }),
      ...(post.updatedAt && {
        modifiedTime: post.updatedAt.toISOString(),
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      ...(post.heroImageUrl && { images: [post.heroImageUrl] }),
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return notFound();

  const authorsMap = await getAuthorsMap([post.authorUserId]);
  const author = authorsMap.get(post.authorUserId);
  const authorName = author?.role === "admin" ? "Equipo 'BallersHub" : "Autor invitado";
  const authorSlug = post.authorUserId.slice(0, 8);

  const wordCount = estimateWordCount(post.contentHtml);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
      <ArticleJsonLd
        article={{
          slug: post.slug,
          title: post.title,
          description: post.description,
          heroImageUrl: post.heroImageUrl
            ? toCanonicalUrl(post.heroImageUrl)
            : null,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          cluster: post.cluster,
          wordCount,
          author: {
            slug: authorSlug,
            name: authorName,
          },
        }}
      />

      <nav aria-label="Breadcrumbs" className="mb-6 text-[11px] uppercase tracking-[0.12em] text-bh-fg-3">
        <Link href="/" className="hover:text-bh-fg-2">Inicio</Link>
        <span aria-hidden className="mx-2">/</span>
        <Link href="/blog" className="hover:text-bh-fg-2">Blog</Link>
        <span aria-hidden className="mx-2">/</span>
        <span className="text-bh-fg-2">{CLUSTER_LABELS[post.cluster]}</span>
      </nav>

      <header className="mb-8 space-y-4">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-lime/30 bg-bh-lime/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-bh-lime">
          {CLUSTER_LABELS[post.cluster]}
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          {post.title}
        </h1>
        <p className="text-base leading-[1.6] text-bh-fg-2 md:text-lg">
          {post.description}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.1em] text-bh-fg-3">
          <span>{authorName}</span>
          <span aria-hidden>·</span>
          <span>{post.readingTimeMin} min de lectura</span>
          {post.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <time dateTime={post.publishedAt.toISOString()}>
                {formatDate(post.publishedAt)}
              </time>
            </>
          )}
        </div>
      </header>

      {post.heroImageUrl && (
        <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-bh-lg">
          <Image
            src={post.heroImageUrl}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 768px, 100vw"
            priority
            className="object-cover"
          />
        </div>
      )}

      <div
        className="prose prose-invert prose-headings:font-bh-display prose-headings:uppercase prose-headings:tracking-tight prose-a:text-bh-lime prose-a:no-underline hover:prose-a:underline max-w-none text-bh-fg-1"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      {post.tags.length > 0 && (
        <div className="mt-12 flex flex-wrap gap-2 border-t border-bh-fg-4 pt-6">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-bh-pill border border-bh-fg-4 bg-bh-surface-1 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-bh-fg-3"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}
