-- ===============================================================
-- 0002a_auth_user_profile_trigger.sql
--
-- Manual complementario (no tracked by Drizzle). Tipo B — trigger.
--
-- Aplica:
--   1. Trigger `on_auth_user_created` en `auth.users` que dispara
--      `public.handle_new_user()` y crea la fila en `public.user_profiles`.
--   2. Backfill de cualquier `auth.users` existente que no tenga perfil
--      todavía (caso dev: usuarios creados antes de que el trigger existiera).
--
-- Requires:
--   - `public.user_profiles` ya creada (Drizzle, 0000_initial_baseline.sql).
--   - `public.handle_new_user()` ya creada (existe en dev y prod).
--
-- Historia:
--   El trigger existía en supabase-main desde antes del workflow Drizzle
--   pero nunca quedó versionado en el repo. Cuando se reconstruyó la
--   branch dev (post-recovery 2026-05-17) la función vino con el journal
--   pero el trigger no, así que en dev los nuevos signups dejaron de
--   replicarse a `user_profiles`. Este archivo cierra ese hueco.
--
-- Idempotente: sí (DROP TRIGGER IF EXISTS + INSERT ... WHERE NOT EXISTS).
--
-- Aplicado en dev via MCP apply_migration con name='0002a_auth_user_profile_trigger' el 2026-05-22.
-- Aplicado en prod: NO requerido — el trigger ya existe en supabase-main.
--   (El archivo se mantiene idempotente para soportar bootstrap desde cero.)
-- ===============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: cubre los auth.users que ya existían antes del trigger.
INSERT INTO public.user_profiles (user_id, role)
SELECT u.id, 'member'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
);
