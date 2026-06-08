# SEO handoff — entry point para continuar el plan en un chat nuevo

> **Read me first.** Este documento existe para que un agente que no
> estuvo en el chat original pueda retomar el plan SEO de 'BallersHub
> sin pedirle contexto al owner. Es self-contained: no asume nada del
> chat anterior.
>
> **Last updated**: 2026-06-01.

## TL;DR

El plan SEO de 'BallersHub está **completo en infraestructura**. Phase 1
(per-player schema), Phase 2 (blog + E-E-A-T), MVP-2 (author hubs +
image upload + emails + admin whitelist UI), drift monitoring y panel
`/admin/seo` con Google Search Console — todo mergeado a main.

Lo que queda son **tareas operativas del owner** (publicar contenido,
configurar credenciales GCP) y **3 piezas de doc/código pendientes**
que un agente nuevo puede ejecutar cuando el owner las priorice:

1. **Opción C**: Plan de backlink outreach (Phase 4). **Deliverable ya
   escrito** en [`docs/seo/backlink-outreach-plan.md`](./backlink-outreach-plan.md) —
   el owner ejecuta manualmente, no requiere agente.
2. **Opción D**: GEO / AI search audit. **Spec** en
   [`docs/seo/geo-ai-audit-spec.md`](./geo-ai-audit-spec.md). Trigger:
   ≥4 semanas de data en GSC + ≥1 cornerstone publicado.
3. **Iteración 2**: GA4 integration en `/admin/seo`. **Spec** en
   [`docs/seo/iter-2-ga4-integration-spec.md`](./iter-2-ga4-integration-spec.md).
   Trigger: setup GCP completo + admin/seo mostrando data GSC real.

Hay también una **Phase 3** (directory hubs) gated a tener ≥200 Pro
profiles — fuera de scope hoy.

## State actual del plan (qué está vivo en prod)

### ✅ Phase 1 — SEO foundation
- Person/Agency JSON-LD, sitemap.xml, robots.txt, llms.txt, OG dinámica
  per player/agency, OG dinámica /pricing, OG dinámica author hub
- PRs cerrados: #63, #82, #117, #118, #122
- Doc canon: [`docs/seo-strategy.md`](../seo-strategy.md), [`docs/seo-per-player-handoff.md`](../seo-per-player-handoff.md)

### ✅ Phase 2 — Blog + E-E-A-T
- Sistema editorial gated (`/blog`, `/blog/write`, `/admin/blog`)
- TipTap rich-text editor + image upload a Supabase Storage
- Article schema JSON-LD + ProfilePage para author hubs
- Email notifications (Resend) en flujo editorial
- UI admin para togglear `is_blogger`
- PRs cerrados: #101, #115, #116, #119
- Docs canon: [`docs/blog/README.md`](../blog/README.md),
  [`docs/blog/blogger-seo-guide.md`](../blog/blogger-seo-guide.md)

### ✅ Drift monitoring
- `scripts/seo/capture-baseline.cjs` + `compare-baseline.cjs`
- 14 URLs críticas trackeadas
- Baseline guardado en `docs/seo/drift/`
- PR cerrado: #130 (mergeado 2026-05-30)
- Doc canon: [`docs/seo/drift-monitoring.md`](./drift-monitoring.md)

### ✅ Panel `/admin/seo` con Google Search Console
- 4 páginas: overview, players (KPI primario), queries, pages
- API client con service account JWT
- Cache 1h con `unstable_cache`
- Degradación graciosa: si no hay env vars, banner amarillo
- PR cerrado: #131 (mergeado 2026-05-30)
- Doc setup: [`docs/seo/admin-seo-setup.md`](./admin-seo-setup.md)

### ✅ Cornerstone drafts seedeados
5 drafts en prod como `status='draft'` (autor: Julián Berardinelli,
`user_id = abadfb88-4692-4cca-91bf-1459480425b2`):

| # | slug | cluster | ~min | ~chars HTML | links | id (URL `/blog/write/<id>`) |
|---|---|---|---|---|---|---|
| 1 | `como-armar-portfolio-profesional-futbolista` | career_guidance | 14 | 18.954 | 6 | `318fdb95-11f6-45a3-800c-ff9582e3dc93` |
| 2 | `que-buscan-los-scouts-perfil-futbolista` | career_guidance | 14 | 17.432 | 7 | `f7855312-855b-449d-81ed-aad6b2490a51` |
| 3 | `como-gestionar-roster-jugadores` | agency_ops | 13 | 18.139 | 6 | `00e3b7c9-fe34-4059-a63a-919dd7d4b928` |
| 4 | `como-presentar-jugadores-a-clubes` | agency_ops | 5 | 5.883 | 7 | `a153d804-444c-47e0-b364-b90c25f92055` |
| 6 | `categorias-futbol-argentino-ascenso` | industry_ar | 12 | 16.183 | 2 | `10db09ee-f8f9-4bbc-acbb-c6bb4b82871c` |

