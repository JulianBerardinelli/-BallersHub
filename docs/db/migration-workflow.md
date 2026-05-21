# Migration workflow — Drizzle como fuente única + complementarios

> **Status**: Workflow canónico vigente desde 2026-05-21.
> **Owner**: @julian-berardinelli
> **Aplicabilidad**: Cualquier cambio de schema, RLS policy, function, trigger, storage bucket, GRANT o data migration en cualquier proyecto Supabase del repo.

Si vas a tocar la DB, **leé este doc antes de hacer nada**. No es opcional.

---

## 1. Por qué existe este workflow

### El incidente original (2026-05)

Un agente migró dev→prod via SQL bundled a mano, sin pasar por Drizzle. Resultado:

- La rama dev de Supabase fue borrada
- El `kyc` storage bucket se perdió
- El Drizzle snapshot history se desincronizó (33 journal entries, 18 snapshots)
- El project ref viejo (`ygansmlplzzwkjdmlqtu`) quedó hardcodeado en `src/db/migrate.ts`
- Quedó drift entre dev y prod que llevó **5 días en cerrar** (2026-05-15 al 2026-05-21)

### Y el drift de 2026-05-20

Cuando deployamos el blog a main, el smoke test reveló que prod **tenía 13 items menos** que dev:
- 9 funciones PL/pgSQL (`approve_player_application`, `approve_team`, etc.)
- 2 storage buckets (`teams`, `divisions`)
- 4 UNIQUE constraints
- 1 RLS policy

Esos items habían sido aplicados a dev via Supabase Studio durante el recovery del 2026-05-17, **pero nunca propagados a prod**. El sync requirió 564 líneas de SQL idempotente extraídas via `pg_dump` para reconstruir el state.

### Lo que aprendimos

**El root cause del drift es tener dos sistemas paralelos de tracking sin coordinación**:

| Sistema | Tracker propio | Cuándo se usa |
|---|---|---|
| **Drizzle** | `drizzle.__drizzle_migrations` + `src/db/migrations/meta/_journal.json` | `db:generate` + `db:migrate` |
| **Supabase Studio / MCP** | `supabase_migrations.schema_migrations` | Cuando alguien aplica SQL manual desde el dashboard o vía `mcp__apply_migration` |

Cuando se aplican cosas por uno y no por el otro → drift inevitable.

### La regla raíz

> **Drizzle es la fuente única de la verdad para schema en `public`. Todo lo que no podés expresar en Drizzle vive en un archivo `XXXa_*.sql` complementario versionado en el repo.**

---

## 2. Las 5 reglas de oro

Estas reglas son **innegociables** después del incidente. Ya están en `memory/feedback_migration_protocol.md`, las repito aquí porque son la base de todo el workflow.

1. **Todo cambio de schema pasa por Drizzle**: `db:generate` → review SQL → `db:migrate`. Nunca SQL ad-hoc en Supabase Studio para schema changes.
2. **Siempre supabase-dev primero** (`avhctddkbcneugtqqxxk`). Nunca tocar supabase-main sin autorización explícita del owner por mensaje.
3. **El agente NUNCA toca el journal de Drizzle** (`src/db/migrations/meta/`). Si Drizzle quiere generar algo destructivo, arreglar el schema TS, no borrar snapshots.
4. **Migrations destructivas** (DROP, RENAME, ALTER TYPE) → deploy en dos pasos (expansive PR + contractive PR semanas después).
5. **El agente NUNCA usa MCP `apply_migration` contra prod sin autorización explícita por mensaje del owner**.

---

## 3. Qué Drizzle SÍ maneja vs NO maneja

### ✅ Drizzle 0.31+ maneja declarativamente

| Concept | Cómo |
|---|---|
| Tables (CREATE / ALTER) | `pgTable("name", { col: ... })` en `src/db/schema/*.ts` |
| Columns + types + defaults | argumentos a `pgTable` |
| Indexes | `(table) => ({ idx: index("name").on(table.col) })` |
| Foreign keys | `.references(() => other.id)` |
| Enums | `pgEnum("name", ["a","b"])` |
| Schemas | `pgSchema("auth")` |
| Views | `pgView("name").as(...)` |
| Materialized views | `pgMaterializedView` |
| Sequences | `pgSequence` |
| **RLS policies** | **`pgPolicy("name", { for, to, using, withCheck })` declarado dentro del `pgTable`** |
| **Roles** | **`pgRole("name")`** |
| Extensions (parcial) | `CREATE EXTENSION` queda en SQL custom, pero Drizzle reconoce su uso |

