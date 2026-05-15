# Post-launch reconciliation — 2026-05-15

This folder contains the SQL + steps to restore prod parity with the codebase
after the dev→prod migration that wiped triggers, missed a storage bucket, and
desynced Drizzle's migration history.

## TL;DR

1. **`001_create_kyc_bucket.sql`** — Run in Supabase Studio. Creates the
   private `kyc` bucket + 4 RLS policies. Required for `/admin/applications`,
   `/admin/manager-applications`, and onboarding KYC upload to work.

2. **Vercel envs (Production)** — Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Value: `eyJhbGciOiJIUzI1NiIs...YjILYubX37F5KgT4ASQaptOmtpH9ZmsettGzhFRjy0w`
   (full key in chat history; do NOT commit it). Then redeploy. Copy the
   complete Production env set to Preview so previews stop pointing at the
   deleted dev Supabase branch.

3. **`002_mark_drizzle_baseline_applied.sql`** — Run in Supabase Studio
   AFTER the commit that resets `src/db/migrations/` lands on `main`.
   Bootstraps `drizzle.__drizzle_migrations` and marks the new
   `0000_initial_baseline` as already-applied so future `db:migrate` runs
   are no-ops until you add real migrations on top.

## Why this exists

The previous migration to prod (commit history in `tmp/launch/`) bundled
schema SQL by hand and skipped the Drizzle migrator. As a result:

- Prod has 52 tables matching `src/db/schema/*` exactly (good).
- Prod has 18 functions, 11 triggers, 76 RLS policies, 4 storage buckets
  (good — except the `kyc` bucket was missed).
- The `drizzle` schema and its `__drizzle_migrations` table never existed
  in prod (bad — `db:migrate` would try to re-apply everything).
- The local Drizzle journal had 33 entries with only 18 snapshots, so
  `db:generate` was guaranteed to produce destructive SQL.

The reset:

- Archived old migrations to `src/db/migrations_archive/dev_drizzle_2026_05/`.
- Regenerated a single `0000_initial_baseline.sql` (SHA256:
  `d0564e2f59248822b1f41785c8b2305eb4aeacf68bd96ea4ac6497cf32d4321c`)
  from the current schema files.
- Fixed `src/db/migrate.ts` so the pooler→direct URL rewrite no longer
  hardcodes the deleted dev project ref.

## Order of operations

```
A) Push the codebase changes (this branch) to main.
B) Run 001_create_kyc_bucket.sql in Supabase Studio.
C) Add NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel Production.
D) Copy Production env vars to Preview.
E) Redeploy Production on Vercel.
F) Run 002_mark_drizzle_baseline_applied.sql in Supabase Studio.
G) Smoke test /admin/* sections.
```

Once those are done, `npm run db:generate` against this repo is safe again
and will produce incremental migrations on top of `0000_initial_baseline`.
