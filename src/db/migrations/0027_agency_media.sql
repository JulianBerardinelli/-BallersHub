-- Agency media gallery: up to 5 photos per agency. Used by the public portfolio
-- gallery module. Avatar/logo lives in agency_profiles.logo_url.

CREATE TABLE IF NOT EXISTS "agency_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agency_id" uuid NOT NULL REFERENCES "agency_profiles"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "title" text,
  "alt_text" text,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "agency_media_agency_idx"
  ON "agency_media" ("agency_id");

ALTER TABLE "agency_media" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_media_select_public" ON "agency_media";
CREATE POLICY "agency_media_select_public"
  ON "agency_media"
  FOR SELECT
  USING (true);

-- Storage bucket for agency gallery uploads (public-readable like agency-logos).
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-media', 'agency-media', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (public bucket); writes/updates/deletes are restricted to
-- the manager whose agency owns the object. Path convention is
--   gallery/{agency_id}-{timestamp}.{ext}
-- so we match on the bytes that follow `gallery/`. Without this, any
-- authenticated user could remove or overwrite another agency's gallery
-- asset by calling Storage directly with a known path.
DROP POLICY IF EXISTS "agency_media_storage_select" ON storage.objects;
CREATE POLICY "agency_media_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agency-media');

DROP POLICY IF EXISTS "agency_media_storage_insert" ON storage.objects;
CREATE POLICY "agency_media_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'agency-media'
    AND EXISTS (
      SELECT 1
        FROM public.user_profiles up
       WHERE up.user_id = auth.uid()
         AND up.role = 'manager'
         AND up.agency_id IS NOT NULL
         AND objects.name LIKE 'gallery/' || up.agency_id::text || '-%'
    )
  );

DROP POLICY IF EXISTS "agency_media_storage_update" ON storage.objects;
CREATE POLICY "agency_media_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'agency-media'
    AND EXISTS (
      SELECT 1
        FROM public.user_profiles up
       WHERE up.user_id = auth.uid()
         AND up.role = 'manager'
         AND up.agency_id IS NOT NULL
         AND objects.name LIKE 'gallery/' || up.agency_id::text || '-%'
    )
  )
  WITH CHECK (
    bucket_id = 'agency-media'
    AND EXISTS (
      SELECT 1
        FROM public.user_profiles up
       WHERE up.user_id = auth.uid()
         AND up.role = 'manager'
         AND up.agency_id IS NOT NULL
         AND objects.name LIKE 'gallery/' || up.agency_id::text || '-%'
    )
  );

DROP POLICY IF EXISTS "agency_media_storage_delete" ON storage.objects;
CREATE POLICY "agency_media_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'agency-media'
    AND EXISTS (
      SELECT 1
        FROM public.user_profiles up
       WHERE up.user_id = auth.uid()
         AND up.role = 'manager'
         AND up.agency_id IS NOT NULL
         AND objects.name LIKE 'gallery/' || up.agency_id::text || '-%'
    )
  );
