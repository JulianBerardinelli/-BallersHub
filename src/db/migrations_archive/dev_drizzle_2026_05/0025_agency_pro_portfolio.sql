-- Agency Pro Portfolio: theme settings, section visibility and hero/cover assets.
-- Mirrors the player portfolio system so managers can pick a layout, a palette
-- and toggle blocks for /agency/[slug].

-- 1) Hero / cover / tagline columns on the agency profile itself.
ALTER TABLE "agency_profiles"
  ADD COLUMN IF NOT EXISTS "hero_url" text,
  ADD COLUMN IF NOT EXISTS "cover_url" text,
  ADD COLUMN IF NOT EXISTS "tagline" text;

-- 2) Per-agency theme settings (1:1 with agency_profiles).
CREATE TABLE IF NOT EXISTS "agency_theme_settings" (
  "agency_id" uuid PRIMARY KEY REFERENCES "agency_profiles"("id") ON DELETE CASCADE,
  "layout" text NOT NULL DEFAULT 'classic',
  "primary_color" text DEFAULT '#10b981',
  "secondary_color" text DEFAULT '#2A2A2A',
  "accent_color" text DEFAULT '#34d399',
  "background_color" text DEFAULT '#050505',
  "typography" text,
  "hero_headline" text,
  "hero_tagline" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- 3) Section visibility per agency portfolio (hero, roster, services, ...).
CREATE TABLE IF NOT EXISTS "agency_sections_visibility" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agency_id" uuid NOT NULL REFERENCES "agency_profiles"("id") ON DELETE CASCADE,
  "section" text NOT NULL,
  "visible" boolean NOT NULL DEFAULT true,
  "settings" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "agency_sections_visibility_agency_idx"
  ON "agency_sections_visibility" ("agency_id");

CREATE UNIQUE INDEX IF NOT EXISTS "agency_sections_visibility_agency_section_uniq"
  ON "agency_sections_visibility" ("agency_id", "section");

-- 4) RLS — public read for portfolio rendering, owner write via dashboard actions.
ALTER TABLE "agency_theme_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_sections_visibility" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_theme_settings_select_public" ON "agency_theme_settings";
CREATE POLICY "agency_theme_settings_select_public"
  ON "agency_theme_settings"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "agency_sections_visibility_select_public" ON "agency_sections_visibility";
CREATE POLICY "agency_sections_visibility_select_public"
  ON "agency_sections_visibility"
  FOR SELECT
  USING (true);
