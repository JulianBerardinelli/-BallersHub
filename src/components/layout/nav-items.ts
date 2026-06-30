// Single source of truth for the corporate / marketing-site navigation.
//
// Consumed by the desktop header (`HeaderChrome`) and the mobile hamburger
// drawer (`mobile-nav/SiteMobileNav`). Keeping it here means the two never
// drift: add or reorder an item once and both surfaces update.
//
// Hrefs are locale-agnostic — the `Link` from `@/i18n/navigation` injects the
// active locale prefix (none for the `es` default). Labels resolve from
// `messages/<locale>/common.json` under `nav.<key>` (e.g. `nav.plans`).

export type SiteNavItem = {
  /** Locale-agnostic path, e.g. "/players". */
  href: string;
  /** Key under the `common.nav` i18n namespace, e.g. "players", "plans". */
  key: string;
};

export const SITE_NAV: SiteNavItem[] = [
  { href: "/players", key: "players" },
  // "Cuerpo Técnico" (/staff) oculto del header por ahora — la vertical staff
  // todavía no se abre al público en el nav. La página /staff, su sitemap y el
  // JSON-LD siguen vivos (accesible por URL directa). Reactivar este item
  // cuando se lance públicamente. El label vive en common.nav.staff (7 locales).
  // { href: "/staff", key: "staff" },
  { href: "/agencies", key: "agencies" },
  { href: "/pricing", key: "plans" },
  { href: "/como-validamos", key: "howWeValidate" },
  { href: "/blog", key: "blog" },
  { href: "/about", key: "about" },
];
