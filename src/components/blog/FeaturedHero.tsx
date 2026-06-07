// Featured post — banner layout (the variant the owner locked in via the
// design tweaks). Full-bleed art with a diagonal scrim and the headline on
// the left. Used at the top of /blog for the most recent post.

import Link from "next/link";
import { CLUSTER_LABELS } from "@/lib/blog/labels";
import { accentForCluster, toneForCluster } from "@/lib/blog/clusterAccent";
import type { BlogCardVM } from "@/lib/blog/view";
import { CoverArt } from "./CoverArt";
import { BlogBadge, AuthorChip } from "./primitives";

export function FeaturedHero({ post }: { post: BlogCardVM }) {
  const tone = toneForCluster(post.cluster);
  const accent = accentForCluster(post.cluster);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="bh-featured group relative block min-h-[420px] overflow-hidden rounded-bh-xl border md:min-h-[470px]"
      style={{ ["--bh-card-border" as string]: accent.border }}
    >
      <div className="bh-cover-zoom absolute inset-0">
        <CoverArt
          slug={post.slug}
          cluster={post.cluster}
          heroImageUrl={post.heroImageUrl}
          alt={post.title}
          sizes="(min-width: 1320px) 1320px, 100vw"
          priority
        />
      </div>
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(105deg, rgba(8,8,8,0.95) 32%, rgba(8,8,8,0.5) 62%, transparent 95%)" }}
      />
      <div className="relative flex min-h-[420px] max-w-[640px] flex-col justify-center p-7 md:min-h-[470px] md:p-[50px]">
        <div className="mb-5 flex flex-wrap gap-2.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-bh-pill px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-bh-black"
            style={{ background: accent.color }}
          >
            ★ Destacado
          </span>
          <BlogBadge tone={tone}>{CLUSTER_LABELS[post.cluster]}</BlogBadge>
        </div>
        <h2 className="mb-4 font-bh-display text-[clamp(34px,4vw,54px)] font-extrabold uppercase leading-[0.95] tracking-[-0.015em] text-bh-fg-1">
          {post.title}
        </h2>
        <p className="mb-7 max-w-[530px] font-bh-body text-base leading-[1.6] text-bh-fg-2">
          {post.description}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <AuthorChip author={post.author} />
          <span className="font-bh-mono text-xs" style={{ color: accent.color }}>
            {post.dateLabel ? `${post.dateLabel} · ` : ""}
            {post.readingTimeMin} min lectura
          </span>
        </div>
      </div>
    </Link>
  );
}
