-- ===============================================================
-- 0006c_blog_media_bucket.sql
--
-- Manual complementario (NO tracked by Drizzle, NO entry en
-- meta/_journal.json). Storage buckets viven en schema `storage`,
-- fuera del alcance de Drizzle (ver docs/db/migration-workflow.md §3).
--
-- Aplica:
--   - Bucket `blog-media` (público, 5MB, JPEG/PNG/WebP/AVIF)
--   - 4 storage.objects policies: select público, insert bloggers,
--     update owner+admin, delete owner+admin
--
-- Por qué bucket dedicado (vs reusar player-media):
--   - Quota / cleanup separados (un blogger spam-uploading no afecta
--     al storage de jugadores)
--   - RLS distinta: player-media indexa por player_id; blog-media
--     indexa por user_id del blogger directo
--   - El path schema es más simple ({user_id}/{uuid}.avif) y permite
--     RLS por foldername sin joins
--
-- Path convention: `{user_id}/{uuid}.avif`
-- (server transcode todo a AVIF q60, mismo patrón que /api/media/upload).
--
-- Requires: public.is_admin(uuid) y public.user_profiles ya existen
-- (auth schema bootstrap).
--
-- Idempotente: sí. ON CONFLICT DO UPDATE en buckets actualiza
-- file_size_limit y mime_types si cambian; DROP POLICY IF EXISTS
-- antes de cada CREATE.
-- ===============================================================

-- ============================================================
-- Bucket creation
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-media',
  'blog-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Policies on storage.objects
-- ============================================================

-- 1. SELECT: público total (anon + authenticated). Las imágenes del
--    blog son embebidas en posts públicos — no hay nada que ocultar.
DROP POLICY IF EXISTS blog_media_storage_select ON storage.objects;
CREATE POLICY blog_media_storage_select ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'blog-media'::text);

-- 2. INSERT: solo bloggers whitelisted (user_profiles.is_blogger=true)
--    y solo bajo su propia carpeta {user_id}/. is_admin() también
--    permite (para uploads de admin desde panel editorial).
--    foldername(name)[1] = primer segmento del path = user_id.
DROP POLICY IF EXISTS blog_media_storage_insert ON storage.objects;
CREATE POLICY blog_media_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'blog-media'::text
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.is_blogger = true
      )
    )
  );

-- 3. UPDATE: owner del file (path starts con su user_id) o admin.
--    Cambio de metadata sí, replace de bytes no permitido (Supabase
--    Storage usa upsert: false en el client).
DROP POLICY IF EXISTS blog_media_storage_update ON storage.objects;
CREATE POLICY blog_media_storage_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'blog-media'::text
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id = 'blog-media'::text
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- 4. DELETE: owner o admin. Admin cleanup de orphan files (sin post
--    asociado) lo hacemos manualmente — no hay garbage collector
--    automático en MVP-2.
DROP POLICY IF EXISTS blog_media_storage_delete ON storage.objects;
CREATE POLICY blog_media_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'blog-media'::text
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
