-- ===============================================================
-- 0011a_coach_rls_and_infra.sql
--
-- Manual complementario (NO tracked by Drizzle — sin entry en
-- meta/_journal.json). Aplica todo lo que el schema Drizzle 0011
-- (0011_coach_pack.sql) NO expresa para las 23 tablas coach_*:
--   (1) CONSTRAINTS  — FKs a auth.users(id) + UNIQUE(user_id) +
--                      las 2 FKs de coach_stats_revision_items que 0011
--                      dejó sin crear.
--   (2) RLS-CORE     — coach_profiles + hijas públicas (career_items,
--                      honours, links, articles, theme_settings,
--                      sections_visibility, stats_seasons, media, licenses,
--                      personal_details) — ENABLE RLS + policies + GRANTs
--                      + triggers updated_at.
--   (3) RLS-MODERATION — applications, proposals, revision_requests/items/
--                      proposed_teams, stats_revision_items, translations,
--                      ai_translation_events, leads/clicks/change_logs.
--   (4) STORAGE      — bucket coach-media (público, 5MB, jpeg/png/webp/avif)
--                      + storage.objects policies scoped por carpeta.
--   (5) RPCS         — get_limits_for_coach, coach_max_media_allowed,
--                      coach_can_add_media, approve_coach_application,
--                      materialize_coach_career_from_application.
--   (6) VIEW + MISC  — coach_dashboard_state + CHECK swap audience +'coach'.
--
-- Requires: 0011_coach_pack.sql aplicado PRIMERO (crea las 23 tablas
--   coach_* y los FKs intra-public).
-- Aplicar en supabase-dev primero (ciolizjshimyvyonlssq); en prod
-- (erdvpcfjynkhcrqktozd) SOLO con autorización explícita del owner.
-- Idempotente: sí (ENABLE RLS no-op si ya activo; DROP POLICY/TRIGGER
--   IF EXISTS antes de cada CREATE; ADD CONSTRAINT vía guard DO $$;
--   CREATE OR REPLACE FUNCTION/VIEW; INSERT ... ON CONFLICT; GRANTs
--   idempotentes).
--
-- Ownership/policies replicados de las definiciones VIVAS del player en dev
-- (ciolizjshimyvyonlssq, solo lectura) + 0009a (translations RLS) +
-- 0006c (blog-media bucket) + HANDOFF §2.2 (FKs auth.users — mejora coach).
-- Reusa public.is_admin(uuid) (solo role='admin') y public.set_updated_at()
-- ya existentes — NO los redefine.
--
-- NOTE: las server actions corren como rol postgres (bypass RLS) y validan
-- ownership + tier limit en código. Estas policies son defense-in-depth para
-- acceso directo vía Supabase JS client.
-- ===============================================================


-- ============================================================
-- SECCIÓN CONSTRAINTS
-- FKs a auth.users(id) (Drizzle no las expresa), UNIQUE(user_id),
-- y las 2 FKs de coach_stats_revision_items que 0011 dejó sin crear.
--
-- Idempotente: cada ADD CONSTRAINT va dentro de un DO-block que chequea
-- pg_constraint.conname (FK no soporta "ADD CONSTRAINT IF NOT EXISTS" nativo).
-- Nombres estilo player: <tabla>_<col>_fkey / <tabla>_<col>_unique
-- (Postgres trunca a 63 chars; ninguno de estos lo excede).
--
-- Recon vivo (dev ciolizjshimyvyonlssq, solo lectura) confirma el espejo:
--   player_profiles_user_id_fkey            → auth.users(id) ON DELETE CASCADE
--   player_profiles_user_id_unique          → UNIQUE (user_id)
--   player_applications_user_id_fkey        → auth.users(id) ON DELETE CASCADE
--   player_applications_reviewed_by_user_id_fkey       → SET NULL
--   career_item_proposals_created_by_user_id_fkey      → CASCADE
--   career_item_proposals_reviewed_by_user_id_fkey     → SET NULL
--   career_revision_requests_submitted_by_user_id_fkey → CASCADE
--   career_revision_requests_reviewed_by_user_id_fkey  → SET NULL
--   stats_revision_items_original_stat_id_fkey → stats_seasons(id) ON DELETE SET NULL
--   stats_revision_items_career_item_id_fkey   → career_items(id)  ON DELETE SET NULL
--
-- NOTA: esta sección es la HOME canónica de TODAS las FKs a auth.users del
-- pack coach. La sección RLS-MODERATION NO vuelve a emitirlas (se removió el
-- bloque duplicado en el ensamblado).
-- ============================================================

-- ------------------------------------------------------------
-- 1) FKs a auth.users(id) — columnas de DUEÑO (ON DELETE CASCADE)
--    coach_profiles.user_id, coach_applications.user_id,
--    coach_career_item_proposals.created_by_user_id,
--    coach_career_revision_requests.submitted_by_user_id,
--    coach_change_logs.user_id
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_profiles
      ADD CONSTRAINT coach_profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_applications_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_applications
      ADD CONSTRAINT coach_applications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_career_item_proposals_created_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_career_item_proposals
      ADD CONSTRAINT coach_career_item_proposals_created_by_user_id_fkey
      FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_career_revision_requests_submitted_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_career_revision_requests
      ADD CONSTRAINT coach_career_revision_requests_submitted_by_user_id_fkey
      FOREIGN KEY (submitted_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- coach_change_logs.user_id → ON DELETE SET NULL (NO cascade). Es un audit log
-- con actor NULLABLE (0011 L139): borrar al usuario debe NULEAR el actor y
-- PRESERVAR la fila de auditoría, no borrarla. Paridad con el player vivo
-- (profile_change_logs.user_id = SET NULL).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_change_logs_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_change_logs
      ADD CONSTRAINT coach_change_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) FKs a auth.users(id) — columnas de REVISOR/VIEWER (ON DELETE SET NULL)
