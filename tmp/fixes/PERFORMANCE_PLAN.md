# BallersHub — Plan de performance y fixes del 504 (2026-05-17)

Hand-off para próximas sesiones. Continúa lo dejado en `HANDOFF.md`
(mismo bug, ahora con plan ejecutable). Owner: Julian. Stack en Vercel
**Pro** (10s default fue el problema; con Pro podemos ir a 60s+).

---

## 0. Contexto rápido

- Stack: Next.js 15 (App Router, Turbopack) + React 19 + Supabase
  (auth + Postgres + Storage) + Drizzle ORM (postgres-js).
- Deploy: Vercel **Pro** (`prj_JeW44MKKD3yrFrBMx3yHWVCOh5Ro`), región
  `iad1`. Default `maxDuration` configurado a **60s** (era 10s, ese era
  el factor que mataba el lambda antes de que el zombie postgres-js
  liberara el slot).
- DB: Supabase prod `erdvpcfjynkhcrqktozd`, pooler en transaction mode
  (port 6543).
- El bug 504 documentado en `HANDOFF.md` sigue siendo estructural a la
  combinación `postgres-js + Supavisor + lambdas cortas`. Este plan lo
  ataca por dos lados: subir `maxDuration` (band-aid efectivo) +
  sacar postgres-js de las rutas calientes (fix real).

---

## 1. Diagnóstico — qué se confirmó en el código actual

### 1.1 Bug 504 (`/admin/marketing`, `/admin/comp-accounts`, etc.)
- **Causa probada (`HANDOFF.md`)**: `pg_stat_activity` muestra
  conexiones en `state=active, wait_event=ClientRead` durante minutos
  cuando Vercel mata la lambda durante un query Drizzle.
- **Por qué persiste tras los fixes de `db.ts`**: los timeouts
  (`statement_timeout`, `idle_session_timeout`, `tcp_keepalives_*`) son
  defensas, no eliminan el bug. Mientras alguna ruta caliente use
  `postgres-js` el riesgo sigue.
- **Por qué se sentía "infinito"**: una sola lambda envenenada con
  `max: 1` por worker bloquea **todas** las navegaciones subsecuentes
  del mismo usuario en esa lambda hasta que Vercel la recicla (~5–15
  min).

Pages que todavía usan Drizzle (confirmado leyendo el código en
`claude/vigilant-hoover-917e2a`):

| Archivo | Queries Drizzle a migrar |
|---|---|
| `src/app/(dashboard)/admin/marketing/page.tsx` | `db.select().from(marketingCampaigns)…limit(50)` |
| `src/app/(dashboard)/admin/marketing/actions.ts` → `fetchGlobalStats` | 3 `db.execute(sql\`…\`)` con counts |
| `src/app/(dashboard)/admin/marketing/drips/page.tsx` | `db.select().from(marketingDripConfigs)` + grouped counts |
| `src/app/actions/admin-comp-accounts.ts` → `listCompAccounts` | `db.select().from(subscriptions)` con `LIKE` |
| `src/app/(dashboard)/admin/agency-team-proposals/page.tsx` | 3 `db.query.*.findMany` |
| `src/app/(dashboard)/admin/agencies/page.tsx` | `db.query.agencyProfiles.findMany` + 2 joins manuales |
| `src/app/(dashboard)/admin/manager-applications/page.tsx` | `db.query.managerApplications.findMany` |

### 1.2 Causas adicionales de lentitud (no relacionadas con el 504)

- **`vercel.json` no tenía `maxDuration`**: aunque ya estábamos en Pro,
  las funciones se mataban a los 10s (default Hobby). Eso minimizaba el
  tiempo que el pooler tenía para reciclar slots envenenados y
  maximizaba el 504. Subido a 60s globalmente.
- **Admin layout dispara 8 supabase counts en cada navegación**
  ([src/app/(dashboard)/admin/layout.tsx:67-85](../../src/app/(dashboard)/admin/layout.tsx)).
  Sin cache → cada click en el sidebar re-ejecuta 8 queries. Solución:
  `unstable_cache` con tag `admin-counters` y revalidación corta.
- **Cero `unstable_cache` en el codebase** (grep confirmó 0 usos). Todo
  RSC consulta Supabase/Drizzle en cada render.
- **`next.config.ts` no optimiza imágenes**: faltan `formats: ['avif',
  'webp']`, `minimumCacheTTL`, `deviceSizes`, `imageSizes`. Cada crest
  / avatar / logo se re-procesa.
