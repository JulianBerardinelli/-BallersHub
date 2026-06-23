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
  espanol:     { es: "Español",    en: "Spanish",     it: "Spagnolo",     pt: "Espanhol",    de: "Spanisch",      fr: "Espagnol",     fi: "Espanja" },
  castellano:  { es: "Español",    en: "Spanish",     it: "Spagnolo",     pt: "Espanhol",    de: "Spanisch",      fr: "Espagnol",     fi: "Espanja" },
  ingles:      { es: "Inglés",     en: "English",     it: "Inglese",      pt: "Inglês",      de: "Englisch",      fr: "Anglais",      fi: "Englanti" },
  italiano:    { es: "Italiano",   en: "Italian",     it: "Italiano",     pt: "Italiano",    de: "Italienisch",   fr: "Italien",      fi: "Italia" },
  portugues:   { es: "Portugués",  en: "Portuguese",  it: "Portoghese",   pt: "Português",   de: "Portugiesisch", fr: "Portugais",    fi: "Portugali" },
  brasileno:   { es: "Portugués (Brasil)", en: "Portuguese (Brazil)", it: "Portoghese (Brasile)", pt: "Português (Brasil)", de: "Portugiesisch (Brasilien)", fr: "Portugais (Brésil)", fi: "Portugali (Brasilia)" },
  frances:     { es: "Francés",    en: "French",      it: "Francese",     pt: "Francês",     de: "Französisch",   fr: "Français",     fi: "Ranska" },
  aleman:      { es: "Alemán",     en: "German",      it: "Tedesco",      pt: "Alemão",      de: "Deutsch",       fr: "Allemand",     fi: "Saksa" },
  catalan:     { es: "Catalán",    en: "Catalan",     it: "Catalano",     pt: "Catalão",     de: "Katalanisch",   fr: "Catalan",      fi: "Katalaani" },
  euskera:     { es: "Euskera",    en: "Basque",      it: "Basco",        pt: "Basco",       de: "Baskisch",      fr: "Basque",       fi: "Baski" },
  vasco:       { es: "Euskera",    en: "Basque",      it: "Basco",        pt: "Basco",       de: "Baskisch",      fr: "Basque",       fi: "Baski" },
  gallego:     { es: "Gallego",    en: "Galician",    it: "Galiziano",    pt: "Galego",      de: "Galicisch",     fr: "Galicien",     fi: "Galicia" },
  neerlandes:  { es: "Neerlandés", en: "Dutch",       it: "Olandese",     pt: "Holandês",    de: "Niederländisch", fr: "Néerlandais", fi: "Hollanti" },
  holandes:    { es: "Neerlandés", en: "Dutch",       it: "Olandese",     pt: "Holandês",    de: "Niederländisch", fr: "Néerlandais", fi: "Hollanti" },
  arabe:       { es: "Árabe",      en: "Arabic",      it: "Arabo",        pt: "Árabe",       de: "Arabisch",      fr: "Arabe",        fi: "Arabia" },
  ruso:        { es: "Ruso",       en: "Russian",     it: "Russo",        pt: "Russo",       de: "Russisch",      fr: "Russe",        fi: "Venäjä" },
  ucraniano:   { es: "Ucraniano",  en: "Ukrainian",   it: "Ucraino",      pt: "Ucraniano",   de: "Ukrainisch",    fr: "Ukrainien",    fi: "Ukraina" },
  polaco:      { es: "Polaco",     en: "Polish",      it: "Polacco",      pt: "Polonês",     de: "Polnisch",      fr: "Polonais",     fi: "Puola" },
  griego:      { es: "Griego",     en: "Greek",       it: "Greco",        pt: "Grego",       de: "Griechisch",    fr: "Grec",         fi: "Kreikka" },
  turco:       { es: "Turco",      en: "Turkish",     it: "Turco",        pt: "Turco",       de: "Türkisch",      fr: "Turc",         fi: "Turkki" },
  chino:       { es: "Chino",      en: "Chinese",     it: "Cinese",       pt: "Chinês",      de: "Chinesisch",    fr: "Chinois",      fi: "Kiina" },
  mandarin:    { es: "Mandarín",   en: "Mandarin",    it: "Mandarino",    pt: "Mandarim",    de: "Mandarin",      fr: "Mandarin",     fi: "Mandariinikiina" },
  japones:     { es: "Japonés",    en: "Japanese",    it: "Giapponese",   pt: "Japonês",     de: "Japanisch",     fr: "Japonais",     fi: "Japani" },
  coreano:     { es: "Coreano",    en: "Korean",      it: "Coreano",      pt: "Coreano",     de: "Koreanisch",    fr: "Coréen",       fi: "Korea" },
  hindi:       { es: "Hindi",      en: "Hindi",       it: "Hindi",        pt: "Hindi",       de: "Hindi",         fr: "Hindi",        fi: "Hindi" },
  hebreo:      { es: "Hebreo",     en: "Hebrew",      it: "Ebraico",      pt: "Hebraico",    de: "Hebräisch",     fr: "Hébreu",       fi: "Heprea" },
  sueco:       { es: "Sueco",      en: "Swedish",     it: "Svedese",      pt: "Sueco",       de: "Schwedisch",    fr: "Suédois",      fi: "Ruotsi" },
  noruego:     { es: "Noruego",    en: "Norwegian",   it: "Norvegese",    pt: "Norueguês",   de: "Norwegisch",    fr: "Norvégien",    fi: "Norja" },
  danes:       { es: "Danés",      en: "Danish",      it: "Danese",       pt: "Dinamarquês", de: "Dänisch",       fr: "Danois",       fi: "Tanska" },
  finlandes:   { es: "Finlandés",  en: "Finnish",     it: "Finlandese",   pt: "Finlandês",   de: "Finnisch",      fr: "Finnois",      fi: "Suomi" },
  rumano:      { es: "Rumano",     en: "Romanian",    it: "Rumeno",       pt: "Romeno",      de: "Rumänisch",     fr: "Roumain",      fi: "Romania" },
  hungaro:     { es: "Húngaro",    en: "Hungarian",   it: "Ungherese",    pt: "Húngaro",     de: "Ungarisch",     fr: "Hongrois",     fi: "Unkari" },
  checo:       { es: "Checo",      en: "Czech",       it: "Ceco",         pt: "Tcheco",      de: "Tschechisch",   fr: "Tchèque",      fi: "Tšekki" },
  croata:      { es: "Croata",     en: "Croatian",    it: "Croato",       pt: "Croata",      de: "Kroatisch",     fr: "Croate",       fi: "Kroatia" },
  serbio:      { es: "Serbio",     en: "Serbian",     it: "Serbo",        pt: "Sérvio",      de: "Serbisch",      fr: "Serbe",        fi: "Serbia" },
  // English-input rows (a player editing in en may type these directly):
  spanish:     { es: "Español",    en: "Spanish",     it: "Spagnolo",     pt: "Espanhol",    de: "Spanisch",      fr: "Espagnol",     fi: "Espanja" },
  english:     { es: "Inglés",     en: "English",     it: "Inglese",      pt: "Inglês",      de: "Englisch",      fr: "Anglais",      fi: "Englanti" },
  italian:     { es: "Italiano",   en: "Italian",     it: "Italiano",     pt: "Italiano",    de: "Italienisch",   fr: "Italien",      fi: "Italia" },
  portuguese:  { es: "Portugués",  en: "Portuguese",  it: "Portoghese",   pt: "Português",   de: "Portugiesisch", fr: "Portugais",    fi: "Portugali" },
  french:      { es: "Francés",    en: "French",      it: "Francese",     pt: "Francês",     de: "Französisch",   fr: "Français",     fi: "Ranska" },
  german:      { es: "Alemán",     en: "German",      it: "Tedesco",      pt: "Alemão",      de: "Deutsch",       fr: "Allemand",     fi: "Saksa" },
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
