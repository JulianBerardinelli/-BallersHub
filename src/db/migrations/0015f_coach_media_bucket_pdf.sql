-- 0015f_coach_media_bucket_pdf.sql
--
-- El bucket coach-media (definido en 0015a) sólo permitía imágenes
-- (image/jpeg|png|webp|avif) y 5MB. La subida de documentos de licencia
-- (/api/coach/license-doc/upload) acepta PDF hasta 10MB → el storage rechazaba
-- todo PDF y el flujo "Subir PDF" fallaba con un error genérico. Ampliamos el
-- bucket para aceptar application/pdf y subimos el límite a 10MB (las rutas de
-- subida siguen validando el MIME por su cuenta).
--
-- Complementario: NO tracked en el journal de Drizzle. Se aplica a mano a dev
-- (ciolizjshimyvyonlssq) y prod (erdvpcfjynkhcrqktozd) vía MCP.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'
    ],
    file_size_limit = 10485760
WHERE id = 'coach-media';
