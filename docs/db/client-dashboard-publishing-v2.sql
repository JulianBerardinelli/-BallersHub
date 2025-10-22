-- Client dashboard V2 foundations: profile publishing artefacts
-- This script introduces normalized tables for links, honours, seasonal stats,
-- and template configuration plus an aggregated view consumed by the dashboard.

-- Profile theme configuration (one-to-one with player)
CREATE TABLE IF NOT EXISTS public.profile_theme_settings (
  player_id uuid PRIMARY KEY REFERENCES public.player_profiles(id) ON DELETE CASCADE,
  layout text NOT NULL DEFAULT 'classic',
  primary_color text,
  accent_color text,
  typography text,
  cover_mode text DEFAULT 'photo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.trg_profile_theme_settings_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_profile_theme_settings_updated'
      AND tgrelid = 'public.profile_theme_settings'::regclass
  ) THEN
    CREATE TRIGGER trg_profile_theme_settings_updated
      BEFORE UPDATE ON public.profile_theme_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_profile_theme_settings_updated();
  END IF;
END$$;

ALTER TABLE public.profile_theme_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_theme_settings_select ON public.profile_theme_settings;
CREATE POLICY profile_theme_settings_select
  ON public.profile_theme_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_theme_settings.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS profile_theme_settings_upsert ON public.profile_theme_settings;
CREATE POLICY profile_theme_settings_upsert
  ON public.profile_theme_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_theme_settings.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS profile_theme_settings_update ON public.profile_theme_settings;
CREATE POLICY profile_theme_settings_update
  ON public.profile_theme_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_theme_settings.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS profile_theme_settings_delete ON public.profile_theme_settings;
CREATE POLICY profile_theme_settings_delete
  ON public.profile_theme_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_theme_settings.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

GRANT ALL ON public.profile_theme_settings TO anon;
GRANT ALL ON public.profile_theme_settings TO authenticated;
GRANT ALL ON public.profile_theme_settings TO service_role;

-- Section visibility toggles per player
CREATE TABLE IF NOT EXISTS public.profile_sections_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.player_profiles(id) ON DELETE CASCADE,
  section text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  settings jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_sections_visibility_player_section_key UNIQUE (player_id, section)
);

CREATE OR REPLACE FUNCTION public.trg_profile_sections_visibility_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_profile_sections_visibility_updated'
      AND tgrelid = 'public.profile_sections_visibility'::regclass
  ) THEN
    CREATE TRIGGER trg_profile_sections_visibility_updated
      BEFORE UPDATE ON public.profile_sections_visibility
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_profile_sections_visibility_updated();
  END IF;
END$$;

ALTER TABLE public.profile_sections_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_sections_visibility_select ON public.profile_sections_visibility;
CREATE POLICY profile_sections_visibility_select
  ON public.profile_sections_visibility
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_sections_visibility.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS profile_sections_visibility_insert ON public.profile_sections_visibility;
CREATE POLICY profile_sections_visibility_insert
  ON public.profile_sections_visibility
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_sections_visibility.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS profile_sections_visibility_update ON public.profile_sections_visibility;
CREATE POLICY profile_sections_visibility_update
  ON public.profile_sections_visibility
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_sections_visibility.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS profile_sections_visibility_delete ON public.profile_sections_visibility;
CREATE POLICY profile_sections_visibility_delete
  ON public.profile_sections_visibility
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_sections_visibility.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

GRANT ALL ON public.profile_sections_visibility TO anon;
GRANT ALL ON public.profile_sections_visibility TO authenticated;
GRANT ALL ON public.profile_sections_visibility TO service_role;

-- External links curated per player
CREATE TABLE IF NOT EXISTS public.player_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.player_profiles(id) ON DELETE CASCADE,
  label text,
  url text NOT NULL,
  kind text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_links_player ON public.player_links (player_id);
CREATE INDEX IF NOT EXISTS idx_player_links_kind ON public.player_links (kind);

CREATE OR REPLACE FUNCTION public.trg_player_links_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_player_links_updated'
      AND tgrelid = 'public.player_links'::regclass
  ) THEN
    CREATE TRIGGER trg_player_links_updated
      BEFORE UPDATE ON public.player_links
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_player_links_updated();
  END IF;
END$$;

ALTER TABLE public.player_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS player_links_select ON public.player_links;
CREATE POLICY player_links_select
  ON public.player_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_links.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS player_links_insert ON public.player_links;
CREATE POLICY player_links_insert
  ON public.player_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_links.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS player_links_update ON public.player_links;
