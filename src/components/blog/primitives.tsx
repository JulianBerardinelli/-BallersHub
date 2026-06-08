// Small presentational primitives shared across the blog surfaces.
// No client interactivity — safe to render from server or client trees.

import type { Tone } from "@/lib/blog/clusterAccent";
import { TONE_ACCENT } from "@/lib/blog/clusterAccent";
import type { AuthorVM } from "@/lib/blog/view";

export function BlogBadge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const a = TONE_ACCENT[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-bh-pill px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] ${className}`}
      style={{ background: a.soft, color: a.color, border: `1px solid ${a.border}` }}
    >
      {children}
    </span>
  );
}

const SIZE: Record<"sm" | "md" | "lg", { avatar: number; name: string; sub: string }> = {
  sm: { avatar: 26, name: "text-[13px]", sub: "text-[10.5px]" },
  md: { avatar: 32, name: "text-[13px]", sub: "text-[10.5px]" },
  lg: { avatar: 40, name: "text-[14.5px]", sub: "text-[11.5px]" },
};

export function AuthorChip({
  author,
  size = "md",
  extra,
}: {
  author: AuthorVM;
  size?: "sm" | "md" | "lg";
  /** Overrides the sub line (role) — e.g. a formatted date. */
  extra?: string;
}) {
  const s = SIZE[size];
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex shrink-0 items-center justify-center rounded-full font-bh-display font-bold text-bh-black"
        style={{
          width: s.avatar,
          height: s.avatar,
          fontSize: s.avatar * 0.42,
          background: `linear-gradient(140deg, ${author.color}, ${author.color}55)`,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {author.initials}
      </div>
      <div className="leading-[1.25]">
        <div className={`font-bh-body font-semibold text-bh-fg-1 ${s.name}`}>{author.name}</div>
        {(extra ?? author.headline) && (
          <div className={`font-bh-mono text-bh-fg-3 ${s.sub}`}>{extra ?? author.headline}</div>
        )}
      </div>
    </div>
  );
}
