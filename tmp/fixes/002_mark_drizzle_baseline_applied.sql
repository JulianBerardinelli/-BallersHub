-- Run this in: Supabase Studio (https://supabase.com/dashboard/project/erdvpcfjynkhcrqktozd/sql/new)
-- AFTER you commit + deploy the new src/db/migrations/0000_initial_baseline.sql.
--
-- Bootstraps the `drizzle.__drizzle_migrations` table and registers the new
-- baseline as already-applied, so `npm run db:migrate` from this point on is
-- a no-op against prod (until you add real new migrations).
--
-- Hash matches: shasum -a 256 src/db/migrations/0000_initial_baseline.sql
-- Hash:    d0564e2f59248822b1f41785c8b2305eb4aeacf68bd96ea4ac6497cf32d4321c
-- Tag:     0000_initial_baseline
-- "when":  1778872470157 (from _journal.json)

-- 1) Create the drizzle schema + tracking table if missing.
CREATE SCHEMA IF NOT EXISTS drizzle;

CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id          SERIAL PRIMARY KEY,
  hash        text NOT NULL,
  created_at  bigint
);

-- 2) Mark the baseline as applied. Idempotent: only inserts if not already
--    present, identified by hash.
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'd0564e2f59248822b1f41785c8b2305eb4aeacf68bd96ea4ac6497cf32d4321c'::text,
       1778872470157::bigint
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = 'd0564e2f59248822b1f41785c8b2305eb4aeacf68bd96ea4ac6497cf32d4321c'
);

-- 3) Verify
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id;
