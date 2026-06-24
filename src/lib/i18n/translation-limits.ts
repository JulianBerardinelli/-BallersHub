// Single source of truth for the profile-translation tier cap (players,
// coaches, agencies) + the hardcoded "unlimited languages" allowlist.
//
// The cap used to live as a `const tierLimit = 4` inside each server action,
// checked ONLY at save time. That let a Pro who'd already published 3 languages
// open a 4th locale, fill it in / spend AI credits, and only get rejected on
// save (HANDOFF §6). Centralizing it here lets the editors read the SAME number
// to disable over-cap locales up front, and the AI-draft actions to refuse
// before calling the model (no wasted credits).
//
// Pure logic + env only — NO db imports — so it's safe to import from server
// actions and RSC pages alike. Editors receive the resolved limit as a number
// prop; they never import this module (keeps server-only code out of the client
// bundle).

// es base + up to 3 overrides = 4 published locales total (the default plan cap).
export const TRANSLATION_TIER_LIMIT = 4;

// Total supported content locales: es + en/it/pt/de/fr/fi. Mirror of
// CONTENT_LOCALES.length in profile-content.ts, kept as a literal so this module
// stays db-free. The unlimited allowlist gets this as its effective cap.
const TOTAL_CONTENT_LOCALES = 7;

// Owner + close team: translate their profile into EVERY language with no cap.
// Matched by profile slug OR account email (case-insensitive). Extendable
// without a deploy via TRANSLATION_UNLIMITED_SLUGS / _EMAILS (comma-separated).
const UNLIMITED_SLUGS = new Set([
  "julian-berardinelli",
  "federico-sarra",
  "felipe-sarra",
]);
const UNLIMITED_EMAILS = new Set([
  "julian.berardinelli@gmail.com",
  "fede.sarra7@gmail.com",
  "sarrafelipemartin@gmail.com",
]);

function parseEnvSet(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}
const ENV_SLUGS = parseEnvSet(process.env.TRANSLATION_UNLIMITED_SLUGS);
const ENV_EMAILS = parseEnvSet(process.env.TRANSLATION_UNLIMITED_EMAILS);

export type ProfileIdentity = { slug?: string | null; email?: string | null };

/** True when this profile/account may publish translations in every language. */
export function hasUnlimitedTranslations({ slug, email }: ProfileIdentity): boolean {
  const s = slug?.trim().toLowerCase();
  const e = email?.trim().toLowerCase();
  if (s && (UNLIMITED_SLUGS.has(s) || ENV_SLUGS.has(s))) return true;
  if (e && (UNLIMITED_EMAILS.has(e) || ENV_EMAILS.has(e))) return true;
  return false;
}

/**
 * Max number of PUBLISHED locales (es INCLUDED) a profile may have. Default
 * plan = 4 (es + 3); the unlimited allowlist gets all supported locales.
 */
export function translationLocaleLimit(identity: ProfileIdentity): number {
  return hasUnlimitedTranslations(identity)
    ? TOTAL_CONTENT_LOCALES
    : TRANSLATION_TIER_LIMIT;
}
