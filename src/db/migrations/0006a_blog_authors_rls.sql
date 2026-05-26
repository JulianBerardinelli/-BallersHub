-- ===============================================================
-- 0003a_blog_authors_rls.sql
--
-- Manual complementario (NO tracked by Drizzle, NO entry en
-- meta/_journal.json).
--
-- Aplica:
--   - RLS enable sobre public.blog_authors
--   - Trigger updated_at (reusa public.set_updated_at)
--   - 4 policies: public select, admin all, self update, admin all-mutate
--
-- Requires: 0003_supreme_mastermind.sql aplicado primero (crea la tabla).
--
-- Aplicado en dev (avhctddkbcneugtqqxxk) via MCP apply_migration el
-- <pendiente — completar al aplicar>.
-- Aplicado en prod (erdvpcfjynkhcrqktozd) — pendiente, requiere
-- autorización explícita del owner antes del merge dev→main.
--
-- Idempotente: sí (DROP POLICY IF EXISTS antes de cada CREATE).
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
--    No incluye slug (que es URL pública y rompe links históricos
--    si cambia) — el cambio de slug requiere admin. Para enforce eso
--    al nivel de RLS sin CHECK condicional por columna, mantenemos la
--    policy a "update libre de columnas no-críticas" y el slug se
--    bloquea app-side en la server action. La policy admin_all puede
--    cambiar el slug sin restricción.
--
--    En el WITH CHECK no validamos columnas individuales porque
--    Postgres no soporta column-level WITH CHECK sin triggers; la app
--    es la línea de defensa en el campo slug.
DROP POLICY IF EXISTS blog_authors_self_update ON public.blog_authors;
CREATE POLICY blog_authors_self_update ON public.blog_authors
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- GRANTs (compatibility con drizzle role + supabase pooler)
-- ============================================================
GRANT SELECT ON public.blog_authors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_authors TO authenticated;
