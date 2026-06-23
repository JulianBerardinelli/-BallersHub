// national_team_stints + national_team_media
//
// Bloque de "Trayectoria a Nivel Selección Nacional" del jugador. Es una
// credencial de alto valor ("medalla"), por eso NO es pública hasta que un
// admin la aprueba: cada etapa nace en `pending_review` y el render público
// solo muestra filas `approved` (status-on-row, igual que teams/divisions/
// player_media).
//
// Decisiones de modelado (ver docs/national-team/PLAN.md):
// - Una etapa (`stint`) = una experiencia/convocatoria con una categoría.
// - El equipo nacional se referencia a `teams` (kind='national'); el género
//   se DERIVA de `player_profiles.gender` (no se duplica acá).
// - La categoría (Sub-15…Mayor) vive en la fila vía `national_team_age_category`.
// - Stats opcionales inline (caps/goals/assists/minutes).
// - Fotos: catálogo APARTE (`national_team_media`), keyed por jugador, cap de 4
//   TOTALES para todo el bloque. Al vivir fuera de `player_media` no cuentan
//   contra el `PRO_PHOTO_CAP` (5) de la galería normal — esa es la "vuelta"
//   para habilitar las +4 sin tocar la regla del catálogo.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  char,
  index,
} from "drizzle-orm/pg-core";
import { playerStatusEnum } from "./enums";
import { playerProfiles } from "./players";
import { teams } from "./teams";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Categoría etaria de la selección. `olympic` cubre el seleccionado olímpico
// (Sub-23 + refuerzos); `senior` = primer equipo/mayor; `other` como escape.
export const nationalTeamAgeCategoryEnum = pgEnum("national_team_age_category", [
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
]);

// Tipo de participación en esa convocatoria/etapa.
export const nationalTeamParticipationEnum = pgEnum("national_team_participation", [
  "called_up", // convocado / citado (no necesariamente jugó)
  "played", // jugó / debutó
  "sparring", // fue de sparring
  "training_camp", // concentración / microciclo
]);

export type NationalTeamAgeCategory =
  (typeof nationalTeamAgeCategoryEnum.enumValues)[number];
export type NationalTeamParticipation =
  (typeof nationalTeamParticipationEnum.enumValues)[number];

export const nationalTeamStints = pgTable(
  "national_team_stints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerProfiles.id, { onDelete: "cascade" }),

    // Equipo nacional ya catalogado (teams.kind='national'). NULL cuando el
    // jugador propone una selección que el admin cataloga al aprobar.
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    proposedTeamName: text("proposed_team_name"),
    // Denormalizado para display/filtro cuando teamId es NULL (bandera, nombre).
    countryCode: char("country_code", { length: 2 }),

    ageCategory: nationalTeamAgeCategoryEnum("age_category").notNull(),
    participation: nationalTeamParticipationEnum("participation")
      .notNull()
      .default("called_up"),

    // Info extra opcional: "debut", "capitán", "goleador", "campeón", etc.
    // Set abierto (chips sugeridos en el editor) — por eso text[] y no enum.
    highlights: text("highlights").array(),

    // "Años" como el resto de la trayectoria (no DATE). endYear NULL => vigente.
    startYear: integer("start_year"),
    endYear: integer("end_year"),

    // Mini descripción por convocatoria.
    description: text("description"),

    // Estadísticas OPCIONALES (todas nullable).
    caps: integer("caps"), // partidos / apariciones
    goals: integer("goals"),
    assists: integer("assists"),
    minutes: integer("minutes"),

    // Fuente verificable para que el admin chequee con dato real la
    // participación (Transfermarkt, web de la federación, nota de prensa…).
    referenceUrl: text("reference_url"),

    // Orden manual en el portfolio.
    orderIndex: integer("order_index").notNull().default(0),

    // Moderación (status-on-row). Nace en pending_review; público = approved.
    status: playerStatusEnum("status").notNull().default("pending_review"),
    submittedByUserId: uuid("submitted_by_user_id"),
    reviewedByUserId: uuid("reviewed_by_user_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("national_team_stints_player_idx").on(t.playerId),
    index("national_team_stints_status_idx").on(t.status),
  ],
);

export type NationalTeamStint = InferSelectModel<typeof nationalTeamStints>;
export type NewNationalTeamStint = InferInsertModel<typeof nationalTeamStints>;

// Catálogo de fotos del bloque selección. Keyed por JUGADOR (no por etapa):
// son hasta 4 fotos generales del paso por la(s) selección(es), no por
// convocatoria. Viven en el bucket `player-media` (path national-team/…) pero
// en tabla aparte para no contar contra el cap de 5 de la galería normal.
// El endpoint de upload las inserta `is_approved=true` (REACTIVO, como
// player_media): el módulo público solo renderiza el bloque cuando hay etapas
// aprobadas, así que las fotos aparecen junto a una "medalla" ya verificada. El
// control de la credencial vive en la ETAPA; `is_flagged` permite ocultar una
// foto puntual. (La DEFAULT de la columna es false; el upload la setea true.)
export const nationalTeamMedia = pgTable(
  "national_team_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerProfiles.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    position: integer("position").notNull().default(0), // 0..3
    isApproved: boolean("is_approved").notNull().default(false),
    isFlagged: boolean("is_flagged").notNull().default(false),
    reviewedBy: uuid("reviewed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("national_team_media_player_idx").on(t.playerId)],
);

export type NationalTeamMedia = InferSelectModel<typeof nationalTeamMedia>;
export type NewNationalTeamMedia = InferInsertModel<typeof nationalTeamMedia>;
