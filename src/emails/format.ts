// Locale-aware formatting helpers for emails (F6).

import type { Locale } from "@/i18n/routing";

const DATE_LOCALE: Record<Locale, string> = {
  es: "es-AR",
  en: "en-US",
  it: "it-IT",
  pt: "pt-BR",
};

/**
 * Long date (e.g. "12 de marzo de 2026" / "March 12, 2026") in the
 * recipient's locale. Falls back to the raw ISO string if parsing fails.
 */
export function formatEmailDate(iso: string, locale: Locale): string {
  try {
    return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
