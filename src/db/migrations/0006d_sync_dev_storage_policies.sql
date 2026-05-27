-- ===============================================================
-- 0006d_sync_dev_storage_policies.sql
--
-- Manual complementario (NO tracked by Drizzle). Sync de drift §5
-- Tipo D del docs/db/migration-workflow.md.
--
-- Aplica: las 24 storage.objects policies que existen en prod pero
-- faltaron en dev tras el rebuild schema-only del 2026-05-21
-- (`pg_dump --schema=public` no incluye storage.objects policies).
--
-- Bukets cubiertos (6, todos preexistentes):
--   - agency-logos     (4 policies: select/insert/update/delete)
--   - agency-media     (4 policies, con scoping de manager + agency_id)
--   - divisions        (4 policies, admin + moderator/analyst)
--   - kyc              (4 policies, con foldername user_id check)
--   - manager-avatars  (4 policies, simples)
--   - player-media     (4 policies, simples)
--   - teams            (4 policies, admin + moderator/analyst)
--
-- NOT en este file: el bucket teams' storage policies — esos 4 ya
-- están en prod por el 0002_sync_historical_drift.sql del incidente
-- anterior y van como parte del mismo grupo per consistencia.
-- (Total = 28 policies, idéntico al state actual de prod.)
--
-- Requires: public.is_admin(uuid) y public.user_profiles ya existen.
--
-- DDL extraído de prod (erdvpcfjynkhcrqktozd) via pg_policies el
-- 2026-05-26 y verificado byte-equivalente.
--
-- Aplicado en dev (ciolizjshimyvyonlssq) — pendiente.
-- Aplicado en prod (erdvpcfjynkhcrqktozd) — N/A (ya existe ahí, esto
-- es sync drift inverso: la verdad vive en prod).
--
-- Idempotente: sí (DROP POLICY IF EXISTS + CREATE).
-- ===============================================================

-- ============================================================
-- AGENCY-LOGOS (4 policies)
-- ============================================================

DROP POLICY IF EXISTS agency_logos_storage_select ON storage.objects;
CREATE POLICY agency_logos_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'agency-logos'::text);

DROP POLICY IF EXISTS agency_logos_storage_insert ON storage.objects;
CREATE POLICY agency_logos_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'agency-logos'::text);

DROP POLICY IF EXISTS agency_logos_storage_update ON storage.objects;
CREATE POLICY agency_logos_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'agency-logos'::text)
  WITH CHECK (bucket_id = 'agency-logos'::text);

DROP POLICY IF EXISTS agency_logos_storage_delete ON storage.objects;
CREATE POLICY agency_logos_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'agency-logos'::text);

-- ============================================================
-- AGENCY-MEDIA (4 policies, scoping manager + agency_id + path)
-- ============================================================

DROP POLICY IF EXISTS agency_media_storage_select ON storage.objects;
CREATE POLICY agency_media_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'agency-media'::text);

DROP POLICY IF EXISTS agency_media_storage_insert ON storage.objects;
CREATE POLICY agency_media_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'agency-media'::text
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'manager'::role
        AND up.agency_id IS NOT NULL
        AND objects.name LIKE ('gallery/' || up.agency_id::text || '-%')
    )
  );

DROP POLICY IF EXISTS agency_media_storage_update ON storage.objects;
CREATE POLICY agency_media_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'agency-media'::text
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'manager'::role
        AND up.agency_id IS NOT NULL
        AND objects.name LIKE ('gallery/' || up.agency_id::text || '-%')
    )
  )
  WITH CHECK (
    bucket_id = 'agency-media'::text
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'manager'::role
        AND up.agency_id IS NOT NULL
        AND objects.name LIKE ('gallery/' || up.agency_id::text || '-%')
    )
  );

DROP POLICY IF EXISTS agency_media_storage_delete ON storage.objects;
CREATE POLICY agency_media_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'agency-media'::text
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'manager'::role
        AND up.agency_id IS NOT NULL
        AND objects.name LIKE ('gallery/' || up.agency_id::text || '-%')
    )
  );