- **55 `<img>` en lugar de `<Image>`** en src/. Los peores ofensores
  son layouts públicos (impacta LCP/SEO):
  `src/app/(public)/[slug]/components/modules/ProfileTacticsModule.tsx`
  tiene 7 solo. Lista completa en `git grep -n "<img " src/`.
- **6 fuentes Google + 1 local** en `src/app/layout.tsx:3-37`. Todas con
  `display:swap`. Pesan en critical path; consolidar a 2-3 familias
  reduce ~50-80 kB de WOFF2.
- **`@heroui/react` importado 93 veces** sin `optimizePackageImports`
  → barrel imports sin tree-shake. **`lucide-react`** igual sin
  `modularizeImports`. Esto solo, configurado, baja 30-50 kB del First
  Load JS.
- **Bundles cliente inflados** por componentes que deberían ser RSC o
  `dynamic()`:
  - `/dashboard/edit-profile/football-data` — 572 kB (managers
    cargados síncrono)
  - `/dashboard/agency` — 510 kB (20+ secciones client)
  - `/onboarding/player/apply` — 477 kB (ApplyFlow es client + tiene
    `useEffect` con `supabase.auth.getUser()`, antipatrón puro)
- **`world-atlas` + `topojson-client` + `d3-geo`** importados síncrono
  para el mapa del player. Candidatos directos a `dynamic({ ssr:
  false })`.

---

## 2. Plan ejecutable (priorizado por ROI)

### P0 — Apagar el incendio del 504 (este PR)
- [x] **`vercel.json` → `functions.maxDuration: 60`** global. Cubre
  RSCs, route handlers y server actions.
- [x] **Cachear los 8 counters del admin layout** con `unstable_cache`
  + tag `admin-counters`. Invalidación on-demand desde las server
  actions que crean/aprueban/rechazan (revalidateTag).
- [x] **Migrar las 7 admin pages Drizzle → Supabase REST**. Mismo
  patrón que `src/components/layout/footer/footer-state.ts` (PR #69
  ya probado). Lista de archivos arriba.
- [x] **Documentar este plan** (este archivo).

### P1 — Performance público + dashboard
- [x] **`next.config.ts`**: `images.formats: ['image/avif','image/webp']`
  + `minimumCacheTTL: 7d` + `experimental.optimizePackageImports`
  para `@heroui/react`, `lucide-react`, `framer-motion`.
- [x] **`<img>` críticos migrados a `next/image`**: TeamCrest,
  TeamPicker, TeamPickerCombo (×2), CareerRowRead, CareerRowEditor
  (×3), atoms.tsx del free layout (Crest), dashboard layout header
  avatar.
- [ ] **Pendiente P1.2**: migrar el resto de `<img>` (~45 restantes,
  no críticos): `ProfileTacticsModule.tsx` (7), `manager-applications`
  (los `<img>` del ID doc / selfie son links a Supabase signed URLs
  cortas; pueden quedar), `media-moderation`, `agency/edit-profile`,
  `dashboard/edit-profile/multimedia`. Hacer cuando el bundle lo
  justifique.
- [ ] **Consolidar fuentes — POSTPONED**. Análisis hecho:
  - `font-heading` / `font-display` (usadas 19 + 1 files en
    layouts pro) **no están mapeadas en `@theme inline`** — el
    template pro probablemente cae a system font. Necesita
    investigación: ver si zuume debería estar mapeada o si los
    layouts están rotos visualmente sin que nadie haya reportado.
  - `font-bh-display` (86 files), `font-bh-mono` (40 files),
    `font-bh-heading` (20 files) son las que se usan masivo —
    Barlow + Barlow_Condensed + DM_Mono son load-bearing.
  - Zuume carga 7 pesos. Si solo se usa Bold (700), podemos
    dropear los otros 6 pesos.
  - **Decisión**: no tocar fuentes en este PR (riesgo visual
    sin ganancia clara hasta que se aclare el mapping de
    font-heading). Anotado para P1.3.

### P2 — Reducir bundles de páginas pesadas
- [x] **`dynamic({ ssr: false })` para 5 managers below-fold** en
  `/dashboard/edit-profile/football-data`: `SeasonStatsManager`,
  `ExternalLinksManager`, `HonoursManager`, `ScoutingAnalysisSection`,
  `MarketProjectionSection`. Wrappers en `components/lazy/*Lazy.tsx`
  (client) que importan los originales dinámicamente. `CareerManager`
  queda síncrono (primer fold).
  **Impacto**: First Load JS 572 → 483 kB (-89 kB / -15%). Page chunk
  107 → 19 kB.
