-- ===============================================================
-- 0014a_notifications_rls.sql
--
-- Manual complementario (NO tracked by Drizzle — sin entry en
-- meta/_journal.json). Aplica: ENABLE RLS + policies + GRANTs para la
-- tabla `notifications` creada en 0014_fair_shiva.sql.
--
-- Requires: 0014_fair_shiva.sql aplicado PRIMERO (crea la tabla).
-- Aplicar en supabase-dev primero (ciolizjshimyvyonlssq); en prod
-- (erdvpcfjynkhcrqktozd) SOLO con autorización explícita del owner.
-- Idempotente: sí (ENABLE RLS no-op si ya activo; DROP POLICY IF EXISTS
--   antes de cada CREATE; GRANTs idempotentes).
--
-- Modelo: reutiliza public.is_admin(uuid) ya existente (0009a).
--
-- NOTE: el dashboard lee notifications vía Drizzle (rol postgres, bypass
-- RLS) y los inserts ocurren server-side (admin player edits). Estas
-- policies son defense-in-depth para acceso directo vía Supabase JS
-- client y habilitan un futuro centro/campana de notificaciones in-app.
-- ===============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: el destinatario ve sus propias notificaciones; admin siempre.
DROP POLICY IF EXISTS notifications_recipient_read ON public.notifications;
CREATE POLICY notifications_recipient_read
  ON public.notifications
  FOR SELECT
  USING (
    recipient_user_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- UPDATE: el destinatario solo marca como leídas las suyas (col read_at via
-- GRANT below); no puede reasignar el destinatario. Admin siempre.
DROP POLICY IF EXISTS notifications_recipient_update ON public.notifications;
CREATE POLICY notifications_recipient_update
  ON public.notifications
  FOR UPDATE
  USING (
    recipient_user_id = auth.uid()
    or public.is_admin(auth.uid())
  )
  WITH CHECK (
    recipient_user_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- Sin policy de INSERT/DELETE para authenticated: los inserts los hace el
-- backend (rol postgres / service_role, bypass RLS) desde recordAdminPlayerEdit.

-- GRANTs. Sin grant a anon (notifications son privadas). El destinatario
-- (authenticated) puede leer y actualizar SOLO read_at de sus filas.
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;
