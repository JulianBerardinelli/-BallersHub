# BallersHub — Handoff a próximo agente (2026-05-17)

Resumen completo de lo que pasó, lo que se arregló, y el bug que sigue sin
resolverse. El owner (Julian) va a abordar esto con otro agente. Se queda
en Vercel (NO migrar).

---

## 0. Contexto rápido

- **Stack**: Next.js 15 (App Router, Turbopack) + Supabase (auth + Postgres)
  + Drizzle ORM (postgres-js driver) + Vercel **Hobby plan** (10s timeout).
- **Repo**: `JulianBerardinelli/-BallersHub`, branch principal: `main`.
- **Producción**: `ballershub.co` → Vercel project `prj_JeW44MKKD3yrFrBMx3yHWVCOh5Ro`.
- **Supabase prod**: `erdvpcfjynkhcrqktozd` (us-east-2, Postgres 17.4.1.074).
- **Vercel region**: `iad1` (us-east-1).

---

## 1. Incidente original (sesión anterior al 2026-05-15)

Un agente anterior intentó migrar de dev → prod en Supabase y se equivocó
fuerte:

- Migró DDL a la rama PRODUCTION de Supabase y borró la rama DEV.
- Aplicó SQL bundleado a mano, sin pasar por `drizzle-kit migrate`.
- Se olvidó de crear varios objetos (triggers, una vista, el bucket `kyc`).
- Dejó `src/db/migrate.ts` con el `project_ref` del proyecto dev borrado
  (`ygansmlplzzwkjdmlqtu`) hardcodeado en una regex de URL rewriting.
- El journal local de Drizzle quedó con 33 entries pero solo 18 snapshots
  (snapshots 0018-0032 borrados a mano), garantizando que el próximo
  `npm run db:generate` produjera SQL destructivo.
- El `next.config.ts` quedó con `images.remotePatterns` apuntando al
  hostname del proyecto dev borrado → toda imagen rechazada por `next/image`.

El usuario heredó: prod incompleta, drift estructural latente, código que
referenciaba un bucket inexistente, sitio con imágenes rotas.

---

## 2. Lo que se recuperó en la sesión 2026-05-15 → 2026-05-17

### Base de datos (Supabase `erdvpcfjynkhcrqktozd`)

| Item | Estado |
|---|---|
| Tablas (52/52 vs schema Drizzle) | ✅ paridad confirmada |
| Funciones (`is_admin`, `slugify`, `handle_new_user`, etc.) | ✅ 18 presentes |
| Triggers (incl. `on_auth_user_created` en `auth.users`) | ✅ 11 activos |
| RLS policies | ✅ 76 en tablas user-facing |
| Storage buckets | ✅ 4 (`agency-logos`, `agency-media`, `manager-avatars`, `player-media`) |
| Bucket `kyc` (faltaba) | ✅ Creado vía `tmp/fixes/001_create_kyc_bucket.sql` |
| Vista `player_dashboard_state` | ✅ Existe (con un advisor warning de SECURITY DEFINER, ignorable) |
| Tabla `drizzle.__drizzle_migrations` | ✅ Creada vía `tmp/fixes/002_mark_drizzle_baseline_applied.sql` |
| Drizzle baseline | ✅ `src/db/migrations/0000_initial_baseline.sql` (SHA256 `d0564e2f592488...`) registrado |

### Código (PRs mergeados — los pueden ver en GitHub)

