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
    de: "Willkommen bei 'BallersHub",
    fr: "Bienvenue sur 'BallersHub",
    fi: "Tervetuloa 'BallersHubiin",
  },
  welcome_agency: {
    en: "Welcome to 'BallersHub — Agency",
    it: "Benvenuto su 'BallersHub — Agenzia",
    pt: "Bem-vindo à 'BallersHub — Agência",
    de: "Willkommen bei 'BallersHub — Agentur",
    fr: "Bienvenue sur 'BallersHub — Agence",
    fi: "Tervetuloa 'BallersHubiin — Agentuuri",
  },
  profile_completion: {
    en: "You're one step from publishing your profile",
    it: "Sei a un passo dal pubblicare il tuo profilo",
    pt: "Você está a um passo de publicar seu perfil",
    de: "Sie sind nur einen Schritt von der Veröffentlichung Ihres Profils entfernt",
    fr: "Vous êtes à une étape de publier votre profil",
    fi: "Olet askeleen päässä profiilisi julkaisemisesta",
  },
  payment_failed: {
    en: "We couldn't charge your subscription",
    it: "Non siamo riusciti ad addebitare il tuo abbonamento",
    pt: "Não conseguimos cobrar sua assinatura",
    de: "Wir konnten Ihr Abonnement nicht abbuchen",
    fr: "Nous n'avons pas pu débiter votre abonnement",
    fi: "Emme voineet veloittaa tilaustasi",
  },
  blog_post_rejected_author: {
    en: "Editorial feedback on your article",
    it: "Feedback editoriale sul tuo articolo",
    pt: "Feedback editorial sobre seu artigo",
    de: "Redaktionelles Feedback zu deinem Artikel",
    fr: "Retour éditorial sur ton article",
    fi: "Toimituksellinen palaute artikkelistasi",
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
