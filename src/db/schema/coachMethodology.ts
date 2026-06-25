// coach_methodology_rubros
//
// Módulo Metodología UNIVERSAL (todos los oficios, no solo DT). Cada rubro es un
// bloque libre (título + ícono + texto). Reemplaza el viejo `methodology_analysis`
// plano y absorbe el concepto "Canvas" para roles no-DT. Los archivos PDF/PPT/PPTX
// cuelgan vía `coach_media.rubro_id` (type='doc'). Pre-moderado como el resto del
// contenido coach. Free: hasta 2 rubros sin archivos; Pro: ilimitado + archivos.
// Ver docs/staff/PLAN.md §5.2.
import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { coachProfiles } from "./coaches";
import { reviewStatusEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const coachMethodologyRubros = pgTable("coach_methodology_rubros", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id").notNull().references(() => coachProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // Nombre del ícono (set Tabler u otro) elegido por el staff para el rubro.
  icon: text("icon"),
  // Cuerpo libre del rubro (texto). NULL permite un rubro solo con archivos.
  body: text("body"),
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

export type CoachMethodologyRubro = InferSelectModel<typeof coachMethodologyRubros>;
export type NewCoachMethodologyRubro = InferInsertModel<typeof coachMethodologyRubros>;
