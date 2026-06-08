// src/lib/seo/hreflang.ts
// Builds Next.js `Metadata.alternates` (self-referential canonical +
// hreflang `languages`) for a route that exists in ALL locales — i.e.
// the marketing/static pages (/, /about, /pricing, /blog) whose content
// is fully translated via JSON dictionaries.
//
// Rules encoded here (see docs/i18n/HANDOFF.md §17):
//   • canonical is self-referential (es → /path, en → /en/path, ...).
//   • languages includes every locale + x-default (→ es, prefix-less).
//   • hreflang codes come from HREFLANG_CODE (es, en, it, pt-BR).
//
// NOT for per-player/agency pages: those emit CONDITIONAL hreflang based
// on which translations actually exist in player_profile_translations
// (Phase 5). Emitting a hreflang to a locale with no real translation
// degrades the whole cluster.

import { getSiteBaseUrl } from "./baseUrl";
import { routing, type Locale } from "@/i18n/routing";
import { HREFLANG_CODE } from "@/i18n/config";

export function localizedAlternates(locale: Locale, pathname: string) {
  const base = getSiteBaseUrl();
  // Normalize: "/" → "" so we don't produce "/en/" with a trailing slash.
  const clean = pathname === "/" ? "" : pathname;
  const urlFor = (l: Locale) =>
    l === routing.defaultLocale ? `${base}${clean || "/"}` : `${base}/${l}${clean}`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[HREFLANG_CODE[l]] = urlFor(l);
  }
  // x-default points to the prefix-less default (es).
  languages["x-default"] = urlFor(routing.defaultLocale);

  return {
    canonical: urlFor(locale),
    languages,
  };
}

/**
 * Same locale→URL map but shaped for MetadataRoute.Sitemap entries
 * (`alternates.languages`). Use ONLY for fully-translated routes.
 */
export function sitemapLanguages(pathname: string): Record<string, string> {
  const base = getSiteBaseUrl();
  const clean = pathname === "/" ? "" : pathname;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[HREFLANG_CODE[l]] =
      l === routing.defaultLocale ? `${base}${clean || "/"}` : `${base}/${l}${clean}`;
  }
  return languages;
}
