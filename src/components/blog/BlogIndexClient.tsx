"use client";

// Interactive shell for /blog: sticky editorial category nav + live search,
// featured hero, the article grid with an inline house ad, and the closing
// conversion CTA. Posts arrive pre-built (serializable view-models) from the
// server page; all filtering happens client-side over the (capped) list.

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import type { BlogCluster } from "@/db/schema";
import { CLUSTER_LABELS } from "@/lib/blog/labels";
import type { BlogCardVM } from "@/lib/blog/view";
import { BlogCard } from "./BlogCard";
import { FeaturedHero } from "./FeaturedHero";
import { AdBanner } from "./AdBanner";

type CatSlug = "all" | BlogCluster;

const CATEGORIES: { slug: CatSlug; label: string }[] = [
  { slug: "all", label: "Todas" },
  ...(Object.entries(CLUSTER_LABELS) as [BlogCluster, string][]).map(([slug, label]) => ({
    slug,
    label,
  })),
];

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <path d="M21 21l-4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BlogIndexClient({ posts }: { posts: BlogCardVM[] }) {
  const [active, setActive] = useState<CatSlug>("all");
  const [query, setQuery] = useState("");

  const featured = posts[0];
  const rest = useMemo(() => posts.slice(1), [posts]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: posts.length };
    for (const [slug] of Object.entries(CLUSTER_LABELS)) {
      c[slug] = posts.filter((p) => p.cluster === slug).length;
    }
    return c;
  }, [posts]);

  const isDefaultView = active === "all" && !query.trim();
  const showFeatured = isDefaultView && Boolean(featured);

  const filtered = useMemo(() => {
    // The default view promotes the featured post to the hero, so the grid
    // lists `rest`. Under any filter/search we scan the FULL list so the
    // featured post stays findable and category counts stay consistent.
    let list = showFeatured ? rest : posts;
    if (active !== "all") list = list.filter((p) => p.cluster === active);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.title + " " + p.description).toLowerCase().includes(q));
    return list;
  }, [posts, rest, active, query, showFeatured]);

  const activeLabel = CATEGORIES.find((c) => c.slug === active)?.label;
  // In the default view, if the featured post is the only one there's no grid.
  const showGridSection = !isDefaultView || rest.length > 0;

  return (
    <div>
      {/* Sticky category nav + search */}
      <div className="sticky top-20 z-40 border-b border-white/[0.10] bg-bh-black/85 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-7 max-md:px-5 max-md:py-2.5">
          <div className="no-scrollbar flex items-stretch gap-1 overflow-x-auto max-md:order-2">
            {CATEGORIES.map((cat) => {
              const on = cat.slug === active;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setActive(cat.slug)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-[17px] font-bh-display text-[16px] font-semibold uppercase tracking-[0.035em] transition-colors max-md:py-3 ${
                    on
                      ? "border-bh-lime text-bh-lime"
                      : "border-transparent text-bh-fg-2 hover:text-bh-fg-1"
                  }`}
                >
                  {cat.label}
                  {counts[cat.slug] != null && (
                    <span className="font-bh-mono text-[10px] font-normal opacity-55">
                      {counts[cat.slug]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="relative w-[230px] shrink-0 max-md:order-1 max-md:w-full">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar notas…"
              aria-label="Buscar notas"
              className="w-full rounded-bh-pill border border-white/[0.12] bg-white/[0.04] py-2.5 pl-9 pr-3.5 font-bh-body text-[13.5px] text-bh-fg-1 outline-none transition-colors focus:border-white/25"
            />
          </div>
        </div>
      </div>

      {/* Featured */}
      {showFeatured && (
        <div className="mx-auto max-w-[1320px] px-7 pt-10 max-md:px-5">
          <div className="bh-animate-in">
            <FeaturedHero post={featured} />
          </div>
        </div>
      )}

      {showGridSection && (
        <>
          {/* Section heading */}
          <div className="mx-auto max-w-[1320px] px-7 pt-10 max-md:px-5">
            <div className="mb-6 flex items-center gap-3.5">
              <h2 className="m-0 font-bh-display text-[26px] font-bold uppercase tracking-[-0.01em] text-bh-fg-1">
                {isDefaultView
                  ? "Últimas notas"
                  : `${filtered.length} ${filtered.length === 1 ? "nota" : "notas"}`}
                {active !== "all" && <span className="text-bh-fg-3"> · {activeLabel}</span>}
              </h2>
              <span className="h-px flex-1 bg-white/10" />
            </div>
          </div>

          {/* Grid + inline ad */}
          <div className="mx-auto max-w-[1320px] px-7 pb-5 max-md:px-5">
            {filtered.length === 0 ? (
              <div className="py-20 text-center font-bh-body text-bh-fg-3">
                {query.trim()
                  ? `No encontramos artículos para “${query}”.`
                  : "Todavía no hay notas en esta categoría."}
              </div>
            ) : (
              <div key={`${active}|${query}`} className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((post, i) => (
                  <Fragment key={post.id}>
                    <div className={`bh-animate-in ${["", "bh-animate-d1", "bh-animate-d2", "bh-animate-d3"][i % 4]}`}>
                      <BlogCard post={post} />
                    </div>
                    {i === 2 && (
                      <div className="col-span-full">
                        <AdBanner variant="horizontal" label="Sponsor" />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Closing CTA (the design's newsletter block, repurposed as conversion) */}
      <div id="crear-perfil" className="mx-auto mt-14 max-w-[1320px] px-7 max-md:px-5">
        <div
          className="relative overflow-hidden rounded-bh-xl border border-bh-lime/20 p-9 md:p-[52px]"
          style={{
            background:
              "radial-gradient(120% 140% at 100% 0%, rgba(204,255,0,0.12) 0%, transparent 55%), radial-gradient(120% 140% at 0% 100%, rgba(0,194,255,0.08) 0%, transparent 55%), rgba(16,16,16,0.7)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-10">
            <div className="max-w-[560px]">
              <h3 className="mb-3 font-bh-display text-[clamp(28px,3vw,40px)] font-extrabold uppercase leading-[0.98] text-bh-fg-1">
                Dejá de esperar a que te descubran
              </h3>
              <p className="m-0 font-bh-body text-[15px] leading-[1.6] text-bh-fg-2">
                Construí tu portfolio profesional en minutos: métricas, highlights y
                referencias verificadas, listo para compartir con un solo enlace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center rounded-bh-md bg-bh-lime px-7 py-3.5 font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.28)] transition hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(204,255,0,0.28)]"
              >
                Crear mi perfil gratis
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-bh-md border border-white/[0.18] px-7 py-3.5 font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-fg-1 transition hover:bg-white/[0.07]"
              >
                Ver planes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
