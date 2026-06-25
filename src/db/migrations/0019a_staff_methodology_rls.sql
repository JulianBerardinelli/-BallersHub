-- ===============================================================
-- 0019a_staff_methodology_rls.sql
--
-- Manual complementario (no tracked by Drizzle).
-- Aplica: RLS + GRANTs + trigger updated_at para coach_methodology_rubros
--   (tabla creada por 0019_chilly_cannonball.sql). Pre-moderada igual que
--   coach_media: nace status='pending', el público sólo ve 'approved', el dueño
--   puede CRUD lo suyo pero NO auto-aprobar (WITH CHECK status <> 'approved');
--   el approve real corre admin-side como service_role (bypass RLS).
--   Gateada por el padre coach_profiles (approved + public) para el público.
-- Requires: 0019_*.sql aplicado primero (crea la tabla) + 0015a (define
--   public.set_updated_at() y public.is_admin()).
-- Aplicado en dev (ciolizjshimyvyonlssq) via MCP apply_migration el 2026-06-24.
-- Aplicado en prod (erdvpcfjynkhcrqktozd) via MCP apply_migration el 2026-06-24.
-- Idempotente: sí (DROP POLICY/TRIGGER IF EXISTS + CREATE).
-- Ver docs/staff/PLAN.md §5.2.
-- ===============================================================

ALTER TABLE public.coach_methodology_rubros ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_methodology_rubros_set_updated_at ON public.coach_methodology_rubros;
CREATE TRIGGER coach_methodology_rubros_set_updated_at
  BEFORE UPDATE ON public.coach_methodology_rubros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Público: sólo rubros aprobados de un perfil approved+public. Dueño/admin ven todo.
DROP POLICY IF EXISTS coach_methodology_rubros_select_public ON public.coach_methodology_rubros;
CREATE POLICY coach_methodology_rubros_select_public
  ON public.coach_methodology_rubros
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_methodology_rubros.coach_id
        AND (
          (
            (p.status = 'approved'::player_status) AND (p.visibility = 'public'::visibility)
            AND coach_methodology_rubros.status = 'approved'::review_status
          )
          OR (p.user_id = auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

-- Insert: el dueño puede crear, pero NO con status='approved' (sólo admin aprueba).
DROP POLICY IF EXISTS coach_methodology_rubros_insert_owner ON public.coach_methodology_rubros;
CREATE POLICY coach_methodology_rubros_insert_owner
  ON public.coach_methodology_rubros
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (status <> 'approved'::review_status)
      AND EXISTS (
        SELECT 1 FROM public.coach_profiles p
        WHERE p.id = coach_methodology_rubros.coach_id AND p.user_id = auth.uid()
      )
    )
  );

-- Update: el dueño edita lo suyo; cualquier edición lo deja en !='approved'.
DROP POLICY IF EXISTS coach_methodology_rubros_update_owner ON public.coach_methodology_rubros;
CREATE POLICY coach_methodology_rubros_update_owner
  ON public.coach_methodology_rubros
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_methodology_rubros.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (status <> 'approved'::review_status)
      AND EXISTS (
        SELECT 1 FROM public.coach_profiles p
        WHERE p.id = coach_methodology_rubros.coach_id AND p.user_id = auth.uid()
      )
    )
  );

-- Delete: dueño o admin.
DROP POLICY IF EXISTS coach_methodology_rubros_delete_owner ON public.coach_methodology_rubros;
CREATE POLICY coach_methodology_rubros_delete_owner
  ON public.coach_methodology_rubros
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_methodology_rubros.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_methodology_rubros TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_methodology_rubros TO authenticated;
GRANT ALL ON public.coach_methodology_rubros TO service_role;
