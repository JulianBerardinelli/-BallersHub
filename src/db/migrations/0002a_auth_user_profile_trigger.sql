-- ===============================================================
-- 0002a_auth_user_profile_trigger.sql
--
-- Manual complementario (NO tracked by Drizzle — sin entry en
-- meta/_journal.json). Versiona el trigger de auth que crea la fila
-- public.user_profiles cuando nace un usuario en auth.users, más el
-- backfill defensivo para usuarios preexistentes.
--
-- POR QUÉ EXISTE ESTE ARCHIVO: el objeto ya está aplicado en dev
-- (supabase_migrations entry 20260522180531 '0002a_auth_user_profile_trigger')
-- y en prod, pero el .sql se había perdido del repo (quedó solo en el
-- tracker de Supabase). Esto lo re-versiona para que el repo sea la
-- fuente reproducible. NO requiere re-aplicar: ver "Estado".
--
-- Requires: baseline 0000 aplicado (crea public.user_profiles + el enum
--   role con label 'member'). auth.users es Supabase-managed.
-- Idempotente: sí (CREATE OR REPLACE FUNCTION; DROP TRIGGER IF EXISTS antes
--   del CREATE TRIGGER; backfill con WHERE NOT EXISTS).
--
-- Estado:
--   - dev  (ciolizjshimyvyonlssq): YA APLICADO (2026-05-22).
--   - prod (erdvpcfjynkhcrqktozd): YA APLICADO.
--   Re-aplicarlo es seguro (idempotente) pero innecesario.
--
-- Definiciones capturadas 1:1 de la DB viva (pg_get_functiondef /
-- pg_get_triggerdef en dev, 2026-06-13).
-- ===============================================================

-- ---------------------------------------------------------------
-- Función: crea user_profiles(role='member') para el nuevo auth user
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (user_id, role)
  SELECT NEW.id, 'member'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = NEW.id
  );
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------
-- Trigger: AFTER INSERT en auth.users
-- ---------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------
-- Backfill: garantizar user_profiles para auth users preexistentes
-- ---------------------------------------------------------------
INSERT INTO public.user_profiles (user_id, role)
SELECT u.id, 'member'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
);
