-- ===============================================================
-- honours-translations.sql  (F6 — palmarés multilingüe, fase 1)
--
-- Crea player_honour_translations: overrides per-locale de los 3 campos
-- texto-libre de player_honours (title, competition, description). season es
-- un año y awarded_on una fecha → no se traducen.
--
-- Lo aplica el OWNER (protocolo de migración: el agente prepara el SQL, el
-- owner lo aplica). Aplicar en supabase-dev PRIMERO; en prod SOLO con OK
-- explícito. Idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS / GRANTs).
--
-- Reusa public.set_updated_at() y public.is_admin(uuid) ya existentes (ver
-- 0009a_translations_rls.sql). Ownership: translation → player_honours →
-- player_profiles.user_id. Las server actions corren como postgres (bypass
-- RLS) y validan ownership en código; estas policies son defense-in-depth.
--
-- NOTE: NO está tracked por Drizzle (sin entry en meta/_journal). El schema
-- Drizzle (src/db/schema/translations.ts) es la fuente de verdad para las
-- queries de la app; esta tabla se crea con este SQL.
-- ===============================================================

CREATE TABLE IF NOT EXISTS public.player_honour_translations (
  honour_id   uuid NOT NULL REFERENCES public.player_honours(id) ON DELETE CASCADE,
  locale      text NOT NULL,
  title       text,
  competition text,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_honour_translations_pkey PRIMARY KEY (honour_id, locale),
  CONSTRAINT player_honour_translations_locale_check
    CHECK (locale IN ('es', 'en', 'it', 'pt'))
);

ALTER TABLE public.player_honour_translations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS player_honour_translations_set_updated_at
  ON public.player_honour_translations;
CREATE TRIGGER player_honour_translations_set_updated_at
  BEFORE UPDATE ON public.player_honour_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELECT: público SOLO si el perfil padre está publicado (public + approved),
-- igual que player_profile_translations. El dueño ve su traducción en cualquier
-- estado; admin siempre.
DROP POLICY IF EXISTS player_honour_translations_read
  ON public.player_honour_translations;
CREATE POLICY player_honour_translations_read
  ON public.player_honour_translations
  FOR SELECT
  USING (
    exists (
      select 1
      from public.player_honours h
      join public.player_profiles p on p.id = h.player_id
      where h.id = honour_id
        and p.visibility = 'public'::visibility
        and p.status = 'approved'::player_status
    )
    or exists (
      select 1
      from public.player_honours h
      join public.player_profiles p on p.id = h.player_id
      where h.id = honour_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

-- INSERT/UPDATE/DELETE: solo el dueño del perfil del honor, o admin.
DROP POLICY IF EXISTS player_honour_translations_cud
  ON public.player_honour_translations;
CREATE POLICY player_honour_translations_cud
  ON public.player_honour_translations
  FOR ALL
  USING (
    exists (
      select 1
      from public.player_honours h
      join public.player_profiles p on p.id = h.player_id
      where h.id = honour_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  )
  WITH CHECK (
    exists (
      select 1
      from public.player_honours h
      join public.player_profiles p on p.id = h.player_id
      where h.id = honour_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.player_honour_translations TO authenticated;
GRANT SELECT ON public.player_honour_translations TO anon;
