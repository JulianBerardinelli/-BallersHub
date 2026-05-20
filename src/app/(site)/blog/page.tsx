// Public /blog listing.
//
// Lists every post with status='published', ordered by published_at DESC.
// MVP-1: simple grid, no pagination (we cap at 20 posts; reasonable for
// early stage). Pagination + filters by cluster land in MVP-3.

import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedPosts } from "@/lib/blog/posts";
import { getBlogActor } from "@/lib/blog/permissions";
import { BlogCard } from "@/components/blog/BlogCard";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Artículos sobre carrera del jugador, operaciones de agencia y el mercado del fútbol argentino. Escrito por jugadores, scouts y periodistas de la red de 'BallersHub.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog · 'BallersHub",
    description:
      "Carrera del jugador, operaciones de agencia, industria AR. Análisis con datos y links a portfolios reales.",
    url: "/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog · 'BallersHub",
    description:
      "Carrera del jugador, operaciones de agencia, industria AR. Por la red de 'BallersHub.",
  },
};

export default async function BlogIndexPage() {
  const [posts, actor] = await Promise.all([listPublishedPosts(20), getBlogActor()]);
  const isContributor = actor?.isBlogger || actor?.isAdmin;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
            Editorial
          </span>
          <h1 className="font-bh-display text-4xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-5xl">
            Blog de &apos;BallersHub
          </h1>
          <p className="max-w-2xl text-sm leading-[1.6] text-bh-fg-3 md:text-base">
            Carrera del jugador, operaciones de agencia, mercado AR. Escrito por
            jugadores, scouts y periodistas que viven el fútbol desde adentro.
          </p>
        </div>
        {isContributor && (
          <div className="flex gap-2">
            <Link
              href="/blog/drafts"
              className="rounded-bh-md border border-bh-fg-4 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-bh-fg-2 transition-colors hover:border-bh-fg-3 hover:text-bh-fg-1"
            >
              Mis borradores
            </Link>
            <Link
              href="/blog/write"
              className="rounded-bh-md bg-bh-lime px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-bh-black transition-opacity hover:opacity-90"
            >
              Escribir artículo
            </Link>
          </div>
        )}
      </header>

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-bh-lg border border-dashed border-bh-fg-4 bg-bh-surface-1 p-10 text-center">
      <p className="font-bh-display text-2xl font-bold uppercase tracking-tight text-bh-fg-2">
        Pronto vas a leer las primeras notas
      </p>
      <p className="mt-2 text-sm text-bh-fg-3">
        Estamos curando contenido editorial. Volvé en unos días.
      </p>
    </div>
  );
}
