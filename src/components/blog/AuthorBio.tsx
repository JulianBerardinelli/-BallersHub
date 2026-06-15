// Author bio block at the end of an article. Links to the author hub when
// the author has a blog_authors row (E-E-A-T cross-reference).

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AuthorVM } from "@/lib/blog/view";

export function AuthorBio({
  author,
  bio,
  accent,
}: {
  author: AuthorVM;
  bio: string | null;
  accent: string;
}) {
  const t = useTranslations("blog");
  const nameEl = author.slug ? (
    <Link
      href={`/blog/authors/${author.slug}`}
      className="font-bh-display text-[22px] font-bold leading-none text-bh-fg-1 underline-offset-4 transition-colors hover:underline"
    >
      {author.name}
    </Link>
  ) : (
    <span className="font-bh-display text-[22px] font-bold leading-none text-bh-fg-1">
      {author.name}
    </span>
  );

  return (
    <div className="mb-10 flex items-start gap-[18px] rounded-bh-lg border border-white/[0.08] bg-white/[0.02] p-6">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-bh-display text-[22px] font-bold text-bh-black"
        style={{ background: `linear-gradient(140deg, ${author.color}, ${author.color}55)` }}
      >
        {author.initials}
      </div>
      <div>
        <div className="mb-1.5 font-bh-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: accent }}>
          {t("authorBio.writtenBy")}
        </div>
        {nameEl}
        {(author.headline || bio) && (
          <p className="mt-2 font-bh-body text-[13.5px] leading-[1.55] text-bh-fg-2">
            {bio ?? author.headline}
          </p>
        )}
      </div>
    </div>
  );
}
