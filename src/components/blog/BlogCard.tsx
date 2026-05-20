// Card used in the public /blog listing.
// Server component — no client interactivity needed.

import Link from "next/link";
import { CLUSTER_LABELS } from "@/lib/blog/labels";
import type { ListedBlogPost } from "@/lib/blog/posts";

export function BlogCard({ post }: { post: ListedBlogPost }) {
  const cluster = CLUSTER_LABELS[post.cluster];
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 transition-colors hover:border-bh-lime/30"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-bh-surface-2">
        {post.heroImageUrl ? (
          // Plain <img> for the same reason as /blog/[slug]/page.tsx —
          // arbitrary external hosts. Will switch back to next/image
          // when MVP-2 ships Supabase Storage upload for blog images.
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={post.heroImageUrl}
            alt={post.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-bh-fg-3 text-xs">
            Sin imagen
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="inline-flex w-fit items-center rounded-bh-pill border border-bh-lime/30 bg-bh-lime/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-bh-lime">
          {cluster}
        </span>
        <h3 className="font-bh-display text-lg font-bold uppercase leading-tight tracking-tight text-bh-fg-1 line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm leading-[1.55] text-bh-fg-3 line-clamp-3">
          {post.description}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] uppercase tracking-[0.1em] text-bh-fg-3">
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
      </div>
    </Link>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}
