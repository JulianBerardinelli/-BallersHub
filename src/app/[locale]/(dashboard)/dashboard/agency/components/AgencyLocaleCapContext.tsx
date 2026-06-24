"use client";

// Shared language-cap state for the FOUR agency translation sections
// (description/tagline · services · media · country). The cap is driven by the
// rows in agency_profile_translations — exactly what the server counts — and a
// language is "published" once it has such a row.
//
// Why a context: the sections are independent components, but they share ONE
// cap. Without shared state, removing a language in the main section frees a
// slot on the server while the secondary sections keep deriving `capReached`
// from their initial snapshot — the freed slot stays locked until a reload
// (Codex P2). Here the writer sections (main + services, the ones that create/
// drop agency_profile_translations rows) update the set; every section reads it,
// so the live swap works across all four.

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AgencyTargetLocale = "en" | "it" | "pt" | "de" | "fr" | "fi";

const LOCALE_ORDER: AgencyTargetLocale[] = ["en", "it", "pt", "de", "fr", "fi"];

type CapValue = {
  /** Non-es locales currently published in agency_profile_translations. */
  publishedSet: Set<AgencyTargetLocale>;
  /** Max non-es locales allowed (= localeLimit - 1). */
  maxNonEs: number;
  /** True once the published set fills the cap. */
  capReached: boolean;
  /** A not-yet-published locale that can't be opened because the cap is full. */
  isLocked: (code: AgencyTargetLocale) => boolean;
  /** First published locale (for landing a section on a non-locked tab). */
  firstPublished: AgencyTargetLocale | null;
  /** A row now exists for this locale (description/tagline OR services save). */
  markPublished: (code: AgencyTargetLocale) => void;
  /** The row was fully deleted (only the main description/tagline delete does
   *  this — services delete only nulls its column, the row survives). */
  markUnpublished: (code: AgencyTargetLocale) => void;
};

const Ctx = createContext<CapValue | null>(null);

export function AgencyLocaleCapProvider({
  initialPublishedLocales,
  localeLimit,
  children,
}: {
  initialPublishedLocales: AgencyTargetLocale[];
  localeLimit: number;
  children: ReactNode;
}) {
  const [published, setPublished] = useState<Set<AgencyTargetLocale>>(
    () => new Set(initialPublishedLocales),
  );

  const value = useMemo<CapValue>(() => {
    const maxNonEs = Math.max(0, localeLimit - 1);
    const capReached = published.size >= maxNonEs;
    return {
      publishedSet: published,
      maxNonEs,
      capReached,
      isLocked: (code) => !published.has(code) && capReached,
      firstPublished: LOCALE_ORDER.find((l) => published.has(l)) ?? null,
      markPublished: (code) =>
        setPublished((prev) => (prev.has(code) ? prev : new Set(prev).add(code))),
      markUnpublished: (code) =>
        setPublished((prev) => {
          if (!prev.has(code)) return prev;
          const next = new Set(prev);
          next.delete(code);
          return next;
        }),
    };
  }, [published, localeLimit]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAgencyLocaleCap(): CapValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error(
      "useAgencyLocaleCap must be used within an AgencyLocaleCapProvider",
    );
  }
  return v;
}
