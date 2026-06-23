// Page-locale → BCP47 tag for `toLocaleDateString` on the public profile.
// es maps to es-AR (the app's canonical Spanish). Keeps profile dates in the
// page language instead of the hardcoded es-ES / es-AR they used to carry.

import type { Locale } from "@/i18n/routing";

const DATE_TAG: Record<Locale, string> = {
  es: "es-AR",
  en: "en-US",
  it: "it-IT",
  pt: "pt-BR",
  de: "de-DE",
  fr: "fr-FR",
  fi: "fi-FI",
};

export function dateLocaleTag(locale: Locale): string {
  return DATE_TAG[locale] ?? "es-AR";
}
