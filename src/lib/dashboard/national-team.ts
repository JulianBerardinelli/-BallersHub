// Constantes y labels del bloque "Trayectoria a Nivel Selección Nacional".
//
// Source-of-truth de los VALORES de enum es el schema Drizzle
// (`src/db/schema/nationalTeams.ts`); acá solo importamos los TIPOS
// (`import type`, borrado en compilación → no bundlea drizzle en el cliente)
// para tipar los maps de labels y forzar exhaustividad cuando se agregue un
// valor nuevo al enum.

import type {
  NationalTeamAgeCategory,
  NationalTeamParticipation,
} from "@/db/schema/nationalTeams";

/**
 * Máximo de fotos del bloque selección. Es un cap TOTAL por jugador (no por
 * etapa/convocatoria): el portfolio lo muestra como un único bloque.
 *
 * Vive en `national_team_media` (tabla aparte), por lo que NO cuenta contra el
 * `PRO_PHOTO_CAP` (5) de la galería normal — así se habilitan estas +4 sin
 * tocar la regla del catálogo. Ver `founder-emails.ts` / `catalog-photos.ts`.
 */
export const NT_PHOTO_CAP = 4;

/** Etiquetas ES de las categorías etarias. */
export const NT_AGE_CATEGORY_LABELS: Record<NationalTeamAgeCategory, string> = {
  sub15: "Sub-15",
  sub16: "Sub-16",
  sub17: "Sub-17",
  sub18: "Sub-18",
  sub19: "Sub-19",
  sub20: "Sub-20",
  sub21: "Sub-21",
  sub23: "Sub-23",
  olympic: "Olímpica",
  senior: "Mayor",
  other: "Otra",
};

/** Orden de display de las categorías (juvenil → mayor). */
export const NT_AGE_CATEGORY_ORDER: readonly NationalTeamAgeCategory[] = [
  "sub15",
  "sub16",
  "sub17",
  "sub18",
  "sub19",
  "sub20",
  "sub21",
  "sub23",
  "olympic",
  "senior",
  "other",
];

/** Etiquetas ES de los tipos de participación. */
export const NT_PARTICIPATION_LABELS: Record<NationalTeamParticipation, string> = {
  called_up: "Convocado/a",
  played: "Jugó partidos",
  sparring: "Sparring",
  training_camp: "Concentración",
};

/** Orden de display de los tipos de participación. */
export const NT_PARTICIPATION_ORDER: readonly NationalTeamParticipation[] = [
  "called_up",
  "played",
  "sparring",
  "training_camp",
];

/**
 * Chips sugeridos de "info extra" para una etapa (set ABIERTO: el jugador
 * puede tipear otros). Se guardan en `national_team_stints.highlights` (text[]).
 */
export const NT_HIGHLIGHT_SUGGESTIONS = [
  "Debut",
  "Capitán",
  "Goleador",
  "Campeón",
  "Subcampeón",
  "MVP",
] as const;
