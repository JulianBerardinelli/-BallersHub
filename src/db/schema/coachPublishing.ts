import { pgTable, uuid, text, boolean, jsonb, timestamp, date, char, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { coachProfiles } from "./coaches";
import { coachCareerItems } from "./coachCareer";
import { reviewStatusEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const coachThemeSettings = pgTable("coach_theme_settings", {
  coachId: uuid("coach_id")
    .primaryKey()
    .references(() => coachProfiles.id, { onDelete: "cascade" }),
  layout: text("layout").notNull().default("classic"),
  primaryColor: text("primary_color").default("#10b981"),
  secondaryColor: text("secondary_color").default("#2A2A2A"),
  accentColor: text("accent_color").default("#34d399"),
  backgroundColor: text("background_color").default("#050505"),
  typography: text("typography"),
  coverMode: text("cover_mode").default("photo"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const coachSectionsVisibility = pgTable(
  "coach_sections_visibility",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => coachProfiles.id, { onDelete: "cascade" }),
    section: text("section").notNull(),
    visible: boolean("visible").notNull().default(true),
    settings: jsonb("settings"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    coachSectionUnique: uniqueIndex("coach_sections_visibility_coach_id_section_key").on(
      table.coachId,
      table.section,
    ),
  }),
);

export const coachLinks = pgTable("coach_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id")
    .notNull()
    .references(() => coachProfiles.id, { onDelete: "cascade" }),
  label: text("label"),
  url: text("url").notNull(),
  kind: text("kind").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const coachHonours = pgTable("coach_honours", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id")
    .notNull()
    .references(() => coachProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  competition: text("competition"),
  season: text("season"),
  awardedOn: date("awarded_on"),
  description: text("description"),
  // Logro asociado a una etapa de la trayectoria (P1.2). El render lo agrupa
  // bajo su etapa; NULL → logro "global" (sin etapa concreta).
  careerItemId: uuid("career_item_id").references(() => coachCareerItems.id, { onDelete: "set null" }),
  // Clip del logro (YouTube/Vimeo). Embebido como los videos de multimedia.
  videoUrl: text("video_url"),
  // Orden manual dentro de su etapa / del grid global.
  position: integer("position").notNull().default(0),
  // Pre-moderación (P1.2): nace 'pending', el público sólo ve 'approved'.
  // Hasta P1.2 la tabla no se editaba (0 filas) → default seguro.
  status: reviewStatusEnum("status").default("pending").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const coachPersonalDetails = pgTable("coach_personal_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id")
    .notNull()
    .unique()
    .references(() => coachProfiles.id, { onDelete: "cascade" }),
  documentType: text("document_type"),
  documentNumber: text("document_number"),
  documentCountry: text("document_country"),
  documentCountryCode: char("document_country_code", { length: 2 }),
  languages: text("languages").array(),
  education: text("education"),
  phone: text("phone"),
  residenceCity: text("residence_city"),
  residenceCountry: text("residence_country"),
  residenceCountryCode: char("residence_country_code", { length: 2 }),
  whatsapp: text("whatsapp"),
  showContactSection: boolean("show_contact_section").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CoachThemeSetting = InferSelectModel<typeof coachThemeSettings>;
export type NewCoachThemeSetting = InferInsertModel<typeof coachThemeSettings>;

export type CoachSectionVisibility = InferSelectModel<typeof coachSectionsVisibility>;
export type NewCoachSectionVisibility = InferInsertModel<typeof coachSectionsVisibility>;

export type CoachLink = InferSelectModel<typeof coachLinks>;
export type NewCoachLink = InferInsertModel<typeof coachLinks>;

export type CoachHonour = InferSelectModel<typeof coachHonours>;
export type NewCoachHonour = InferInsertModel<typeof coachHonours>;

export type CoachPersonalDetails = InferSelectModel<typeof coachPersonalDetails>;
export type NewCoachPersonalDetails = InferInsertModel<typeof coachPersonalDetails>;