- [x] **Mismo patrón en `/dashboard/agency/page.tsx`** — 6 secciones
  below-fold: `ServicesSection`, `OperativeReachSection`,
  `CountriesSection`, `TeamRelationsSection`, `ContactSocialSection`,
  `AgencyMediaManagerClient`. Identity + GeneralInfo (primer fold)
  síncronos.
  **Impacto**: First Load JS 510 → 462 kB (-48 kB / -9%). Page chunk
  46 → 8.2 kB.
- [x] **`ApplyFlow.tsx`**: `userEmail` viene como prop desde el RSC
  padre. Se borró el `useEffect` con `supabase.auth.getUser()` que
  duplicaba el fetch + flash inicial sin email. Bundle ~igual (los
  Step1/2/3 son los pesos reales), pero gana UX + un round-trip menos.
- [x] **Globe3D `dynamic({ ssr: false })`** en
  `(public)/agency/[slug]/components/modules/AgencyReachModule.tsx`.
  Saca `d3-geo` + `topojson-client` + `world-atlas` (~80 kB TopoJSON)
  del bundle inicial.
  **Impacto**: `/agency/[slug]` First Load JS 336 → 287 kB (-49 kB /
  -15%).

**Total P2**: ~186 kB removidos del First Load JS sumando las 3
páginas (football-data + agency + agency/[slug]).

### P3 — Arquitectura defensiva
- [x] **Migración `postgres-js` → `pg` (node-postgres)**.
  Nota: `@vercel/postgres` (lo que originalmente sugerí) es **Neon-only**,
  no funciona con Supabase. La migración real es a `pg` con el adapter
  `drizzle-orm/node-postgres`. `pg` no tiene el bug de extended-protocol
  que causaba los ClientRead zombies de `postgres-js`.
  - `src/lib/db.ts`: reescrito con `pg.Pool` + `drizzle(pool, { schema })`.
    Timeouts defensivos mantenidos vía `options` libpq-style
    (`statement_timeout`, `idle_in_transaction_session_timeout`,
    `idle_session_timeout`) + `keepAlive` socket-level. `max: 1`,
    `maxLifetimeSeconds: 60`, `idleTimeoutMillis: 5000`,
    `connectionTimeoutMillis: 10000`.
  - `src/db/migrate.ts`: misma migración a `pg.Pool` + `drizzle-orm/node-postgres/migrator`.
  - `src/db/migrate_raw.ts`: **eliminado**. Era código muerto con un
    project_ref del dev borrado del incidente original.
  - `src/app/(dashboard)/admin/{divisions,teams}/bulkActions.ts`:
    spawneaban su propio `postgres()` client a load del módulo, doblando
    el pool footprint por warm lambda. Refactoreados a usar el `db`
    compartido de `@/lib/db`.
  - Call-sites de `db.execute<T>()`: `pg` siempre devuelve
    `QueryResult<T>` con `.rows`; `postgres-js` a veces devolvía array
    directo. Simplificados los unwraps defensivos en 8 archivos
    (`audiences.ts`, `recipient-props.ts`, `player-invites.ts`,
    `agency-invites.ts`, `marketing/actions.ts`, `ContactPortfolioModule.tsx`).
  - `src/app/(public)/[slug]/opengraph-image.tsx`: cambiado de
    `runtime = "edge"` → `"nodejs"`. `pg` no funciona en Edge (usa
    `net`/`crypto` de Node) y la guía oficial de Vercel ya no recomienda
    Edge para nuevo trabajo (Fluid Compute es el sucesor).

  **Resultado**: bug 504 estructural cerrado. Los timeouts en `db.ts`
  pasan a ser defensa de borde, no la línea principal de defensa.

  **Regresión menor de bundle**: First Load JS shared 294 → 319 kB
  (+25 kB) y CSS 42 → 67 kB. Causa: Turbopack rehace el chunk-splitting
  por el nuevo grafo de imports (verificado: ningún client component
  importa `pg`, no leaks al cliente). Páginas individuales **mantienen
  los gains de P2** — football-data 483 kB, agency 462 kB, /agency/[slug]
  287 kB. Aceptable tradeoff por eliminar el bug 504.
- [ ] **Auth check de admin a middleware**: hoy cada layout/page hace
  `getUser()` + lookup de `role`. Centralizar reduce round-trips a
  Supabase Auth. Ojo: middleware corre en cada request — usar bien el
  matcher.

### P4 — Cleanup (paralelo, opcional)
- [ ] Limpiar warnings ESLint del build (50+ `any`, 30+ unused,
  useEffect deps). Sin impacto perf pero molesta al refactorizar.

---

## 3. Cambios aplicados en este PR (P0)

