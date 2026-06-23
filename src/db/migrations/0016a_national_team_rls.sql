-- ===============================================================
-- 0016a_national_team_rls.sql
--
-- Manual complementario (NO tracked by Drizzle — sin entry en
-- meta/_journal.json). Aplica: ENABLE RLS + policies + GRANTs para las
-- tablas `national_team_stints` y `national_team_media` creadas en
-- 0016_late_betty_brant.sql.
--
-- Requires: 0016_late_betty_brant.sql aplicado PRIMERO (crea las tablas).
-- Aplicar en supabase-dev primero (ciolizjshimyvyonlssq); en prod
-- (erdvpcfjynkhcrqktozd) SOLO con autorización explícita del owner.
-- Idempotente: sí (ENABLE RLS no-op si ya activo; DROP POLICY IF EXISTS
--   antes de cada CREATE; GRANTs idempotentes).
--
-- Modelo (espejo de 0009a_translations_rls.sql):
--   - Lectura pública: solo filas APROBADAS de perfiles públicos+aprobados
--     (la "medalla" no es visible hasta que el admin la valida).
--   - Dueño: el jugador ve/edita SOLO sus propias filas, en cualquier estado.
--   - Admin: acceso total vía public.is_admin(auth.uid()).
-- NOTE: el dashboard y el portfolio leen/escriben vía Drizzle (rol postgres,
--   bypass RLS) y los writes pasan por server actions. Estas policies son
--   defense-in-depth para acceso directo vía Supabase JS / PostgREST.
--
-- Storage: las fotos viven en el bucket `player-media` (path
--   national-team/{user_id}/{uuid}.avif). Las policies de ese bucket ya son
--   bucket-scoped y permisivas (0006d), así que NO hace falta storage RLS nueva.
-- ===============================================================

-- ===========================================================
-- national_team_stints
-- ===========================================================
ALTER TABLE public.national_team_stints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS national_team_stints_read ON public.national_team_stints;
CREATE POLICY national_team_stints_read
  ON public.national_team_stints
  FOR SELECT
  USING (
    -- público: etapa aprobada de un perfil público + aprobado
    (
      status = 'approved'::player_status
      and exists (
        select 1 from public.player_profiles p
        where p.id = player_id
          and p.visibility = 'public'::visibility
          and p.status = 'approved'::player_status
      )
    )
    -- dueño: ve las suyas en cualquier estado
    or exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS national_team_stints_cud ON public.national_team_stints;
CREATE POLICY national_team_stints_cud
  ON public.national_team_stints
  FOR ALL
  USING (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  )
  WITH CHECK (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

-- ===========================================================
-- national_team_media
-- ===========================================================
ALTER TABLE public.national_team_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS national_team_media_read ON public.national_team_media;
CREATE POLICY national_team_media_read
  ON public.national_team_media
  FOR SELECT
  USING (
    -- público: foto aprobada de un perfil público + aprobado
    (
      is_approved = true
      and exists (
        select 1 from public.player_profiles p
        where p.id = player_id
          and p.visibility = 'public'::visibility
          and p.status = 'approved'::player_status
      )
    )
    -- dueño: ve las suyas aunque no estén aprobadas (preview en dashboard)
    or exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS national_team_media_cud ON public.national_team_media;
CREATE POLICY national_team_media_cud
  ON public.national_team_media
  FOR ALL
  USING (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  )
  WITH CHECK (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

-- ===========================================================
-- GRANTs (espejo de notifications/translations)
-- ===========================================================
GRANT SELECT ON public.national_team_stints TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.national_team_stints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.national_team_stints TO service_role;

GRANT SELECT ON public.national_team_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.national_team_media TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.national_team_media TO service_role;
