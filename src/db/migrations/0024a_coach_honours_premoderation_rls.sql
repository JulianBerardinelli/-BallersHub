-- ===============================================================
-- 0024a_coach_honours_premoderation_rls.sql
--
-- Manual complementario (no tracked by Drizzle).
-- P1.2 "Logros por etapa con video" convierte coach_honours en un módulo
-- editable + PRE-MODERADO (antes la tabla no se editaba: 0 filas, sin status).
-- 0024_*.sql agregó video_url/position/status/review cols; este reemplaza las
-- 2 policies viejas (manage_owner ALL + select_public sin status) por el patrón
-- pre-moderado canónico (espeja 0023a de game-ideas):
--   - público (anon): sólo status='approved' de un perfil approved+public.
--   - dueño: CRUD lo suyo pero NO auto-aprobar (WITH CHECK status <> 'approved').
--   - admin/service_role: bypass (el approve corre admin-side).
-- Requires: 0024_*.sql aplicado primero + 0015a (set_updated_at, is_admin).
-- Idempotente: sí (DROP POLICY/TRIGGER IF EXISTS + CREATE).
-- Ver docs/staff/PLAN.md §5.2 (Logros por etapa).
-- ===============================================================

ALTER TABLE public.coach_honours ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_honours_set_updated_at ON public.coach_honours;
CREATE TRIGGER coach_honours_set_updated_at
  BEFORE UPDATE ON public.coach_honours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reemplazo de las policies legacy (sin status).
DROP POLICY IF EXISTS coach_honours_manage_owner ON public.coach_honours;
DROP POLICY IF EXISTS coach_honours_select_public ON public.coach_honours;

-- Público: sólo logros aprobados de un perfil approved+public. Dueño/admin ven todo.
CREATE POLICY coach_honours_select_public
  ON public.coach_honours
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_honours.coach_id
        AND (
          (
            (p.status = 'approved'::player_status) AND (p.visibility = 'public'::visibility)
            AND coach_honours.status = 'approved'::review_status
          )
          OR (p.user_id = auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

-- Insert: el dueño puede crear, pero NO con status='approved' (sólo admin aprueba).
CREATE POLICY coach_honours_insert_owner
  ON public.coach_honours
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (status <> 'approved'::review_status)
      AND EXISTS (
        SELECT 1 FROM public.coach_profiles p
        WHERE p.id = coach_honours.coach_id AND p.user_id = auth.uid()
      )
    )
  );

-- Update: el dueño edita lo suyo; cualquier edición lo deja en !='approved'.
CREATE POLICY coach_honours_update_owner
  ON public.coach_honours
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_honours.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (status <> 'approved'::review_status)
      AND EXISTS (
        SELECT 1 FROM public.coach_profiles p
        WHERE p.id = coach_honours.coach_id AND p.user_id = auth.uid()
      )
    )
  );

-- Delete: dueño o admin.
CREATE POLICY coach_honours_delete_owner
  ON public.coach_honours
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_honours.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_honours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_honours TO authenticated;
GRANT ALL ON public.coach_honours TO service_role;
