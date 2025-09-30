-- Client dashboard bootstrap script
-- Run this in the Supabase SQL editor to ensure the player dashboard
-- backing structures exist in the target environment.

BEGIN;

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
  p.bio AS profile_bio,
  p.avatar_url AS profile_avatar_url,
  p.foot AS profile_foot,
  p.height_cm AS profile_height_cm,
  p.weight_kg AS profile_weight_kg,
  p.updated_at AS profile_updated_at,
  p.plan_public AS profile_plan_public,
  p.market_value_eur AS profile_market_value_eur,
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

COMMIT;
