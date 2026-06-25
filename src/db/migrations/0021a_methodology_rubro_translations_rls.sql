-- ===============================================================
-- 0021a_methodology_rubro_translations_rls.sql
--
-- Manual complementario (no tracked by Drizzle).
-- Aplica: RLS + GRANTs + trigger updated_at para
--   coach_methodology_rubro_translations (creada por 0021). Espeja
--   coach_honour_translations (0015a): lectura pública gateada por el perfil
--   padre approved+public; el dueño y admin pueden CUD. Diferencia: además
--   exige rubro.status='approved' en la rama pública (los rubros son
--   pre-moderados; no exponer traducciones de rubros pending).
-- Requires: 0021 (crea la tabla) + 0015a (set_updated_at, is_admin).
-- Aplicado en dev  (ciolizjshimyvyonlssq) via MCP apply_migration el 2026-06-25.
-- Aplicado en prod (erdvpcfjynkhcrqktozd) via MCP apply_migration el 2026-06-25.
-- Idempotente: sí (DROP IF EXISTS + CREATE).
-- ===============================================================

ALTER TABLE public.coach_methodology_rubro_translations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_methodology_rubro_translations_set_updated_at ON public.coach_methodology_rubro_translations;
CREATE TRIGGER coach_methodology_rubro_translations_set_updated_at
  BEFORE UPDATE ON public.coach_methodology_rubro_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS coach_methodology_rubro_translations_read ON public.coach_methodology_rubro_translations;
CREATE POLICY coach_methodology_rubro_translations_read
  ON public.coach_methodology_rubro_translations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_methodology_rubros r
      JOIN public.coach_profiles p ON p.id = r.coach_id
      WHERE r.id = coach_methodology_rubro_translations.rubro_id
        AND p.visibility = 'public'::visibility
        AND p.status = 'approved'::player_status
        AND r.status = 'approved'::review_status
    )
    OR EXISTS (
      SELECT 1 FROM public.coach_methodology_rubros r
      JOIN public.coach_profiles p ON p.id = r.coach_id
      WHERE r.id = coach_methodology_rubro_translations.rubro_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS coach_methodology_rubro_translations_cud ON public.coach_methodology_rubro_translations;
CREATE POLICY coach_methodology_rubro_translations_cud
  ON public.coach_methodology_rubro_translations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_methodology_rubros r
      JOIN public.coach_profiles p ON p.id = r.coach_id
      WHERE r.id = coach_methodology_rubro_translations.rubro_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_methodology_rubros r
      JOIN public.coach_profiles p ON p.id = r.coach_id
      WHERE r.id = coach_methodology_rubro_translations.rubro_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

GRANT SELECT ON public.coach_methodology_rubro_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_methodology_rubro_translations TO authenticated;
GRANT ALL ON public.coach_methodology_rubro_translations TO service_role;