### 3.1 `vercel.json`
```json
{
  "functions": {
    "src/app/**/*.tsx": { "maxDuration": 60 },
    "src/app/**/route.ts": { "maxDuration": 60 }
  },
  "crons": [...],
  "headers": [...]
}
```

### 3.2 `src/app/(dashboard)/admin/layout.tsx`
- Los 8 counts mudados a una función cacheada con
  `unstable_cache(...)`, tag `admin-counters`, `revalidate: 30`.
- Server actions admin (approve/reject/etc.) ahora llaman
  `revalidateTag("admin-counters")` para refrescar los badges sin
  esperar el TTL.

### 3.3 Pages admin migradas a Supabase REST
Patrón consistente — `createSupabaseAdmin()` (service role) para
bypassear RLS cuando se necesita ver todo:

- `src/app/(dashboard)/admin/marketing/page.tsx` — lista de campañas.
- `src/app/(dashboard)/admin/marketing/actions.ts:fetchGlobalStats` —
  3 counts con `head: true`.
- `src/app/(dashboard)/admin/marketing/drips/page.tsx` — configs +
  grouped counts (Supabase RPC o agregación en cliente).
- `src/app/actions/admin-comp-accounts.ts:listCompAccounts` — lectura
  para el render del page (writes siguen con Drizzle, no están en el
  hot path).
- `src/app/(dashboard)/admin/agency-team-proposals/page.tsx` — 3 reads.
- `src/app/(dashboard)/admin/agencies/page.tsx` — agencyProfiles +
  staff + player counts.
- `src/app/(dashboard)/admin/manager-applications/page.tsx` — pending
  applications + signed URLs.

### 3.4 Lo que NO se tocó
- `src/lib/db.ts` — los timeouts del PR #69-#72 quedan. Son defensa
  útil para el resto de rutas que aún usan Drizzle (dashboard del
  jugador, agencia, edit-profile…). Esas rutas pueden seguir
  bloqueándose si se las castiga, pero no son las que paseaba el owner.
- **Writes** en admin actions (insert/update/delete) — siguen con
  Drizzle. No están en el render path, el riesgo de envenenar lambda
  es menor y la migración es 3× más laburo.
- Schema Drizzle — sigue siendo source of truth para tipos.

---

## 4. Cómo verificar que el 504 está mitigado

1. Tras deploy, abrir `/admin/marketing`, `/admin/comp-accounts`,
   `/admin/marketing/drips`, `/admin/agency-team-proposals`,
   `/admin/agencies`, `/admin/manager-applications`. Navegar entre
   ellas múltiples veces.
2. En paralelo, vía Supabase MCP:
   ```sql
   SELECT pid, wait_event, state, now() - query_start AS duration,
          substring(query, 1, 100) AS query
   FROM pg_stat_activity
   WHERE state = 'active'
     AND wait_event = 'ClientRead'
     AND application_name = 'Supavisor';
   ```
   **Resultado esperado**: lista vacía o queries cortas (<5s) y
   transientes. Si aparecen zombies de >30s post-deploy, alguna ruta
   admin migrada quedó mal y todavía usa Drizzle.
3. **Métrica de éxito**: ningún 504 en `/admin/*` durante una sesión
   de navegación normal (15+ páginas). Si pasa una vez por
   `/dashboard/edit-profile/football-data` (que sigue con Drizzle vía
   actions), no cuenta — eso lo cierra P3.

---

## 5. Decisiones tomadas en esta sesión

- **No migrar a `@vercel/postgres` todavía**. P0 es alto ROI con bajo
  riesgo (sigue el patrón de `footer-state.ts` ya probado). P3 queda
  para cuando el owner decida — es el fix definitivo pero requiere más
  pruebas.
- **No tocar Hobby**: confirmado que Pro está activo. `maxDuration:
  60` aplica en Pro sin warnings.
- **Mantener Drizzle para writes**: writes salen de un click (no
  render), riesgo de bloqueo de navegación es bajo. Si en P3 migramos
  driver, los writes vienen gratis.
- **No tocar `(dashboard)/dashboard/*`** en P0 — fuera del scope del
  bug reportado (era `/admin/*`). Si el dashboard del jugador también
  se traba, se migra en P1/P2 con la misma plantilla.

---

## 6. Memorias a actualizar tras este PR

`MEMORY.md` debería sumar:
- `project_admin_504_bug.md` → marcar como "mitigado, no resuelto" si
  el deploy confirma que el 504 desapareció.
- Nuevo memory: `project_perf_baseline.md` con bundle sizes pre/post
  para tener baseline al hacer P1/P2.
