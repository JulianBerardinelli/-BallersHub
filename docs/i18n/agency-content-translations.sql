-- BallersHub — Agency CONTENT translations (services / country narratives / media).
-- P1 follow-up to player_honour_translations (#185): three more free-text surfaces
-- on the public agency profile, each translatable into en/it/pt with es as the
-- canonical base (per HANDOFF §4 capa C).
--
-- Owner applies this on supabase-dev first (then prod with OK).
-- See feedback_migration_protocol: agent prepares SQL, owner applies.

-- ============================================================
-- 1) agency_media_translations
--    title / alt_text per (media_id, locale). es base lives on agency_media.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agency_media_translations (
  media_id   uuid        NOT NULL REFERENCES public.agency_media(id) ON DELETE CASCADE,
  locale     text        NOT NULL,
  title      text,
  alt_text   text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (media_id, locale),
  CONSTRAINT agency_media_translations_locale_check
    CHECK (locale IN ('es','en','it','pt'))
);

CREATE TRIGGER agency_media_translations_set_updated_at
BEFORE UPDATE ON public.agency_media_translations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.agency_media_translations ENABLE ROW LEVEL SECURITY;

-- Public read: visible iff the parent media is public (its parent agency's
-- profile is visible — agencies are always public when they exist).
CREATE POLICY agency_media_translations_select_public
ON public.agency_media_translations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_media m
    WHERE m.id = agency_media_translations.media_id
  )
);

-- CUD: agency staff (user_profiles.agency_id = the media's agency_id) or admin.
CREATE POLICY agency_media_translations_cud_staff
ON public.agency_media_translations FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_media m
    JOIN public.user_profiles u ON u.agency_id = m.agency_id
    WHERE m.id = agency_media_translations.media_id
      AND u.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.agency_media m
    JOIN public.user_profiles u ON u.agency_id = m.agency_id
    WHERE m.id = agency_media_translations.media_id
      AND u.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

GRANT SELECT                         ON public.agency_media_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE         ON public.agency_media_translations TO authenticated;
GRANT ALL                            ON public.agency_media_translations TO service_role;


-- ============================================================
-- 2) agency_country_profile_translations
--    description per (country_profile_id, locale). es base on agency_country_profiles.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agency_country_profile_translations (
  country_profile_id uuid        NOT NULL REFERENCES public.agency_country_profiles(id) ON DELETE CASCADE,
  locale             text        NOT NULL,
  description        text,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (country_profile_id, locale),
  CONSTRAINT agency_country_profile_translations_locale_check
    CHECK (locale IN ('es','en','it','pt'))
);

CREATE TRIGGER agency_country_profile_translations_set_updated_at
BEFORE UPDATE ON public.agency_country_profile_translations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.agency_country_profile_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY agency_country_profile_translations_select_public
ON public.agency_country_profile_translations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_country_profiles c
    WHERE c.id = agency_country_profile_translations.country_profile_id
  )
);

CREATE POLICY agency_country_profile_translations_cud_staff
ON public.agency_country_profile_translations FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_country_profiles c
    JOIN public.user_profiles u ON u.agency_id = c.agency_id
    WHERE c.id = agency_country_profile_translations.country_profile_id
      AND u.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.agency_country_profiles c
    JOIN public.user_profiles u ON u.agency_id = c.agency_id
    WHERE c.id = agency_country_profile_translations.country_profile_id
      AND u.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

GRANT SELECT                  ON public.agency_country_profile_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE  ON public.agency_country_profile_translations TO authenticated;
GRANT ALL                     ON public.agency_country_profile_translations TO service_role;


-- ============================================================
-- 3) Extend agency_profile_translations with `services jsonb`
--    services is a JSONB array on agency_profiles WITHOUT stable item ids,
--    so translations are stored indexed by position. Same caveat the base
--    already has (reordering services in es invalidates translation indices).
--    Shape: [{ "title": string, "description": string|null }, ...]
-- ============================================================

ALTER TABLE public.agency_profile_translations
  ADD COLUMN IF NOT EXISTS services jsonb;
