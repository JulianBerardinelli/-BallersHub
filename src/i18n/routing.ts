import { defineRouting } from "next-intl/routing";

// i18n routing — single source of truth for locales + URL strategy.
//
// `es` is the DEFAULT locale and renders WITHOUT a path prefix
// (localePrefix: 'as-needed'). This is deliberate and load-bearing for
// SEO: every existing es-AR URL (/[slug], /agency/[slug], /blog/...)
// stays byte-identical → zero rupture of backlinks / GSC history / drift
// baselines. `en`, `it`, `pt` are served under /en, /it, /pt.
//
// See docs/i18n/HANDOFF.md §2 (routing) and §17 (hreflang codes).
export const routing = defineRouting({
  locales: ["es", "en", "it", "pt"],
  defaultLocale: "es",
  localePrefix: "as-needed",
  // OFF on purpose: a prefix-less URL (e.g. /<slug>, /blog) must always serve
  // the canonical es, NOT bounce to the NEXT_LOCALE cookie's locale. Without
  // this, removing the /pt prefix from /pt/<slug> bounced straight back to /pt
  // (cookie remembered pt). First-visit geo on the home is handled separately
  // in src/middleware.ts (by IP country), so we lose nothing here.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
