-- Client dashboard bootstrap script
-- Run this in the Supabase SQL editor to ensure the player dashboard
-- backing structures exist in the target environment.

BEGIN;

-- Ensure cryptographic helpers are available for UUID generation.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Auditing table to track critical profile mutations from the dashboard UI.
CREATE TABLE IF NOT EXISTS public.profile_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  user_id uuid,
  field text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure foreign-key integrity with player profiles and optionally the authoring user.
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.profile_change_logs
      ADD CONSTRAINT profile_change_logs_player_id_fkey
      FOREIGN KEY (player_id)
      REFERENCES public.player_profiles(id)
      ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.profile_change_logs
      ADD CONSTRAINT profile_change_logs_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;

-- Indexes used by the dashboard when querying the change timeline.
CREATE INDEX IF NOT EXISTS idx_profile_change_logs_player
  ON public.profile_change_logs (player_id);

CREATE INDEX IF NOT EXISTS idx_profile_change_logs_created_at
  ON public.profile_change_logs (created_at);

-- RLS policies mirroring production so players and admins can inspect the audit log.
ALTER TABLE public.profile_change_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_change_logs_select ON public.profile_change_logs;
CREATE POLICY profile_change_logs_select
  ON public.profile_change_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_change_logs.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS profile_change_logs_insert ON public.profile_change_logs;
CREATE POLICY profile_change_logs_insert
  ON public.profile_change_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = profile_change_logs.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Expose the audit log through Supabase clients.
GRANT ALL ON public.profile_change_logs TO anon;
GRANT ALL ON public.profile_change_logs TO authenticated;
GRANT ALL ON public.profile_change_logs TO service_role;

-- Identity metadata table required by the consolidated dashboard view.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'player_media'
      AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE public.player_media
      ADD COLUMN is_primary boolean DEFAULT false NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_player_media_primary_photo
      ON public.player_media (player_id)
      WHERE is_primary;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.player_personal_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  document_type text,
  document_number text,
  document_country text,
  document_country_code char(2),
  languages text[],
  phone text,
  residence_city text,
  residence_country text,
  residence_country_code char(2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_personal_details
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS document_country text,
  ADD COLUMN IF NOT EXISTS document_country_code char(2),
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS residence_city text,
  ADD COLUMN IF NOT EXISTS residence_country text,
  ADD COLUMN IF NOT EXISTS residence_country_code char(2),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_personal_details_player_id_key'
      AND conrelid = 'public.player_personal_details'::regclass
  ) THEN
    ALTER TABLE public.player_personal_details
      ADD CONSTRAINT player_personal_details_player_id_key UNIQUE (player_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_personal_details_pkey'
      AND conrelid = 'public.player_personal_details'::regclass
  ) THEN
    ALTER TABLE public.player_personal_details
      ADD CONSTRAINT player_personal_details_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_personal_details_player_id_fkey'
      AND conrelid = 'public.player_personal_details'::regclass
  ) THEN
    ALTER TABLE public.player_personal_details
      ADD CONSTRAINT player_personal_details_player_id_fkey
      FOREIGN KEY (player_id)
      REFERENCES public.player_profiles(id)
      ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_player_personal_details_player
  ON public.player_personal_details (player_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'biu_set_country_code_player_personal'
      AND tgrelid = 'public.player_personal_details'::regclass
  ) THEN
    CREATE TRIGGER biu_set_country_code_player_personal
      BEFORE INSERT OR UPDATE OF residence_country, residence_country_code,
        document_country, document_country_code
      ON public.player_personal_details
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_set_country_code_from_text();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_player_personal_details_updated'
      AND tgrelid = 'public.player_personal_details'::regclass
  ) THEN
    CREATE TRIGGER trg_player_personal_details_updated
      BEFORE UPDATE ON public.player_personal_details
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

ALTER TABLE public.player_personal_details ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'player_personal_details_select'
      AND polrelid = 'public.player_personal_details'::regclass
  ) THEN
    DROP POLICY player_personal_details_select ON public.player_personal_details;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'player_personal_details_insert'
      AND polrelid = 'public.player_personal_details'::regclass
  ) THEN
    DROP POLICY player_personal_details_insert ON public.player_personal_details;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'player_personal_details_update'
      AND polrelid = 'public.player_personal_details'::regclass
  ) THEN
    DROP POLICY player_personal_details_update ON public.player_personal_details;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'player_personal_details_delete'
      AND polrelid = 'public.player_personal_details'::regclass
  ) THEN
    DROP POLICY player_personal_details_delete ON public.player_personal_details;
  END IF;
END$$;

CREATE POLICY player_personal_details_select
  ON public.player_personal_details
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_personal_details.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY player_personal_details_insert
  ON public.player_personal_details
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_personal_details.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY player_personal_details_update
  ON public.player_personal_details
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_personal_details.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_personal_details.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY player_personal_details_delete
  ON public.player_personal_details
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.player_profiles p
      WHERE p.id = player_personal_details.player_id
        AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

