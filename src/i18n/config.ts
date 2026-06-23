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
  de: "de",
  fr: "fr",
  fi: "fi",
};

// <html lang> attribute per locale (describes the real content variant).
export const HTML_LANG: Record<Locale, string> = {
  es: "es-AR",
  en: "en",
  it: "it-IT",
  pt: "pt-BR",
  de: "de-DE",
  fr: "fr-FR",
  fi: "fi-FI",
};

// Open Graph og:locale per locale.
export const OG_LOCALE: Record<Locale, string> = {
  es: "es_AR",
  en: "en_US",
  it: "it_IT",
  pt: "pt_BR",
  de: "de_DE",
  fr: "fr_FR",
  fi: "fi_FI",
};

// Human-readable language names for the <LocaleSwitcher /> UI (each shown
// in its own language, the accessibility convention for language pickers).
export const LOCALE_LABEL: Record<Locale, string> = {
  es: "Español",
  en: "English",
  it: "Italiano",
  pt: "Português",
  de: "Deutsch",
  fr: "Français",
  fi: "Suomi",
};

// flag-icons country code per locale, shown as an icon in the language
// pickers. These are the FLAG choices (ISO-3166 country), independent of
// the language code: es→Argentina (the es content is es-AR and the brand is
// Argentine), en→United Kingdom, it→Italy, pt→Brazil (the pt content is
// pt-BR). Consumed via <LocaleFlag /> (`fi fi-<code>` from flag-icons).
export const LOCALE_FLAG: Record<Locale, string> = {
  es: "ar",
  en: "gb",
  it: "it",
  pt: "br",
  de: "de",
  fr: "fr",
  fi: "fi",
};
