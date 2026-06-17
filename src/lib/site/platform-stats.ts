/**
 * Canonical platform stat values shown across public marketing surfaces:
 * the site + portfolio footers (SiteFooter / PortfolioFooter / FooterMarkup)
 * and the free-portfolio promo banner (PromoBanner).
 *
 * These are lightly projected (~2 weeks ahead) marketing figures, not live
 * counts. Real production baseline (2026-06-17): 24 validated profiles,
 * 125 clubs, 15 countries, 0 reviews. Update the numbers here when refreshing
 * the public-facing stats.
 *
 * NOTE: the home hero (HeroJourney) reads the same values — plus the hero
 * "jugadores registrados" counter ("+50") and the footer eyebrow/subheadline
 * — from the next-intl message files (`src/i18n/messages/<locale>/home.json`
 * and `footer.json`). JSON messages can't import TS, so those literals are
 * mirrored there and must be kept in sync when these change.
 */
export const PLATFORM_STATS = {
  /** "Perfiles validados" */
  profiles: "+30",
  /** "Clubes activos" */
  clubs: "+130",
  /** "Referencias" / "Reseñas verificadas" (score out of 5) */
  reviews: "4.8/5",
  /** "Países" */
  countries: "15",
} as const;
