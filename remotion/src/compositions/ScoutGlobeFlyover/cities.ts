// Datos del globo. Shape simplificado (el globo solo necesita coords + cantidad).
// A futuro: un endpoint `GET /api/scouting/globe` devuelve esto con datos reales.
// Por ahora, mock realista con ciudades del fútbol LATAM/España (coords reales).

export type GlobeCity = {
  key: string;
  name: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  playerCount: number;
};

export const MOCK_CITIES: GlobeCity[] = [
  { key: "buenos-aires|AR", name: "Buenos Aires", countryCode: "AR", latitude: -34.61, longitude: -58.38, playerCount: 9 },
  { key: "rosario|AR", name: "Rosario", countryCode: "AR", latitude: -32.95, longitude: -60.66, playerCount: 4 },
  { key: "cordoba|AR", name: "Córdoba", countryCode: "AR", latitude: -31.42, longitude: -64.18, playerCount: 3 },
  { key: "montevideo|UY", name: "Montevideo", countryCode: "UY", latitude: -34.9, longitude: -56.16, playerCount: 5 },
  { key: "santiago|CL", name: "Santiago", countryCode: "CL", latitude: -33.45, longitude: -70.66, playerCount: 4 },
  { key: "sao-paulo|BR", name: "São Paulo", countryCode: "BR", latitude: -23.55, longitude: -46.63, playerCount: 7 },
  { key: "rio|BR", name: "Río de Janeiro", countryCode: "BR", latitude: -22.91, longitude: -43.17, playerCount: 5 },
  { key: "bogota|CO", name: "Bogotá", countryCode: "CO", latitude: 4.71, longitude: -74.07, playerCount: 4 },
  { key: "lima|PE", name: "Lima", countryCode: "PE", latitude: -12.05, longitude: -77.04, playerCount: 3 },
  { key: "cdmx|MX", name: "Ciudad de México", countryCode: "MX", latitude: 19.43, longitude: -99.13, playerCount: 4 },
  { key: "madrid|ES", name: "Madrid", countryCode: "ES", latitude: 40.42, longitude: -3.7, playerCount: 8 },
  { key: "barcelona|ES", name: "Barcelona", countryCode: "ES", latitude: 41.39, longitude: 2.17, playerCount: 5 },
  { key: "lisboa|PT", name: "Lisboa", countryCode: "PT", latitude: 38.72, longitude: -9.14, playerCount: 3 },
  { key: "milan|IT", name: "Milán", countryCode: "IT", latitude: 45.46, longitude: 9.19, playerCount: 3 },
];

// Densidad por país (ISO alpha-2) → cuántos jugadores "juegan" ahí (tiñe los continentes).
export const MOCK_DENSITY: Record<string, number> = {
  AR: 16, UY: 5, CL: 4, BR: 12, CO: 4, PE: 3, MX: 4, ES: 13, PT: 3, IT: 3,
};

// Totales de marketing (de la landing) para el contador con count-up.
export const MOCK_TOTALS = {
  players: 1247,
  clubs: 86,
  countries: Object.keys(MOCK_DENSITY).length,
};
