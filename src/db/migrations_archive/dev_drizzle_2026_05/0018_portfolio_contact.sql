-- Public-facing contact channels on player_personal_details (manual social links + per-channel visibility flags).
ALTER TABLE "player_personal_details"
  ADD COLUMN IF NOT EXISTS "public_email" text,
  ADD COLUMN IF NOT EXISTS "whatsapp" text,
  ADD COLUMN IF NOT EXISTS "instagram_url" text,
  ADD COLUMN IF NOT EXISTS "linkedin_url" text,
  ADD COLUMN IF NOT EXISTS "show_contact_section" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "show_email" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "show_phone" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "show_whatsapp" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "show_instagram" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "show_linkedin" boolean NOT NULL DEFAULT false;

-- Lead capture: visitors who unlock a portfolio's contact section.
CREATE TABLE IF NOT EXISTS "portfolio_leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid REFERENCES "player_profiles"("id") ON DELETE SET NULL,
  "email" text NOT NULL,
  "source" text NOT NULL DEFAULT 'contact_unlock',
  "referrer" text,
  "user_agent" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "portfolio_leads_email_idx" ON "portfolio_leads" ("email");
CREATE INDEX IF NOT EXISTS "portfolio_leads_player_idx" ON "portfolio_leads" ("player_id");

-- Click tracking on each contact channel (whatsapp/email/phone/instagram/linkedin).
CREATE TABLE IF NOT EXISTS "portfolio_contact_clicks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL REFERENCES "player_profiles"("id") ON DELETE CASCADE,
  "platform" text NOT NULL,
  "viewer_email" text,
  "viewer_user_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "portfolio_contact_clicks_player_idx" ON "portfolio_contact_clicks" ("player_id");

-- Refresh the dashboard state view so the client picks up the new contact columns.
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
  ppd.public_email AS personal_public_email,
  ppd.whatsapp AS personal_whatsapp,
  ppd.instagram_url AS personal_instagram_url,
  ppd.linkedin_url AS personal_linkedin_url,
  ppd.show_contact_section AS personal_show_contact_section,
  ppd.show_email AS personal_show_email,
  ppd.show_phone AS personal_show_phone,
  ppd.show_whatsapp AS personal_show_whatsapp,
  ppd.show_instagram AS personal_show_instagram,
  ppd.show_linkedin AS personal_show_linkedin,
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
