// Default theme + sections for a freshly-approved agency.
//
// Called from `approveManagerApplication` so every new agency lands with a
// usable `agency_theme_settings` row (layout='classic') and the full set of
// `agency_sections_visibility` rows. Without this, the public portfolio
// renders the implicit defaults baked into page.tsx, but the dashboard
// "Estructura" page looks empty until the manager touches every toggle.
//
// Idempotent: safe to call on agencies that already have a theme row
// (UPSERT no-ops) and on sections that are already persisted (skipped).

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencyThemeSettings, agencySectionsVisibility } from "@/db/schema";

export const AGENCY_SECTION_IDS = [
  "about",
  "staff",
  "roster",
  "services",
  "reach",
  "gallery",
  "contact",
] as const;

export type AgencySectionId = (typeof AGENCY_SECTION_IDS)[number];

export async function seedAgencyDefaults(agencyId: string): Promise<void> {
  // Free-tier convention: persist colors/hero as NULL so the public resolver
  // falls back to the Classic hardcoded palette (page.tsx). Matches the shape
  // `updateAgencyThemeSettingsAction` writes for non-Pro managers.
  await db
    .insert(agencyThemeSettings)
    .values({
      agencyId,
      layout: "classic",
      primaryColor: null,
      secondaryColor: null,
      accentColor: null,
      backgroundColor: null,
      typography: null,
      heroHeadline: null,
      heroTagline: null,
    })
    .onConflictDoNothing({ target: agencyThemeSettings.agencyId });

  const existing = await db
    .select({ section: agencySectionsVisibility.section })
    .from(agencySectionsVisibility)
    .where(eq(agencySectionsVisibility.agencyId, agencyId));
  const have = new Set(existing.map((r) => r.section));

  const missing = AGENCY_SECTION_IDS.filter((id) => !have.has(id)).map((id) => ({
    agencyId,
    section: id,
    visible: true,
  }));

  if (missing.length > 0) {
    await db.insert(agencySectionsVisibility).values(missing);
  }
}