- #5 (mercado de pases) desestimado por el owner
- #4 corto (~870 palabras vs floor 1500) — publicable solo vía admin
- #6 con solo 1 link a portfolios — justificado por coherencia
  temática (post sobre Argentina; otros portfolios son jugadores en
  clubes españoles)

## Reglas operativas críticas (registradas por el owner — no negociables)

1. **Brand: `'BallersHub`** con apóstrofe recto inicial. **Nunca**
   "BallersHub" suelto. Cualquier draft nuevo o edit retroactivo debe
   respetar esto. Hay un script de fix: `tmp_brandfix.cjs` que usa
   regex `(?<!['’])BallersHub` → `'BallersHub`.
2. **Julián Berardinelli SIEMPRE linkeado** en cada post como
   [`/julian-berardinelli`](https://ballershub.co/julian-berardinelli).
   Es founder + ancla del author hub. Excepción justificada documentada
   por post si aplica.
3. **≥3 links a portfolios reales** por cornerstone post. Excepción
   documentada si el ángulo del post lo justifica (ej. #6).
4. **Floor 1500 palabras** para cornerstone. Posts más cortos se
   publican solo vía admin override (`reviewPost` no valida word
   count) y son subóptimos.
5. **Migration protocol** ([`feedback_migration_protocol.md`](../../.claude/projects/-Users-jberardinelli-Dev-ballershub/memory/feedback_migration_protocol.md))
   sigue vivo para cualquier cambio de schema. Resumen: Drizzle es
   source of truth, dev antes de prod, agente nunca toca el journal,
   apply_migration contra prod requiere autorización explícita del
   owner por mensaje.

## Pending operativos del owner (no requieren agente)

### Bloqueantes para que rinda lo construido

1. **Setup Google Service Account** (~30 min). Doc paso a paso:
   [`docs/seo/admin-seo-setup.md`](./admin-seo-setup.md). Sin esto,
   `/admin/seo` muestra banner amarillo "credenciales no configuradas".
   Resumen:
   - GCP Console → crear SA `ballershub-seo-reader`
   - Habilitar Search Console API
   - GSC → agregar el email del SA con permission `Restricted`
   - Vercel → env vars `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON del key) y
     `GSC_SITE_URL=https://ballershub.co`

2. **Subir heroes + publicar cornerstone #1** para activar el flywheel.
   Una vez publicado:
   - `Article.author.@id` cierra cross-ref con el author hub
   - El author hub `julian-berardinelli` entra al sitemap + llms.txt
     (filtro `≥1 post published`)
   - Los 5+ portfolios linkeados empiezan a recibir más crawl

   El URL para editar el draft #1 (que ya tiene 6 portfolios linkeados
   y el ángulo más universal): [`/blog/write/318fdb95-11f6-45a3-800c-ff9582e3dc93`](https://ballershub.co/blog/write/318fdb95-11f6-45a3-800c-ff9582e3dc93).
   Falta subir la hero image y hacer click en "Enviar a revisión" →
   luego desde `/admin/blog/[id]` el owner se auto-aprueba.

### Limpieza (opcional, baja prioridad)

3. Borrar worktrees locales con PRs ya mergeados:
   ```bash
   git worktree remove .claude/worktrees/admin-seo-gsc
   git worktree remove .claude/worktrees/seo-drift-baseline
   git branch -d claude/admin-seo-gsc claude/seo-drift-baseline
   ```

## Roadmap restante (qué puede hacer un agente nuevo)

### Próximo natural: **Opción C — Backlink outreach plan (Phase 4)**

**Status**: ✅ Plan completo ya escrito como deliverable en
[`docs/seo/backlink-outreach-plan.md`](./backlink-outreach-plan.md).

El owner ejecuta manualmente: identificar journalists, mandar emails
con las plantillas, trackear en spreadsheet, esperar coverage.

**Por qué Opción C antes que D**: D rinde más con varias semanas de
data en GSC + al menos 1 cornerstone publicado. C se puede ejecutar en
paralelo mientras esa data se acumula.

**Qué puede pedir el owner a un agente nuevo sobre C**:
- Refinar plantillas con un ángulo específico (ej. agregar un caso de
  jugador concreto post-publicación)
- Generar variantes de outreach para un medio nuevo no en la lista
- Investigar el journalist beat de un target específico
- Sumar targets internacionales (Argentinos en LaLiga, etc.)

### Cuando llegue el momento: **Opción D — GEO / AI search audit**

**Status**: 📋 Spec escrita en [`docs/seo/geo-ai-audit-spec.md`](./geo-ai-audit-spec.md).

**Trigger**: arrancar cuando se cumpla `≥4 semanas de data en GSC` +
`≥1 cornerstone publicado`.

**Qué hace**: audita visibilidad en AI search (Google AI Overviews,
ChatGPT, Perplexity, Bing Copilot), valida `llms.txt`, mide
passage-level citability de cornerstone posts, brand mention signals.

Se ejecuta con el skill `/claude-seo:seo-geo` instalado en el repo.

### Cuando setup GCP esté listo: **Iteración 2 — GA4 integration**

**Status**: 📋 Spec escrita en [`docs/seo/iter-2-ga4-integration-spec.md`](./iter-2-ga4-integration-spec.md).

**Trigger**: setup GCP completo (env vars de SA + GSC ya en Vercel) +
`/admin/seo` mostrando data real de GSC.

**Qué hace**: agrega conversions funnel (`organic → signup → Pro`) al
panel `/admin/seo`. Reusa la misma Service Account de GSC; sólo agrega
una env var nueva `GA4_PROPERTY_ID` y habilita la GA4 Data API en GCP.

### Más lejos (out of scope hoy)

- **Phase 3**: directory hubs `/players`, `/agencies`, `/scouts`.
  Gated a `≥200 Pro profiles` para tener masa crítica. Hoy no aplica.
- **Hreflang multilingüe**: deferred. Hoy solo `es-AR`.

## Cómo retomar paso a paso (para el agente nuevo)

1. **Leé este doc completo.** Es self-contained.
2. **Leé las memorias críticas** del owner:
   - [`project_seo_plan_status.md`](../../.claude/projects/-Users-jberardinelli-Dev-ballershub/memory/project_seo_plan_status.md) —
     source of truth del plan (probablemente más reciente que este doc
     en el repo si hubo otra sesión)
   - [`feedback_migration_protocol.md`](../../.claude/projects/-Users-jberardinelli-Dev-ballershub/memory/feedback_migration_protocol.md) —
     5 reglas de oro antes de tocar DB
   - [`user_julian.md`](../../.claude/projects/-Users-jberardinelli-Dev-ballershub/memory/user_julian.md) —
     preferencias del owner (español, ship fast, autonomous)
3. **Verificá state real** del repo y PRs (la memoria puede estar
   stale):
   ```bash
   gh pr list --state open --limit 20
   gh pr list --state merged --limit 10
   git log origin/main --oneline -20
   git worktree list
   ```
4. **Si el owner te pide arrancar con C** (backlinks): el doc ya está
   escrito. Preguntale qué quiere refinar/expandir, o si quiere
   ejecutar el outreach. **No es trabajo de código.**
5. **Si te pide arrancar con D** (GEO audit): verificá primero el
   trigger (data GSC + cornerstone publicado). Si no se cumple,
   explicale al owner por qué esperar. Si sí, ejecutá el skill
   `/claude-seo:seo-geo` siguiendo el spec.
6. **Si te pide arrancar con iter-2** (GA4): verificá primero que el
   panel `/admin/seo` muestre data real (no banner amarillo). Si no,
   priorizá ayudar al owner con setup GCP. Si sí, seguí el spec.
7. **Si el owner pide algo nuevo no listado**: aplicá criterio.
   Probablemente conviene crearle su propio spec doc en `docs/seo/`
   para mantener trazabilidad.

## Docs canon del SEO (índice)

### Estrategia y roadmap
- [`docs/seo-strategy.md`](../seo-strategy.md) — audiences, KPIs,
  content tracks, schema plan, 4 phases
- [`docs/seo-per-player-handoff.md`](../seo-per-player-handoff.md) —
  Phase 1 implementation log

### Operación del blog
- [`docs/blog/README.md`](../blog/README.md) — arquitectura, schema,
  rutas, file tree, dependencies
- [`docs/blog/contributor-guide.md`](../blog/contributor-guide.md) —
  flow editorial para autores
- [`docs/blog/admin-guide.md`](../blog/admin-guide.md) — flow editorial
  para admins
- [`docs/blog/blogger-seo-guide.md`](../blog/blogger-seo-guide.md) —
  guía SEO enviable a bloggers invitados

### SEO infra y monitoring (este folder)
- [`docs/seo/HANDOFF.md`](./HANDOFF.md) — **este doc**
- [`docs/seo/admin-seo-setup.md`](./admin-seo-setup.md) — setup GCP
  Service Account para `/admin/seo`
- [`docs/seo/drift-monitoring.md`](./drift-monitoring.md) — uso del
  sistema baseline/compare
- [`docs/seo/backlink-outreach-plan.md`](./backlink-outreach-plan.md) —
  Phase 4 plan (Opción C)
- [`docs/seo/geo-ai-audit-spec.md`](./geo-ai-audit-spec.md) — Opción D
  spec
- [`docs/seo/iter-2-ga4-integration-spec.md`](./iter-2-ga4-integration-spec.md) —
  iter-2 spec
- [`docs/seo/drift/`](./drift/) — baselines versionados

## Datos operativos clave (para no preguntar al owner)

- **Domain prod**: `https://ballershub.co`
- **Owner user_id** (prod): `abadfb88-4692-4cca-91bf-1459480425b2`
- **Owner author_slug**: `julian-berardinelli`
- **Owner email**: `julian.berardinelli@gmail.com`
- **Supabase prod project**: `erdvpcfjynkhcrqktozd`
- **Supabase dev project**: `ciolizjshimyvyonlssq`
- **GSC**: verificado 2026-05-27, sitemap submitido, `/` y
  `/julian-berardinelli` ya indexadas
- **Idioma sitio**: `es-AR`
- **Skill SEO instalado**: `claude-seo@agricidaniel-seo` v1.9.9
  (`/claude-seo:seo <command> <args>`)

## Stack técnico SEO (resumen)

### JSON-LD activos en prod

- Sitewide (root layout): `Organization` + `WebSite` + `SoftwareApplication`
- `/[slug]` Free: minimal `Person`
- `/[slug]` Pro: `Person` + `SportsTeam` + `SportsOrganization` +
  `BreadcrumbList` + sameAs (incluye author hub si el user es blogger)
- `/agency/[slug]`: `SportsOrganization` + member cross-refs +
  `BreadcrumbList`
- `/about`: `AboutPage` + team `Person` entities
- `/pricing`: `Product` (con image) + `Offer × N` + `BreadcrumbList`
- `/blog/[slug]`: `Article` + author `Person` + `BreadcrumbList`
- `/blog/authors/[slug]`: `ProfilePage` + `Person` (con sameAs
  incluyendo portfolio) + `BreadcrumbList`

### Helpers SEO clave

Ubicación: `src/lib/seo/`

- `baseUrl.ts` — canonical URL helper, single source of truth
- `organizationJsonLd.tsx` — sitewide
- `personJsonLd.tsx` — per-player (Free/Pro branching, authorHubSlug)
- `agencyJsonLd.tsx` — per-agency
- `offerJsonLd.tsx` — `/pricing` (con Product.image)
- `articleJsonLd.tsx` — blog posts (con author cross-ref)
- `profilePageJsonLd.tsx` — author hubs
- `revalidate.ts` — cache invalidation helpers
- `google-clients.ts` — GSC API auth con service account
- `gsc-queries.ts` — GSC API wrappers
- `player-rank-tracking.ts` — KPI primario classification

### Scripts

Ubicación: `scripts/seo/`

- `capture-baseline.cjs` — snapshot SEO state de 14 URLs críticas
- `compare-baseline.cjs` — diff vs baseline guardado, exit codes 0/1/2

### Routes admin

- `/admin/seo` — overview
- `/admin/seo/players` — KPI primario (Pro players por estado:
  winning/fighting/missing)
- `/admin/seo/queries` — top queries
- `/admin/seo/pages` — top pages

## Cómo medir éxito del plan SEO (KPIs primarios)

**Vivimos por** (definidos en `docs/seo-strategy.md`):

1. **Cantidad de Pro players en estado "winning"** — `name + apellido +
   ('futbolista' | 'jugador')` rankea en top-10 en GSC. Target: 60%+
   de Pro players en winning a los 90 días post-launch.
2. **Tráfico orgánico al blog** — sessions desde Google a `/blog/*`.
   Target: +20% MoM los primeros 6 meses.
3. **Conversión orgánica → Pro** — % de visitantes orgánicos que
   suben a Pro. Target: 1-2% (industria SaaS B2C).

**No vivimos por**:
- Traffic total (vanity).
- Ranking de keywords genéricas tipo "futbolistas" (no es nuestro nicho).
- DA del dominio (lagging indicator).

## Si vas a tocar código

- Worktree-per-feature obligatorio. Branch naming: `claude/<descriptive>`.
- 1 PR por feature/scope claro. Target default: `main` (el flujo `dev →
  main` quedó obsoleto desde el plan SEO).
- Verify obligatorio antes del commit: `pnpm typecheck && pnpm lint`.
- Docs canon: actualizar en el mismo PR si lo afectás.
- Memoria del owner: actualizar `project_seo_plan_status.md` post-merge.
