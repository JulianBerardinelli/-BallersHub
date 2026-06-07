import type { Locale } from "./routing";

// SEO locale metadata — single source of truth for docs/i18n/HANDOFF.md §17.
//
// hreflang uses GENERIC codes to maximise market capture, EXCEPT pt-BR
// (explicit region: Brazil is the target market and it avoids pt-PT
// ambiguity). <html lang> may be more specific than hreflang because it
// describes the actual content, not the targeting.

// hreflang code emitted in <link rel="alternate"> + sitemap alternates.
export const HREFLANG_CODE: Record<Locale, string> = {
  es: "es",
  en: "en",
  it: "it",
  pt: "pt-BR",
};

// <html lang> attribute per locale (describes the real content variant).
export const HTML_LANG: Record<Locale, string> = {
  es: "es-AR",
  en: "en",
  it: "it-IT",
  pt: "pt-BR",
};

// Open Graph og:locale per locale.
export const OG_LOCALE: Record<Locale, string> = {
  es: "es_AR",
  en: "en_US",
  it: "it_IT",
  pt: "pt_BR",
};

// Human-readable language names for the <LocaleSwitcher /> UI (each shown
// in its own language, the accessibility convention for language pickers).
export const LOCALE_LABEL: Record<Locale, string> = {
  es: "Español",
  en: "English",
  it: "Italiano",
  pt: "Português",
};
