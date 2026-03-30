// src/db/schema/agencies.ts
import { pgTable, uuid, timestamp, text, boolean, jsonb, integer } from "drizzle-orm/pg-core";

export const agencyProfiles = pgTable("agency_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  websiteUrl: text("website_url"),
  verifiedLink: text("verified_link"),
  
  // Legacy fields (kept for backward compatibility, will be migrated out or ignored)
  agentLicenseUrl: text("agent_license_url"),
  agentLicenseType: text("agent_license_type"),
  
  // New Extended Fields
  licenses: jsonb("licenses").$type<{ type: string; number: string; url?: string }[]>(),
  operativeCountries: text("operative_countries").array(),
  headquarters: text("headquarters"),
  foundationYear: integer("foundation_year"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  linkedinUrl: text("linkedin_url"),
  services: text("services").array(),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
