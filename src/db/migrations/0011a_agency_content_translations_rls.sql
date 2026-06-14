-- ===============================================================
-- 0011a_agency_content_translations_rls.sql
--
-- Manual complementario (NO tracked by Drizzle — sin entry en
-- meta/_journal.json). Aplica: ENABLE RLS + policies + updated_at triggers
-- + GRANTs para las 2 tablas de traducción de contenido de agencia creadas
-- en 0011_flaky_blade.sql:
--   · agency_media_translations
--   · agency_country_profile_translations
-- (Nota: 0011 también agrega la columna `services jsonb` a
-- agency_profile_translations; esa tabla ya tiene RLS desde 0009a.)
--
-- Requires: 0011_flaky_blade.sql aplicado PRIMERO (crea las tablas).
-- Aplicar en supabase-dev primero (ciolizjshimyvyonlssq); en prod
-- (erdvpcfjynkhcrqktozd) SOLO con autorización explícita del owner.
-- Idempotente: sí (ENABLE RLS no-op si ya activo; DROP POLICY IF EXISTS
--   antes de cada CREATE; DROP TRIGGER IF EXISTS; GRANTs idempotentes).
--
-- Ownership: el manager de la agencia (user_profiles.agency_id) o admin
-- pueden CUD. SELECT público porque los contenidos viven dentro de
-- /agency/[slug] que es página pública. Reusa public.set_updated_at() y
-- public.is_admin(uuid) ya existentes.
--
-- NOTE: las server actions corren como rol postgres (bypass RLS) y validan
-- ownership en código (ensureAgencyStaff en agency-translations.ts). Estas
-- policies son defense-in-depth para acceso directo via Supabase JS client.
-- ===============================================================

-- ============================================================
-- 1) agency_media_translations
-- ============================================================

ALTER TABLE public.agency_media_translations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS agency_media_translations_set_updated_at
  ON public.agency_media_translations;
CREATE TRIGGER agency_media_translations_set_updated_at
BEFORE UPDATE ON public.agency_media_translations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public SELECT: agency public profile is always indexable when the agency
-- exists, so the matching translation row should also be readable.
DROP POLICY IF EXISTS agency_media_translations_select_public
  ON public.agency_media_translations;
CREATE POLICY agency_media_translations_select_public
ON public.agency_media_translations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_media m
    WHERE m.id = agency_media_translations.media_id
  )
);

-- CUD: agency staff (user_profiles.agency_id matches the media's agency_id) or admin.
DROP POLICY IF EXISTS agency_media_translations_cud_staff
  ON public.agency_media_translations;
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

GRANT SELECT                  ON public.agency_media_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE  ON public.agency_media_translations TO authenticated;
GRANT ALL                     ON public.agency_media_translations TO service_role;


-- ============================================================
-- 2) agency_country_profile_translations
-- ============================================================

ALTER TABLE public.agency_country_profile_translations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS agency_country_profile_translations_set_updated_at
  ON public.agency_country_profile_translations;
CREATE TRIGGER agency_country_profile_translations_set_updated_at
BEFORE UPDATE ON public.agency_country_profile_translations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS agency_country_profile_translations_select_public
  ON public.agency_country_profile_translations;
CREATE POLICY agency_country_profile_translations_select_public
ON public.agency_country_profile_translations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_country_profiles c
    WHERE c.id = agency_country_profile_translations.country_profile_id
  )
);

DROP POLICY IF EXISTS agency_country_profile_translations_cud_staff
  ON public.agency_country_profile_translations;
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