### ❌ Drizzle NO maneja — usar archivos complementarios `XXXa_*.sql`

| Concept | Por qué Drizzle no |
|---|---|
| Functions PL/pgSQL | No es DDL standard, requiere parser custom |
| Triggers | Idem |
| Storage buckets | Es Supabase-specific, vive en schema `storage` (no `public`) |
| GRANTs custom | Drizzle solo emite GRANTs en base a roles declarados, no GRANTs custom |
| Auth schema | Supabase managed, fuera de scope |
| Storage RLS policies (en `storage.objects`) | Mismo motivo que buckets |
| Triggers de auth (`on_auth_user_created`, etc.) | Supabase managed |
| Data seeds (INSERT) | Drizzle es schema-only, no data |

---

## 4. File naming convention

Carpeta `src/db/migrations/` tiene 2 tipos de archivos:

```
src/db/migrations/
├── 0000_initial_baseline.sql           # ← generado por Drizzle, tracked en journal
├── 0001_cynical_ted_forrester.sql      # ← generado por Drizzle, tracked en journal
├── 0001a_blog_posts_rls.sql            # ← MANUAL complementario, NO tracked
├── 0002_sync_historical_drift.sql      # ← MANUAL hot-fix, NO tracked
├── meta/
│   ├── _journal.json                   # ← INTOCABLE
│   ├── 0000_snapshot.json              # ← INTOCABLE
│   └── 0001_snapshot.json              # ← INTOCABLE
└── migrations_archive/                 # ← históricos del incidente, no re-aplicar
```

**Reglas:**

- **`NNNN_descriptive.sql`** (sin sufijo) → generado por `db:generate`. Drizzle lo registra en `meta/_journal.json` y al aplicarlo registra hash en `drizzle.__drizzle_migrations`.
- **`NNNNa_descriptive.sql`** (sufijo `a`, `b`, etc. al número) → manual, complementario. NO tracked por Drizzle. Aplicar manualmente vía MCP `apply_migration` o Supabase Studio. Documentar en el header del archivo qué hace y por qué.
- **`meta/` folder**: **NUNCA editar a mano**. Si Drizzle hace algo raro, arreglar el schema TS y regenerar.

### Orden de apply

Drizzle aplica solo los archivos sin sufijo, en orden numérico, según journal. Los complementarios (`NNNNa_*`) se aplican manualmente, ASEGURANDO que se hagan **después** del correspondiente `NNNN_*.sql` para que las tablas existan.

Ejemplo del blog:
1. `0001_cynical_ted_forrester.sql` (Drizzle) crea `blog_posts` table
2. `0001a_blog_posts_rls.sql` (manual) agrega RLS + 7 policies + trigger + GRANTs

Si aplicás `0001a` antes que `0001`, falla porque la tabla no existe.

---

## 5. Workflows por tipo de cambio

### Tipo A — Cambio que Drizzle maneja (tabla, columna, index, FK, enum, RLS policy)

```bash
# 1. Editar src/db/schema/*.ts
#    Ejemplo: agregar columna `bio` a player_profiles
#    Ejemplo: declarar RLS policy con pgPolicy() inline en la table

# 2. Generar el SQL incremental
npm run db:generate

# 3. REVISAR el SQL generado en src/db/migrations/NNNN_*.sql
#    ⚠️ Drizzle puede generar DROP TABLE si se desincroniza con la DB.
#    Si el SQL contiene cosas que NO esperás, NO lo apliques. Arreglá el schema TS y regenerá.

# 4. Aplicar a dev primero (apuntando DATABASE_URL al pooler de dev)
#    Opción A: via Drizzle migrator local
DATABASE_URL='postgres://postgres.avhctddkbcneugtqqxxk:[PWD]@aws-0-us-east-2.pooler.supabase.com:6543/postgres' \
  npm run db:migrate

#    Opción B: via Supabase MCP apply_migration apuntando a avhctddkbcneugtqqxxk

# 5. Smoke test en dev preview (Vercel preview deploy del PR)

# 6. Cuando el PR aprueba para merge → owner aplica el mismo SQL a prod:
#    Opción A: Via MCP apply_migration apuntando a erdvpcfjynkhcrqktozd (autorización explícita)
#    Opción B: Via Supabase Studio prod (cuidado, es vivo)
#    DESPUÉS de aplicar a prod, manualmente INSERT en drizzle.__drizzle_migrations con el hash del file
#    para que Drizzle no intente re-aplicar:
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('<sha256 del file>', <epoch ms>);

# 7. Commit el SQL + meta/_journal.json + meta/NNNN_snapshot.json al repo
git add src/db/migrations/ src/db/schema/
git commit -m "feat(db): add bio column to player_profiles"
```

