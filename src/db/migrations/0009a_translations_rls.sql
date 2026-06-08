-- ===============================================================
-- 0009a_translations_rls.sql
--
-- Manual complementario (NO tracked by Drizzle — sin entry en
-- meta/_journal.json). Aplica: ENABLE RLS + policies + updated_at triggers
-- + GRANTs para las 3 tablas i18n creadas en 0009_supreme_wolfpack.sql
-- (player_profile_translations, agency_profile_translations,
-- ai_translation_events).
--
-- Requires: 0009_supreme_wolfpack.sql aplicado PRIMERO (crea las tablas).
-- Aplicar en supabase-dev primero (avhctddkbcneugtqqxxk); en prod
-- (erdvpcfjynkhcrqktozd) SOLO con autorización explícita del owner.
-- Idempotente: sí (ENABLE RLS no-op si ya activo; DROP POLICY IF EXISTS
--   antes de cada CREATE; DROP TRIGGER IF EXISTS; GRANTs idempotentes).
--
-- Ownership replicado de player_profiles child tables
-- (ddl-rls-mvp_v1.sql L277-292) y blog_posts (0001a_blog_posts_rls.sql).
-- Reusa public.set_updated_at() y public.is_admin(uuid) ya existentes.
--
-- NOTE: las server actions corren como rol postgres (bypass RLS) y validan
-- ownership + tier limit en código (HANDOFF §6). Estas policies son
-- defense-in-depth para acceso directo vía Supabase JS client.
-- ===============================================================

-- ============================================================
-- player_profile_translations
-- ============================================================
ALTER TABLE public.player_profile_translations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS player_profile_translations_set_updated_at
  ON public.player_profile_translations;
CREATE TRIGGER player_profile_translations_set_updated_at
  BEFORE UPDATE ON public.player_profile_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELECT: público SOLO si el perfil padre está publicado (public + approved),
-- igual que el filtro del render en (public)/[slug]/page.tsx — sin el gate de
-- status, un draft/pending (visibility default = public) filtraría su bio /
-- scouting traducido vía el client API antes de aprobación. El dueño ve su
-- traducción en cualquier estado (la edita en draft); admin siempre.
DROP POLICY IF EXISTS player_profile_translations_read
  ON public.player_profile_translations;
CREATE POLICY player_profile_translations_read
  ON public.player_profile_translations
  FOR SELECT
  USING (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id
        and p.visibility = 'public'::visibility
        and p.status = 'approved'::player_status
    )
    or exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

-- INSERT/UPDATE/DELETE: solo el dueño del perfil o admin.
DROP POLICY IF EXISTS player_profile_translations_cud
  ON public.player_profile_translations;
CREATE POLICY player_profile_translations_cud
  ON public.player_profile_translations
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

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.player_profile_translations TO authenticated;
GRANT SELECT ON public.player_profile_translations TO anon;

-- ============================================================
-- agency_profile_translations
-- ============================================================
ALTER TABLE public.agency_profile_translations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS agency_profile_translations_set_updated_at
  ON public.agency_profile_translations;
CREATE TRIGGER agency_profile_translations_set_updated_at
  BEFORE UPDATE ON public.agency_profile_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELECT: público si la agencia está aprobada; su staff y admin siempre.
DROP POLICY IF EXISTS agency_profile_translations_read
  ON public.agency_profile_translations;
CREATE POLICY agency_profile_translations_read
  ON public.agency_profile_translations
  FOR SELECT
  USING (
    exists (
      select 1 from public.agency_profiles a
      where a.id = agency_id and a.is_approved = true
    )
    or exists (
      select 1 from public.user_profiles up
      where up.agency_id = agency_id and up.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

-- CUD: staff de la agencia (user_profiles.agency_id) o admin.
DROP POLICY IF EXISTS agency_profile_translations_cud
  ON public.agency_profile_translations;
CREATE POLICY agency_profile_translations_cud
  ON public.agency_profile_translations
  FOR ALL
  USING (
    exists (
      select 1 from public.user_profiles up
      where up.agency_id = agency_id and up.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  )
  WITH CHECK (
    exists (
      select 1 from public.user_profiles up
      where up.agency_id = agency_id and up.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.agency_profile_translations TO authenticated;
GRANT SELECT ON public.agency_profile_translations TO anon;

-- ============================================================
-- ai_translation_events  (auditoría de costos/quota — PRIVADA, no público)
-- ============================================================
ALTER TABLE public.ai_translation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_translation_events_owner_read
  ON public.ai_translation_events;
CREATE POLICY ai_translation_events_owner_read
  ON public.ai_translation_events
  FOR SELECT
  USING (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS ai_translation_events_owner_insert
  ON public.ai_translation_events;
CREATE POLICY ai_translation_events_owner_insert
  ON public.ai_translation_events
  FOR INSERT
  WITH CHECK (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

-- No anon grant: events son privados (quota/audit). Solo authenticated + admin.
GRANT SELECT, INSERT ON public.ai_translation_events TO authenticated;
