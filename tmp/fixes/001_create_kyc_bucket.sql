-- Run this in: Supabase Studio (https://supabase.com/dashboard/project/erdvpcfjynkhcrqktozd/sql/new)
-- Idempotent: safe to run multiple times.
--
-- Creates the 'kyc' storage bucket (PRIVATE) that the prod migration missed.
-- Without this, /admin/applications and /admin/manager-applications cannot
-- show signed URLs for ID docs/selfies, and onboarding KYC upload fails.

-- 1) Bucket — PRIVATE, 5 MB, only image/* + PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc',
  'kyc',
  false,
  5242880,
  ARRAY['image/jpeg','image/png','application/pdf']
)
ON CONFLICT (id) DO UPDATE
   SET file_size_limit    = EXCLUDED.file_size_limit,
       allowed_mime_types = EXCLUDED.allowed_mime_types,
       public             = EXCLUDED.public;

-- 2) SELECT — owner (top-level folder = auth.uid()) OR admin/moderator/analyst
DROP POLICY IF EXISTS "kyc_storage_select" ON storage.objects;
CREATE POLICY "kyc_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role IN ('moderator','analyst')
      )
    )
  );

-- 3) INSERT — authenticated user uploads to their own folder only
DROP POLICY IF EXISTS "kyc_storage_insert" ON storage.objects;
CREATE POLICY "kyc_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) UPDATE — admin/moderator/analyst (for review metadata)
DROP POLICY IF EXISTS "kyc_storage_update" ON storage.objects;
CREATE POLICY "kyc_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'kyc'
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role IN ('moderator','analyst')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'kyc'
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role IN ('moderator','analyst')
      )
    )
  );

-- 5) DELETE — admin only
DROP POLICY IF EXISTS "kyc_storage_delete" ON storage.objects;
CREATE POLICY "kyc_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc'
    AND public.is_admin(auth.uid())
  );

-- 6) Verify
SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id='kyc';
SELECT policyname FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname LIKE 'kyc_%';