### Tipo B — Cambio que Drizzle NO maneja (function/trigger/bucket/GRANT)

```bash
# 1. NO tocar src/db/schema/*.ts (Drizzle no lo modela)

# 2. Crear archivo manual con sufijo:
#    src/db/migrations/NNNNa_descriptive.sql
#    NNNN = el último número Drizzle (sin sufijo). Sufijo a/b/c según orden.
#    Header obligatorio:

--- ejemplo header:
-- ===============================================================
-- NNNNa_descriptive.sql
-- 
-- Manual complementario (no tracked by Drizzle).
-- Aplica: <descripción de lo que hace>.
-- Requires: NNNN_*.sql aplicado primero (porque crea la tabla X).
-- Aplicado en prod via MCP apply_migration con name='<nombre>' el <fecha>.
-- Aplicado en dev via <método> el <fecha>.
-- Idempotente: sí (CREATE OR REPLACE + DROP IF EXISTS + ON CONFLICT DO NOTHING).
-- ===============================================================

# 3. Aplicar manualmente a dev primero via MCP o Supabase Studio dev.

# 4. Smoke test dev.

# 5. Owner aplica a prod (con autorización explícita).
#    NO insertar nada en drizzle.__drizzle_migrations — estos archivos no están trackeados.

# 6. Commit el archivo .sql al repo (no hay meta/ que actualizar).
```

### Tipo C — Cambio destructivo (DROP COLUMN, RENAME, ALTER TYPE)

**Deploy en dos pasos (expand + contract):**

```
PR 1 (expansive):
  - Agregar columna nueva
  - Código dual-write (escribe a vieja Y nueva)
  - Backfill data vieja → nueva
  - Deploy. Esperar semanas en prod.

PR 2 (contractive):
  - Código solo escribe a nueva
  - Drop columna vieja
  - Deploy.
```

**NUNCA en un solo PR**. Un solo PR de expand+drop garantiza downtime mientras el viejo deployment todavía corre escribiendo a la columna vieja.

### Tipo D — Sync de drift (caso especial)

Si descubrís drift entre dev y prod (smoke test, advisor, query manual):

1. `pg_dump --schema-only --no-owner --no-privileges --schema=public $DEV_URL > /tmp/dev_schema.sql`
2. Comparar contra prod via MCP queries: `count tables, functions, policies, etc.`
3. Identificar exactamente qué falta en prod
4. Extraer SQL idempotente de las cosas faltantes (CREATE OR REPLACE, DROP IF EXISTS, ON CONFLICT DO NOTHING)
5. Crear `NNNN_sync_drift_<descriptor>.sql` (sufijo opcional según si Drizzle conoce la cosa o no)
6. Owner revisa SQL
7. Apply a prod via MCP con autorización explícita
8. Verificar counts en prod = dev post-apply

Ejemplo concreto: `src/db/migrations/0002_sync_historical_drift.sql` (564 líneas, 9 funciones + 4 UNIQUE + 1 policy + 2 buckets + 12 storage policies).

---

## 6. Verificación de drift

### Comando rápido (manual)

```bash
# Comparar count totales dev vs prod
# Si los counts coinciden, no hay drift estructural mayor

# DEV:
DATABASE_URL='<dev>' psql -t -c "
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') AS tables,
  (SELECT count(*) FROM information_schema.routines WHERE routine_schema='public') AS functions,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS policies,
  (SELECT count(*) FROM storage.buckets) AS buckets,
  (SELECT count(*) FROM information_schema.table_constraints WHERE table_schema='public' AND constraint_type='UNIQUE') AS unique_constraints;
"

# PROD: misma query con DATABASE_URL de prod
# Comparar manualmente las dos filas. Diff = drift.
```

### Smoke test post-apply

Después de aplicar cualquier migration a prod, verificar:

```sql
-- 1. ¿Las cosas que agregué están?
SELECT count(*) FROM <tabla_nueva>;  -- esperado 0 (vacía)
SELECT proname FROM pg_proc WHERE proname='<funcion_nueva>';  -- esperado 1 row

-- 2. ¿Las RLS policies están activas?
SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='<tabla_nueva>';

-- 3. ¿No rompí nada existente?
SELECT count(*) FROM information_schema.tables WHERE table_schema='public';  -- comparar con count anterior
```

### Pre-merge dev→main check