--    coach_applications.reviewed_by_user_id,
--    coach_career_item_proposals.reviewed_by_user_id,
--    coach_career_revision_requests.reviewed_by_user_id,
--    coach_media.reviewed_by_user_id,
--    coach_licenses.reviewed_by_user_id,
--    coach_contact_clicks.viewer_user_id
--
-- NOTA: coach_media/coach_licenses.reviewed_by_user_id y
-- coach_contact_clicks.viewer_user_id NO tienen equivalente FK en el player vivo
-- (query Recon → []). El coach las agrega por diseño explícito (HANDOFF §2.2):
-- mejora de integridad referencial sobre el player. SET NULL preserva la fila
-- de moderación / el click log si se borra el revisor / viewer.
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_applications_reviewed_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_applications
      ADD CONSTRAINT coach_applications_reviewed_by_user_id_fkey
      FOREIGN KEY (reviewed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_career_item_proposals_reviewed_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_career_item_proposals
      ADD CONSTRAINT coach_career_item_proposals_reviewed_by_user_id_fkey
      FOREIGN KEY (reviewed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_career_revision_requests_reviewed_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_career_revision_requests
      ADD CONSTRAINT coach_career_revision_requests_reviewed_by_user_id_fkey
      FOREIGN KEY (reviewed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_media_reviewed_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_media
      ADD CONSTRAINT coach_media_reviewed_by_user_id_fkey
      FOREIGN KEY (reviewed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_licenses_reviewed_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_licenses
      ADD CONSTRAINT coach_licenses_reviewed_by_user_id_fkey
      FOREIGN KEY (reviewed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_contact_clicks_viewer_user_id_fkey'
  ) THEN
    ALTER TABLE public.coach_contact_clicks
      ADD CONSTRAINT coach_contact_clicks_viewer_user_id_fkey
      FOREIGN KEY (viewer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) UNIQUE(user_id) en coach_profiles — 1 perfil por user
--    (espejo de player_profiles_user_id_unique)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_profiles_user_id_unique'
  ) THEN
    ALTER TABLE public.coach_profiles
      ADD CONSTRAINT coach_profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) FKs de coach_stats_revision_items que 0011 dejó sin crear
--    (dependencia circular en el orden de tablas de Drizzle).
--    original_stat_id -> coach_stats_seasons(id) ON DELETE SET NULL
--    career_item_id   -> coach_career_items(id)  ON DELETE SET NULL
--    Paridad con stats_revision_items del player (Recon confirma ambas).
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_stats_revision_items_original_stat_id_fkey'
  ) THEN
    ALTER TABLE public.coach_stats_revision_items
      ADD CONSTRAINT coach_stats_revision_items_original_stat_id_fkey
      FOREIGN KEY (original_stat_id) REFERENCES public.coach_stats_seasons(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_stats_revision_items_career_item_id_fkey'
  ) THEN
    ALTER TABLE public.coach_stats_revision_items
      ADD CONSTRAINT coach_stats_revision_items_career_item_id_fkey
      FOREIGN KEY (career_item_id) REFERENCES public.coach_career_items(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ============================================================
-- SECCIÓN RLS-CORE — coach_profiles + hijas públicas
--
-- Tablas: coach_profiles, coach_career_items, coach_honours,
--   coach_links, coach_articles, coach_theme_settings,
--   coach_sections_visibility, coach_personal_details,
--   coach_stats_seasons, coach_media, coach_licenses.
--
-- Espeja las expresiones USING/WITH CHECK vivas del player en dev
-- (ciolizjshimyvyonlssq, solo lectura — Recon B), con la convención de
-- nombres consistente coach: <tabla>_select_public / <tabla>_manage_owner.
-- Reusa public.is_admin(uuid) y public.set_updated_at() (NO redefinidos).
--
-- Gating: el público/anon SOLO ve filas cuyo perfil padre esté
-- (status='approved' AND visibility='public'); el dueño ve lo suyo en
-- cualquier estado; admin siempre.
--   • coach_media / coach_licenses: pre-moderación per-fila por status.
--   • coach_personal_details: SIN select público (datos privados).
-- Idempotente: ENABLE RLS no-op si ya activo; DROP POLICY/TRIGGER IF EXISTS
--   antes de cada CREATE; GRANTs idempotentes.
-- ============================================================

-- ============================================================
-- coach_profiles  (perfil raíz — gatea a todas las hijas)
-- ============================================================
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_profiles_set_updated_at ON public.coach_profiles;
CREATE TRIGGER coach_profiles_set_updated_at
  BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELECT: público si (approved + public); el dueño ve su perfil en
-- cualquier estado (lo edita en draft); admin siempre.
DROP POLICY IF EXISTS coach_profiles_select_public ON public.coach_profiles;
CREATE POLICY coach_profiles_select_public
  ON public.coach_profiles
  FOR SELECT
  USING (
    ((status = 'approved'::player_status) AND (visibility = 'public'::visibility))
    OR (user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- INSERT: el propio usuario o admin.
DROP POLICY IF EXISTS coach_profiles_insert_self ON public.coach_profiles;
CREATE POLICY coach_profiles_insert_self
  ON public.coach_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid()) OR public.is_admin(auth.uid())
  );

-- UPDATE: el dueño o admin (USING + WITH CHECK).
DROP POLICY IF EXISTS coach_profiles_update_own ON public.coach_profiles;
CREATE POLICY coach_profiles_update_own
  ON public.coach_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid()) OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    (user_id = auth.uid()) OR public.is_admin(auth.uid())
  );

-- DELETE: solo admin.
DROP POLICY IF EXISTS coach_profiles_delete_admin ON public.coach_profiles;
CREATE POLICY coach_profiles_delete_admin
  ON public.coach_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

GRANT SELECT ON public.coach_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_profiles TO authenticated;
GRANT ALL ON public.coach_profiles TO service_role;

-- ============================================================
-- coach_career_items  (hija gateada por coach_profiles)
-- ============================================================
ALTER TABLE public.coach_career_items ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_career_items_set_updated_at ON public.coach_career_items;
CREATE TRIGGER coach_career_items_set_updated_at
  BEFORE UPDATE ON public.coach_career_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS coach_career_items_select_public ON public.coach_career_items;
