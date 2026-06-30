// coach_game_ideas
//
// "Ideas de Juego" — módulo PRO exclusivo del layout DT (head-coach). Cada idea
// es una pizarra táctica: formación base opcional + un tablero (`pitch_board`
// jsonb con fichas + flechas) + título/descripción + link externo opcional.
// Pre-moderado como el resto del contenido coach (nace 'pending', el público
// sólo ve 'approved'). Cap por plan en la action (Pro: hasta 3). Sólo se monta
// para perfiles con primary_role head-coach (isHeadCoachLayout). El rename
// físico a staff_* sigue diferido → la tabla es coach_game_ideas.
// Ver docs/staff/PLAN.md §5.2.
import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { coachProfiles } from "./coaches";
import { reviewStatusEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const coachGameIdeas = pgTable("coach_game_ideas", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id").notNull().references(() => coachProfiles.id, { onDelete: "cascade" }),
  // Título de la idea, ej "Salida limpia en 3-2" / "Presión alta 4-4-2".
  title: text("title"),
  // Formación base opcional ("4-3-3") — sirve para auto-colocar las fichas y
  // como chip de display. NULL → tablero libre sin formación de referencia.
  formation: text("formation"),
  // Descripción libre de la idea (pasaje citable para GEO).
  blurb: text("blurb"),
  // Estado serializado de la pizarra: { tokens: PitchToken[], arrows: PitchArrow[] }.
  // Coordenadas en % (0-100) relativas a la cancha. Ver src/lib/coach/game-ideas.ts.
  pitchBoard: jsonb("pitch_board"),
  // Link externo opcional (video de la jugada, artículo, etc).
  link: text("link"),
  // Orden manual en el portfolio. Lower sorts first.
  position: integer("position").notNull().default(0),
  // Pre-moderación: nace 'pending', oculto del público hasta aprobación.
  status: reviewStatusEnum("status").default("pending").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachGameIdea = InferSelectModel<typeof coachGameIdeas>;
export type NewCoachGameIdea = InferInsertModel<typeof coachGameIdeas>;
