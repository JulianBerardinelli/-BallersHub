-- Reset agency-logos storage policies. The previous policies (created via
-- Studio UI) sometimes failed RLS check on upsert. We replace them with clean
-- INSERT / UPDATE / DELETE policies bound to the authenticated role.

DROP POLICY IF EXISTS "Auth Users Can Upload Agency Logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth Users Can Update their Agency Logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth Users Can Delete their Agency Logos" ON storage.objects;

DROP POLICY IF EXISTS "agency_logos_storage_select" ON storage.objects;
CREATE POLICY "agency_logos_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agency-logos');

DROP POLICY IF EXISTS "agency_logos_storage_insert" ON storage.objects;
CREATE POLICY "agency_logos_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'agency-logos');

DROP POLICY IF EXISTS "agency_logos_storage_update" ON storage.objects;
CREATE POLICY "agency_logos_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'agency-logos')
  WITH CHECK (bucket_id = 'agency-logos');

DROP POLICY IF EXISTS "agency_logos_storage_delete" ON storage.objects;
CREATE POLICY "agency_logos_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'agency-logos');

-- Tighten size limit + allowed mime types so the bucket can never grow out
-- of control. 5 MB is plenty for a logo.
UPDATE storage.buckets
   SET file_size_limit   = 5242880,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
 WHERE id = 'agency-logos';

UPDATE storage.buckets
   SET file_size_limit   = 5242880,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
 WHERE id = 'agency-media';