GRANT ALL ON public.player_personal_details TO anon;
GRANT ALL ON public.player_personal_details TO authenticated;
GRANT ALL ON public.player_personal_details TO service_role;

-- Ensure player profile deletions cascade through related tables
ALTER TABLE public.career_items
  DROP CONSTRAINT IF EXISTS career_items_player_id_fkey,
  ADD CONSTRAINT career_items_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.player_media
  DROP CONSTRAINT IF EXISTS player_media_player_id_fkey,
  ADD CONSTRAINT player_media_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.profile_change_logs
  DROP CONSTRAINT IF EXISTS profile_change_logs_player_id_fkey,
  ADD CONSTRAINT profile_change_logs_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.player_personal_details
  DROP CONSTRAINT IF EXISTS player_personal_details_player_id_fkey,
  ADD CONSTRAINT player_personal_details_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.review_invitations
  DROP CONSTRAINT IF EXISTS review_invitations_player_id_fkey,
  ADD CONSTRAINT review_invitations_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.reviewer_permissions
  DROP CONSTRAINT IF EXISTS reviewer_permissions_player_id_fkey,
  ADD CONSTRAINT reviewer_permissions_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_player_id_fkey,
  ADD CONSTRAINT reviews_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.stats_seasons
  DROP CONSTRAINT IF EXISTS stats_seasons_player_id_fkey,
  ADD CONSTRAINT stats_seasons_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.player_profiles(id)
    ON DELETE CASCADE;

-- Consolidated view consumed by the client dashboard data provider.
DROP VIEW IF EXISTS public.player_dashboard_state;

CREATE VIEW public.player_dashboard_state AS
SELECT
  u.id AS user_id,
  u.email AS user_email,
  p.id AS profile_id,
  p.status AS profile_status,
  p.slug AS profile_slug,
  p.visibility AS profile_visibility,
  p.full_name AS profile_full_name,
  p.birth_date AS profile_birth_date,
  p.nationality AS profile_nationality,
  p.nationality_codes AS profile_nationality_codes,
  p.positions AS profile_positions,
  p.current_club AS profile_current_club,
  p.contract_status AS profile_contract_status,
  p.bio AS profile_bio,
  p.avatar_url AS profile_avatar_url,
  p.foot AS profile_foot,
  p.height_cm AS profile_height_cm,
  p.weight_kg AS profile_weight_kg,
  p.updated_at AS profile_updated_at,
  p.plan_public AS profile_plan_public,
  p.market_value_eur AS profile_market_value_eur,
  p.career_objectives AS profile_career_objectives,
  ppd.id AS personal_details_id,
  ppd.document_type AS personal_document_type,
  ppd.document_number AS personal_document_number,
  ppd.document_country AS personal_document_country,
  ppd.document_country_code AS personal_document_country_code,
  ppd.languages AS personal_languages,
  ppd.phone AS personal_phone,
  ppd.residence_city AS personal_residence_city,
  ppd.residence_country AS personal_residence_country,
  ppd.residence_country_code AS personal_residence_country_code,
  app.id AS application_id,
  app.status AS application_status,
  app.created_at AS application_created_at,
  app.plan_requested AS application_plan_requested,
  app.transfermarkt_url AS application_transfermarkt_url,
  app.external_profile_url AS application_external_profile_url,
  app.full_name AS application_full_name,
  app.nationality AS application_nationality,
  app.positions AS application_positions,
  app.current_club AS application_current_club,
  app.notes AS application_notes,
  sub.plan AS subscription_plan,
  sub.status AS subscription_status,
  media.url AS primary_photo_url
FROM auth.users u
LEFT JOIN public.player_profiles p ON p.user_id = u.id
LEFT JOIN public.player_personal_details ppd ON ppd.player_id = p.id
LEFT JOIN LATERAL (
  SELECT pa.*
  FROM public.player_applications pa
  WHERE pa.user_id = u.id
  ORDER BY pa.created_at DESC
  LIMIT 1
) app ON TRUE
LEFT JOIN public.subscriptions sub ON sub.user_id = u.id
LEFT JOIN LATERAL (
  SELECT pm.url
  FROM public.player_media pm
  WHERE pm.player_id = p.id
    AND pm.type = 'photo'::public.media_type
    AND pm.is_primary = TRUE
  ORDER BY pm.created_at DESC
  LIMIT 1
) media ON TRUE;

GRANT SELECT ON public.player_dashboard_state TO authenticated;
GRANT SELECT ON public.player_dashboard_state TO service_role;

-- Fix RLS policy for player_media to allow avatar upload (is_primary = true) 
-- bypassing the strict max_photos limit or using it as a separate concern.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'player_media_owner_insert_limit'
      AND polrelid = 'public.player_media'::regclass
  ) THEN
    DROP POLICY player_media_owner_insert_limit ON public.player_media;
  END IF;
END$$;

CREATE POLICY player_media_owner_insert_limit
  ON public.player_media
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.player_profiles p WHERE p.id = player_id AND p.user_id = auth.uid())
    AND (
      is_primary = TRUE OR public.can_add_media(auth.uid(), player_id, type)
    )
  );

COMMIT;
