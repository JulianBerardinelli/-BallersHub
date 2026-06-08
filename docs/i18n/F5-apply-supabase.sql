-- =====================================================================
-- F5 — i18n traducciones per-perfil · aplicar a Supabase
-- =====================================================================
-- ORDEN: supabase-dev (ciolizjshimyvyonlssq / avhctddkbcneugtqqxxk) PRIMERO
--        → correr PASO 3 (smoke) → recién después prod (erdvpcfjynkhcrqktozd).
--
-- Todo es ADD-only (CREATE TABLE / ADD COLUMN). No toca nada existente.
-- Rollback = DROP (ver el final del archivo).
--
-- Fuente: src/db/migrations/0009_supreme_wolfpack.sql   (Drizzle)
--         src/db/migrations/0009a_translations_rls.sql  (manual RLS)
--
-- ⚠️ El PASO 1 es una migration de Drizzle. Si lo corrés ACÁ en Studio
--    (en vez de `npm run db:migrate`), corré también el PASO 4 en esa misma
--    base para que Drizzle no intente re-crearlo y rompa el próximo
--    `db:migrate`. Si aplicás el PASO 1 con `db:migrate`, ignorá el PASO 4.
-- =====================================================================


-- =====================================================================
-- PASO 1 — Tablas + columna  (= 0009_supreme_wolfpack.sql)
-- =====================================================================

CREATE TABLE "agency_profile_translations" (
  "agency_id" uuid NOT NULL,
  "locale" text NOT NULL,
  "description" text,
  "tagline" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "agency_profile_translations_agency_id_locale_pk" PRIMARY KEY("agency_id","locale"),
  CONSTRAINT "agency_profile_translations_locale_check" CHECK (locale IN ('es','en','it','pt'))
);

CREATE TABLE "ai_translation_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" uuid NOT NULL,
  "locale" text NOT NULL,
  "block" text NOT NULL,
  "kind" text NOT NULL,
  "source_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ai_translation_events_locale_check" CHECK (locale IN ('es','en','it','pt')),
  CONSTRAINT "ai_translation_events_kind_check" CHECK (kind IN ('initial','regen'))
);

CREATE TABLE "player_profile_translations" (
  "player_id" uuid NOT NULL,
  "locale" text NOT NULL,
  "bio" text,
  "career_objectives" text,
  "top_characteristics" text[],
  "tactics_analysis" text,
  "physical_analysis" text,
  "mental_analysis" text,
  "technique_analysis" text,
  "analysis_author" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "player_profile_translations_player_id_locale_pk" PRIMARY KEY("player_id","locale"),
  CONSTRAINT "player_profile_translations_locale_check" CHECK (locale IN ('es','en','it','pt'))
);

ALTER TABLE "user_profiles" ADD COLUMN "preferred_locale" text DEFAULT 'es' NOT NULL;

ALTER TABLE "agency_profile_translations"
  ADD CONSTRAINT "agency_profile_translations_agency_id_agency_profiles_id_fk"
  FOREIGN KEY ("agency_id") REFERENCES "public"."agency_profiles"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "ai_translation_events"
  ADD CONSTRAINT "ai_translation_events_player_id_player_profiles_id_fk"
  FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "player_profile_translations"
  ADD CONSTRAINT "player_profile_translations_player_id_player_profiles_id_fk"
  FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX "ai_translation_events_quota_idx"
  ON "ai_translation_events" USING btree ("player_id","kind","created_at");

ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_preferred_locale_check"
  CHECK (preferred_locale IN ('es','en','it','pt'));


-- =====================================================================
-- PASO 2 — RLS + policies + triggers + GRANTs  (= 0009a_translations_rls.sql)
-- Reusa public.set_updated_at() y public.is_admin(uuid) ya existentes.
-- =====================================================================

-- ---------- player_profile_translations ----------
ALTER TABLE public.player_profile_translations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS player_profile_translations_set_updated_at
  ON public.player_profile_translations;
CREATE TRIGGER player_profile_translations_set_updated_at
  BEFORE UPDATE ON public.player_profile_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS player_profile_translations_read
  ON public.player_profile_translations;
