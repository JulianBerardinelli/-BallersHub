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
});

export type Locale = (typeof routing.locales)[number];
