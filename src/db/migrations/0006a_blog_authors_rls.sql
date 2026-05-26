-- ===============================================================
-- 0006a_blog_authors_rls.sql
--
-- Manual complementario (NO tracked by Drizzle, NO entry en
-- meta/_journal.json).
--
-- Aplica:
--   - RLS enable sobre public.blog_authors
--   - Trigger updated_at (reusa public.set_updated_at)
--   - 3 policies: public select, admin all, self update
--   - Trigger BEFORE UPDATE que bloquea cambio de slug por non-admins
--     (fix del comentario Codex P1: enforce slug immutability en DB,
--     no solo app-side, para que clientes Supabase directos no rompan
--     URLs históricas + Article author.@id refs)
--
-- Requires: 0006_sweet_preak.sql aplicado primero (crea la tabla) y
-- public.is_admin(uuid) ya existe (auth schema bootstrap).
--
-- Aplicado en dev (ciolizjshimyvyonlssq) via MCP apply_migration.
-- Aplicado en prod (erdvpcfjynkhcrqktozd) via MCP apply_migration el
-- 2026-05-25 con OK explícito del owner.
--
-- Idempotente: sí (DROP POLICY/TRIGGER/FUNCTION IF EXISTS + CREATE).
-- ===============================================================

-- ============================================================
-- Enable RLS
-- ============================================================
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- updated_at trigger (reusa public.set_updated_at)
-- ============================================================
DROP TRIGGER IF EXISTS blog_authors_set_updated_at ON public.blog_authors;
CREATE TRIGGER blog_authors_set_updated_at
  BEFORE UPDATE ON public.blog_authors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Policies
-- ============================================================

-- 1. Public select: cualquiera (anon + authenticated) ve TODOS los
--    authors. No hay status de "borrador" — un author existe o no.
--    El JSON-LD Person + page /blog/authors/<slug> son públicos por
--    diseño (E-E-A-T amplifier).
DROP POLICY IF EXISTS blog_authors_public_select ON public.blog_authors;
CREATE POLICY blog_authors_public_select ON public.blog_authors
  FOR SELECT
  USING (true);

-- 2. Admin: full read/write/delete. Usado por /admin/blog/authors (UI
--    de admin para crear y editar authors — MVP-3) y por seeds.
DROP POLICY IF EXISTS blog_authors_admin_all ON public.blog_authors;
CREATE POLICY blog_authors_admin_all ON public.blog_authors
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3. Self update: el dueño del row puede actualizar SU PROPIA fila.
--    El bloqueo de cambio de slug NO vive en esta policy — RLS WITH
--    CHECK no soporta comparar OLD vs NEW por columna. El enforce de
--    slug-immutability vive en el trigger blog_authors_protect_slug
--    declarado más abajo (fix del comentario Codex P1).
DROP POLICY IF EXISTS blog_authors_self_update ON public.blog_authors;
CREATE POLICY blog_authors_self_update ON public.blog_authors
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Trigger: prevenir cambio de slug por non-admins (Codex P1 fix)
-- ============================================================
-- Por qué un trigger y no column-level GRANT:
--   - Column GRANT bloquearía también al admin (admin usa el rol
--     "authenticated" + check de is_admin(auth.uid()) en RLS).
--   - El trigger consulta is_admin() y permite admin, bloquea el
--     resto. Mantiene el modelo de "admin via authenticated role"
--     que ya usa el resto de la app.
--   - SECURITY DEFINER + search_path explícito evita ataques de
--     resolución de nombres en el cuerpo del trigger.
--   - WHEN clause skipea la function call cuando slug no cambia
--     (UPDATEs de bio/social URLs no pagan el costo del trigger).
--
-- Operaciones admin que sí necesitan cambiar slug deben correr con
-- service_role (bypasses RLS y triggers SECURITY INVOKER) o
-- autenticadas con un user que pase is_admin(auth.uid())=true.

CREATE OR REPLACE FUNCTION public.blog_authors_protect_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION
      'blog_authors.slug is admin-only (changing it breaks public URLs and JSON-LD author.@id references)'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_authors_protect_slug ON public.blog_authors;
CREATE TRIGGER blog_authors_protect_slug
  BEFORE UPDATE ON public.blog_authors
  FOR EACH ROW
  WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION public.blog_authors_protect_slug();

-- ============================================================
-- GRANTs (compatibility con drizzle role + supabase pooler)
-- ============================================================
GRANT SELECT ON public.blog_authors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_authors TO authenticated;
