// Approximate centroid (lat, lng) for ISO-3166 alpha-2 country codes.
// Used by the agency portfolio's <Globe3D /> to position country pins on a
// rotating sphere. Coordinates are intentionally lightweight — we don't ship a
// full geo dataset, just the markers our football-industry users actually pick.

export type CountryCoord = { lat: number; lng: number };

export const COUNTRY_COORDS: Record<string, CountryCoord> = {
  // South America
  AR: { lat: -38.4, lng: -63.6 },
  BO: { lat: -16.3, lng: -63.6 },
  BR: { lat: -14.2, lng: -51.9 },
  CL: { lat: -35.7, lng: -71.5 },
  CO: { lat: 4.6, lng: -74.1 },
  EC: { lat: -1.8, lng: -78.2 },
  GY: { lat: 4.9, lng: -58.9 },
  PY: { lat: -23.4, lng: -58.4 },
  PE: { lat: -9.2, lng: -75.0 },
  SR: { lat: 3.9, lng: -56.0 },
  UY: { lat: -32.5, lng: -55.8 },
  VE: { lat: 6.4, lng: -66.6 },

  // North & Central America
  CA: { lat: 56.1, lng: -106.3 },
  US: { lat: 37.1, lng: -95.7 },
  MX: { lat: 23.6, lng: -102.6 },
  GT: { lat: 15.8, lng: -90.2 },
  HN: { lat: 15.2, lng: -86.2 },
  SV: { lat: 13.8, lng: -88.9 },
  NI: { lat: 12.9, lng: -85.2 },
  CR: { lat: 9.7, lng: -83.8 },
  PA: { lat: 8.5, lng: -80.8 },
  CU: { lat: 21.5, lng: -77.8 },
  DO: { lat: 18.7, lng: -70.2 },
  HT: { lat: 18.9, lng: -72.3 },
  JM: { lat: 18.1, lng: -77.3 },
  PR: { lat: 18.2, lng: -66.6 },
  TT: { lat: 10.7, lng: -61.2 },

  // Europe
  AD: { lat: 42.5, lng: 1.5 },
  AT: { lat: 47.5, lng: 14.6 },
  BE: { lat: 50.5, lng: 4.5 },
  BG: { lat: 42.7, lng: 25.5 },
  BA: { lat: 43.9, lng: 17.7 },
  BY: { lat: 53.7, lng: 27.9 },
  CH: { lat: 46.8, lng: 8.2 },
  CY: { lat: 35.1, lng: 33.4 },
  CZ: { lat: 49.8, lng: 15.5 },
  DE: { lat: 51.2, lng: 10.5 },
  DK: { lat: 56.3, lng: 9.5 },
  EE: { lat: 58.6, lng: 25.0 },
  ES: { lat: 40.5, lng: -3.7 },
  FI: { lat: 61.9, lng: 25.7 },
  FR: { lat: 46.2, lng: 2.2 },
  GB: { lat: 55.4, lng: -3.4 },
  GR: { lat: 39.1, lng: 21.8 },
  HR: { lat: 45.1, lng: 15.2 },
  HU: { lat: 47.2, lng: 19.5 },
  IE: { lat: 53.4, lng: -8.2 },
  IS: { lat: 64.9, lng: -19.0 },
  IT: { lat: 41.9, lng: 12.6 },
  LT: { lat: 55.2, lng: 23.9 },
  LU: { lat: 49.8, lng: 6.1 },
  LV: { lat: 56.9, lng: 24.6 },
  MD: { lat: 47.4, lng: 28.4 },
  ME: { lat: 42.7, lng: 19.4 },
  MK: { lat: 41.6, lng: 21.7 },
  MT: { lat: 35.9, lng: 14.4 },
  NL: { lat: 52.1, lng: 5.3 },
  NO: { lat: 60.5, lng: 8.5 },
  PL: { lat: 51.9, lng: 19.1 },
  PT: { lat: 39.4, lng: -8.2 },
  RO: { lat: 45.9, lng: 24.9 },
  RS: { lat: 44.0, lng: 21.0 },
  RU: { lat: 61.5, lng: 105.3 },
  SE: { lat: 60.1, lng: 18.6 },
  SI: { lat: 46.1, lng: 14.9 },
  SK: { lat: 48.6, lng: 19.6 },
  TR: { lat: 38.9, lng: 35.2 },
  UA: { lat: 48.3, lng: 31.1 },

  // Africa
  AO: { lat: -11.2, lng: 17.8 },
  CI: { lat: 7.5, lng: -5.5 },
  CM: { lat: 7.3, lng: 12.3 },
  CD: { lat: -4.0, lng: 21.7 },
  CG: { lat: -0.2, lng: 15.8 },
  DZ: { lat: 28.0, lng: 1.6 },
  EG: { lat: 26.8, lng: 30.8 },
  ET: { lat: 9.1, lng: 40.4 },
  GH: { lat: 7.9, lng: -1.0 },
  GN: { lat: 9.9, lng: -9.7 },
  KE: { lat: -0.0, lng: 37.9 },
  LY: { lat: 26.3, lng: 17.2 },
  MA: { lat: 31.7, lng: -7.0 },
  ML: { lat: 17.5, lng: -3.9 },
  NG: { lat: 9.0, lng: 8.6 },
  RW: { lat: -1.9, lng: 29.8 },
  SN: { lat: 14.4, lng: -14.4 },
  TN: { lat: 33.8, lng: 9.5 },
  ZA: { lat: -30.5, lng: 22.9 },
  ZM: { lat: -13.1, lng: 27.8 },
  ZW: { lat: -19.0, lng: 29.1 },

  // Asia / Middle East
  AE: { lat: 23.4, lng: 53.8 },
  CN: { lat: 35.8, lng: 104.1 },
  HK: { lat: 22.3, lng: 114.1 },
  ID: { lat: -0.7, lng: 113.9 },
  IL: { lat: 31.0, lng: 34.8 },
  IN: { lat: 20.5, lng: 78.9 },
  IR: { lat: 32.4, lng: 53.6 },
  IQ: { lat: 33.2, lng: 43.6 },
  JP: { lat: 36.2, lng: 138.2 },
  KR: { lat: 35.9, lng: 127.7 },
  KZ: { lat: 48.0, lng: 66.9 },
  KW: { lat: 29.3, lng: 47.4 },
  LB: { lat: 33.8, lng: 35.8 },
  MY: { lat: 4.2, lng: 101.9 },
  PH: { lat: 12.8, lng: 121.7 },
  PK: { lat: 30.3, lng: 69.3 },
  QA: { lat: 25.3, lng: 51.1 },
  SA: { lat: 23.8, lng: 45.0 },
  SG: { lat: 1.4, lng: 103.8 },
  TH: { lat: 15.8, lng: 100.9 },
  TW: { lat: 23.6, lng: 121.0 },
  UZ: { lat: 41.3, lng: 64.5 },
  VN: { lat: 14.0, lng: 108.2 },

  // Oceania
  AU: { lat: -25.2, lng: 133.7 },
  NZ: { lat: -40.9, lng: 174.8 },
};

/**
 * Look up a country's lat/lng by ISO-2. Returns null if we don't carry
 * coordinates for that code so the globe can render a fallback marker.
 */
export function getCountryCoord(code: string): CountryCoord | null {
  return COUNTRY_COORDS[code.toUpperCase()] ?? null;
}
