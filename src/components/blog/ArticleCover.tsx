// Cinematic article cover (the style the owner locked in). Full-bleed art
// behind a scrim with the eyebrow / title / excerpt / byline anchored at the
// bottom. Entrance is a pure-CSS animation (.bh-cine in globals.css) that
// ENDS visible — content is readable even if animation/JS never runs, which
// was the explicit requirement after the earlier scroll-reveal bug.

import Link from "next/link";
import type { BlogCluster } from "@/db/schema";
import type { AuthorVM } from "@/lib/blog/view";
import { CoverArt } from "./CoverArt";
import { AuthorChip } from "./primitives";

export function ArticleCover({
  slug,
  cluster,
  title,
  description,
  heroImageUrl,
  author,
  categoryLabel,
  breadcrumbLabel,
  dateLabel,
  publishedISO,
  readingTimeLabel,
  accent,
}: {
  slug: string;
  cluster: BlogCluster;
  title: string;
  description: string;
  heroImageUrl: string | null;
  author: AuthorVM;
  categoryLabel: string;
  /** Localized label for the /blog breadcrumb crumb. */
  breadcrumbLabel: string;
  dateLabel: string | null;
  publishedISO: string | null;
  /** Pre-formatted ICU plural ("X min de lectura"). */
  readingTimeLabel: string;
  accent: string;
}) {
  return (
    <header className="bh-cine relative flex min-h-[min(86vh,740px)] items-end overflow-hidden">
      <div className="bh-cine-art absolute inset-0">
        <CoverArt
          slug={slug}
          cluster={cluster}
          heroImageUrl={heroImageUrl}
          alt={title}
          sizes="100vw"
          priority
        />
      </div>
      <div className="bh-cine-veil absolute inset-0" />

      <div className="bh-cine-inner relative mx-auto w-full max-w-[980px] px-7 pb-14 pt-28 max-md:pb-11">
        <div className="mb-5 flex items-center gap-2 font-bh-mono text-xs uppercase tracking-[0.04em] text-bh-fg-2">
          <Link href="/blog" className="text-bh-fg-2 transition-colors hover:text-bh-fg-1">
            {breadcrumbLabel}
          </Link>
          <span className="opacity-50">/</span>
          <span style={{ color: accent }}>{categoryLabel}</span>
        </div>

        <h1 className="mb-5 font-bh-display text-[clamp(40px,6vw,88px)] font-extrabold uppercase leading-[0.95] tracking-[-0.015em] text-bh-fg-1">
          {title}
        </h1>

        <p className="bh-cine-excerpt mb-7 max-w-[640px] font-bh-body text-[18px] leading-[1.6] text-bh-fg-1/80 max-md:text-base">
          {description}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <AuthorChip author={author} size="lg" />
          <span className="hidden h-[30px] w-px bg-white/15 sm:block" />
          {dateLabel && (
            <time
              dateTime={publishedISO ?? undefined}
              className="font-bh-mono text-[12.5px] text-bh-fg-3"
            >
              {dateLabel}
            </time>
          )}
          <span className="font-bh-mono text-[12.5px]" style={{ color: accent }}>
            {readingTimeLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