ANTES de mergear `dev → main` GitHub, verificar que los SQL files nuevos del PR ya están aplicados a prod:

```bash
# Lista migrations nuevas en el PR
git diff main..dev -- 'src/db/migrations/**'

# Por cada uno: ¿ya está aplicado en prod?
#   - Si es .sql tracked por Drizzle: ¿hay row en drizzle.__drizzle_migrations con su hash?
#   - Si es .sql manual: ¿la cosa que crea existe en prod via query?
# Si no → aplicar a prod ANTES del merge git. Si no, código rompe en prod por columna/función faltante.
```

---

## 7. Recovery / rollback

### Recovery de migration que falló a medio aplicar

Caso: aplicaste un SQL grande y a la mitad falló. State parcial en la DB.

**Si la migration era idempotente** (CREATE OR REPLACE, ADD COLUMN IF NOT EXISTS, etc.):
- Volver a correr el SQL completo. La idempotencia debería saltear lo ya aplicado.

**Si NO era idempotente:**
- Examinar qué se aplicó (queries a `information_schema.tables`, `pg_proc`, etc.)
- Manualmente revertir lo aplicado (DROP) o adelantar lo que falta
- Hacer el SQL idempotente y re-aplicar

### Rollback completo de un cambio recién aplicado

Para cosas ADD-only (no destructivo), el rollback es DROP:

```sql
DROP TABLE IF EXISTS <table_nueva> CASCADE;
DROP TYPE IF EXISTS <enum_nuevo>;
ALTER TABLE <table_existente> DROP COLUMN IF EXISTS <col_nueva>;
DROP FUNCTION IF EXISTS <func_nueva>(arg_type);
DROP POLICY IF EXISTS <policy_nueva> ON <table>;
```

Para cosas destructivas (DROP COLUMN ya hecho), restore desde backup. Por eso la **regla absoluta es: snapshot de prod antes de cualquier migration destructiva**.

### Si Drizzle pierde sincronía con la DB

Síntomas:
- `db:generate` produce SQL destructivo inesperado
- Quiere CREATE TABLE de cosas que ya existen
- Quiere DROP COLUMN que sí necesitamos

**No editar el schema TS para "matchear" la DB sin antes ver el diff.** Pasos correctos:

1. Identificar la diferencia exacta entre snapshot de Drizzle y DB real
2. Decidir dirección:
   - **DB es verdad** → editar schema TS para reflejarla, NO generar migration
   - **Schema TS es verdad** → ALTER manual idempotente (`IF NOT EXISTS`) en dev primero, después prod. Sin Drizzle.
3. El próximo `db:generate` debería ver ambos alineados

Si la situación es muy mala (como el incidente de 2026-05), considerar **reset del baseline**:
1. Archive las migrations actuales a `src/db/migrations_archive/`
2. Borrar `src/db/migrations/0000_*.sql` y `src/db/migrations/meta/`
3. Re-generar baseline: `npm run db:generate` (sin journal, genera un solo file enorme con todo el schema)
4. Bootstrap `drizzle.__drizzle_migrations` en prod con el hash del nuevo baseline (como hizo `tmp/fixes/002_mark_drizzle_baseline_applied.sql` en 2026-05)

---

## 8. Anti-patterns — qué NO hacer

| ❌ NO hacés | ✅ Hacés |
|---|---|
| Editar SQL en Supabase Studio para schema changes en `public` | Editar `src/db/schema/*.ts` y `db:generate` |
| Aplicar a prod sin pasar por dev primero | Apply a dev → verificar → apply a prod con OK explícito |
| Editar `src/db/migrations/meta/_journal.json` o snapshots | Arreglar schema TS y regenerar |
| Borrar la rama dev de Supabase | NUNCA. Si necesitás resetear, pedir guidance al owner |
| Hardcodear project refs en código | Derivar del `DATABASE_URL` username (ver `src/db/migrate.ts`) |
| Aplicar migration destructiva en un solo PR | Two-step expand + contract |
| Re-aplicar `tmp/launch/*.sql` o `migrations_archive/*` | NUNCA — son históricos del incidente, no son canónicos |
| Asumir que Drizzle maneja RLS automáticamente sin `pgPolicy()` | Drizzle ignora RLS si no la declarás con `pgPolicy()`. Con 0.31+ usalo. |
| Mezclar Drizzle migrations con SQL manual sin sufijo `a/b/c` | Usar convención `NNNNa_*.sql` para no-Drizzle |
| Llamar `unaccent(...)` sin qualifier en functions | Siempre `extensions.unaccent(...)` qualified (ver lección de 2026-05-20) |

