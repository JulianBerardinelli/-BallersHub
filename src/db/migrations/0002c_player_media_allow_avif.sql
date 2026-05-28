-- ===============================================================
-- 0002c_player_media_allow_avif.sql
--
-- Manual complementary migration (NOT tracked by Drizzle).
-- Extiende `allowed_mime_types` del bucket `player-media` para
-- aceptar `image/avif`.
--
-- Contexto: el commit 6c6b31b (feat(media): season_year en
-- highlights + transcode AVIF en catálogo, 2026-05-21) cambió
-- /api/media/upload para transcodear las fotos del catálogo a AVIF
-- y subirlas con contentType "image/avif". El bucket en main+dev
-- tenía whitelist ['image/jpeg','image/png','image/webp','image/svg+xml']
-- (creado con el bootstrap post-recovery), entonces Supabase Storage
-- rechazaba todos los uploads del endpoint con error de MIME → 500.
--
-- Síntoma observado: usuarios en producción no podían subir fotos al
-- catálogo desde /dashboard/edit-profile/multimedia. Logs Vercel:
-- "Storage upload error: [Error...]" en cada POST /api/media/upload.
-- Reportado 2026-05-25.
--
-- Idempotente: el UPDATE replantea el array completo. Si se vuelve
-- a aplicar, deja el mismo resultado.
-- ===============================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml'
]
WHERE id = 'player-media';
