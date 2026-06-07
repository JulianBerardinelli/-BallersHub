// Public /blog/[slug] post detail — editorial redesign (Claude Design
// handoff): cinematic cover, reading progress, sticky TOC, wide styled
// prose, author bio, conversion CTA and related posts.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, listPublishedPosts } from "@/lib/blog/posts";
import { hydrateAuthors, authorSameAs } from "@/lib/blog/authors";
import { CLUSTER_LABELS } from "@/lib/blog/labels";
import { estimateWordCount } from "@/lib/blog/reading-time";
import { processArticleHtml } from "@/lib/blog/toc";
import { buildAuthorVM, toCardVM } from "@/lib/blog/view";
import { accentForCluster, toneForCluster } from "@/lib/blog/clusterAccent";
import { ArticleJsonLd } from "@/lib/seo/articleJsonLd";
import { toCanonicalUrl } from "@/lib/seo/baseUrl";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { ArticleCover } from "@/components/blog/ArticleCover";
import { ArticleToc } from "@/components/blog/ArticleToc";
import { AuthorBio } from "@/components/blog/AuthorBio";
import { BlogCta } from "@/components/blog/BlogCta";
import { CommentsPlaceholder } from "@/components/blog/CommentsPlaceholder";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { BlogBadge } from "@/components/blog/primitives";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

// Full-bleed escape from the layout's max-w-[1200px] main.
const fullBleed = {
  marginLeft: "calc(50% - 50vw)",
  marginRight: "calc(50% - 50vw)",
  width: "100vw",
} as const;

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

  // Related: same cluster first, then the rest, excluding the current post.
  const pool = await listPublishedPosts(10);
  const relatedRaw = [
    ...pool.filter((p) => p.id !== post.id && p.cluster === post.cluster),
    ...pool.filter((p) => p.id !== post.id && p.cluster !== post.cluster),
  ].slice(0, 3);

  const authorIds = [...new Set([post.authorUserId, ...relatedRaw.map((p) => p.authorUserId)])];
  const authors = await hydrateAuthors(authorIds);

  const hydrated = authors.get(post.authorUserId);
  const blogAuthor = hydrated?.blogAuthor ?? null;
  const author = buildAuthorVM(post.authorUserId, hydrated);
  const authorBio = blogAuthor?.bio ?? null;
  const authorSameAsUrls = blogAuthor ? authorSameAs(blogAuthor) : [];

  const related = relatedRaw.map((p) => toCardVM(p, authors));

  const { html, headings } = processArticleHtml(post.contentHtml);
  const accent = accentForCluster(post.cluster).color;
  const tone = toneForCluster(post.cluster);
  const categoryLabel = CLUSTER_LABELS[post.cluster];
  const wordCount = estimateWordCount(post.contentHtml);

  return (
    <>
      <ReadingProgress accent={accent} />

      {/* Cinematic cover — full-bleed, pulled up under the fixed header. */}
      <div style={{ ...fullBleed, marginTop: "-6.5rem" }}>
        <ArticleCover
          slug={post.slug}
          cluster={post.cluster}
          title={post.title}
          description={post.description}
          heroImageUrl={post.heroImageUrl}
          author={author}
          categoryLabel={categoryLabel}
          dateLabel={post.publishedAt ? new Intl.DateTimeFormat("es-AR", { year: "numeric", month: "long", day: "numeric" }).format(post.publishedAt) : null}
          publishedISO={post.publishedAt ? post.publishedAt.toISOString() : null}
          readingTimeMin={post.readingTimeMin}
          accent={accent}
        />
      </div>

      {/* Body */}
      <div style={fullBleed}>
        <div className="mx-auto max-w-[1320px] px-7 pt-11 max-md:px-5">
          <div className="bh-article-layout">
            {/* TOC */}
            <aside className="bh-toc">
              <ArticleToc headings={headings} accent={accent} />
            </aside>

            {/* Article */}
            <article className="bh-article-col">
              <ArticleJsonLd
                article={{
                  slug: post.slug,
                  title: post.title,
                  description: post.description,
                  heroImageUrl: post.heroImageUrl ? toCanonicalUrl(post.heroImageUrl) : null,
                  publishedAt: post.publishedAt,
                  updatedAt: post.updatedAt,
                  cluster: post.cluster,
                  wordCount,
                  author: {
                    slug: author.slug ?? post.authorUserId.slice(0, 8),
                    name: author.name,
                    bio: authorBio,
                    sameAs: authorSameAsUrls,
                  },
                }}
              />

              <div
                id="bh-article-body"
                className="bh-article-prose"
                style={{ ["--acc" as string]: accent }}
                dangerouslySetInnerHTML={{ __html: html }}
              />

              {/* Tags */}
              <div className="my-10 flex flex-wrap items-center gap-2 border-y border-white/[0.09] py-6">
                <BlogBadge tone={tone}>{categoryLabel}</BlogBadge>
                {post.tags.slice(0, 4).map((tag) => (
                  <BlogBadge key={tag} tone="neutral">
                    {tag}
                  </BlogBadge>
                ))}
              </div>

              <AuthorBio author={author} bio={authorBio} accent={accent} />
              <BlogCta cluster={post.cluster} />
              <CommentsPlaceholder />
            </article>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-[70px]">
              <div className="mb-6 flex items-center gap-3.5">
                <h2 className="m-0 font-bh-display text-[clamp(28px,3vw,40px)] font-extrabold uppercase text-bh-fg-1">
                  Seguí leyendo
                </h2>
                <span className="h-px flex-1 bg-white/10" />
                <Link
                  href="/blog"
                  className="whitespace-nowrap font-bh-body text-[13.5px] font-semibold"
                  style={{ color: accent }}
                >
                  Ver todo →
                </Link>
              </div>
              <RelatedPosts posts={related} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