---

## 9. Tools & scripts disponibles

### `package.json` scripts actuales

```bash
npm run db:generate   # Drizzle compara schema TS vs snapshot, genera SQL incremental
npm run db:migrate    # Aplica migrations pendientes a DATABASE_URL
npm run db:studio     # Drizzle Studio UI (no necesita Supabase Studio)
```

### MCP de Supabase (disponible para agentes Claude)

```
mcp__716a1768-d626-42c7-a3bc-b2dc44fc8c5b__list_migrations    # Lista migrations registradas
mcp__716a1768-d626-42c7-a3bc-b2dc44fc8c5b__apply_migration    # Apply DDL (tracked en supabase_migrations)
mcp__716a1768-d626-42c7-a3bc-b2dc44fc8c5b__execute_sql        # Query / DML (no DDL)
mcp__716a1768-d626-42c7-a3bc-b2dc44fc8c5b__list_branches      # Branches (dev + main)
mcp__716a1768-d626-42c7-a3bc-b2dc44fc8c5b__get_advisors       # Advisors de security/perf
```

### MCP de Vercel (para verificación post-deploy)

```
mcp__ba4c7bf0-e62e-4ef3-bab0-0fed0d639175__get_runtime_logs        # Logs con filter por error/query
mcp__ba4c7bf0-e62e-4ef3-bab0-0fed0d639175__get_deployment_build_logs
mcp__ba4c7bf0-e62e-4ef3-bab0-0fed0d639175__list_deployments
```

### Project refs

| Branch Supabase | project_ref | Vercel env target |
|---|---|---|
| **main (prod)** | `erdvpcfjynkhcrqktozd` | Production |
| **dev** | `avhctddkbcneugtqqxxk` | Preview + Development |

---

## 10. Pendientes futuros (mejoras al workflow)

Decisiones que tomamos pero aún NO implementadas:

| Item | Razón |
|---|---|
| Migrar RLS policies existentes a `pgPolicy` declarativo en los schema TS | Hoy las policies viven en `0001a_*.sql` separados. Drizzle 0.31+ las maneja inline. Reduce los archivos complementarios. |
| Crear script `scripts/db-apply.sh` que orquesta apply (con confirmación) | Hoy se hace manual. Script reduciría error de operación. |
| Implementar `npm run db:check` que detecta drift | Drizzle Kit lo soporta. Worth wiring up. |
| Resolver el `MIGRATIONS_FAILED` state del Supabase Branching system | Hoy ambas branches reportan `MIGRATIONS_FAILED` porque el branching no entiende el reset de Drizzle baseline. Hay que decidir si re-sincronizar branching o aceptar que está separado del Drizzle tracking. |
| Setup `vercel.ts` config para incluir steps de DB verification en build | Vercel `vercel.ts` permite hooks pre-build que pueden hacer `db:check` antes de buildear. |

---

## 11. Recursos cruzados

- `memory/feedback_migration_protocol.md` — las 5 reglas de oro (versión condensada)
- `memory/feedback_db_schema_drift.md` — incidente original 2026-05-09
- `memory/project_post_launch_recovery.md` — recovery completo del incidente
- `memory/project_drizzle_workflow.md` — referencias rápidas + estado del workflow (este doc canónico)
- `tmp/fixes/README.md` — bootstrap del recovery (no re-aplicar, solo lectura histórica)
- `src/db/drizzle.config.ts` — config de Drizzle Kit
- `src/db/migrate.ts` — migrator local que rewriteea pooler→direct URL
- `src/db/migrations_archive/dev_drizzle_2026_05/` — históricos del incidente, NO tocar

---

## 12. Resumen ejecutivo (TL;DR)

1. **Drizzle es la fuente única** para schema `public` (tables, columns, indexes, FKs, enums, **RLS via `pgPolicy`**, views, sequences).
2. **Cosas no-Drizzle** (functions, triggers, storage buckets, GRANTs custom) → archivos `NNNNa_*.sql` complementarios versionados.
3. **Flujo**: editar schema TS → `db:generate` → review → apply a dev primero → smoke → apply a prod con autorización del owner → commit al repo.
4. **NUNCA** editar el journal de Drizzle, ni aplicar a prod desde un agente sin OK explícito, ni hacer destructive migrations en un solo PR.
5. **Verificar drift** comparando counts dev vs prod regularmente. Si hay drift, sync con SQL idempotente extraído via `pg_dump`.
6. **Recovery**: cosas ADD-only son DROP. Destructivas requieren restore desde backup → snapshot antes de cualquier migration destructive.
