-- Complementary SQL (not tracked by Drizzle) — historical backfill.
--
-- Antes de PR #103 + PR #108 las etapas de trayectoria se guardaban con
-- `division` (texto libre) pero `division_id` quedaba null si el usuario
-- tipeaba sin seleccionar del autocomplete. Resultado: filas legacy sin
-- crest visible en el portfolio público y no filtrables por liga.
--
-- Este backfill recorre `career_items`, `career_revision_items` y
-- `career_item_proposals` y popula `division_id` cuando hay match exacto
-- (case-insensitive) con `divisions.name`. Idempotente: solo toca filas
-- con `division_id IS NULL` y deja intactas las que no tienen match
-- (textos compuestos pre-secondary_division y etiquetas genéricas se
-- limpian manualmente desde el dashboard del jugador).

UPDATE career_items ci
SET division_id = d.id
FROM divisions d
WHERE ci.division_id IS NULL
  AND ci.division IS NOT NULL
  AND lower(d.name) = lower(ci.division);

UPDATE career_revision_items cri
SET division_id = d.id
FROM divisions d
WHERE cri.division_id IS NULL
  AND cri.division IS NOT NULL
  AND lower(d.name) = lower(cri.division);

UPDATE career_item_proposals cip
SET division_id = d.id
FROM divisions d
WHERE cip.division_id IS NULL
  AND cip.division IS NOT NULL
  AND lower(d.name) = lower(cip.division);
