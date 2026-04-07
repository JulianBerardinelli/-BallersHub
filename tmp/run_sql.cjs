const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const sqlQuery = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'player_media_owner_insert_limit' AND polrelid = 'public.player_media'::regclass
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

UPDATE public.subscriptions
SET limits_json = jsonb_set(
  jsonb_set(
    COALESCE(limits_json, '{}'::jsonb),
    '{max_photos}',
    '10'::jsonb
  ),
  '{max_videos}',
  '5'::jsonb
)
WHERE plan = 'free';
`;

async function main() {
  const sql = postgres('postgresql://postgres:Melapela10ballershub@db.ygansmlplzzwkjdmlqtu.supabase.co:5432/postgres', { ssl: 'require' });
  try {
    console.log("Running SQL update script...");
    await sql.unsafe(sqlQuery);
    console.log("SQL update script completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("SQL update script failed:", err);
    process.exit(1);
  }
}

main();