CREATE POLICY coach_career_items_select_public
  ON public.coach_career_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_career_items.coach_id
        AND (
          ((p.status = 'approved'::player_status) AND (p.visibility = 'public'::visibility))
          OR (p.user_id = auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS coach_career_items_manage_owner ON public.coach_career_items;
CREATE POLICY coach_career_items_manage_owner
  ON public.coach_career_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_career_items.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_career_items.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_career_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_career_items TO authenticated;
GRANT ALL ON public.coach_career_items TO service_role;

-- ============================================================
-- coach_honours  (hija gateada por coach_profiles)
-- ============================================================
ALTER TABLE public.coach_honours ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_honours_set_updated_at ON public.coach_honours;
CREATE TRIGGER coach_honours_set_updated_at
  BEFORE UPDATE ON public.coach_honours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS coach_honours_select_public ON public.coach_honours;
CREATE POLICY coach_honours_select_public
  ON public.coach_honours
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_honours.coach_id
        AND (
          ((p.status = 'approved'::player_status) AND (p.visibility = 'public'::visibility))
          OR (p.user_id = auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS coach_honours_manage_owner ON public.coach_honours;
CREATE POLICY coach_honours_manage_owner
  ON public.coach_honours
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_honours.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_honours.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_honours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_honours TO authenticated;
GRANT ALL ON public.coach_honours TO service_role;

-- ============================================================
-- coach_links  (hija gateada por coach_profiles)
-- ============================================================
ALTER TABLE public.coach_links ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_links_set_updated_at ON public.coach_links;
CREATE TRIGGER coach_links_set_updated_at
  BEFORE UPDATE ON public.coach_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS coach_links_select_public ON public.coach_links;
CREATE POLICY coach_links_select_public
  ON public.coach_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_links.coach_id
        AND (
          ((p.status = 'approved'::player_status) AND (p.visibility = 'public'::visibility))
          OR (p.user_id = auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS coach_links_manage_owner ON public.coach_links;
CREATE POLICY coach_links_manage_owner
  ON public.coach_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_links.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_links.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_links TO authenticated;
GRANT ALL ON public.coach_links TO service_role;

-- ============================================================
-- coach_articles  (hija gateada por coach_profiles — SIN updated_at)
-- ============================================================
ALTER TABLE public.coach_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_articles_select_public ON public.coach_articles;
CREATE POLICY coach_articles_select_public
  ON public.coach_articles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_articles.coach_id
        AND (
          ((p.status = 'approved'::player_status) AND (p.visibility = 'public'::visibility))
          OR (p.user_id = auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS coach_articles_manage_owner ON public.coach_articles;
CREATE POLICY coach_articles_manage_owner
  ON public.coach_articles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_articles.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_articles.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_articles TO authenticated;
GRANT ALL ON public.coach_articles TO service_role;

-- ============================================================
-- coach_theme_settings  (hija gateada por coach_profiles; PK = coach_id)
-- ============================================================
ALTER TABLE public.coach_theme_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_theme_settings_set_updated_at ON public.coach_theme_settings;
CREATE TRIGGER coach_theme_settings_set_updated_at
  BEFORE UPDATE ON public.coach_theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS coach_theme_settings_select_public ON public.coach_theme_settings;
CREATE POLICY coach_theme_settings_select_public
  ON public.coach_theme_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_theme_settings.coach_id
        AND (
          ((p.status = 'approved'::player_status) AND (p.visibility = 'public'::visibility))
          OR (p.user_id = auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS coach_theme_settings_manage_owner ON public.coach_theme_settings;
CREATE POLICY coach_theme_settings_manage_owner
  ON public.coach_theme_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_theme_settings.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_theme_settings.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_theme_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_theme_settings TO authenticated;
GRANT ALL ON public.coach_theme_settings TO service_role;

-- ============================================================
-- coach_sections_visibility  (hija gateada por coach_profiles)
-- ============================================================
ALTER TABLE public.coach_sections_visibility ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_sections_visibility_set_updated_at ON public.coach_sections_visibility;
CREATE TRIGGER coach_sections_visibility_set_updated_at
  BEFORE UPDATE ON public.coach_sections_visibility
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS coach_sections_visibility_select_public ON public.coach_sections_visibility;
CREATE POLICY coach_sections_visibility_select_public
  ON public.coach_sections_visibility
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_sections_visibility.coach_id
        AND (
          ((p.status = 'approved'::player_status) AND (p.visibility = 'public'::visibility))
          OR (p.user_id = auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS coach_sections_visibility_manage_owner ON public.coach_sections_visibility;
CREATE POLICY coach_sections_visibility_manage_owner
  ON public.coach_sections_visibility
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_sections_visibility.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_sections_visibility.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_sections_visibility TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_sections_visibility TO authenticated;
GRANT ALL ON public.coach_sections_visibility TO service_role;

-- ============================================================
-- coach_stats_seasons  (hija gateada por coach_profiles — SIN updated_at)
-- ============================================================
ALTER TABLE public.coach_stats_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_stats_seasons_select_public ON public.coach_stats_seasons;
CREATE POLICY coach_stats_seasons_select_public
  ON public.coach_stats_seasons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_stats_seasons.coach_id
        AND (
          ((p.status = 'approved'::player_status) AND (p.visibility = 'public'::visibility))
          OR (p.user_id = auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS coach_stats_seasons_manage_owner ON public.coach_stats_seasons;
CREATE POLICY coach_stats_seasons_manage_owner
  ON public.coach_stats_seasons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_stats_seasons.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_stats_seasons.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_stats_seasons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_stats_seasons TO authenticated;
GRANT ALL ON public.coach_stats_seasons TO service_role;

-- ============================================================
-- coach_media  (pre-moderación per-fila por status; espeja player_media)
-- player usa is_approved boolean → coach usa status='approved'::review_status
-- NOTA: coach_media NO tiene updated_at (0011) → sin trigger set_updated_at.
-- ============================================================
ALTER TABLE public.coach_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_media_select_public ON public.coach_media;
CREATE POLICY coach_media_select_public
  ON public.coach_media
  FOR SELECT
  USING (
    (status = 'approved'::review_status)
    OR EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_media.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

-- Pre-moderación a nivel SQL: el dueño puede crear/editar/borrar su media, pero
-- NO puede escribir status='approved' (solo admin aprueba). El WITH CHECK del
-- owner exige status <> 'approved'; cualquier edición del dueño vuelve la fila a
-- 'pending'. El approve real corre admin-side como service_role (bypass RLS).
-- (Divergencia deliberada vs player_media, que es reactivo sin este gate.)
DROP POLICY IF EXISTS coach_media_manage_owner ON public.coach_media;
DROP POLICY IF EXISTS coach_media_insert_owner ON public.coach_media;
CREATE POLICY coach_media_insert_owner
  ON public.coach_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (status <> 'approved'::review_status)
      AND EXISTS (
        SELECT 1 FROM public.coach_profiles p
        WHERE p.id = coach_media.coach_id AND p.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS coach_media_update_owner ON public.coach_media;
CREATE POLICY coach_media_update_owner
  ON public.coach_media
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_media.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (status <> 'approved'::review_status)
      AND EXISTS (
        SELECT 1 FROM public.coach_profiles p
        WHERE p.id = coach_media.coach_id AND p.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS coach_media_delete_owner ON public.coach_media;
CREATE POLICY coach_media_delete_owner
  ON public.coach_media
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_media.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_media TO authenticated;
GRANT ALL ON public.coach_media TO service_role;

-- ============================================================
-- coach_licenses  (pre-moderación per-fila por status, igual que coach_media)
-- NOTA: doc_url NO debe exponerse en queries públicas. RLS es por fila, no por
--   columna: una licencia approved es visible a anon, y con ella su doc_url. El
--   app DEBE omitir la columna doc_url en los SELECT públicos del portfolio
--   (solo owner/admin la leen). Esta policy no la filtra a nivel SQL.
-- ============================================================
ALTER TABLE public.coach_licenses ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_licenses_set_updated_at ON public.coach_licenses;
CREATE TRIGGER coach_licenses_set_updated_at
  BEFORE UPDATE ON public.coach_licenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS coach_licenses_select_public ON public.coach_licenses;
CREATE POLICY coach_licenses_select_public
  ON public.coach_licenses
  FOR SELECT
  USING (
    (status = 'approved'::review_status)
    OR EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_licenses.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

-- Pre-moderación igual que coach_media: el dueño no puede auto-aprobar su
-- licencia (status <> 'approved' en el WITH CHECK del owner). Editar una
-- licencia aprobada la vuelve a 'pending' → re-revisión (D5 "editar republica").
DROP POLICY IF EXISTS coach_licenses_manage_owner ON public.coach_licenses;
DROP POLICY IF EXISTS coach_licenses_insert_owner ON public.coach_licenses;
CREATE POLICY coach_licenses_insert_owner
  ON public.coach_licenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (status <> 'approved'::review_status)
      AND EXISTS (
        SELECT 1 FROM public.coach_profiles p
        WHERE p.id = coach_licenses.coach_id AND p.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS coach_licenses_update_owner ON public.coach_licenses;
CREATE POLICY coach_licenses_update_owner
  ON public.coach_licenses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_licenses.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (status <> 'approved'::review_status)
      AND EXISTS (
        SELECT 1 FROM public.coach_profiles p
        WHERE p.id = coach_licenses.coach_id AND p.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS coach_licenses_delete_owner ON public.coach_licenses;
CREATE POLICY coach_licenses_delete_owner
  ON public.coach_licenses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_licenses.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

-- doc_url es el DOCUMENTO de la credencial (escaneo del título) — privado.
-- RLS es por fila, no por columna, así que una licencia approved sería legible
-- por anon CON su doc_url. Defensa a nivel SQL: GRANT por columna a anon que
-- OMITE doc_url + las columnas internas de moderación. Una query pública con
-- `select *` como anon falla; el read layer del portfolio (PR-3) DEBE pedir
-- columnas explícitas. (Además doc_url debe vivir en el bucket privado `kyc`,
-- no en `coach-media`, para que el path solo sea resoluble con signed URL.)
--
-- IMPORTANTE: hay que REVOCAR primero el SELECT table-level que la DEFAULT
-- PRIVILEGE de public le da a anon en cada tabla nueva (si no, el grant por
-- columna es inefectivo: el table-level cubre todas las columnas incl. doc_url).
REVOKE SELECT ON public.coach_licenses FROM anon;
GRANT SELECT (
  id, coach_id, title, issuer, awarded_year, expires_year,
  status, position, created_at, updated_at
) ON public.coach_licenses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_licenses TO authenticated;
GRANT ALL ON public.coach_licenses TO service_role;

-- ============================================================
-- coach_personal_details  (datos privados — SIN select público)
-- Espeja player_personal_details: solo owner/admin (select + manage).
-- ============================================================
ALTER TABLE public.coach_personal_details ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS coach_personal_details_set_updated_at ON public.coach_personal_details;
CREATE TRIGGER coach_personal_details_set_updated_at
  BEFORE UPDATE ON public.coach_personal_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELECT: SOLO owner/admin (authenticated). NO {public}/anon — datos privados.
DROP POLICY IF EXISTS coach_personal_details_select_owner ON public.coach_personal_details;
CREATE POLICY coach_personal_details_select_owner
  ON public.coach_personal_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_personal_details.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS coach_personal_details_manage_owner ON public.coach_personal_details;
CREATE POLICY coach_personal_details_manage_owner
  ON public.coach_personal_details
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_personal_details.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_personal_details.coach_id
        AND ((p.user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

-- GRANT SELECT a anon de todos modos: NO hay policy de select público, así que
-- anon recibe 0 filas (deny por defecto). Se mantiene el patrón uniforme de
-- GRANTs; el gate real es la ausencia de policy {public}. Igual que player.
GRANT SELECT ON public.coach_personal_details TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_personal_details TO authenticated;
GRANT ALL ON public.coach_personal_details TO service_role;


-- ============================================================================
-- SECCIÓN RLS-MODERATION — applications, revisiones, traducciones, leads/audit
-- Tablas: coach_applications, coach_career_item_proposals,
--   coach_career_revision_requests, coach_career_revision_items,
--   coach_career_revision_proposed_teams, coach_stats_revision_items,
--   coach_profile_translations, coach_honour_translations,
--   coach_ai_translation_events, coach_portfolio_leads, coach_contact_clicks,
--   coach_change_logs.
--
-- Espeja las definiciones vivas del player (dev ciolizjshimyvyonlssq) +
-- HANDOFF §2.2. Reusa public.is_admin(uuid) y public.set_updated_at()
-- existentes. Idempotente: DROP ... IF EXISTS antes de cada CREATE; ENABLE RLS
-- no-op; GRANTs idempotentes.
--
-- NOTA: las FKs a auth.users de estas tablas (user_id/created_by/submitted_by/
-- reviewed_by/viewer_user_id) viven en la SECCIÓN CONSTRAINTS de arriba — el
-- bloque duplicado de FKs del draft original se removió en el ensamblado.
-- ============================================================================

-- ============================================================
-- updated_at triggers (set_updated_at BEFORE UPDATE)
-- Solo tablas con columna updated_at. Convención 0009a: <tabla>_set_updated_at.
-- ============================================================
DROP TRIGGER IF EXISTS coach_applications_set_updated_at ON public.coach_applications;
CREATE TRIGGER coach_applications_set_updated_at
  BEFORE UPDATE ON public.coach_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS coach_career_item_proposals_set_updated_at ON public.coach_career_item_proposals;
CREATE TRIGGER coach_career_item_proposals_set_updated_at
  BEFORE UPDATE ON public.coach_career_item_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS coach_career_revision_requests_set_updated_at ON public.coach_career_revision_requests;
CREATE TRIGGER coach_career_revision_requests_set_updated_at
  BEFORE UPDATE ON public.coach_career_revision_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS coach_career_revision_items_set_updated_at ON public.coach_career_revision_items;
CREATE TRIGGER coach_career_revision_items_set_updated_at
  BEFORE UPDATE ON public.coach_career_revision_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS coach_career_revision_proposed_teams_set_updated_at ON public.coach_career_revision_proposed_teams;
CREATE TRIGGER coach_career_revision_proposed_teams_set_updated_at
  BEFORE UPDATE ON public.coach_career_revision_proposed_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS coach_stats_revision_items_set_updated_at ON public.coach_stats_revision_items;
CREATE TRIGGER coach_stats_revision_items_set_updated_at
  BEFORE UPDATE ON public.coach_stats_revision_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS coach_profile_translations_set_updated_at ON public.coach_profile_translations;
CREATE TRIGGER coach_profile_translations_set_updated_at
  BEFORE UPDATE ON public.coach_profile_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS coach_honour_translations_set_updated_at ON public.coach_honour_translations;
CREATE TRIGGER coach_honour_translations_set_updated_at
  BEFORE UPDATE ON public.coach_honour_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- coach_applications — select own-or-admin / insert self / update own-or-admin
--   / delete admin
-- ============================================================
ALTER TABLE public.coach_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_applications_select_own ON public.coach_applications;
CREATE POLICY coach_applications_select_own
  ON public.coach_applications
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS coach_applications_insert_self ON public.coach_applications;
CREATE POLICY coach_applications_insert_self
  ON public.coach_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS coach_applications_update_owner_or_admin ON public.coach_applications;
CREATE POLICY coach_applications_update_owner_or_admin
  ON public.coach_applications
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK ((user_id = auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS coach_applications_delete_admin ON public.coach_applications;
CREATE POLICY coach_applications_delete_admin
  ON public.coach_applications
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

GRANT SELECT ON public.coach_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_applications TO authenticated;
GRANT ALL ON public.coach_applications TO service_role;

-- ============================================================
-- coach_career_item_proposals — select owner-or-admin (incl app owner) /
--   insert owner / update admin / delete admin
-- ============================================================
ALTER TABLE public.coach_career_item_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_career_item_proposals_select_owner_or_admin ON public.coach_career_item_proposals;
CREATE POLICY coach_career_item_proposals_select_owner_or_admin
  ON public.coach_career_item_proposals
  FOR SELECT TO authenticated
  USING (
    (created_by_user_id = auth.uid())
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.coach_applications a
      WHERE a.id = coach_career_item_proposals.application_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS coach_career_item_proposals_insert_owner ON public.coach_career_item_proposals;
CREATE POLICY coach_career_item_proposals_insert_owner
  ON public.coach_career_item_proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    (created_by_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.coach_applications a
      WHERE a.id = coach_career_item_proposals.application_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS coach_career_item_proposals_update_admin ON public.coach_career_item_proposals;
CREATE POLICY coach_career_item_proposals_update_admin
  ON public.coach_career_item_proposals
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS coach_career_item_proposals_delete_admin ON public.coach_career_item_proposals;
CREATE POLICY coach_career_item_proposals_delete_admin
  ON public.coach_career_item_proposals
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

GRANT SELECT ON public.coach_career_item_proposals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_career_item_proposals TO authenticated;
GRANT ALL ON public.coach_career_item_proposals TO service_role;

-- ============================================================
-- coach_career_revision_requests — select own (incl coach owner) /
--   insert self / update own-or-admin / delete own-or-admin
-- ============================================================
ALTER TABLE public.coach_career_revision_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_career_revision_requests_select_own ON public.coach_career_revision_requests;
CREATE POLICY coach_career_revision_requests_select_own
  ON public.coach_career_revision_requests
  FOR SELECT TO authenticated
  USING (
    (submitted_by_user_id = auth.uid())
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_career_revision_requests.coach_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS coach_career_revision_requests_insert_self ON public.coach_career_revision_requests;
CREATE POLICY coach_career_revision_requests_insert_self
  ON public.coach_career_revision_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (submitted_by_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_career_revision_requests.coach_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS coach_career_revision_requests_update_owner_or_admin ON public.coach_career_revision_requests;
CREATE POLICY coach_career_revision_requests_update_owner_or_admin
  ON public.coach_career_revision_requests
  FOR UPDATE TO authenticated
  USING ((submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK ((submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS coach_career_revision_requests_delete_owner_or_admin ON public.coach_career_revision_requests;
CREATE POLICY coach_career_revision_requests_delete_owner_or_admin
  ON public.coach_career_revision_requests
  FOR DELETE TO authenticated
  USING ((submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()));

GRANT SELECT ON public.coach_career_revision_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_career_revision_requests TO authenticated;
GRANT ALL ON public.coach_career_revision_requests TO service_role;

-- ============================================================
-- coach_career_revision_items — FOR ALL manage via request (owner-or-admin)
-- ============================================================
ALTER TABLE public.coach_career_revision_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_career_revision_items_manage_via_request ON public.coach_career_revision_items;
CREATE POLICY coach_career_revision_items_manage_via_request
  ON public.coach_career_revision_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_career_revision_requests r
      WHERE r.id = coach_career_revision_items.request_id
        AND ((r.submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_career_revision_requests r
      WHERE r.id = coach_career_revision_items.request_id
        AND ((r.submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_career_revision_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_career_revision_items TO authenticated;
GRANT ALL ON public.coach_career_revision_items TO service_role;

-- ============================================================
-- coach_career_revision_proposed_teams — FOR ALL manage via request
-- ============================================================
ALTER TABLE public.coach_career_revision_proposed_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_career_revision_proposed_teams_manage_via_request ON public.coach_career_revision_proposed_teams;
CREATE POLICY coach_career_revision_proposed_teams_manage_via_request
  ON public.coach_career_revision_proposed_teams
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_career_revision_requests r
      WHERE r.id = coach_career_revision_proposed_teams.request_id
        AND ((r.submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_career_revision_requests r
      WHERE r.id = coach_career_revision_proposed_teams.request_id
        AND ((r.submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_career_revision_proposed_teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_career_revision_proposed_teams TO authenticated;
GRANT ALL ON public.coach_career_revision_proposed_teams TO service_role;

-- ============================================================
-- coach_stats_revision_items — FOR ALL manage via request
-- ============================================================
ALTER TABLE public.coach_stats_revision_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_stats_revision_items_manage_via_request ON public.coach_stats_revision_items;
CREATE POLICY coach_stats_revision_items_manage_via_request
  ON public.coach_stats_revision_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_career_revision_requests r
      WHERE r.id = coach_stats_revision_items.request_id
        AND ((r.submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_career_revision_requests r
      WHERE r.id = coach_stats_revision_items.request_id
        AND ((r.submitted_by_user_id = auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

GRANT SELECT ON public.coach_stats_revision_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_stats_revision_items TO authenticated;
GRANT ALL ON public.coach_stats_revision_items TO service_role;

-- ============================================================
-- coach_profile_translations — read (parent published OR owner OR admin) /
--   cud (owner OR admin). Espeja player_profile_translations (0009a).
-- ============================================================
ALTER TABLE public.coach_profile_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_profile_translations_read ON public.coach_profile_translations;
CREATE POLICY coach_profile_translations_read
  ON public.coach_profile_translations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_profile_translations.coach_id
        AND p.visibility = 'public'::visibility
        AND p.status = 'approved'::player_status
    )
    OR EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_profile_translations.coach_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS coach_profile_translations_cud ON public.coach_profile_translations;
CREATE POLICY coach_profile_translations_cud
  ON public.coach_profile_translations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_profile_translations.coach_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_profile_translations.coach_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

GRANT SELECT ON public.coach_profile_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_profile_translations TO authenticated;
GRANT ALL ON public.coach_profile_translations TO service_role;

-- ============================================================
-- coach_honour_translations — parent es coach_honours → su coach_profiles.
--   read (parent published OR owner OR admin) / cud (owner OR admin).
--   Espeja player_honour_translations (JOIN honours→profiles).
-- ============================================================
ALTER TABLE public.coach_honour_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_honour_translations_read ON public.coach_honour_translations;
CREATE POLICY coach_honour_translations_read
  ON public.coach_honour_translations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_honours h
      JOIN public.coach_profiles p ON p.id = h.coach_id
      WHERE h.id = coach_honour_translations.honour_id
        AND p.visibility = 'public'::visibility
        AND p.status = 'approved'::player_status
    )
    OR EXISTS (
      SELECT 1 FROM public.coach_honours h
      JOIN public.coach_profiles p ON p.id = h.coach_id
      WHERE h.id = coach_honour_translations.honour_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS coach_honour_translations_cud ON public.coach_honour_translations;
CREATE POLICY coach_honour_translations_cud
  ON public.coach_honour_translations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_honours h
      JOIN public.coach_profiles p ON p.id = h.coach_id
      WHERE h.id = coach_honour_translations.honour_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_honours h
      JOIN public.coach_profiles p ON p.id = h.coach_id
      WHERE h.id = coach_honour_translations.honour_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

GRANT SELECT ON public.coach_honour_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_honour_translations TO authenticated;
GRANT ALL ON public.coach_honour_translations TO service_role;

-- ============================================================
-- coach_ai_translation_events — solo owner (insert+select). Sin anon.
--   Espeja ai_translation_events (0009a).
-- ============================================================
ALTER TABLE public.coach_ai_translation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_ai_translation_events_owner_read ON public.coach_ai_translation_events;
CREATE POLICY coach_ai_translation_events_owner_read
  ON public.coach_ai_translation_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_ai_translation_events.coach_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS coach_ai_translation_events_owner_insert ON public.coach_ai_translation_events;
CREATE POLICY coach_ai_translation_events_owner_insert
  ON public.coach_ai_translation_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles p
      WHERE p.id = coach_ai_translation_events.coach_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

-- Sin anon: events son privados (quota/audit). Solo authenticated + admin.
GRANT SELECT, INSERT ON public.coach_ai_translation_events TO authenticated;
GRANT ALL ON public.coach_ai_translation_events TO service_role;

-- ============================================================
-- coach_portfolio_leads / coach_contact_clicks / coach_change_logs
-- ENABLE RLS, SIN policies → deny-all para anon/authenticated.
-- Solo service-role/postgres (server actions corren como postgres → bypass RLS).
-- Igual que portfolio_leads del player. SIN anon select.
-- ============================================================
ALTER TABLE public.coach_portfolio_leads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_portfolio_leads TO authenticated;
GRANT ALL ON public.coach_portfolio_leads TO service_role;

ALTER TABLE public.coach_contact_clicks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_contact_clicks TO authenticated;
GRANT ALL ON public.coach_contact_clicks TO service_role;

ALTER TABLE public.coach_change_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_change_logs TO authenticated;
GRANT ALL ON public.coach_change_logs TO service_role;


-- ===============================================================
-- SECCIÓN STORAGE — bucket coach-media (público, 5MB, [jpeg,png,webp,avif])
--     Patrón 0006c_blog_media_bucket.sql (mismo shape que blog-media:
--     público, 5MB, sin image/svg+xml — a diferencia de player-media que
--     SÍ permite svg). Bucket dedicado: quota / cleanup separados del
--     storage de jugadores y bloggers.
--
--     Mejora vs player-media (cuyas storage policies son laxas, solo
--     chequean bucket_id): acá INSERT/UPDATE/DELETE están scoped por
--     carpeta del dueño. foldername(name) devuelve el array de segmentos
--     del path (sin el filename). Convención de paths:
--       - gallery/{userId}/{uuid}.avif         → userId en segmento [2]
--       - gallery/{userId}/hero-{uuid}.avif    → userId en segmento [2]
--       - {userId}/{uuid}.avif (legacy/flat)   → userId en segmento [1]
--       - avatars/{coachId}.jpg                → SIN userId en el path
--     Por eso aceptamos [1] OR [2] == auth.uid(): cubre gallery/ (userId
--     en [2]) y el layout flat (userId en [1]). El namespace avatars/
--     usa coachId (≠ userId) y no tiene userId embebido, así que un
--     escritura directa de avatar vía client cae en la rama is_admin();
--     el upload real de avatar lo hace la server action (rol postgres,
--     bypass RLS). Estas policies son defense-in-depth para acceso directo
--     vía Supabase JS client — la lógica de ownership canónica vive en las
--     server actions.
-- ===============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-media',
  'coach-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 1. SELECT: público total (anon + authenticated). Bucket público,
--    imágenes embebidas en portfolios públicos.
DROP POLICY IF EXISTS coach_media_storage_select ON storage.objects;
CREATE POLICY coach_media_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'coach-media'::text);

-- 2. INSERT: admin, o el dueño de la carpeta. El userId aparece en el
--    path en alguno de los dos primeros segmentos según el sub-namespace
--    (gallery/{userId}/... o {userId}/...). Aceptamos cualquiera de los
--    dos primeros segmentos == auth.uid() para cubrir ambas convenciones.
DROP POLICY IF EXISTS coach_media_storage_insert ON storage.objects;
CREATE POLICY coach_media_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'coach-media'::text
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- 3. UPDATE: owner del file o admin.
DROP POLICY IF EXISTS coach_media_storage_update ON storage.objects;
CREATE POLICY coach_media_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'coach-media'::text
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id = 'coach-media'::text
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- 4. DELETE: owner o admin.
DROP POLICY IF EXISTS coach_media_storage_delete ON storage.objects;
CREATE POLICY coach_media_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'coach-media'::text
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );


-- ============================================================
-- SECCIÓN RPCS coach (espejo de los RPCs vivos del player en dev)
--
-- Todas CREATE OR REPLACE FUNCTION → idempotentes. Reusan los helpers
-- existentes public.is_admin(uuid) y (indirectamente) las subscriptions del
-- player. NO redefinen is_admin ni set_updated_at.
--
-- NOTA SOBRE EL ROL: ninguna de estas funciones setea user_profiles.role.
-- La transición member->coach se hace en el route handler de aprobación
-- (igual que approve_player_application NO toca el rol del player).
-- ============================================================

-- ------------------------------------------------------------
-- get_limits_for_coach(p_coach_id)
--   Espejo de get_limits_for_player: lee subscriptions.limits_json vía el
--   user dueño del coach. STABLE + search_path 'public'. coalesce a '{}'.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_limits_for_coach(p_coach_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(s.limits_json, '{}'::jsonb)
  from public.coach_profiles p
  left join public.subscriptions s on s.user_id = p.user_id
  where p.id = p_coach_id
  limit 1;
$function$;

-- ------------------------------------------------------------
-- coach_max_media_allowed(p_coach_id, p_type)
--   Espejo de max_media_allowed: defaults photo=2, video=1 si la subscription
--   no define max_photos/max_videos. (Función auxiliar privada de can_add.)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.coach_max_media_allowed(p_coach_id uuid, p_type media_type)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_type = 'photo'::media_type then coalesce((public.get_limits_for_coach(p_coach_id)->>'max_photos')::int, 2)
    when p_type = 'video'::media_type then coalesce((public.get_limits_for_coach(p_coach_id)->>'max_videos')::int, 1)
    else 0 end;
$function$;

-- ------------------------------------------------------------
-- coach_can_add_media(p_user_id, p_coach_id, p_type)
--   Espejo de can_add_media: el caller debe ser dueño del coach Y el conteo
--   actual de ese tipo de media debe estar bajo el límite del plan.
--   NOTA: cuenta TODAS las filas coach_media del tipo (igual que el player
--   cuenta player_media sin filtrar por status/is_approved) — el límite es
--   sobre lo subido, no sobre lo aprobado.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.coach_can_add_media(p_user_id uuid, p_coach_id uuid, p_type media_type)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with owner as (
    select 1 from public.coach_profiles p where p.id = p_coach_id and p.user_id = p_user_id
  ),
  cnt as (
    select count(*)::int as c from public.coach_media m where m.coach_id = p_coach_id and m.type = p_type
  )
  select exists(select 1 from owner) and (select c from cnt) < public.coach_max_media_allowed(p_coach_id, p_type);
$function$;

-- ------------------------------------------------------------
-- approve_coach_application(p_id)
--   Espejo de approve_player_application VIVO:
--     - guard is_admin(auth.uid()) → raise 'forbidden'
--     - idempotencia por coach_profiles.user_id (si ya existe perfil, solo
--       marca la app approved y retorna idempotent=true)
--     - slug: lower(regexp_replace(full_name,'[^a-z0-9]+','-','g')) trim '-',
--       fallback 'coach', left 60, loop -2..-999 (NO usar slugify/unaccent)
--     - INSERT coach_profiles(user_id, slug, full_name, nationality,
--       role_title, current_club, bio=null, visibility='public',
--       status='approved')  [coach_profiles.full_name es NOT NULL → coalesce]
--     - marca app approved + reviewed_by + reviewed_at
--     - ADEMÁS materializa app.licenses_draft (jsonb array [{title,issuer,year}])
--       a filas coach_licenses status='approved' (mejora coach sobre player).
--       'year' del draft → coach_licenses.awarded_year.
--   NO setea user_profiles.role (lo hace el route handler member->coach).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_coach_application(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  app record;
  existing_profile record;
  slug_base text;
  slug_candidate text;
  n int := 1;
  exists_slug boolean;
  new_coach_id uuid;
  lic jsonb;
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;

  select * into app from public.coach_applications where id = p_id;
  if not found then raise exception 'application % not found', p_id; end if;

  -- Idempotencia: si el user ya tiene un coach_profile, no recreamos.
  select id, slug into existing_profile from public.coach_profiles where user_id = app.user_id;
  if found then
    update public.coach_applications
    set status = 'approved',
        reviewed_by_user_id = coalesce(reviewed_by_user_id, auth.uid()),
        reviewed_at = coalesce(reviewed_at, now()),
        updated_at = now()
    where id = p_id AND status <> 'approved';
    return jsonb_build_object('coach_id', existing_profile.id, 'slug', existing_profile.slug, 'idempotent', true);
  end if;

  -- Slug determinístico (mismo algoritmo que el player; sin unaccent/slugify).
  slug_base := coalesce(app.full_name, 'coach');
  slug_base := lower(regexp_replace(slug_base, '[^a-z0-9]+', '-', 'g'));
  slug_base := trim(both '-' from slug_base);
  if slug_base = '' then slug_base := 'coach'; end if;
  slug_candidate := left(slug_base, 60);
  loop
    select exists(select 1 from public.coach_profiles where slug = slug_candidate) into exists_slug;
    exit when not exists_slug;
    n := n + 1;
    slug_candidate := left(slug_base, 60 - length(n::text) - 1) || '-' || n::text;
    if n > 999 then raise exception 'no available slug'; end if;
  end loop;

  insert into public.coach_profiles
    (user_id, slug, full_name, nationality, role_title, current_club, bio, visibility, status, updated_at)
  values
    (app.user_id, slug_candidate, coalesce(app.full_name, 'Coach'),
     app.nationality, app.role_title, app.current_club, null, 'public', 'approved', now())
  returning id into new_coach_id;

  -- Materializar licencias declaradas en la aplicación → coach_licenses
  -- (status='approved' porque ya pasaron por la revisión de la app).
  for lic in select * from jsonb_array_elements(coalesce(app.licenses_draft, '[]'::jsonb))
  loop
    if coalesce(lic->>'title', '') <> '' then
      insert into public.coach_licenses (coach_id, title, issuer, awarded_year, status)
      values (
        new_coach_id,
        lic->>'title',
        lic->>'issuer',
        case when lic->>'year' ~ '^\d+$' then (lic->>'year')::int else null end,
        'approved'::review_status
      );
    end if;
  end loop;

  update public.coach_applications
  set status = 'approved',
      reviewed_by_user_id = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_id;

  return jsonb_build_object('coach_id', new_coach_id, 'slug', slug_candidate, 'idempotent', false);
end;
$function$;

-- ------------------------------------------------------------
-- materialize_coach_career_from_application(p_application_id)
--   Espejo de materialize_career_from_application VIVO (incluye division_ids):
--     - guard is_admin(auth.uid())
--     - resuelve el coach_profile por user de la app (último por created_at)
--     - recorre coach_career_item_proposals status='accepted' AND
--       materialized_at IS NULL
--     - resuelve team: coalesce(cip.team_id, match por nombre approved>pending)
--       La rama del player que busca teams.requested_from_career_item_id NO
--       aplica a coach (ese FK apunta a career_item_proposals del player) →
--       se omite; es un no-op inofensivo de la versión player.
--     - INSERT coach_career_items(coach_id, club, role_title, division,
--       division_id, secondary_division_id, start_date, end_date, team_id)
--       start_date=make_date(start_year,1,1), end_date=make_date(end_year,12,31)
--     - marca materialized_at; retorna {inserted}
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.materialize_coach_career_from_application(p_application_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_app record;
  v_coach_id uuid;
  v_cnt_inserted int := 0;
  v_now timestamptz := now();
  r record;
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;

  select a.*, p.id as coach_profile_id
  into v_app
  from public.coach_applications a
  join public.coach_profiles p on p.user_id = a.user_id
  where a.id = p_application_id
  order by p.created_at desc
  limit 1;
  if not found then raise exception 'application_or_profile_not_found'; end if;
  v_coach_id := v_app.coach_profile_id;

  for r in
    select cip.*,
      coalesce(
        cip.team_id,
        (select t.id from public.teams t
          where lower(t.name) = lower(coalesce(cip.proposed_team_name, cip.club))
          order by case when t.status = 'approved' then 0 when t.status = 'pending' then 1 else 2 end,
                   t.created_at asc
          limit 1)
      ) as resolved_team_id
    from public.coach_career_item_proposals cip
    where cip.application_id = p_application_id
      and cip.status = 'accepted'
      and cip.materialized_at is null
  loop
    insert into public.coach_career_items (
      coach_id, club, role_title, division, division_id, secondary_division_id,
      start_date, end_date, team_id
    )
    values (
      v_coach_id,
      coalesce( (select t.name from public.teams t where t.id = r.resolved_team_id), r.club ),
      r.role_title,
      r.division,
      r.division_id,
      r.secondary_division_id,
      case when r.start_year is not null then make_date(r.start_year, 1, 1)  else null end,
      case when r.end_year   is not null then make_date(r.end_year, 12, 31) else null end,
      r.resolved_team_id
    );
    update public.coach_career_item_proposals set materialized_at = v_now where id = r.id;
    v_cnt_inserted := v_cnt_inserted + 1;
  end loop;

  return jsonb_build_object('inserted', v_cnt_inserted);
end;
$function$;


-- ============================================================
-- SECCIÓN VIEW + MISC
--
-- VIEW coach_dashboard_state
--
-- Espejo de la view VIVA public.player_dashboard_state (Recon A,
-- pg_get_viewdef en dev ciolizjshimyvyonlssq). Security INVOKER
-- (default, SIN security_definer / SIN security_barrier) + filtro
-- embebido WHERE u.id = auth.uid() — exactamente como el player.
-- CREATE OR REPLACE VIEW => idempotente.
--
-- Diferencias deliberadas vs player (espejo del modelo coach 0011):
--   * coach_profiles usa role_title / coaching_since / preferred_formations
--     / playing_style / methodology_analysis / analysis_author en lugar
--     de positions / foot / height / weight / market_value.
--   * El LATERAL de foto primaria SÍ filtra cm.status='approved'::review_status
--     (el coach pre-modera media por fila; el player usaba is_primary sin
--     gate de status). order by created_at desc limit 1, igual que player.
--   * Se exponen application_status + application_rejection_reason para
--     notificar el motivo de rechazo en el dashboard (mejora sobre player).
-- ============================================================
CREATE OR REPLACE VIEW public.coach_dashboard_state AS
  SELECT u.id AS user_id,
    u.email AS user_email,
    c.id AS profile_id,
    c.status AS profile_status,
    c.slug AS profile_slug,
    c.visibility AS profile_visibility,
    c.full_name AS profile_full_name,
    c.birth_date AS profile_birth_date,
    c.nationality AS profile_nationality,
    c.nationality_codes AS profile_nationality_codes,
    c.role_title AS profile_role_title,
    c.coaching_since AS profile_coaching_since,
    c.current_club AS profile_current_club,
    c.current_team_id AS profile_current_team_id,
    c.agency_id AS profile_agency_id,
    c.bio AS profile_bio,
    c.avatar_url AS profile_avatar_url,
    c.hero_url AS profile_hero_url,
    c.preferred_formations AS profile_preferred_formations,
    c.playing_style AS profile_playing_style,
    c.methodology_analysis AS profile_methodology_analysis,
    c.analysis_author AS profile_analysis_author,
    c.career_objectives AS profile_career_objectives,
    c.updated_at AS profile_updated_at,
    c.plan_public AS profile_plan_public,
    c.transfermarkt_url AS profile_transfermarkt_url,
    cpd.id AS personal_details_id,
    cpd.document_type AS personal_document_type,
    cpd.document_number AS personal_document_number,
    cpd.document_country AS personal_document_country,
    cpd.document_country_code AS personal_document_country_code,
    cpd.languages AS personal_languages,
    cpd.education AS personal_education,
    cpd.phone AS personal_phone,
    cpd.residence_city AS personal_residence_city,
    cpd.residence_country AS personal_residence_country,
    cpd.residence_country_code AS personal_residence_country_code,
    cpd.whatsapp AS personal_whatsapp,
    cpd.show_contact_section AS personal_show_contact_section,
    app.id AS application_id,
    app.status AS application_status,
    app.rejection_reason AS application_rejection_reason,
    app.created_at AS application_created_at,
    app.plan_requested AS application_plan_requested,
    app.transfermarkt_url AS application_transfermarkt_url,
    app.external_profile_url AS application_external_profile_url,
    app.full_name AS application_full_name,
    app.nationality AS application_nationality,
    app.role_title AS application_role_title,
    app.current_club AS application_current_club,
    app.notes AS application_notes,
    sub.plan AS subscription_plan,
    sub.status AS subscription_status,
    media.url AS primary_photo_url
   FROM auth.users u
     LEFT JOIN public.coach_profiles c ON c.user_id = u.id
     LEFT JOIN public.coach_personal_details cpd ON cpd.coach_id = c.id
     LEFT JOIN LATERAL ( SELECT ca.id,
            ca.status,
            ca.rejection_reason,
            ca.created_at,
            ca.plan_requested,
            ca.transfermarkt_url,
            ca.external_profile_url,
            ca.full_name,
            ca.nationality,
            ca.role_title,
            ca.current_club,
            ca.notes
           FROM public.coach_applications ca
          WHERE ca.user_id = u.id
          ORDER BY ca.created_at DESC
         LIMIT 1) app ON true
     LEFT JOIN public.subscriptions sub ON sub.user_id = u.id
     LEFT JOIN LATERAL ( SELECT cm.url
           FROM public.coach_media cm
          WHERE cm.coach_id = c.id
            AND cm.type = 'photo'::media_type
            AND cm.is_primary = true
            AND cm.status = 'approved'::review_status
          ORDER BY cm.created_at DESC
         LIMIT 1) media ON true
  WHERE u.id = auth.uid();

GRANT SELECT ON public.coach_dashboard_state TO authenticated;
GRANT SELECT ON public.coach_dashboard_state TO service_role;

-- ============================================================
-- CHECK swap: user_tutorial_progress.audience  +'coach'
--
-- CHECK vivo (Recon B, dev): CHECK ((audience = ANY (ARRAY['player','agency'])))
-- Swap no destructivo (expand-compatible): solo agrega 'coach' al set
-- permitido; las filas existentes ('player'/'agency') siguen validando.
-- DROP ... IF EXISTS + ADD => idempotente (re-correr deja el mismo estado).
-- ============================================================
ALTER TABLE public.user_tutorial_progress
  DROP CONSTRAINT IF EXISTS user_tutorial_progress_audience_check;
ALTER TABLE public.user_tutorial_progress
  ADD CONSTRAINT user_tutorial_progress_audience_check
  CHECK (audience = ANY (ARRAY['player'::text, 'agency'::text, 'coach'::text]));
