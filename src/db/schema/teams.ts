// src/db/schema/team.ts
import { pgTable, uuid, text, timestamp, boolean, char } from "drizzle-orm/pg-core";
import { teamStatusEnum, teamKindEnum, visibilityEnum } from "./enums";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),           // ej: ca-independiente
  name: text("name").notNull(),                    // ej: Club Atlético Independiente
  country: text("country"),                        // ISO2/país libre por ahora
  countryCode: char("country_code", { length: 2 }),
  kind: teamKindEnum("kind").notNull().default("club"),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  status: teamStatusEnum("status").notNull().default("pending"),
  altNames: text("alt_names").array(),             // otros nombres / alias
  tags: text("tags").array(),                      // "xeneize", "sub-20"...
  crestUrl: text("crest_url").notNull().default("/images/team-default.svg"),
  category: text("category"),
  transfermarktUrl: text("transfermarkt_url"),
  // tracking
  requestedByUserId: uuid("requested_by_user_id"), // quien lo propuso
  requestedInApplicationId: uuid("requested_in_application_id"), // player_applications.id
  requestedFromCareerItemId: uuid("requested_from_career_item_id"),
  // flags
  featured: boolean("featured").notNull().default(false),
  // timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Team = InferSelectModel<typeof teams>;
export type NewTeam = InferInsertModel<typeof teams>;
