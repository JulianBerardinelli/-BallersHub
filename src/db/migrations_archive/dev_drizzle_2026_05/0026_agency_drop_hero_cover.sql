-- Remove hero/cover assets from agency_profiles. Agencies render their
-- portfolio using just the existing logo (avatar) — no PNG cutout needed.

ALTER TABLE "agency_profiles"
  DROP COLUMN IF EXISTS "hero_url",
  DROP COLUMN IF EXISTS "cover_url";
