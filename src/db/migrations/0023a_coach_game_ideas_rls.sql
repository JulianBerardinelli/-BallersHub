-- ===============================================================
-- 0023a_coach_game_ideas_rls.sql
--
-- Manual complementario (no tracked by Drizzle).
-- Aplica: RLS + GRANTs + trigger updated_at para coach_game_ideas
--   (tabla creada por 0023_aromatic_rocket_racer.sql). Pre-moderada igual que
--   coach_methodology_rubros: nace status='pending', el público sólo ve
--   'approved', el dueño puede CRUD lo suyo pero NO auto-aprobar (WITH CHECK
--   status <> 'approved'); el approve real corre admin-side como service_role
--   (bypass RLS). Gateada por el padre coach_profiles (approved + public) para
--   el público.
-- Requires: 0023_*.sql aplicado primero (crea la tabla) + 0015a (define
--   public.set_updated_at() y public.is_admin()).
-- Idempotente: sí (DROP POLICY/TRIGGER IF EXISTS + CREATE).
-- Ver docs/staff/PLAN.md §5.2 (Ideas de Juego — pizarra).
-- ===============================================================

ALTER TABLE public.coach_game_ideas ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_game_ideas_set_updated_at ON public.coach_game_ideas;
CREATE TRIGGER coach_game_ideas_set_updated_at
  BEFORE UPDATE ON public.coach_game_ideas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Público: sólo ideas aprobadas de un perfil approved+public. Dueño/admin ven todo.
DROP POLICY IF EXISTS coach_game_ideas_select_public ON public.coach_game_ideas;
CREATE POLICY coach_game_ideas_select_public
  ON public.coach_game_ideas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_game_ideas.coach_id
        AND (
          (
            (p.status = 'approved'::player_status) AND (p.visibility = 'public'::visibility)
            AND coach_game_ideas.status = 'approved'::review_status
          )
          OR (p.user_id = auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

-- Insert: el dueño puede crear, pero NO con status='approved' (sólo admin aprueba).
DROP POLICY IF EXISTS coach_game_ideas_insert_owner ON public.coach_game_ideas;
CREATE POLICY coach_game_ideas_insert_owner
  ON public.coach_game_ideas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (status <> 'approved'::review_status)
      AND EXISTS (
        SELECT 1 FROM public.coach_profiles p
        WHERE p.id = coach_game_ideas.coach_id AND p.user_id = auth.uid()
      )
    )
  );

-- Update: el dueño edita lo suyo; cualquier edición lo deja en !='approved'.
DROP POLICY IF EXISTS coach_game_ideas_update_owner ON public.coach_game_ideas;
CREATE POLICY coach_game_ideas_update_owner
  ON public.coach_game_ideas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_game_ideas.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (status <> 'approved'::review_status)
      AND EXISTS (
        SELECT 1 FROM public.coach_profiles p
        WHERE p.id = coach_game_ideas.coach_id AND p.user_id = auth.uid()
      )
    )
  );

-- Delete: dueño o admin.
DROP POLICY IF EXISTS coach_game_ideas_delete_owner ON public.coach_game_ideas;
CREATE POLICY coach_game_ideas_delete_owner
  ON public.coach_game_ideas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_game_ideas.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_game_ideas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_game_ideas TO authenticated;
GRANT ALL ON public.coach_game_ideas TO service_role;