-- ============================================================
-- DIVISIONS (4 policies, admin + moderator/analyst)
-- ============================================================

DROP POLICY IF EXISTS divisions_storage_select ON storage.objects;
CREATE POLICY divisions_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'divisions'::text);

DROP POLICY IF EXISTS divisions_storage_insert ON storage.objects;
CREATE POLICY divisions_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'divisions'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  );

DROP POLICY IF EXISTS divisions_storage_update ON storage.objects;
CREATE POLICY divisions_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'divisions'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  )
  WITH CHECK (
    bucket_id = 'divisions'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  );

DROP POLICY IF EXISTS divisions_storage_delete ON storage.objects;
CREATE POLICY divisions_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'divisions'::text
    AND public.is_admin(auth.uid())
  );

-- ============================================================
-- KYC (4 policies, foldername user_id check + admin override)
-- ============================================================
-- Bucket privado (public=false). Cada user solo ve/sube sus propios
-- docs (path = '{user_id}/...'); admin + moderator/analyst pueden todo.

DROP POLICY IF EXISTS kyc_storage_select ON storage.objects;
CREATE POLICY kyc_storage_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc'::text
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  );

DROP POLICY IF EXISTS kyc_storage_insert ON storage.objects;
CREATE POLICY kyc_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc'::text
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS kyc_storage_update ON storage.objects;
CREATE POLICY kyc_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'kyc'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  )
  WITH CHECK (
    bucket_id = 'kyc'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  );

DROP POLICY IF EXISTS kyc_storage_delete ON storage.objects;
CREATE POLICY kyc_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc'::text
    AND public.is_admin(auth.uid())
  );

-- ============================================================
-- MANAGER-AVATARS (4 policies, simples por bucket_id)
-- ============================================================

DROP POLICY IF EXISTS manager_avatars_storage_select ON storage.objects;
CREATE POLICY manager_avatars_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'manager-avatars'::text);

DROP POLICY IF EXISTS manager_avatars_storage_insert ON storage.objects;
CREATE POLICY manager_avatars_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'manager-avatars'::text);

DROP POLICY IF EXISTS manager_avatars_storage_update ON storage.objects;
CREATE POLICY manager_avatars_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'manager-avatars'::text)
  WITH CHECK (bucket_id = 'manager-avatars'::text);

DROP POLICY IF EXISTS manager_avatars_storage_delete ON storage.objects;
CREATE POLICY manager_avatars_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'manager-avatars'::text);

-- ============================================================
-- PLAYER-MEDIA (4 policies, simples por bucket_id)
-- ============================================================

DROP POLICY IF EXISTS player_media_storage_select ON storage.objects;
CREATE POLICY player_media_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'player-media'::text);

DROP POLICY IF EXISTS player_media_storage_insert ON storage.objects;
CREATE POLICY player_media_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'player-media'::text);

DROP POLICY IF EXISTS player_media_storage_update ON storage.objects;
CREATE POLICY player_media_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'player-media'::text)
  WITH CHECK (bucket_id = 'player-media'::text);

DROP POLICY IF EXISTS player_media_storage_delete ON storage.objects;
CREATE POLICY player_media_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'player-media'::text);

-- ============================================================
-- TEAMS (4 policies, admin + moderator/analyst — mismo patrón divisions)
-- ============================================================

DROP POLICY IF EXISTS teams_storage_select ON storage.objects;
CREATE POLICY teams_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'teams'::text);

DROP POLICY IF EXISTS teams_storage_insert ON storage.objects;
CREATE POLICY teams_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'teams'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  );

DROP POLICY IF EXISTS teams_storage_update ON storage.objects;
CREATE POLICY teams_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'teams'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  )
  WITH CHECK (
    bucket_id = 'teams'::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role = ANY (ARRAY['moderator'::role, 'analyst'::role])
      )
    )
  );

DROP POLICY IF EXISTS teams_storage_delete ON storage.objects;
CREATE POLICY teams_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'teams'::text
    AND public.is_admin(auth.uid())
  );
