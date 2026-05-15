-- Upgrade agency_profiles.services from text[] to jsonb so each service can
-- carry title + icon + color + description. We backfill existing strings
-- into objects with default icon/color so no manager loses their data.

DO $migration$
DECLARE
  current_type text;
BEGIN
  SELECT data_type
    INTO current_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'agency_profiles'
     AND column_name  = 'services';

  IF current_type = 'ARRAY' THEN
    -- Stage in a tmp jsonb column so we can preserve data through the type swap.
    ALTER TABLE "agency_profiles"
      ADD COLUMN IF NOT EXISTS "services_tmp" jsonb;

    UPDATE "agency_profiles"
       SET "services_tmp" = COALESCE(
         (
           SELECT jsonb_agg(
             jsonb_build_object(
               'title', s,
               'icon', 'briefcase',
               'color', null,
               'description', null
             )
           )
             FROM unnest(services) AS s
         ),
         '[]'::jsonb
       );

    ALTER TABLE "agency_profiles" DROP COLUMN "services";
    ALTER TABLE "agency_profiles" RENAME COLUMN "services_tmp" TO "services";
  ELSIF current_type IS NULL THEN
    -- Column doesn't exist (fresh DB). Create it as jsonb directly.
    ALTER TABLE "agency_profiles" ADD COLUMN "services" jsonb;
  END IF;
END
$migration$;