CREATE POLICY player_links_update
  ON public.player_links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_links.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS player_links_delete ON public.player_links;
CREATE POLICY player_links_delete
  ON public.player_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_links.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

GRANT ALL ON public.player_links TO anon;
GRANT ALL ON public.player_links TO authenticated;
GRANT ALL ON public.player_links TO service_role;

-- Honours and trophies per player
CREATE TABLE IF NOT EXISTS public.player_honours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.player_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  competition text,
  season text,
  awarded_on date,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_honours_player ON public.player_honours (player_id);
CREATE INDEX IF NOT EXISTS idx_player_honours_season ON public.player_honours (season);

CREATE OR REPLACE FUNCTION public.trg_player_honours_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_player_honours_updated'
      AND tgrelid = 'public.player_honours'::regclass
  ) THEN
    CREATE TRIGGER trg_player_honours_updated
      BEFORE UPDATE ON public.player_honours
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_player_honours_updated();
  END IF;
END$$;

ALTER TABLE public.player_honours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS player_honours_select ON public.player_honours;
CREATE POLICY player_honours_select
  ON public.player_honours
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_honours.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS player_honours_insert ON public.player_honours;
CREATE POLICY player_honours_insert
  ON public.player_honours
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_honours.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS player_honours_update ON public.player_honours;
CREATE POLICY player_honours_update
  ON public.player_honours
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_honours.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS player_honours_delete ON public.player_honours;
CREATE POLICY player_honours_delete
  ON public.player_honours
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_honours.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

GRANT ALL ON public.player_honours TO anon;
GRANT ALL ON public.player_honours TO authenticated;
GRANT ALL ON public.player_honours TO service_role;

-- Extend seasonal stats with optional categorization fields
ALTER TABLE public.stats_seasons
  ADD COLUMN IF NOT EXISTS competition text,
  ADD COLUMN IF NOT EXISTS team text,
  ADD COLUMN IF NOT EXISTS yellow_cards integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS red_cards integer DEFAULT 0;

-- Aggregated publishing state view consumed by the dashboard
CREATE OR REPLACE VIEW public.player_dashboard_publishing_state AS
SELECT
  p.id AS player_id,
  p.user_id,
  to_jsonb(theme.*) - 'player_id'::text AS theme_settings,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'label', l.label,
          'url', l.url,
          'kind', l.kind,
          'is_primary', l.is_primary,
          'metadata', l.metadata,
          'created_at', l.created_at,
          'updated_at', l.updated_at
        )
        ORDER BY l.is_primary DESC, l.created_at DESC
      )
      FROM public.player_links l
      WHERE l.player_id = p.id
    ),
    '[]'::jsonb
  ) AS links,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'section', s.section,
          'visible', s.visible,
          'settings', s.settings,
          'created_at', s.created_at,
          'updated_at', s.updated_at
        )
        ORDER BY s.section
      )
      FROM public.profile_sections_visibility s
      WHERE s.player_id = p.id
    ),
    '[]'::jsonb
  ) AS sections,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', h.id,
          'title', h.title,
          'competition', h.competition,
          'season', h.season,
          'awarded_on', h.awarded_on,
          'description', h.description,
          'created_at', h.created_at,
          'updated_at', h.updated_at
        )
        ORDER BY h.awarded_on DESC NULLS LAST, h.created_at DESC
      )
      FROM public.player_honours h
      WHERE h.player_id = p.id
    ),
    '[]'::jsonb
  ) AS honours,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', st.id,
          'season', st.season,
          'competition', st.competition,
          'team', st.team,
          'matches', st.matches,
          'minutes', st.minutes,
          'goals', st.goals,
          'assists', st.assists,
          'yellow_cards', st.yellow_cards,
          'red_cards', st.red_cards,
          'created_at', st.created_at,
          'career_item_id', st.career_item_id,
          'team_crest_url', tm.crest_url
        )
        ORDER BY st.season DESC, st.created_at DESC
      )
      FROM public.stats_seasons st
      LEFT JOIN public.career_items ci ON ci.id = st.career_item_id
      LEFT JOIN public.teams tm ON tm.id = ci.team_id
      WHERE st.player_id = p.id
    ),
    '[]'::jsonb
  ) AS stats
FROM public.player_profiles p
LEFT JOIN public.profile_theme_settings theme ON theme.player_id = p.id;

GRANT SELECT ON public.player_dashboard_publishing_state TO authenticated;
GRANT SELECT ON public.player_dashboard_publishing_state TO service_role;
