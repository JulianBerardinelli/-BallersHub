// Article card for the public blog grid (overlay) and "related" rail
// (classic). Whole card is a Link; hover micro-interactions are pure CSS
// (.bh-blog-card in globals.css) so this stays a server-renderable
// presentational component.

import Link from "next/link";
import { useTranslations } from "next-intl";
import { accentForCluster, toneForCluster } from "@/lib/blog/clusterAccent";
import type { BlogCardVM } from "@/lib/blog/view";
import { CoverArt } from "./CoverArt";
import { BlogBadge, AuthorChip } from "./primitives";

export function BlogCard({
  post,
  variant = "overlay",
  priority = false,
}: {
  post: BlogCardVM;
  variant?: "overlay" | "classic";
  priority?: boolean;
}) {
  const t = useTranslations("blog");
  const tone = toneForCluster(post.cluster);
  const accent = accentForCluster(post.cluster);
  const href = `/blog/${post.slug}`;
  const sizes = "(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw";
  const clusterLabel = t(`clusters.${post.cluster}` as const);
  const readingChip = t("card.readingMin", { n: post.readingTimeMin });

  if (variant === "classic") {
    return (
      <Link
        href={href}
        className="bh-blog-card group flex h-full flex-col overflow-hidden rounded-bh-lg border bg-[rgba(20,20,20,0.55)] backdrop-blur-[6px]"
        style={{ ["--bh-card-border" as string]: accent.border }}
      >
        <div className="relative h-[186px] overflow-hidden">
          <div className="bh-cover-zoom absolute inset-0">
            <CoverArt slug={post.slug} cluster={post.cluster} heroImageUrl={post.heroImageUrl} alt={post.title} sizes={sizes} priority={priority} />
          </div>
          <div className="absolute left-3.5 top-3.5">
            <BlogBadge tone={tone}>{clusterLabel}</BlogBadge>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="mb-2.5 line-clamp-2 font-bh-display text-[20px] font-bold uppercase leading-[1.04] tracking-[-0.01em] text-bh-fg-1">
            {post.title}
          </h3>
          <p className="mb-4 line-clamp-3 flex-1 font-bh-body text-[13.5px] leading-[1.55] text-bh-fg-3">
            {post.description}
          </p>
          <div className="flex items-center justify-between border-t border-white/[0.07] pt-3.5">
            <AuthorChip author={post.author} size="sm" extra={post.dateLabel ?? undefined} />
            <span className="font-bh-mono text-[11px]" style={{ color: accent.color }}>
              {readingChip}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // overlay (default)
  return (
    <Link
      href={href}
      className="bh-blog-card group relative block min-h-[340px] overflow-hidden rounded-bh-lg border bg-[rgba(20,20,20,0.55)] backdrop-blur-[6px]"
      style={{ ["--bh-card-border" as string]: accent.border }}
    >
      <div className="bh-cover-zoom absolute inset-0">
        <CoverArt slug={post.slug} cluster={post.cluster} heroImageUrl={post.heroImageUrl} alt={post.title} sizes={sizes} priority={priority} />
      </div>
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(8,8,8,0.95) 5%, rgba(8,8,8,0.55) 42%, transparent 72%)" }}
      />
      <div className="absolute left-4 top-4">
        <BlogBadge tone={tone}>{clusterLabel}</BlogBadge>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="mb-2.5 font-bh-display text-[22px] font-bold uppercase leading-[1.02] tracking-[-0.01em] text-bh-fg-1">
          {post.title}
        </h3>
        <p className="mb-4 line-clamp-2 font-bh-body text-[13.5px] leading-[1.5] text-bh-fg-2">
          {post.description}
        </p>
        <div className="flex items-center justify-between">
          <AuthorChip author={post.author} size="sm" />
          <span className="font-bh-mono text-[11px]" style={{ color: accent.color }}>
            {readingChip}
          </span>
        </div>
      </div>
    </Link>
  );
}
