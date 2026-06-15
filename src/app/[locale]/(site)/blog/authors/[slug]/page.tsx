// Author hub público: /blog/authors/[slug]
//
// Cumple el rol de Phase 2 Track B objetivo 4 del seo-strategy:
// E-E-A-T amplifier. Cada autor invitado es una Person entity con
// sameAs a sus perfiles externos (LinkedIn, X, IG) y un listado de
// sus posts published. Cierra el cross-reference @id dangling que
// emite Article schema desde /blog/[slug].
//
// 404 cuando el slug no resuelve — los Article schemas que apunten a
// authors borrados quedan con @id dangling pero Google lo tolera y
// el sitemap se ocupa de no listarlos.

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAuthorBySlug, authorSameAs } from "@/lib/blog/authors";
import { listPublishedPostsByAuthorUserId } from "@/lib/blog/posts";
import { ProfilePageJsonLd } from "@/lib/seo/profilePageJsonLd";
import { getPortfolioSlugForUser } from "@/lib/seo/cross-ref";
import { BlogCard } from "@/components/blog/BlogCard";
import { toCardVM } from "@/lib/blog/view";
import type { HydratedAuthor } from "@/lib/blog/authors";
import { toCanonicalUrl } from "@/lib/seo/baseUrl";

export const revalidate = 3600;

type Params = Promise<{ slug: string; locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  const t = await getTranslations("blog");
  if (!author) {
    return {
      title: t("author.notFoundTitle"),
      robots: { index: false, follow: false },
    };
  }

  const title = `${author.displayName} ${t("author.metaTitleSuffix")}`;
  const description =
    author.bio ??
    author.headline ??
    t("author.fallbackDescription", { name: author.displayName });

  return {
    title,
    description,
    alternates: { canonical: `/blog/authors/${slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/authors/${slug}`,
      type: "profile",
      siteName: "'BallersHub",
      locale: "es_AR",
      ...(author.avatarUrl && {
        images: [{ url: author.avatarUrl, alt: author.displayName }],
      }),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(author.avatarUrl && { images: [author.avatarUrl] }),
    },
  };
}

export default async function AuthorHubPage({ params }: { params: Params }) {
  const { slug, locale } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return notFound();

  // Posts + cross-ref al portfolio del jugador en paralelo. El
  // portfolioSlug solo se setea si el autor también es un jugador
  // aprobado + público (gate dentro del helper) — sino el sameAs[]
  // queda sin ese link y el author hub solo refiere al blog.
  const [posts, portfolioSlug, t] = await Promise.all([
    listPublishedPostsByAuthorUserId(author.userId, { locale }),
    getPortfolioSlugForUser(author.userId),
    getTranslations("blog"),
  ]);
  const sameAs = authorSameAs(author);

  // All posts here are by this one author → build view-models from a
  // single-entry hydrated map (matches the new BlogCard contract).
  const authorsMap = new Map<string, HydratedAuthor>([
    [author.userId, { userId: author.userId, blogAuthor: author, role: "" }],
  ]);
  const authorCards = posts.map((p) => toCardVM(p, authorsMap, locale));

  // Para JSON-LD necesitamos URLs absolutas en image/sameAs.
  const authorForSchema = {
    ...author,
    avatarUrl: author.avatarUrl ? toCanonicalUrl(author.avatarUrl) : null,
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 md:py-16">
      <ProfilePageJsonLd author={authorForSchema} portfolioSlug={portfolioSlug} />

      <nav
        aria-label="Breadcrumbs"
        className="mb-6 text-[11px] uppercase tracking-[0.12em] text-bh-fg-3"
      >
        <Link href="/" className="hover:text-bh-fg-2">
          {t("author.breadcrumbHome")}
        </Link>
        <span aria-hidden className="mx-2">/</span>
        <Link href="/blog" className="hover:text-bh-fg-2">
          {t("author.breadcrumbBlog")}
        </Link>
        <span aria-hidden className="mx-2">/</span>
        <span className="text-bh-fg-2">{author.displayName}</span>
      </nav>

      <header className="mb-10 grid gap-6 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 md:grid-cols-[auto_1fr] md:p-8">
        {author.avatarUrl ? (
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/[0.08] md:h-32 md:w-32">
            <Image
              src={author.avatarUrl}
              alt={author.displayName}
              fill
              sizes="128px"
              unoptimized={!author.avatarUrl.includes(".supabase.co")}
              className="object-cover"
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="grid h-28 w-28 place-items-center rounded-full border border-white/[0.08] bg-bh-surface-2 text-3xl font-bold uppercase text-bh-fg-3 md:h-32 md:w-32"
          >
            {initialsOf(author.displayName)}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
              {t("author.badge")}
            </span>
            <h1 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
              {author.displayName}
            </h1>
            {author.headline && (
              <p className="text-sm font-medium uppercase tracking-[0.08em] text-bh-lime">
                {author.headline}
              </p>
            )}
          </div>
          {author.bio && (
            <p className="max-w-prose text-sm leading-[1.6] text-bh-fg-2 md:text-base">
              {author.bio}
            </p>
          )}
          {sameAs.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1">
              {sameAs.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="me noopener noreferrer"
                    className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 bg-bh-surface-2 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-bh-fg-2 transition-colors hover:border-bh-lime/40 hover:text-bh-fg-1"
                  >
                    {labelForUrl(url, t("author.linksSiteFallback"))}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <section aria-labelledby="author-posts-heading">
        <h2
          id="author-posts-heading"
          className="mb-6 font-bh-display text-xl font-bold uppercase tracking-tight text-bh-fg-1"
        >
          {posts.length > 0
            ? t("author.postsHeading", { firstName: author.displayName.split(" ")[0] })
            : t("author.postsHeadingEmpty")}
        </h2>

        {posts.length === 0 ? (
          <p className="rounded-bh-md border border-dashed border-bh-fg-4 bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
            {t("author.emptyBody")}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {authorCards.map((card) => (
              <BlogCard key={card.id} post={card} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function labelForUrl(url: string, siteFallback: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("twitter") || host.includes("x.com")) return "X / Twitter";
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("youtube") || host.includes("youtu.be")) return "YouTube";
    return host;
  } catch {
    return siteFallback;
  }
}
