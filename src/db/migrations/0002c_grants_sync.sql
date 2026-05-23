-- ===============================================================
-- 0002c_grants_sync.sql
--
-- Manual complementario (no tracked by Drizzle). Tipo D — sync de drift.
--
-- Aplica:
--   1. GRANT base (USAGE en schema + ALL en tablas/sequences/functions)
--      para anon, authenticated, service_role en `public`.
--   2. ALTER DEFAULT PRIVILEGES para que toda CREATE TABLE / SEQUENCE /
--      FUNCTION futura herede los mismos grants sin trabajo manual.
--
-- Why:
--   Después del rebuild de la branch dev post-recovery (2026-05-17), el
--   schema `public` en dev quedó con grants SOLO para `postgres`. Los
--   roles que usa Supabase (anon, authenticated, service_role) no tenían
--   GRANT en 50/55 tablas, incluido `user_profiles`. Postgres chequea
--   GRANT antes de RLS, así que cualquier query desde el cliente Supabase
--   con JWT (rol `authenticated`) fallaba silenciosamente con
--   "permission denied" y los layouts del app interpretaban el NULL como
--   "no autorizado", redirigiendo a /dashboard.
--
--   Síntoma observado: con role='admin' en user_profiles, /admin
--   redirigía a /dashboard porque el SELECT del layout fallaba por GRANT.
--
--   Main (supabase-main, erdvpcfjynkhcrqktozd) tiene los default
--   privileges correctamente configurados desde el bootstrap, por eso
--   prod no tiene este síntoma.
--
-- Security note:
--   Esto NO debilita seguridad. RLS sigue habilitada en todas las tablas
--   sensibles y filtra fila por fila. El GRANT solo le dice a Postgres
--   "podés intentar leer", la policy decide qué filas devuelve. La regla
--   en BallersHub es "RLS-first": las policies son el muro.
--
-- Requires:
--   - schema `public` existe (siempre).
--   - Tablas/funciones/sequences ya creadas por Drizzle migrations.
--
-- Idempotente: sí (GRANT ALL repetido no rompe, ALTER DEFAULT PRIVILEGES
-- es declarativo y reemplaza el entry existente para esa combinación
-- role × schema × objtype).
--
-- Aplicado en dev via MCP apply_migration con name='0002b_grants_sync' el 2026-05-22.
--   ⚠️ Solo las secciones (1) y (2) corrieron via MCP. La sección (3)
--   (ALTER DEFAULT PRIVILEGES) requiere el rol `supabase_admin` o
--   `postgres` superuser y el role del MCP no lo tiene; fue rechazado con
--   "permission denied to change default privileges". Para cerrar el loop
--   y que tablas nuevas hereden grants automáticamente, ejecutar la
--   sección (3) manualmente desde Supabase Studio dev (SQL editor corre
--   como supabase_admin) o desde psql con el connection string del pooler
--   apuntando a postgres user.
-- Aplicado en prod: NO requerido — prod ya tiene los grants y defaults correctos.
--   (El archivo se mantiene idempotente para soportar bootstrap desde cero.)
-- ===============================================================

-- 1) Schema usage  [APLICADO via MCP en dev 2026-05-22]
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2) Retroactivo: tablas/secuencias/funciones existentes  [APLICADO via MCP en dev 2026-05-22]
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 3) Default privileges (futuros objetos)  [PENDIENTE — correr en Supabase Studio dev]
--    Replicamos los dos owners que aparecen en main: postgres + supabase_admin.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
