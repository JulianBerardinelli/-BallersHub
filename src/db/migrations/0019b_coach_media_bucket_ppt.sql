-- ===============================================================
-- 0019b_coach_media_bucket_ppt.sql
--
-- Manual complementario (no tracked by Drizzle).
-- Aplica: amplía el bucket coach-media para aceptar PowerPoint (PPT/PPTX)
--   además de las imágenes + PDF que ya permitía (ver 0015a / 0015f), y sube el
--   límite a 25MB porque las presentaciones con imágenes pesan más que un PDF.
--   Los adjuntos de metodología (coach_media type='doc' + rubro_id) viven acá.
--   Las rutas de subida siguen validando MIME + tamaño por su cuenta (magic
--   bytes, no extensión) y aplican el cap por plan — esto es sólo el techo del
--   storage. Ver docs/staff/PLAN.md §5.2 / §8.
-- Requires: 0015f (que dejó el bucket en image/* + pdf, 10MB).
-- Aplicado en dev (ciolizjshimyvyonlssq) via MCP execute_sql el 2026-06-24.
-- Aplicado en prod (erdvpcfjynkhcrqktozd) via MCP execute_sql el 2026-06-24.
-- Idempotente: sí (UPDATE absoluto del array + límite).
-- ===============================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ],
    file_size_limit = 26214400
WHERE id = 'coach-media';
