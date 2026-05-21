# docs/db/ — Database documentation index

> **Status**: Index canónico de docs DB. Mantener al día con cada cambio mayor.
> **Owner**: @julian-berardinelli
> **Última actualización**: 2026-05-21

## Docs canónicos (leer en orden si sos nuevo)

| # | Doc | Audiencia | Cuándo leer |
|---|---|---|---|
| 1 | [**`migration-workflow.md`**](./migration-workflow.md) | Cualquiera que toque schema, RLS, function, trigger, bucket, GRANT o data migration | **ANTES de hacer cualquier cambio en la DB**. Es innegociable. |

## SQL históricos (referencia, no re-aplicar)

Estos archivos están acá por contexto histórico. **NO son canónicos** y **NO deben re-aplicarse** — el state que generan ya está en la DB y/o en otros archivos.

| File | Qué hace | Aplicado |
|---|---|---|
| `02_stats_revision_items.sql` | Setup inicial de tabla stats_revision_items + policies | Ya aplicado (en baseline) |
| `client-dashboard-career-requests.sql` | Career revision flow setup | Ya aplicado |
| `client-dashboard-publishing-v2.sql` | Profile publishing v2 | Ya aplicado |
| `football-data-updates.sql` | Football data updates | Ya aplicado |
| `tutorial-assistant.sql` | Tutorial progress tracking | Ya aplicado |

## Archivos relacionados FUERA de este folder

### Migrations canónicas vivas

```
src/db/migrations/
├── 0000_initial_baseline.sql           # Drizzle baseline (post-recovery)
├── 0001_cynical_ted_forrester.sql      # Drizzle: blog_posts table
├── 0001a_blog_posts_rls.sql            # Manual: blog RLS + trigger
├── 0002_sync_historical_drift.sql      # Manual: sync 13 items que faltaban en prod (2026-05-20)
└── meta/                               # Drizzle journal — INTOCABLE
```

### Schema TS (fuente de verdad declarativa)

```
src/db/schema/
├── index.ts            # Re-exports
├── enums.ts            # Todos los pgEnum
├── relations.ts        # Drizzle relations
├── users.ts            # user_profiles
├── players.ts          # player_profiles
├── agencies.ts
├── blog.ts             # blog_posts
└── ... (50+ archivos)
```

### Scripts

```
src/db/
├── drizzle.config.ts   # Drizzle Kit config (apunta a DATABASE_URL)
├── migrate.ts          # Migrator local con pooler→direct URL rewrite
└── schema.sql          # Dump completo de referencia (no canónico)
```

### Recovery histórico (NO TOCAR)

```
src/db/migrations_archive/
├── dev_drizzle_2026_05/   # 33 migrations del incidente del 2026-05
└── ...

tmp/fixes/                 # Bootstrap del recovery (ya aplicado en prod)
├── README.md
├── 001_create_kyc_bucket.sql
└── 002_mark_drizzle_baseline_applied.sql

tmp/launch/                # Bundle SQL del launch original (ya aplicado en prod)
```

## Memory relacionada

- `memory/feedback_migration_protocol.md` — 5 reglas de oro (versión condensada del workflow)
- `memory/feedback_db_schema_drift.md` — lección del incidente original (2026-05-09)
- `memory/project_post_launch_recovery.md` — recovery completo
- `memory/project_drizzle_workflow.md` — state actual del workflow + pendientes futuros
- `memory/feedback_supabase_branch.md` — default a dev branch, nunca prod sin auth
- `memory/reference_supabase_branches.md` — project_refs de main + dev

## Project refs

| Branch | project_ref | Vercel target |
|---|---|---|
| **main (prod)** | `erdvpcfjynkhcrqktozd` | Production |
| **dev** | `avhctddkbcneugtqqxxk` | Preview + Development |

## Quick links

- Supabase Dashboard prod: https://supabase.com/dashboard/project/erdvpcfjynkhcrqktozd
- Supabase Dashboard dev: https://supabase.com/dashboard/project/avhctddkbcneugtqqxxk
- Migration workflow canónico: [`migration-workflow.md`](./migration-workflow.md)
