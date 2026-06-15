// View-model builders for the public blog surfaces.
//
// The index list is rendered by a client component (live category filter +
// search), so the server pre-computes plain, serializable view-models:
// author display data resolved, dates pre-formatted, no Date objects or DB
// rows crossing the server→client boundary.

import type { BlogCluster } from "@/db/schema";
import type { ListedBlogPost } from "./posts";
import type { HydratedAuthor } from "./authors";
import { fallbackDisplayName } from "./authors";
import { dateLocaleTag } from "@/lib/i18n/dates";
import type { Locale } from "@/i18n/routing";

export type AuthorVM = {
  name: string;
  initials: string;
  /** Avatar gradient seed color. */
  color: string;
  /** Author hub slug, or null when the author has no blog_authors row. */
  slug: string | null;
  /** Editorial headline (e.g. "Periodista deportivo") for the byline sub-line. */
  headline: string | null;
};

export type BlogCardVM = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cluster: BlogCluster;
  heroImageUrl: string | null;
  readingTimeMin: number;
  /** ISO string for <time dateTime>. */
  publishedISO: string | null;
  /** Pre-formatted "12 may 2026" label. */
  dateLabel: string | null;
  author: AuthorVM;
};

const AVATAR_PALETTE = ["#CCFF00", "#00C2FF", "#22C55E", "#F59E0B", "#7FDDFF"];

/** Deterministic avatar color from a stable id (so it never flips between renders). */
function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

/** Up to two uppercase initials from a display name. */
export function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L} ]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]).join("");
  return (letters || "BH").toUpperCase();
}

// Per-locale formatter cache. Keeps "12 may 2026" / "May 12, 2026" /
// "12 mag 2026" / "12 de mai 2026" coherent with the page language.
const DATE_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();
function dateFormatterFor(locale?: string): Intl.DateTimeFormat {
  // Fallback to es-AR (the app's canonical Spanish) if no locale supplied —
  // matches the historical hardcoded format from pre-i18n callers.
  const tag = locale ? dateLocaleTag(locale as Locale) : "es-AR";
  let fmt = DATE_FMT_CACHE.get(tag);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(tag, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    DATE_FMT_CACHE.set(tag, fmt);
  }
  return fmt;
}

export function formatBlogDate(d: Date, locale?: string): string {
  // Intl returns "12 may 2026" / "12 may. 2026" depending on ICU; strip the
  // trailing dot on the month abbreviation for a cleaner editorial look.
  return dateFormatterFor(locale).format(d).replace(/\./g, "");
}

/** Resolve a hydrated author (real blog_authors row or fallback) into a VM. */
export function buildAuthorVM(
  userId: string,
  hydrated: HydratedAuthor | undefined,
): AuthorVM {
  const blogAuthor = hydrated?.blogAuthor ?? null;
  const role = hydrated?.role ?? null;
  const name = blogAuthor?.displayName ?? fallbackDisplayName(role ?? undefined);
  return {
    name,
    initials: initialsOf(name),
    color: colorForId(userId),
    slug: blogAuthor?.slug ?? null,
    headline: blogAuthor?.headline ?? null,
  };
}

/** Build a serializable card view-model from a listed post + author map. */
export function toCardVM(
  post: ListedBlogPost,
  authors: Map<string, HydratedAuthor>,
  locale?: string,
): BlogCardVM {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description,
    cluster: post.cluster,
    heroImageUrl: post.heroImageUrl,
    readingTimeMin: post.readingTimeMin,
    publishedISO: post.publishedAt ? post.publishedAt.toISOString() : null,
    dateLabel: post.publishedAt ? formatBlogDate(post.publishedAt, locale) : null,
    author: buildAuthorVM(post.authorUserId, authors.get(post.authorUserId)),
  };
}
