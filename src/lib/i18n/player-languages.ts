// Deterministic mapping of player-entered language names (free-text in
// player_personal_details.languages) to localized labels per active URL locale.
//
// Why this exists: a Pro player types their spoken languages in es ("Español,
// Inglés, Portugués"). On /en/<slug> we don't want to render those raw; we want
// "Spanish, English, Portuguese". The list is bounded (~30 common languages in
// football) and pure mapping — no LLM, no migration, no new column.
//
// Strategy: normalize the input (lowercase + strip accents) and match against a
// canonical key. If a language has no mapping (something exotic the player
// entered) we pass the original string through unchanged.

import type { Locale } from "@/i18n/routing";

// canonical key (no accents, lowercase) → label per locale
type LangRow = Record<Locale, string>;

const TABLE: Record<string, LangRow> = {
  espanol:     { es: "Español",    en: "Spanish",     it: "Spagnolo",     pt: "Espanhol" },
  castellano:  { es: "Español",    en: "Spanish",     it: "Spagnolo",     pt: "Espanhol" },
  ingles:      { es: "Inglés",     en: "English",     it: "Inglese",      pt: "Inglês" },
  italiano:    { es: "Italiano",   en: "Italian",     it: "Italiano",     pt: "Italiano" },
  portugues:   { es: "Portugués",  en: "Portuguese",  it: "Portoghese",   pt: "Português" },
  brasileno:   { es: "Portugués (Brasil)", en: "Portuguese (Brazil)", it: "Portoghese (Brasile)", pt: "Português (Brasil)" },
  frances:     { es: "Francés",    en: "French",      it: "Francese",     pt: "Francês" },
  aleman:      { es: "Alemán",     en: "German",      it: "Tedesco",      pt: "Alemão" },
  catalan:     { es: "Catalán",    en: "Catalan",     it: "Catalano",     pt: "Catalão" },
  euskera:     { es: "Euskera",    en: "Basque",      it: "Basco",        pt: "Basco" },
  vasco:       { es: "Euskera",    en: "Basque",      it: "Basco",        pt: "Basco" },
  gallego:     { es: "Gallego",    en: "Galician",    it: "Galiziano",    pt: "Galego" },
  neerlandes:  { es: "Neerlandés", en: "Dutch",       it: "Olandese",     pt: "Holandês" },
  holandes:    { es: "Neerlandés", en: "Dutch",       it: "Olandese",     pt: "Holandês" },
  arabe:       { es: "Árabe",      en: "Arabic",      it: "Arabo",        pt: "Árabe" },
  ruso:        { es: "Ruso",       en: "Russian",     it: "Russo",        pt: "Russo" },
  ucraniano:   { es: "Ucraniano",  en: "Ukrainian",   it: "Ucraino",      pt: "Ucraniano" },
  polaco:      { es: "Polaco",     en: "Polish",      it: "Polacco",      pt: "Polonês" },
  griego:      { es: "Griego",     en: "Greek",       it: "Greco",        pt: "Grego" },
  turco:       { es: "Turco",      en: "Turkish",     it: "Turco",        pt: "Turco" },
  chino:       { es: "Chino",      en: "Chinese",     it: "Cinese",       pt: "Chinês" },
  mandarin:    { es: "Mandarín",   en: "Mandarin",    it: "Mandarino",    pt: "Mandarim" },
  japones:     { es: "Japonés",    en: "Japanese",    it: "Giapponese",   pt: "Japonês" },
  coreano:     { es: "Coreano",    en: "Korean",      it: "Coreano",      pt: "Coreano" },
  hindi:       { es: "Hindi",      en: "Hindi",       it: "Hindi",        pt: "Hindi" },
  hebreo:      { es: "Hebreo",     en: "Hebrew",      it: "Ebraico",      pt: "Hebraico" },
  sueco:       { es: "Sueco",      en: "Swedish",     it: "Svedese",      pt: "Sueco" },
  noruego:     { es: "Noruego",    en: "Norwegian",   it: "Norvegese",    pt: "Norueguês" },
  danes:       { es: "Danés",      en: "Danish",      it: "Danese",       pt: "Dinamarquês" },
  finlandes:   { es: "Finlandés",  en: "Finnish",     it: "Finlandese",   pt: "Finlandês" },
  rumano:      { es: "Rumano",     en: "Romanian",    it: "Rumeno",       pt: "Romeno" },
  hungaro:     { es: "Húngaro",    en: "Hungarian",   it: "Ungherese",    pt: "Húngaro" },
  checo:       { es: "Checo",      en: "Czech",       it: "Ceco",         pt: "Tcheco" },
  croata:      { es: "Croata",     en: "Croatian",    it: "Croato",       pt: "Croata" },
  serbio:      { es: "Serbio",     en: "Serbian",     it: "Serbo",        pt: "Sérvio" },
  // English-input rows (a player editing in en may type these directly):
  spanish:     { es: "Español",    en: "Spanish",     it: "Spagnolo",     pt: "Espanhol" },
  english:     { es: "Inglés",     en: "English",     it: "Inglese",      pt: "Inglês" },
  italian:     { es: "Italiano",   en: "Italian",     it: "Italiano",     pt: "Italiano" },
  portuguese:  { es: "Portugués",  en: "Portuguese",  it: "Portoghese",   pt: "Português" },
  french:      { es: "Francés",    en: "French",      it: "Francese",     pt: "Francês" },
  german:      { es: "Alemán",     en: "German",      it: "Tedesco",      pt: "Alemão" },
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    // strip combining diacriticals (accents) — eslint disable for clarity
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Localize one language string. Unknown languages pass through unchanged so
 * exotic / proper-noun entries the player typed are preserved exactly.
 */
export function localizeLanguage(raw: string, locale: Locale): string {
  const key = normalize(raw);
  const row = TABLE[key];
  return row?.[locale] ?? raw;
}

/**
 * Localize an array of language strings. Skips empties and pass-throughs
 * unknowns. Returns a NEW array, doesn't mutate.
 */
export function localizeLanguages(
  list: string[] | null | undefined,
  locale: Locale,
): string[] {
  if (!list) return [];
  return list
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0)
    .map((s) => localizeLanguage(s, locale));
}
