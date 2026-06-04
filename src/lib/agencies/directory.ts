// Approved agencies for the public /agencies landing.
//
// Richer than the SEO `getIndexableAgencies` (adds logo/tagline/location for the
// cards) but the SAME set — `isApproved = true` — so the rendered grid and the
// JSON-LD ItemList match the sitemap exactly. Server-only; the page degrades to
// an empty state if this throws.

import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { agencyProfiles } from "@/db/schema/agencies";

export type DirectoryAgency = {
  slug: string;
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  description: string | null;
  headquarters: string | null;
  operativeCountries: string[] | null;
};

export async function getApprovedAgencies(): Promise<DirectoryAgency[]> {
  const rows = await db
    .select({
      slug: agencyProfiles.slug,
      name: agencyProfiles.name,
      logoUrl: agencyProfiles.logoUrl,
      tagline: agencyProfiles.tagline,
      description: agencyProfiles.description,
      headquarters: agencyProfiles.headquarters,
      operativeCountries: agencyProfiles.operativeCountries,
      updatedAt: agencyProfiles.updatedAt,
    })
    .from(agencyProfiles)
    .where(eq(agencyProfiles.isApproved, true));

  // Most-recently-updated first (same ordering as getIndexableAgencies).
  return rows
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      logoUrl: r.logoUrl,
      tagline: r.tagline,
      description: r.description,
      headquarters: r.headquarters,
      operativeCountries: r.operativeCountries,
    }));
}
