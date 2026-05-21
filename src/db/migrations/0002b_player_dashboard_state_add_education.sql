-- ===============================================================
-- 0002b_player_dashboard_state_add_education.sql
--
-- Manual complementary migration (NOT tracked by Drizzle).
-- Recreates the `player_dashboard_state` view to expose
-- `ppd.education AS personal_education` so the dashboard data
-- provider can read the player's education line in a single round-trip
-- (instead of falling back to a separate `player_personal_details`
-- query).
--
-- Requires: `player_personal_details.education` (text, nullable) — already
-- present in both branches as part of the initial baseline.
-- Idempotent: yes (CREATE OR REPLACE VIEW + GRANT preserved).
--
-- Applied in dev (ciolizjshimyvyonlssq) via MCP `apply_migration` 2026-05-21.
-- Applied in prod (erdvpcfjynkhcrqktozd) via MCP `apply_migration` 2026-05-21.
-- ===============================================================

CREATE OR REPLACE VIEW "public"."player_dashboard_state" AS
 SELECT u.id AS user_id,
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
    p.transfermarkt_url AS profile_transfermarkt_url,
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
    ppd.whatsapp AS personal_whatsapp,
    ppd.show_contact_section AS personal_show_contact_section,
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
    media.url AS primary_photo_url,
    ppd.education AS personal_education
   FROM auth.users u
     LEFT JOIN player_profiles p ON p.user_id = u.id
     LEFT JOIN player_personal_details ppd ON ppd.player_id = p.id
     LEFT JOIN LATERAL (
       SELECT pa.id, pa.user_id, pa.plan_requested, pa.full_name, pa.nationality,
              pa.positions, pa.current_club, pa.transfermarkt_url, pa.external_profile_url,
              pa.id_doc_url, pa.selfie_url, pa.notes, pa.status, pa.reviewed_by_user_id,
              pa.reviewed_at, pa.created_at, pa.updated_at, pa.current_team_id,
              pa.proposed_team_name, pa.proposed_team_country, pa.free_agent,
              pa.personal_info_approved, pa.proposed_team_category,
              pa.proposed_team_transfermarkt_url, pa.proposed_team_country_code,
              pa.birth_date, pa.height_cm, pa.weight_kg
         FROM player_applications pa
        WHERE pa.user_id = u.id
        ORDER BY pa.created_at DESC
        LIMIT 1
     ) app ON true
     LEFT JOIN subscriptions sub ON sub.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT pm.url
         FROM player_media pm
        WHERE pm.player_id = p.id AND pm.type = 'photo'::media_type AND pm.is_primary = true
        ORDER BY pm.created_at DESC
        LIMIT 1
     ) media ON true
  WHERE u.id = auth.uid();

GRANT SELECT ON TABLE "public"."player_dashboard_state" TO "authenticated";
GRANT SELECT ON TABLE "public"."player_dashboard_state" TO "service_role";
