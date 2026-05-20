// Article JSON-LD for blog posts.
//
// Emits an `Article` node tied to the sitewide Organization (#organization)
// as publisher. Author is rendered as a `Person` — for MVP-1 we anchor
// the Person @id at /blog/authors/<slug> even though that page doesn't
// exist yet (MVP-2). Google accepts dangling @id refs and we'll resolve
// them when /blog/authors/[slug] ships.

import { toCanonicalUrl, getSiteBaseUrl } from "./baseUrl";

export type ArticleJsonLdInput = {
  slug: string;
  title: string;
  description: string;
  heroImageUrl: string | null;
  publishedAt: Date | string | null;
  updatedAt: Date | string | null;
  cluster: string;
  wordCount: number;
  author: {
    /** Slug del autor — usado para construir @id de /blog/authors/<slug>. */
    slug: string;
    name: string;
    bio?: string | null;
    sameAs?: string[];
  };
};

function toIso(d: Date | string | null): string | null {
  if (!d) return null;
  if (typeof d === "string") return d;
  return d.toISOString();
}

export function ArticleJsonLd({ article }: { article: ArticleJsonLdInput }) {
  const base = getSiteBaseUrl();
  const articleUrl = toCanonicalUrl(`/blog/${article.slug}`);
  const authorUrl = toCanonicalUrl(`/blog/authors/${article.author.slug}`);
  const articleId = `${articleUrl}#article`;
  const authorId = `${authorUrl}#person`;
  const orgId = `${base}#organization`;
  const breadcrumbId = `${articleUrl}#breadcrumb`;

  const datePublished = toIso(article.publishedAt);
  const dateModified = toIso(article.updatedAt) ?? datePublished;

  const authorNode = {
    "@type": "Person",
    "@id": authorId,
    name: article.author.name,
    url: authorUrl,
    ...(article.author.bio && { description: article.author.bio }),
    ...(article.author.sameAs &&
      article.author.sameAs.length > 0 && { sameAs: article.author.sameAs }),
  };

  const articleNode = {
    "@type": "Article",
    "@id": articleId,
    headline: article.title,
    description: article.description,
    url: articleUrl,
    inLanguage: "es-AR",
    ...(article.heroImageUrl && { image: article.heroImageUrl }),
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    author: { "@id": authorId },
    publisher: { "@id": orgId },
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    articleSection: article.cluster,
    wordCount: article.wordCount,
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: base },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${base}/blog` },
      { "@type": "ListItem", position: 3, name: article.title, item: articleUrl },
    ],
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [articleNode, authorNode, breadcrumb],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
