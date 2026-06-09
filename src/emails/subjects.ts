// Localized inbox subjects for the welcome flow (F6).
//
// The BODY of each welcome template is localized via its own COPY map; the
// SUBJECT lives here because the SEND paths own it (the drip dispatcher reads
// `default_subject` from the DB; the transactional helpers hard-code it), not
// the template component.
//
// Only en/it/pt are defined on purpose: for es, `localizedSubject` returns the
// caller's existing subject unchanged (the drip's DB `default_subject` or the
// transactional fallback), so es behavior stays byte-identical.

import type { Locale } from "@/i18n/routing";
import type { TemplateKey } from "./templates/_registry";

const SUBJECTS: Partial<Record<TemplateKey, Partial<Record<Locale, string>>>> = {
  welcome_player: {
    en: "Welcome to 'BallersHub",
    it: "Benvenuto su 'BallersHub",
    pt: "Bem-vindo à 'BallersHub",
  },
  welcome_agency: {
    en: "Welcome to 'BallersHub — Agency",
    it: "Benvenuto su 'BallersHub — Agenzia",
    pt: "Bem-vindo à 'BallersHub — Agência",
  },
};

/**
 * Localized subject for a template + locale, or `fallback` when there is no
 * localized entry. es always returns `fallback` so existing subjects (the
 * drip's `default_subject`, the helper's hard-coded one) never change.
 */
export function localizedSubject(
  key: TemplateKey,
  locale: Locale,
  fallback: string,
): string {
  if (locale === "es") return fallback;
  return SUBJECTS[key]?.[locale] ?? fallback;
}
