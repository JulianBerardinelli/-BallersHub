-- Complementary SQL (not tracked by Drizzle) — historical split.
--
-- Pre-feature de secondary_division (PR #103), jugadores cargaban dos ligas
-- en el campo `division` separadas por " / " (ej "Tercera RFEF / Primera
-- Extremeña"). Este script las separa en primary + secondary y enlaza al
-- catálogo cuando matchee.
--
-- Idempotente: solo toca rows con división compuesta y SIN secondary_*
-- populado todavía. Si part2 no matchea ninguna division.name, queda como
-- texto en secondary_division — el editor mostrará el aviso "Liga sin
-- enlazar al catálogo".

WITH compuestos AS (
  SELECT
    ci.id,
    trim(split_part(ci.division, '/', 1)) AS part1,
    trim(split_part(ci.division, '/', 2)) AS part2
  FROM career_items ci
  WHERE ci.division ILIKE '% / %'
    AND ci.secondary_division_id IS NULL
    AND ci.secondary_division IS NULL
),
matched AS (
  SELECT
    c.id,
    c.part1,
    c.part2,
    d1.id AS part1_id,
    d1.name AS part1_name,
    d2.id AS part2_id,
    d2.name AS part2_name
  FROM compuestos c
  LEFT JOIN divisions d1 ON lower(d1.name) = lower(c.part1)
  LEFT JOIN divisions d2 ON lower(d2.name) = lower(c.part2)
  WHERE d1.id IS NOT NULL
)
UPDATE career_items ci
SET
  division = COALESCE(m.part1_name, ci.division),
  division_id = COALESCE(ci.division_id, m.part1_id),
  secondary_division = COALESCE(m.part2_name, m.part2),
  secondary_division_id = m.part2_id
FROM matched m
WHERE ci.id = m.id;

WITH compuestos AS (
  SELECT
    cri.id,
    trim(split_part(cri.division, '/', 1)) AS part1,
    trim(split_part(cri.division, '/', 2)) AS part2
  FROM career_revision_items cri
  WHERE cri.division ILIKE '% / %'
    AND cri.secondary_division_id IS NULL
    AND cri.secondary_division IS NULL
),
matched AS (
  SELECT
    c.id,
    c.part1,
    c.part2,
    d1.id AS part1_id,
    d1.name AS part1_name,
    d2.id AS part2_id,
    d2.name AS part2_name
  FROM compuestos c
  LEFT JOIN divisions d1 ON lower(d1.name) = lower(c.part1)
  LEFT JOIN divisions d2 ON lower(d2.name) = lower(c.part2)
  WHERE d1.id IS NOT NULL
)
UPDATE career_revision_items cri
SET
  division = COALESCE(m.part1_name, cri.division),
  division_id = COALESCE(cri.division_id, m.part1_id),
  secondary_division = COALESCE(m.part2_name, m.part2),
  secondary_division_id = m.part2_id
FROM matched m
WHERE cri.id = m.id;