| PR | Commit | Cambia | Estado |
|---|---|---|---|
| [#68](https://github.com/JulianBerardinelli/-BallersHub/pull/68) | `3dbacb4` | Post-launch recovery: `next.config.ts` hostname, `migrate.ts` desharcodeado, Drizzle baseline reset, archivo de migraciones viejas | ✅ Mergeado, deployado |
| [#69](https://github.com/JulianBerardinelli/-BallersHub/pull/69) | `2bbdbae` | `footer-state.ts`: cambia 2 queries Drizzle → Supabase REST. `db.ts`: agrega `statement_timeout` + `idle_in_transaction_session_timeout` | ✅ Mergeado, deployado |
| [#70](https://github.com/JulianBerardinelli/-BallersHub/pull/70) | `38899ff` | Fix TS: `statement_timeout` debía ser `number`, no `string` | ✅ Mergeado, deployado |
| [#71](https://github.com/JulianBerardinelli/-BallersHub/pull/71) | `4900660` | `db.ts`: agrega `client_connection_check_interval: 5000`, baja `max_lifetime` a 60s, `idle_timeout` a 5s | ✅ Mergeado, deployado |
| [#72](https://github.com/JulianBerardinelli/-BallersHub/pull/72) | `58754ec` | `db.ts`: agrega `idle_session_timeout`, `tcp_keepalives_idle/interval/count` (responde review de Codex en PR #71) | ⚠️ Abierto, NO mergeado todavía |

### Env vars en Vercel (Production / Preview / Development)

Antes de esta sesión, Production tenía 5 env vars críticas vacías (tipo
`sensitive` de la integración Supabase, que no se pueden actualizar via
CLI). Reemplazadas todas vía la API REST de Vercel:

- `DATABASE_URL` → pooler URL (port 6543, transaction mode)
- `NEXT_PUBLIC_APP_URL` = `https://ballershub.co`
- `NEXT_PUBLIC_SITE_URL` = `https://ballershub.co`
- `SUPABASE_SERVICE_ROLE_KEY` (JWT)
- `SUPABASE_JWT_SECRET`

Todas las otras envs (Stripe, MP, Resend, anon key, secrets random) están bien.

### DNS de `ballershub.co`

Setup correcto en Namecheap (nameservers `ns1/ns2.dns-parking.com`):
- `@` A → `76.76.21.21` (Vercel apex IP)
- `www` CNAME → `cname.vercel-dns.com`

Vercel sugiere migrar nameservers — **ignorar esa advertencia**, no es
necesario.

---

## 3. EL BUG QUE NO SE RESOLVIÓ

### Síntoma

Páginas admin específicas devuelven **504 GATEWAY_TIMEOUT** al usuario
autenticado, después de ~10s. Las páginas afectadas (lista no exhaustiva,
varía sesión a sesión):

- `/admin/marketing`
- `/admin/marketing/drips`
- `/admin/comp-accounts`
- `/admin/revisions`
- `/admin/agency-team-proposals`
- `/admin/agencies`
- `/admin/manager-applications`

Una vez que una lambda Vercel "se envenena", **TODA navegación del usuario
en esa lambda falla** — no puede ir a `/dashboard` ni nada hasta que Vercel
evicta la lambda (~5-15 min) o se recicla la conexión.

Páginas que SÍ funcionan (la mayoría del tiempo): `/admin/players`, `/dashboard/*`,
páginas públicas, `/auth/*`.

### Causa raíz confirmada (vía Supabase MCP `pg_stat_activity`)

```
pid 184168 (ejemplo capturado en vivo)
state           = active
wait_event_type = Client
wait_event      = ClientRead
duration        = 3+ minutos
application_name = Supavisor
query           = select "id","slug","name",... from marketing_campaigns ...
```

**Patrón**: `postgres-js` (driver Drizzle) + Supabase pooler en transaction
mode + Vercel Hobby (lambdas con 10s timeout) = **conexiones zombi**.

Mecanismo:
1. Lambda corre query Drizzle vía pooler.
2. Postgres devuelve el result. postgres-js termina de procesar pero queda
   en extended-protocol esperando próxima portal step del cliente.
3. Vercel mata la lambda al timeout (10s) → el cliente postgres-js muere
   sin cerrar el portal/transacción.
4. Postgres NO se entera: del lado del pooler la conexión sigue "active"
   pero esperando un cliente que nunca va a responder.
5. Con `max: 1` por lambda en `src/lib/db.ts`, la PRÓXIMA request del
   usuario a ESA misma lambda se queda esperando la única slot → otro 504.
6. Una vez que la lambda tiene el slot envenenado, toda página del
   `(dashboard)` layout falla porque la layout (y antes el `SiteFooter`)
   intentaba queries Drizzle.

### Por qué NO se solucionó

Cada PR cubrió una parte del problema pero ninguna sola alcanzó:

| Knob | Cubre | Por qué no alcanzó |
|---|---|---|
| `statement_timeout: 8000` | Query activamente ejecutándose | El zombie aparece DESPUÉS de que la query terminó (state=active+ClientRead). Postgres lo considera "query done" → no aplica. |
| `idle_in_transaction_session_timeout: 10000` | `state="idle in transaction"` | El zombie está en `state="active"`, no idle. |
| `client_connection_check_interval: 5000` | Best-effort durante query | **Codex flag (P1 en PR #71)**: solo corre "while running queries", no después. |
| `idle_session_timeout: 30000` (PR #72, no mergeado) | `state="idle"` entre queries | Tampoco aplica directamente a `active+ClientRead`. |
| `tcp_keepalives_idle/interval/count` (PR #72, no mergeado) | Detección kernel-level de socket TCP muerto | **Esta es la única defensa que aplica al estado real**. No probado en prod aún. |
| `max_lifetime: 60` | Hard cap de edad de conexión | Funciona como red de seguridad final pero deja 60s de daño. |

### Estado actual

- PR #69, #70, #71 mergeados y deployados. **El problema persiste** —
  capturado un zombie nuevo después del deploy de PR #71.
- PR #72 abierto con `tcp_keepalives_*` + `idle_session_timeout`. Es la
  pieza más prometedora porque opera a nivel kernel/socket, no Postgres
  session state. **No se mergeó porque el owner ya estaba quemado y dudaba
  que arreglara**.

---

## 4. Lo que el próximo agente debería probar (ranking por probabilidad)

### Opción 1 — Refactor admin pages a Supabase REST (RECOMENDADA)

Es exactamente lo que se hizo en `src/components/layout/footer/footer-state.ts`
(en PR #69) y funcionó perfecto. El SiteFooter ya no envenena la pool.

**El bug es estructural a `postgres-js + serverless + Supabase pooler`.**
Cada query Drizzle es un riesgo. La forma de matarlo definitivamente es
sacar a postgres-js de las rutas calientes. Las admin pages problemáticas son:

| Archivo | Queries Drizzle a migrar |
|---|---|
| `src/app/(dashboard)/admin/marketing/page.tsx` | `db.select().from(marketingCampaigns)...` |
| `src/app/(dashboard)/admin/marketing/actions.ts:fetchGlobalStats` | 3 `db.execute(sql\`...\`)` con counts |
| `src/app/(dashboard)/admin/marketing/drips/page.tsx` | `db.select().from(marketingDripConfigs)` + counts |
| `src/app/(dashboard)/admin/comp-accounts/page.tsx` + `src/app/actions/admin-comp-accounts.ts` | `db.select().from(subscriptions)...` y loop con `admin.auth.admin.getUserById` |
| `src/app/(dashboard)/admin/agency-team-proposals/page.tsx` | 3 `db.query.*.findMany` |
| `src/app/(dashboard)/admin/agencies/page.tsx` | `db.query.agencyProfiles.findMany` + joins manuales |
| `src/app/(dashboard)/admin/manager-applications/page.tsx` | `db.query.managerApplications.findMany` |

Patrón a aplicar (idéntico a footer-state.ts antes/después en PR #69):
```ts
// Antes
const rows = await db.query.thing.findMany({ where: ..., columns: { ... } });

// Después
const supabase = await createSupabaseServerRSC();
const { data: rows } = await supabase
  .from("thing")
  .select("col_1, col_2, related:other_table(slug)")
  .eq("user_id", userId);
```

RLS bloqueará lo que el postgres role bypassea — para queries admin que
necesitan ver TODO, usar `createSupabaseAdmin()` (service role, bypassea RLS).

**Tiempo estimado**: 2-3 horas para los 7 archivos.

### Opción 2 — Mergear PR #72 + probar TCP keepalives

Las defensas que agregamos (especialmente `tcp_keepalives_*`) son la primera
que opera a nivel kernel, no Postgres state machine. **Es lo único que NO
está mergeado y que podría arreglar la causa raíz sin refactor**.

Riesgo: si los GUCs `tcp_keepalives_*` no se aplican vía `connection: {}` en
postgres-js startup, no hace nada. Verificar con:
```sql
-- después del deploy, abrir psql como postgres role y ejecutar:
SELECT name, setting, source FROM pg_settings
WHERE name IN ('tcp_keepalives_idle','tcp_keepalives_interval','tcp_keepalives_count',
               'idle_session_timeout','statement_timeout');
```
Si `source` no es "session" para los nuevos, el setting no llegó.

**Tiempo estimado**: 5 min para mergear + esperar deploy + reproducir.

### Opción 3 — Upgrade a Vercel Pro ($20/mes)

`maxDuration: 60` en lugar de 10s. No arregla el bug, lo enmascara: la
lambda termina lo que está haciendo antes que el zombie se forme. Si el
problema es solo cold start + query lenta + ocasional bug postgres-js, 60s
de runway probablemente es suficiente.

**Tiempo estimado**: 5 min.

### Opción 4 — Cambiar de driver (`postgres-js` → `pg` o `@vercel/postgres`)

`pg` (node-postgres) es más viejo, más battle-tested, sin el bug de extended
protocol que causa el ClientRead. `@vercel/postgres` es HTTP-based (no TCP)
y por diseño no tiene zombies.

Requiere cambios en `src/lib/db.ts` y posiblemente en queries que usan
`db.execute(sql\`...\`)` (sintaxis distinta).

**Tiempo estimado**: 1 hora para `pg`, 2-3 horas para `@vercel/postgres` (más
porque Drizzle tiene adapter pero hay diferencias sutiles).

---

## 5. Archivos clave para el próximo agente

### Modificados durante recuperación (ya en main)
- `src/lib/db.ts` — config postgres-js con timeouts
- `src/components/layout/footer/footer-state.ts` — refactor a Supabase REST (template para más refactors)
- `src/db/migrate.ts` — fix URL rewriting
- `next.config.ts` — hostname de imágenes correcto
- `src/db/migrations/0000_initial_baseline.sql` — baseline limpio
- `src/db/migrations_archive/dev_drizzle_2026_05/*` — migraciones viejas archivadas

### Drizzle schema (NO tocar, está en sync con prod)
- `src/db/schema/*.ts` (52 tablas)

### Worktree de la sesión que hizo este trabajo
- Path: `/Users/jberardinelli/Dev/ballershub/.claude/worktrees/sleepy-saha-6b2931`
- Branch: `claude/sleepy-saha-6b2931`
- Estado: tiene commit `58754ec` (PR #72) sin mergear. Si se decide otra
  cosa, descartar la branch — todo lo importante está en `main`.

### SQL ya aplicado a prod (NO re-aplicar)
- `tmp/fixes/001_create_kyc_bucket.sql` ✅
- `tmp/fixes/002_mark_drizzle_baseline_applied.sql` ✅

---

## 6. Memorias guardadas para próximo Claude

- `MEMORY.md` index incluye:
  - `project_main_launch.md` — estado launch original
  - `project_post_launch_recovery.md` — recuperación session 2026-05-15
  - `feedback_db_schema_drift.md` — regla: nunca editar schema reactivamente
- **Actualizar después de esta handoff** con un nuevo memory que
  documente el bug postgres-js no resuelto.

---

## 7. MCPs disponibles (usados durante esta sesión)

- **Supabase MCP** (`mcp__716a1768...`): `execute_sql`, `apply_migration`,
  `list_tables`, `get_advisors`, `get_publishable_keys`. Usado para
  diagnosticar (pg_stat_activity) y aplicar fixes (kyc bucket, kill zombies).
- **Vercel MCP** (`mcp__ba4c7bf0...`): `list_deployments`, `get_runtime_logs`,
  `get_deployment_build_logs`. Usado para logs y validar deploys.
- **Vercel CLI**: `npx vercel env ls/add/rm` + Vercel API REST con token de
  `~/Library/Application Support/com.vercel.cli/auth.json` para
  manipular envs `sensitive`.
- **Claude in Chrome**: el bug se reprodujo con esta extensión (state=504
  capturado en vivo, mostrando el request `pending` en Network).

---

## 8. Test rápido para el próximo agente

Verificar si el bug está activo en este momento:

```sql
-- Vía Supabase MCP execute_sql:
SELECT pid, wait_event, state, now() - query_start AS duration,
       substring(query, 1, 100) AS query
FROM pg_stat_activity
WHERE state = 'active' AND wait_event = 'ClientRead'
  AND application_name = 'Supavisor';
```

Si hay rows con duración > 30s → bug activo, lambda envenenada, conviene
killear con `pg_terminate_backend(pid)`.

Si está vacío → bug no activo en este momento, las admin pages deberían
cargar. Reproducir hitting `/admin/marketing` autenticado en una browser.

---

**Última nota**: el owner está agotado de esto. Cuando arranques con él,
NO pidas más diagnostics — leé este doc, decidí Opción 1/2/3/4 con
fundamento, y proponé un plan ejecutable directo. Esto ya consumió demasiadas
horas de su tiempo.
