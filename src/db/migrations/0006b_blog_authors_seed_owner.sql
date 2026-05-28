-- ===============================================================
-- 0003b_blog_authors_seed_owner.sql
--
-- Manual complementario (NO tracked by Drizzle).
--
-- Aplica:
--   - INSERT idempotente del blog_authors row del owner (Julián).
--     Necesario para que los posts ya publicados (firmados como
--     "Equipo 'BallersHub") pasen a tener Author hub real con
--     ProfilePage JSON-LD + sameAs en lugar de un @id dangling.
--
-- Requires:
--   - 0003_supreme_mastermind.sql aplicado (crea blog_authors)
--   - 0003a_blog_authors_rls.sql aplicado (RLS no bloquea el seed
--     porque corre con superuser/postgres role)
--   - El user del owner ya debe existir en auth.users
--
-- Idempotente: sí. ON CONFLICT (user_id) DO UPDATE actualiza display
-- editorial sin tocar slug (para no romper URLs).
--
-- Aplicado en dev (ciolizjshimyvyonlssq) el <pendiente — completar>.
-- Aplicado en prod (erdvpcfjynkhcrqktozd) — pendiente, requiere
-- autorización explícita del owner antes del merge dev→main.
--
-- Personalizar bio/social URLs después con UPDATE manual; el seed
-- mete defaults conservadores que el owner puede editar luego.
-- ===============================================================

INSERT INTO public.blog_authors (
  user_id,
  slug,
  display_name,
  headline,
  bio
)
SELECT
  u.id,
  'julian-berardinelli',
  'Julián Berardinelli',
  'Founder de ''BallersHub',
  'Founder de ''BallersHub. Construyendo la plataforma de portfolios profesionales para futbolistas y agencias del fútbol argentino.'
FROM auth.users u
WHERE u.email = 'julian.berardinelli@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  headline = EXCLUDED.headline,
  bio = EXCLUDED.bio,
  updated_at = now();

-- Verificación: si el user del owner existe en auth.users, debe haber
-- 1 row con slug 'julian-berardinelli'. En entornos sin auth.users
-- poblado (ej. branch dev creado schema-only) el INSERT no inserta y
-- el script emite un NOTICE en lugar de fallar. En prod (con users
-- reales) el NOTICE no se dispara y la fila queda lista.
DO $$
DECLARE
  v_owner_exists boolean;
  v_seed_count int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'julian.berardinelli@gmail.com'
  ) INTO v_owner_exists;

  SELECT count(*) INTO v_seed_count
  FROM public.blog_authors
  WHERE slug = 'julian-berardinelli';

  IF v_owner_exists AND v_seed_count <> 1 THEN
    RAISE EXCEPTION 'blog_authors seed verification failed: owner exists in auth.users but blog_authors row not created (got % rows for slug=julian-berardinelli)', v_seed_count;
  END IF;

  IF NOT v_owner_exists THEN
    RAISE NOTICE 'blog_authors seed skipped: no auth.users row for julian.berardinelli@gmail.com (esperado en branch dev schema-only)';
  END IF;
END $$;
