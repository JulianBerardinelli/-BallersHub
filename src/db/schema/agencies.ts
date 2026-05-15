// src/db/schema/agencies.ts
import { pgTable, uuid, timestamp, text, boolean, integer, jsonb } from "drizzle-orm/pg-core";

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

  // Licenses now live on manager_profiles (one set per agent). The agency
  // portfolio aggregates licenses across staff at render time.
  operativeCountries: text("operative_countries").array(),
  headquarters: text("headquarters"),
  foundationYear: integer("foundation_year"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  linkedinUrl: text("linkedin_url"),
  services: jsonb("services").$type<{
    title: string;
    icon: string;
    color: string | null;
    description: string | null;
  }[]>(),
  // Optional one-line tagline shown under the agency identity in the portfolio.
  tagline: text("tagline"),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
