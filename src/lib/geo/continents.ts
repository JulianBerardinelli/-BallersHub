// Mapeo país (ISO 3166-1 alpha-2) → continente.
// Pensado para agrupar divisiones/ligas por continente en el panel admin.
// Las decisiones transcontinentales siguen la convención más habitual en fútbol:
//   Rusia, Turquía y Chipre → Europa; Armenia, Azerbaiyán, Georgia, Kazajistán e
//   Israel → Asia (criterio geográfico). Norteamérica incluye Centroamérica y el Caribe.

export type ContinentKey =
  | "south-america"
  | "north-america"
  | "europe"
  | "africa"
  | "asia"
  | "oceania"
  | "other";

export const CONTINENT_LABELS: Record<ContinentKey, string> = {
  "south-america": "Sudamérica",
  "north-america": "Norteamérica",
  europe: "Europa",
  africa: "África",
  asia: "Asia",
  oceania: "Oceanía",
  other: "Otros",
};

// Orden de display (relevancia para el público del producto primero).
export const CONTINENT_ORDER: ContinentKey[] = [
  "south-america",
  "north-america",
  "europe",
  "africa",
  "asia",
  "oceania",
  "other",
];

const SOUTH_AMERICA = [
  "AR", "BO", "BR", "CL", "CO", "EC", "FK", "GF", "GY", "PY", "PE", "SR", "UY", "VE",
];

// Norteamérica incluye Centroamérica y el Caribe.
const NORTH_AMERICA = [
  "AI", "AG", "AW", "BS", "BB", "BZ", "BM", "BQ", "VG", "CA", "KY", "CR", "CU", "CW",
  "DM", "DO", "SV", "GL", "GD", "GP", "GT", "HT", "HN", "JM", "MQ", "MX", "MS", "NI",
  "PA", "PR", "BL", "KN", "LC", "MF", "PM", "VC", "SX", "TT", "TC", "US", "VI",
];

const EUROPE = [
  "AL", "AD", "AT", "AX", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE", "DK", "EE",
  "ES", "FI", "FO", "FR", "GB", "GG", "GI", "GR", "HR", "HU", "IE", "IM", "IS", "IT",
  "JE", "LI", "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT",
  "RO", "RS", "RU", "SE", "SI", "SK", "SM", "TR", "UA", "VA", "XK",
];

const AFRICA = [
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD", "CI",
  "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR",
  "LY", "MG", "MW", "ML", "MR", "MU", "YT", "MA", "MZ", "NA", "NE", "NG", "RE", "RW",
  "SH", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "EH",
  "ZM", "ZW",
];

const ASIA = [
  "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "GE", "HK", "IN", "ID", "IR",
  "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MO", "MY", "MV", "MN", "MM",
  "NP", "KP", "OM", "PK", "PS", "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ",
  "TH", "TL", "TM", "AE", "UZ", "VN", "YE",
];

const OCEANIA = [
  "AS", "AU", "CK", "FJ", "PF", "GU", "KI", "MH", "FM", "NR", "NC", "NZ", "NU", "NF",
  "MP", "PW", "PG", "PN", "WS", "SB", "TK", "TO", "TV", "VU", "WF",
];

export const COUNTRY_TO_CONTINENT: Record<string, ContinentKey> = (() => {
  const map: Record<string, ContinentKey> = {};
  const add = (codes: string[], key: ContinentKey) => {
    for (const code of codes) map[code] = key;
  };
  add(SOUTH_AMERICA, "south-america");
  add(NORTH_AMERICA, "north-america");
  add(EUROPE, "europe");
  add(AFRICA, "africa");
  add(ASIA, "asia");
  add(OCEANIA, "oceania");
  return map;
})();

/** Devuelve el continente de un código de país ISO-2. "other" si es desconocido/nulo. */
export function getContinent(code?: string | null): ContinentKey {
  if (!code) return "other";
  return COUNTRY_TO_CONTINENT[code.toUpperCase()] ?? "other";
}
