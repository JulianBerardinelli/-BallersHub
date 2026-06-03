// Curated club → city/coords map for the scouting backfill.
//
// Football clubs are mostly NOT named after their city (River Plate, Boca,
// Racing…), so fuzzy geocoding produces wrong pins. This hand-verified map is
// the source of truth for the clubs currently in the DB; anything not here
// falls back to an EXACT country-state-city name match (clubs literally named
// after a city), else stays unresolved → filled manually via the admin
// CityPicker. Coordinates are city/neighbourhood centroids (enough for a globe
// pin). Keys are matched case/accent-insensitively.

export type ClubCity = { city: string; lat: number; lon: number };

export const KNOWN_CLUB_CITIES: Record<string, ClubCity> = {
  // --- Argentina — AMBA / Gran Buenos Aires ---
  "CA River Plate": { city: "Buenos Aires", lat: -34.5453, lon: -58.4498 },
  "CA Boca Juniors": { city: "Buenos Aires", lat: -34.6354, lon: -58.3645 },
  "San Lorenzo": { city: "Buenos Aires", lat: -34.6457, lon: -58.4445 },
  Huracán: { city: "Buenos Aires", lat: -34.6376, lon: -58.4012 },
  "CA Vélez Sarsfield": { city: "Buenos Aires", lat: -34.6353, lon: -58.5215 },
  "Argentinos Juniors": { city: "Buenos Aires", lat: -34.6066, lon: -58.4694 },
  "Deportivo Riestra": { city: "Buenos Aires", lat: -34.6479, lon: -58.4575 },
  "Barracas Central": { city: "Buenos Aires", lat: -34.6479, lon: -58.396 },
  "CA Independiente": { city: "Avellaneda", lat: -34.6699, lon: -58.3704 },
  "Racing Club": { city: "Avellaneda", lat: -34.668, lon: -58.3677 },
  Lanús: { city: "Lanús", lat: -34.7058, lon: -58.392 },
  "CA Banfield": { city: "Banfield", lat: -34.7434, lon: -58.3927 },
  "CA Platense": { city: "Vicente López", lat: -34.5267, lon: -58.4742 },
  Platense: { city: "Vicente López", lat: -34.5267, lon: -58.4742 },
  "CA Colegiales": { city: "Munro", lat: -34.5283, lon: -58.5181 },
  Tigre: { city: "Victoria", lat: -34.4585, lon: -58.531 },
  "Defensa y Justicia": { city: "Florencio Varela", lat: -34.805, lon: -58.279 },
  "CA Temperley II": { city: "Temperley", lat: -34.77, lon: -58.392 },
  "CA Temperley U20": { city: "Temperley", lat: -34.77, lon: -58.392 },
  "Brown de Adrogue": { city: "Adrogué", lat: -34.8003, lon: -58.39 },
  "San Martin De Burzaco": { city: "Burzaco", lat: -34.823, lon: -58.392 },
  "Sportivo Ballester": { city: "Villa Ballester", lat: -34.547, lon: -58.556 },
  Almagro: { city: "José Ingenieros", lat: -34.6433, lon: -58.5536 },
  "AJJ Urquiza": { city: "Caseros", lat: -34.6106, lon: -58.5614 },

  // --- Argentina — interior ---
  "Estudiantes de La Plata": { city: "La Plata", lat: -34.9215, lon: -57.9545 },
  "Gimnasia y Esgrima (LP)": { city: "La Plata", lat: -34.9215, lon: -57.9545 },
  "Estudiantes (RC)": { city: "Río Cuarto", lat: -33.1307, lon: -64.3499 },
  "Rosario Central": { city: "Rosario", lat: -32.958, lon: -60.639 },
  "CA Newell's Old Boys": { city: "Rosario", lat: -32.951, lon: -60.665 },
  "Central Córdoba (SdE)": { city: "Santiago del Estero", lat: -27.7951, lon: -64.2615 },
  "Talleres de Córdoba": { city: "Córdoba", lat: -31.4201, lon: -64.1888 },
  Belgrano: { city: "Córdoba", lat: -31.3919, lon: -64.203 },
  Instituto: { city: "Córdoba", lat: -31.38, lon: -64.185 },
  "Atlético Tucumán": { city: "San Miguel de Tucumán", lat: -26.8083, lon: -65.2176 },
  "Independiente Rivadavia": { city: "Mendoza", lat: -32.8895, lon: -68.8458 },
  "Gimnasia y Esgrima de Mendoza": { city: "Mendoza", lat: -32.8895, lon: -68.8458 },
  Aldosivi: { city: "Mar del Plata", lat: -38.0055, lon: -57.5426 },
  "Sarmiento (J)": { city: "Junín", lat: -34.5848, lon: -60.9426 },
  "Racing Club (Trelew)": { city: "Trelew", lat: -43.2489, lon: -65.3051 },
  Unión: { city: "Santa Fe", lat: -31.6107, lon: -60.6973 },

  // --- España (las no city-named) ---
  "CD Manchego": { city: "Ciudad Real", lat: 38.9848, lon: -3.9272 },
  "Moralo CP": { city: "Navalmoral de la Mata", lat: 39.8936, lon: -5.5407 },
  "CD Nuevo Boadilla": { city: "Boadilla del Monte", lat: 40.4058, lon: -3.8772 },
  "CD Nuevo Puerta Bonita": { city: "Madrid", lat: 40.387, lon: -3.73 },
  "FPA Las Rozas": { city: "Las Rozas de Madrid", lat: 40.4924, lon: -3.8741 },
  "AD Orcasitas": { city: "Madrid", lat: 40.3756, lon: -3.7178 },
  "CF Rayo Majadahonda": { city: "Majadahonda", lat: 40.473, lon: -3.872 },

  // --- Internacional ---
  "Abano Calcio": { city: "Abano Terme", lat: 45.3594, lon: 11.7903 },
  "ASD Melito": { city: "Melito di Porto Salvo", lat: 37.9183, lon: 15.7472 },
  "Pro Gorizia": { city: "Gorizia", lat: 45.9411, lon: 13.6217 },
  "FC Basel": { city: "Basel", lat: 47.5596, lon: 7.5886 },
  "Concordia Basel": { city: "Basel", lat: 47.5596, lon: 7.5886 },
  "FC Horgen": { city: "Horgen", lat: 47.2599, lon: 8.5969 },
  "FC Weesen": { city: "Weesen", lat: 47.1276, lon: 9.0977 },
  "FC Vaajakoski": { city: "Jyväskylä", lat: 62.2667, lon: 25.9333 },
  "Dynamo Kiev": { city: "Kyiv", lat: 50.4501, lon: 30.5234 },
  "JEF United Chiba": { city: "Chiba", lat: 35.6073, lon: 140.1063 },
  "São Paulo FC": { city: "São Paulo", lat: -23.5505, lon: -46.6333 },
  "GD Estoril Praia": { city: "Estoril", lat: 38.7057, lon: -9.3977 },
};
