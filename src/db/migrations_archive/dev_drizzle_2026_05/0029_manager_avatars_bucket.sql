-- Storage bucket for manager (agent) personal avatars. Public-readable like the
-- player avatars, with INSERT/UPDATE/DELETE allowed to authenticated users.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manager-avatars',
  'manager-avatars',
  true,
  2097152,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
   SET file_size_limit   = EXCLUDED.file_size_limit,
       allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "manager_avatars_storage_select" ON storage.objects;
CREATE POLICY "manager_avatars_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'manager-avatars');

DROP POLICY IF EXISTS "manager_avatars_storage_insert" ON storage.objects;
CREATE POLICY "manager_avatars_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'manager-avatars');

DROP POLICY IF EXISTS "manager_avatars_storage_update" ON storage.objects;
CREATE POLICY "manager_avatars_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'manager-avatars')
  WITH CHECK (bucket_id = 'manager-avatars');

DROP POLICY IF EXISTS "manager_avatars_storage_delete" ON storage.objects;
CREATE POLICY "manager_avatars_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'manager-avatars');
