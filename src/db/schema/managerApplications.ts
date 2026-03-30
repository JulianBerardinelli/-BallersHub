// manager_applications
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";


export const managerApplications = pgTable("manager_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  fullName: text("full_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  agencyName: text("agency_name").notNull(),
  agencyWebsiteUrl: text("agency_website_url"),
  verifiedLink: text("verified_link"),
  agentLicenseUrl: text("agent_license_url"),
  agentLicenseType: text("agent_license_type"),
  idDocUrl: text("id_doc_url"),
  selfieUrl: text("selfie_url"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ManagerApplication = InferSelectModel<typeof managerApplications>;
export type NewManagerApplication = InferInsertModel<typeof managerApplications>;
