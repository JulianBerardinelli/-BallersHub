-- Move representation licenses from the agency level to the individual
-- manager (agent) level. Each agent's license is theirs personally; the agency
-- portfolio aggregates licenses across the staff.

ALTER TABLE "manager_profiles"
  ADD COLUMN IF NOT EXISTS "licenses" jsonb;

-- Best-effort data migration: copy legacy agency licenses to the OLDEST
-- manager linked to that agency, so no data is lost in dev databases.
-- Wrapped in a DO block so the migration is idempotent — if the legacy
-- agency_profiles.licenses column is already gone, we simply skip this step.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'agency_profiles'
       AND column_name  = 'licenses'
  ) THEN
    EXECUTE $sql$
      UPDATE "manager_profiles" m
         SET "licenses" = seed.licenses
        FROM (
          SELECT DISTINCT ON (a.id)
                 a.id  AS agency_id,
                 a.licenses AS licenses,
                 u.user_id AS user_id
            FROM "agency_profiles" a
            JOIN "user_profiles" u ON u.agency_id = a.id AND u.role = 'manager'
           WHERE a.licenses IS NOT NULL
             AND jsonb_array_length(a.licenses) > 0
           ORDER BY a.id, u.created_at ASC
        ) seed
       WHERE m.user_id = seed.user_id
         AND (m.licenses IS NULL OR jsonb_array_length(m.licenses) = 0);
    $sql$;
  END IF;
END
$migration$;

-- Drop the legacy agency-level licenses column to enforce the new model.
ALTER TABLE "agency_profiles"
  DROP COLUMN IF EXISTS "licenses",
  DROP COLUMN IF EXISTS "agent_license_type",
  DROP COLUMN IF EXISTS "agent_license_url";