CREATE POLICY player_profile_translations_read
  ON public.player_profile_translations
  FOR SELECT
  USING (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id
        and p.visibility = 'public'::visibility
        and p.status = 'approved'::player_status
    )
    or exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS player_profile_translations_cud
  ON public.player_profile_translations;
CREATE POLICY player_profile_translations_cud
  ON public.player_profile_translations
  FOR ALL
  USING (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  )
  WITH CHECK (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.player_profile_translations TO authenticated;
GRANT SELECT ON public.player_profile_translations TO anon;

-- ---------- agency_profile_translations ----------
ALTER TABLE public.agency_profile_translations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS agency_profile_translations_set_updated_at
  ON public.agency_profile_translations;
CREATE TRIGGER agency_profile_translations_set_updated_at
  BEFORE UPDATE ON public.agency_profile_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS agency_profile_translations_read
  ON public.agency_profile_translations;
CREATE POLICY agency_profile_translations_read
  ON public.agency_profile_translations
  FOR SELECT
  USING (
    exists (
      select 1 from public.agency_profiles a
      where a.id = agency_id and a.is_approved = true
    )
    or exists (
      select 1 from public.user_profiles up
      where up.agency_id = agency_id and up.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS agency_profile_translations_cud
  ON public.agency_profile_translations;
CREATE POLICY agency_profile_translations_cud
  ON public.agency_profile_translations
  FOR ALL
  USING (
    exists (
      select 1 from public.user_profiles up
      where up.agency_id = agency_id and up.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  )
  WITH CHECK (
    exists (
      select 1 from public.user_profiles up
      where up.agency_id = agency_id and up.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.agency_profile_translations TO authenticated;
GRANT SELECT ON public.agency_profile_translations TO anon;

-- ---------- ai_translation_events (privada: quota/audit) ----------
ALTER TABLE public.ai_translation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_translation_events_owner_read
  ON public.ai_translation_events;
CREATE POLICY ai_translation_events_owner_read
  ON public.ai_translation_events
  FOR SELECT
  USING (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS ai_translation_events_owner_insert
  ON public.ai_translation_events;
CREATE POLICY ai_translation_events_owner_insert
  ON public.ai_translation_events
  FOR INSERT
  WITH CHECK (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

GRANT SELECT, INSERT ON public.ai_translation_events TO authenticated;


-- =====================================================================
-- PASO 3 — Smoke test (esperado entre paréntesis)
-- =====================================================================
SELECT count(*) FROM player_profile_translations;   -- (0)
SELECT count(*) FROM agency_profile_translations;    -- (0)
SELECT count(*) FROM ai_translation_events;          -- (0)

-- RLS activa en las 3 (rowsecurity = true):
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('player_profile_translations',
                    'agency_profile_translations',
                    'ai_translation_events');

-- columna nueva con default 'es':
SELECT preferred_locale FROM user_profiles LIMIT 1;  -- ('es')


-- =====================================================================
-- PASO 4 — SOLO si corriste el PASO 1 a mano (no via `npm run db:migrate`)
-- Registra la migration en el tracker de Drizzle para que NO se re-aplique.
-- (Si usaste db:migrate, NO corras esto.)
-- =====================================================================
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('ec3ae71e82d403b7f700b96d20cd7b1edbfdd8add3d3465f82842dbe1a919185',
        (extract(epoch from now()) * 1000)::bigint);


-- =====================================================================
-- ROLLBACK (si hiciera falta) — ADD-only, así que es seguro:
-- =====================================================================
-- DROP TABLE IF EXISTS public.ai_translation_events CASCADE;
-- DROP TABLE IF EXISTS public.player_profile_translations CASCADE;
-- DROP TABLE IF EXISTS public.agency_profile_translations CASCADE;
-- ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS preferred_locale;
-- DELETE FROM drizzle.__drizzle_migrations
--   WHERE hash = 'ec3ae71e82d403b7f700b96d20cd7b1edbfdd8add3d3465f82842dbe1a919185';
