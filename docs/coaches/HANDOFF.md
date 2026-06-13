# Vertical Entrenadores (Coaches) — Plan de implementación / HANDOFF

> **Status: 📋 PLAN — pendiente de aprobación del owner. NO implementado.**
> Fecha: 2026-06-12 · Autor: análisis multi-agente (14 agentes: código + Supabase MCP dev + Vercel MCP) sobre el worktree `claude/beautiful-bardeen-6ec6e5` (HEAD `9673d5c`, 2 commits detrás de `origin/main` — falta PR #206).
> Objetivo: 3ª vertical **coaches** con paridad total a players: portfolio público `/coach/[slug]`, Free/Pro, moderación humana por edición, SEO+GEO completos, checkout Stripe+MP.
>
> **Regla de lectura**: todo lo de §1 es estado REAL verificado en código/DB (con paths). Todo lo de §2 en adelante es PROPUESTA. Las decisiones que necesitan confirmación del owner están en §9.

---

## §0 TL;DR

1. **El sistema ya tiene casi todos los patrones que la vertical coach necesita** — el trabajo es un espejo disciplinado, no una invención:
   - Moderación de alta: `player_applications` → cola `/admin/applications` → RPC de aprobación (rol + perfil + slug + materialización de trayectoria).
   - **Moderación por edición YA EXISTE** para trayectoria: envelope `career_revision_requests` + items + snapshot (el público sigue viendo la versión aprobada mientras hay un pending). Coach la clona.
   - SEO per-profile completo (metadata, hreflang condicional, JSON-LD, OG image, sitemap, llms.txt) con predicado de indexabilidad centralizado.
   - i18n por tabla `*_translations` (fila = locale publicado), checkout Stripe+MP con accessors de env genéricos.
2. **Las 3 piezas netas nuevas**: (a) pre-moderación de multimedia (player es reactivo: publica primero; el requerimiento coach es `pending → approved` ANTES de publicar); (b) **diff para el revisor** (el snapshot existe pero ningún panel lo renderiza hoy); (c) licencias como credencial verificada (`hasCredential` en JSON-LD).
3. **roleEnum ya incluye `'coach'`** en DB y TS (`src/db/schema/enums.ts:4`) — cero `ALTER TYPE`. No existe ninguna tabla/ruta/código coach.
4. **Hay 1 drift bloqueante de DB que hay que resolver ANTES de generar la migración coach**: `player_honour_translations` existe en dev/prod y en `translations.ts` pero NO está en ningún snapshot de Drizzle → el próximo `db:generate` la re-emite y el apply falla (§2.6, PR-0).
5. Roadmap: 6 PRs en orden (drift-fix → DB → onboarding+alta → portfolio+SEO/GEO → edición+moderación+diff → billing), siempre dev primero, prod solo con OK explícito (workflow `docs/db/migration-workflow.md`).

---

## §1 Mapa del sistema actual (verificado)

### 1.1 Rutas y render de portfolios públicos

| Pieza | Player | Agency | Coach (destino) |
|---|---|---|---|
| Ruta | `src/app/[locale]/(public)/[slug]/page.tsx` (root dinámico) | `src/app/[locale]/(public)/agency/[slug]/page.tsx` (segmento propio) | `src/app/[locale]/(public)/coach/[slug]/` (forma agency: el segmento estático gana precedencia sobre `/[slug]`) |
| Layout grupo | `(public)/layout.tsx` = mínimo (`<ZoomLock/>` + children, sin navbar) | ídem | hereda tal cual |
| ISR | `revalidate = 3600` **INEFECTIVO** — dinámico por `await searchParams` incondicional (page.tsx:283, para `?force_free=1`) y por `cookies()`+`auth.getUser()` en `ContactPortfolioModule` | `revalidate = 3600` **EFECTIVO** (cero dynamic APIs en el árbol) | ISR real (modelo agency, ver §3.4) |
| Free vs Pro | `resolvePlanAccess(subscription)` (`src/lib/dashboard/plan-access.ts`: `status_v2 IN (trialing,active)` + `planId`; NUNCA la columna legacy `plan`) → `LayoutResolver.tsx`; `theme.layout==='free'` permite a un Pro degradarse | **SIN check de plan en render** — `agency_theme_settings.layout` decide solo (coerción en write-path) | modelo player (re-check por render) |
| Pro layout | `ProAthleteLayout.tsx`: hero cutout PNG (`player.heroUrl`, requisito del template, gate + CTA si falta), framer-motion + Lenis (`SmoothScrollProvider`), 5 módulos RSC streameados con Suspense que **re-fetchean** por playerId (Bio/Tactics/Career/Gallery/Contact) + Press | `ProAgencyLayout` (7 módulos, sin cutout) | espejo player con módulos coach (§3.3) |
| Free layout | `free/FreeLayout.tsx` (1262 líneas): dossier editorial, 3 `ProSpot` (promo p/ visitantes+crawlers, upsell p/ owner vía `viewer-identity.ts` sin romper ISR) | `ClassicAgencyLayout` | espejo player |
| Template config | `profile_theme_settings` (PK player_id; layout/4 colores) + `profile_sections_visibility` editadas en `/dashboard/edit-template/{styles,structure}` (`src/app/actions/template-settings.ts`, coerción plan-aware server-side + `revalidatePath('/${slug}')`) | espejo `agency_*` | espejo `coach_*` |
| ⚠️ Quirk | los toggles `visible` de `profile_sections_visibility` **NO se consumen** en el render público del player (solo `settings.layout` de section='press'); en agency cada módulo SÍ hace `sections.find → return null` | — | coach implementa el gating REAL (patrón agency) — ver §9-D7 |
| APIs | `api/portfolio/[slug]/contact-click` y `/lead` (lead capture + cookie unlock + Resend) — **hardcodean playerProfiles** | no tiene | espejo coach (§3.5) |

**Gate de existencia del portfolio (el patrón central a replicar)** — aplicado en 5 lugares (metadata, render, opengraph-image, contact-click, lead):
```ts
and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved"))  // sin row → notFound()
```
Un perfil draft/pending/rejected/private **nunca renderiza HTML** (404 duro). Agency NO tiene este gate en su page (bug conocido, ver §1.9).

### 1.2 Moderación existente — estado real

**Veredicto del research: NO hay tabla polimórfica de revisiones. El patrón de la casa es "envelope + items" clonado por vertical.** Campos comunes de todo envelope: `status` (`pending|approved|rejected[|cancelled]`, text sin CHECK), `submitted_by_user_id`/`submitted_at`, `reviewed_by_user_id`/`reviewed_at`, `resolution_note` (nota del moderador AL usuario), `change_summary` (nota del usuario AL moderador).

1. **Alta player**: `player_applications` (status pending; KYC en bucket privado `kyc/{userId}/...`) + `career_item_proposals` → colas `/admin/applications` y `/admin/career` → approve (`src/app/api/admin/applications/[id]/approve/route.ts`): slug único, `user_profiles.role` member→player, INSERT `player_profiles` `status='approved'`, RPC `materialize_career_from_application` (canon vivo == `0004a`), `revalidatePlayerPublicProfile(slug)`. Reject: **sin motivo** (no existe `rejection_reason` en la tabla) y **sin email**.
2. **Edición de trayectoria (el corazón)**: `career_revision_requests` (FK dura `player_id`) + `career_revision_items` (con `original_item_id` → null = etapa nueva) + `career_revision_proposed_teams` + `stats_revision_items` (cuelga del MISMO request). El player la crea con `submitCareerRevision` (`dashboard/edit-profile/football-data/actions.ts:844-1049`): regla **1-pending-por-player**, snapshot del estado aprobado en `current_snapshot jsonb`, submission = estado COMPLETO deseado (no delta). Mientras está pending: el dashboard se lockea (`CareerManager.isLockedByRequest`) y **el público sigue leyendo solo las tablas live** (`career_items`, `stats_seasons`) — las `*_revision_*` jamás se leen en superficies públicas. Approve admin (`api/admin/career/revisions/[id]/approve`): update/insert por item + **DELETE de los items no incluidos** (sync destructivo) + materialización de teams propuestos (`status='pending'`) + cierre del envelope. **`current_snapshot` se guarda pero NINGÚN panel lo renderiza: hoy NO hay diff** (solo chips "Nueva etapa"/"Equipo propuesto").
3. **Multimedia**: `player_media.is_approved` **DEFAULT TRUE** ("Reactive mode", `api/media/upload/route.ts:253`) — publica primero, el admin baja después en `/admin/media-moderation`. El panel muta **client-side por RLS** — y como `is_admin()` SQL solo acepta `role='admin'`, un `moderator` ve la cola pero su UPDATE falla (asimetría real, verificada en pg_policies de dev: ninguna policy de tablas public menciona moderator).
4. **Agencias**: clon del envelope con mejoras — `agency_team_relation_submissions` + `agency_team_relation_proposals` (**status per-item** + `materialized_team_id`) + cancel del owner. Alta vía `manager_applications` (⚠️ `approveManagerApplication` NO valida rol admin dentro de la action — no replicar).
5. **Guards (3 capas)**: layout RSC (`admin/layout.tsx`, roles admin|moderator|analyst) + check inline por route (`role==='admin'`) + RLS `is_admin()` en DB. Writes admin = `createSupabaseAdmin()` service-role (patrón post-504/PR #73); Drizzle con driver `pg` `Pool max:1`.
6. **Notificaciones**: NO hay tabla `notifications` ni emails de aprobación/rechazo (los `sendPlayerWelcomeEmail`/`sendAgencyWelcomeEmail` existen en `src/lib/resend.ts` pero SIN callers, aunque la UI promete "te avisaremos por correo"). El canal real es in-app: `src/modules/notifications/` (Provider global en `src/app/providers.tsx`, 8 templates, dedup por localStorage) — **verificado vertical-agnóstico** (cero queries propias; agency ya lo reusa). El motivo de rechazo fluye e2e SOLO en revisiones (`resolution_note` → `CareerManager` → toast `review.rejected` con `moderatorMessage`); el template `onboarding.rejected` ya renderiza `moderatorMessage` pero nadie se lo pasa (falta la columna).
7. **Counters**: `src/lib/admin/counters.ts` — 8 counts cacheados (`unstable_cache` tag `admin-counters`) + `revalidateAdminCounters()` desde cada mutación.

### 1.3 Capa SEO (paridad a replicar)

- **Metadata** (`(public)/[slug]/page.tsx:165-273`): título `Nombre — Posición · Club`, description 158 chars word-boundary, canonical self-referente por locale vía `conditionalAlternates` (`src/lib/seo/hreflang.ts` — hreflang SOLO de locales con traducción real + `x-default`→es), OG `type:"profile"` + `siteName "'BallersHub"`, twitter `summary_large_image`. **Matriz robots**: sin row approved+public → 404; Free con bio < `FREE_BIO_INDEX_MIN_CHARS` (=100) → soft-noindex `{index:false, follow:true}` ("Pro siempre indexable — pagan el SERP slot"); locale sin traducción → noindex + `redirect('/${slug}')`.
- **JSON-LD** (`src/lib/seo/personJsonLd.tsx`): tier-gated — Free = Person mínimo SIN sameAs; Pro = `@graph` Person + SportsTeam (`#current-team`) + SportsOrganization (agencia, `@id` cross-ref) + BreadcrumbList, con jobTitle/knowsAbout/inLanguage localizados. ⚠️ Gap: `buildSameAs` acepta socials pero `page.tsx` nunca pasa los `player_links` → las redes están como `<a>` visibles pero no en el entity graph.
- **OG image**: `opengraph-image.tsx` (`runtime nodejs`, 1200×630, revalidate 3600): Pro = card avatar+nombre+posición+club; Free = brand-only. Agency NO tiene (gap).
- **Sitemap** (`src/app/sitemap.ts`, único, revalidate 3600): players vía `getIndexablePlayers()` (predicado central `src/lib/seo/indexable-profiles.ts`: `status='approved' AND visibility='public'` + Pro siempre / Free bio≥100), priority 0.9 Pro / 0.6 Free, weekly, `alternates.languages` condicional. Agencies 0.7 (`is_approved=true`). Fail-safe: si la DB falla, solo entries estáticas.
- **robots.ts**: una sola regla `userAgent:"*"` allow `/` + disallow `/dashboard/ /admin/ /checkout/ /onboarding/ /auth/ /api/ /unsubscribe`. `vercel.json` agrega `X-Robots-Tag: noindex` a `*.vercel.app` (previews).
- **Invalidación**: `src/lib/seo/revalidate.ts` — `revalidatePlayerPublicProfile(slug)` busts `/${slug}` + `/players` + `/sitemap.xml` + `/llms.txt`.
- **Drift** (PR #130): `scripts/seo/capture-baseline.cjs` con const `URLS` hand-listed (14 URLs, 6 slugs reales hardcodeados) → `docs/seo/drift/baseline.json`; compare con severidades CRITICAL/MAJOR/INFO.
- **/admin/seo** (PR #131): GSC vía service account, KPI "Pro players rankeando por su nombre" (`src/lib/seo/player-rank-tracking.ts` — player-only).

### 1.4 Capa GEO

- **`/llms.txt`** = ruta dinámica `src/app/llms.txt/route.ts` (shape llmstxt.org: H1 marca + blockquote + H2 `## Jugadores / ## Agencias / ## Blog / ## Autores`), mismo predicado indexable que el sitemap, es-only. **NO existe `llms-full.txt`.** Descripciones de players genéricas (no usa positions/club que ya tiene).
- **Bots IA**: cero reglas específicas — política deliberada documentada en `docs/seo/geo-ai-audit-spec.md:230-233` ("permitir crawl AI salvo override del owner"); todos cubiertos por `*`. La auditoría GEO ("Opción D") es spec NO ejecutada, gated por trigger (≥4 semanas GSC + ≥1 cornerstone).
- **Citabilidad passage-level del player HOY (anti-patrones a NO replicar)**: trayectoria/palmarés/bio SÍ son texto HTML semántico, pero (a) **todos los números de stats SSR-renderizan "0"** (`CountUp` placeholder), (b) **`ScrambleText` borra el SSR** (los vitales del bio-card Pro nacen como nbsp), (c) 3 de 4 análisis de scouting fuera del HTML inicial (accordion `{isOpen && }`).
- **Marca**: `'BallersHub` con apóstrofe (Organization JSON-LD con `alternateName: ["BallersHub","Ballers Hub"]`); ~4 strings user-facing sin apóstrofe en messages (ej. `portfolio.json:275`, texto de share).
- **Middleware** (`src/middleware.ts`): geo-redirect SOLO en `/` y solo UA no-bot (`BOT_RE` cubre GPTBot/ClaudeBot/PerplexityBot por contener "bot"; **ChatGPT-User / Claude-User / Perplexity-User / anthropic-ai NO matchean** y recibirían el 307 — solo afecta `/`). BotID NO está en el código actual (quedó en la branch descartada del viejo dev).

### 1.5 i18n

- next-intl, locales `es` (default SIN prefijo, `localePrefix:"as-needed"`, `localeDetection:false` — load-bearing SEO), `en`, `it`, `pt`(=pt-BR). Registro de namespaces en `src/i18n/request.ts` (10 en main post-#206: + `onboarding`, `checkout`).
- Contenido dinámico: tablas `player_profile_translations` (PK `(player_id, locale)`, CHECK locale text — NO pgEnum, a propósito), `player_honour_translations`, `agency_profile_translations`. **Fila existente = locale publicado e indexable** (gobierna hreflang + redirect). Merge per-field con fallback es (`src/lib/i18n/profile-content.ts`).
- Editor Pro-only (`dashboard/edit-profile/translations/`): gate `ensureProOwner` server-side, cap 4 locales, asistente "Auto-completar" vía AI Gateway (default `google/gemini-2.5-flash`), anti-abuso por `ai_translation_events` (hash + 40 regens/mes), **nunca auto-publica**.
- Módulos streameados aplican su propia traducción (`getLocale()` + merge — patrón #203, obligatorio para módulos que re-fetchean).

### 1.6 Billing

- **2 planIds hardcodeados**: `CheckoutPlanId = "pro-player" | "pro-agency"` (`src/lib/billing/plans.ts:7`) con tabla de precios in-code (USD/EUR→Stripe Checkout subscription anual trial 7d; ARS→MP preapproval plan pre-provisionado vía env). `processorFor(currency)`.
- Persistencia: `subscriptions` (**UNIQUE(user_id)** — 1 sub por user), `checkout_sessions`, `payment_events` (idempotencia), `billing_addresses`. Todo cuelga de `user_id` → **agnóstico de vertical, cero DDL para coach** (`plan_id` es text: `'pro-coach'` es solo data).
- `resolvePlanAccess()` es EL helper isPro (y `resolveProUserIds` su gemelo batch en `indexable-profiles.ts`) — ambos hardcodean los 2 planIds (un `pro-coach` NO sería reconocido Pro hoy).
- Env accessors **ya genéricos**: `STRIPE_PRICE_<PLANID>_<CUR>` / `MP_PLAN_<PLANID>_<CUR>` (`src/lib/billing/env.ts`) → coach = solo agregar env vars + provisioning.
- **La dualidad player/agency está hardcodeada en ~22 puntos** — inventario completo con paths y líneas en §6.2.
- Flow: `/pricing?audience=` → `/checkout/[planId]?currency=` → procesador → `/checkout/processing` (poll 12s + reconcile fallback) → webhooks → `/checkout/success` con `resolveNextStep()` branching por planId al onboarding. El checkout Pro ocurre ANTES e independiente de la aprobación del perfil.

### 1.7 Infra / performance (presupuesto para `/coach/[slug]`)

- Vercel `ballers-hub`, **iad1** + Fluid Compute, Node 22; Supabase prod **us-east-2** (regiones vecinas ~10-15ms RTT — no es cross-continente, pero se multiplica por query).
- `/[slug]` Pro hoy = **~32-35 queries por request** (17 shell + 15-18 de módulos que re-fetchean, con `pg Pool max:1` que serializa) **y es dinámico** (ver 1.1) → ese es el origen del LCP 3.78s. `/agency/[slug]` es el contraejemplo sano (ISR real).
- Quedan `<img>` raw graves: `ProfileTacticsModule` renderiza `modelUrl1/2` (segundo cutout PNG full-size) sin next/image.
- `next.config.ts`: `remotePatterns *.supabase.co` (cubre dev y prod), AVIF/WebP, TTL 7d, `serverActions.bodySizeLimit 10mb` (los cutouts ya están contemplados).

### 1.8 Onboarding actual

- Chooser `/onboarding/start`: cards Player → `/pricing?audience=player`, Agencia → `/pricing?audience=agency`, y **un card "Soy DT / Scout / Dirigente" deshabilitado con "Próximamente"** (post-#206: `start/page.tsx:208-215`, keys `onboarding.start.chooser.staff.*`) — el placeholder exacto donde se enchufa coach. Shortcut por sub activa: `pro-player`→apply, `pro-agency`→manager/info (líneas 59-64).
- Wizard player: 3 steps client (`ApplyFlow.tsx` + Step1/2/3) → POST Bearer a `api/onboarding/submit` → `player_applications` pending + `career_item_proposals` + `audit_logs`. KYC client-side al bucket `kyc` (`KycUploader.tsx`, reutilizable tal cual, namespace `onboarding.kyc.*`).
- ⚠️ `pricing/page.tsx:40` fuerza `audience` a binario: `sp.audience === "agency" ? "agency" : "player"` → `?audience=coach` caería a player sin extensión.

### 1.9 Deudas/bugs preexistentes detectados (NO bloquean coach, pero informan decisiones)

| # | Hallazgo | Path | Relación con coach |
|---|---|---|---|
| B1 | Agency `[slug]` NO filtra `is_approved` en metadata/render (una agencia no aprobada renderiza e indexa) | `(public)/agency/[slug]/page.tsx:58-61,120-124` | coach usa el gate del player (404 duro) |
| B2 | 2 policies de agencia con tautología `up.agency_id = up.agency_id` | `agency_profile_translations_cud`, `agency_team_relation_submissions_manage_manager` (vivas en dev) | no replicar el patrón; comparar contra la columna de la tabla |
| B3 | `approveManagerApplication` sin check de rol admin en la action | `src/app/actions/manager-applications.ts:52-58` | coach estandariza guard `isAdmin` en TODAS las actions |
| B4 | `player_profiles.slug` SIN UNIQUE en DB (unicidad solo por código); `agency_profiles.slug` SÍ | catálogo dev | `coach_profiles.slug` nace UNIQUE |
| B5 | `current_snapshot` jamás renderizado (no hay diff revisor) | `admin/revisions/CareerRevisionPanel.tsx` | coach construye el diff (§5.3); reusable para player después |
| B6 | Reject de application sin motivo (`rejection_reason` no existe) pese a que el template de notificación ya lo renderiza | `api/admin/applications/[id]/reject/route.ts:30-38` | `coach_applications` nace con `rejection_reason` |
| B7 | `/[slug]` dinámico (mata ISR): `await searchParams` + cookies en Contact | `page.tsx:283`, `ContactPortfolioModule.tsx:75-80` | coach evita ambos (§3.4) |
| B8 | Drift Drizzle: `player_honour_translations` en dev/prod + TS pero fuera de snapshots/journal | `src/db/migrations/meta/` | **bloquea el `db:generate` del coach pack** — PR-0 (§2.6) |
| B9 | `0002a_auth_user_profile_trigger.sql` no existe en el repo (solo en supabase_migrations de dev; SQL recuperado en el research) | `src/db/migrations/` | re-versionar en PR-0 |
| B10 | `unaccent` NO instalada en dev → `slugify()` SQL falla en dev | pg_extension dev | el RPC coach genera slug con regexp inline (como el `approve_player_application` vivo, que NO usa slugify); fix de unaccent opcional |
| B11 | `docs/db/migration-workflow.md:55,391` cita el dev ref viejo `avhctddkbcneugtqqxxk` (el real: `ciolizjshimyvyonlssq`) | doc | corregir en PR-0 |
| B12 | Las RLS policies vivas del core player (`*_select_public`/`*_manage_owner`) no tienen .sql vigente en el repo (solo dentro del restore_from_prod) | pg_policies dev | el complementario coach las escribe desde las definiciones extraídas (este doc §2.4), NO desde `src/db/schema.sql` (stale, nombres viejos) |
| B13 | `player_dashboard_publishing_state` NO existe en dev — el código vive del fallback PGRST205 | `src/lib/dashboard/client/publishing-state.ts` | coach NO crea view de publishing: va directo a base tables (el fallback es el camino real) |
| B14 | Módulo notifications 100% es-hardcoded sin next-intl + CTA con anchor sin prefijo de locale | `src/modules/notifications/` | coach lo hereda; fix i18n aparte |

---

## §2 Modelo de datos propuesto

### 2.1 Decisiones de espejo (patrón de la casa: mirror por vertical, NO polimórfico)

- **Prefijo `coach_`** para todo. Se reusan SIN cambios: `user_profiles` (role `'coach'` ya existe), `subscriptions`/`checkout_sessions`/`payment_events`/`billing_addresses` (per-user), `teams`/`divisions`/`countries` (catálogo compartido — los teams propuestos por coaches siguen el mismo `teams.status='pending'`), `audit_logs`.
- **Enums**: se reusa `player_status` (`draft|pending_review|approved|rejected`) para `coach_profiles.status` — nombre engañoso pero semántica idéntica y cero DDL (renombrar o duplicar no aporta; documentado). `review_status` (`pending|approved|rejected`) para media/licencias. `visibility`, `plan`, `media_type` se reusan.
- **Estados por registro — cómo se satisface el requerimiento**:
  - *Perfil*: `coach_profiles.status` (enum) + `visibility` — gate de página completa (404 si no approved+public).
  - *Trayectoria*: *modelo envelope* (idéntico a player): la tabla live `coach_career_items` ES por definición "lo aprobado"; las propuestas viven en `coach_career_revision_*` con su request `pending|approved|rejected|cancelled` + `reviewed_by/at` + `resolution_note`. El público/sitemap/JSON-LD leen SOLO la tabla live → "el portfolio sigue mostrando la última versión aprobada" sale gratis del modelo, sin filtrar por estado en cada query pública.
  - *Multimedia y licencias*: estado **en la fila** (`status review_status DEFAULT 'pending'` + `reviewed_by`, `reviewed_at`, `rejection_reason`) — **divergencia deliberada vs player** (que publica primero): coach pre-modera.
- Sin tabla `stats_seasons` espejo en v1 (no hay equivalente DT con fuente de datos; ver §9-D6).

### 2.2 Tablas nuevas (spec a nivel columna; convención de nombres = la observada en dev)

**`coach_profiles`** (espejo de `player_profiles`, `src/db/schema/players.ts` como referencia):

```
id uuid PK defaultRandom
user_id uuid NOT NULL  → UNIQUE + FK auth.users ON DELETE CASCADE (FK en complementario; Drizzle no expresa auth.users)
slug text NOT NULL UNIQUE            ← mejora vs player (B4)
full_name text NOT NULL
birth_date date
nationality text[] / nationality_codes char(2)[]
role_title text                      ← cargo actual ("Director Técnico", "Asistente", "DT de juveniles"…) — taxonomía en código
coaching_since int                   ← año de inicio de carrera (citabilidad: "dirige desde {año}")
current_team_id uuid FK teams SET NULL / current_club text (legacy display)
agency_id uuid FK agency_profiles SET NULL   ← un DT puede ser representado
bio text ᵗ / career_objectives text ᵗ
playing_style text ᵗ                 ← "ideas de juego" (long text)
preferred_formations text[]          ← módulos/formaciones ("4-3-3", "3-5-2"…)
methodology_analysis text ᵗ / analysis_author text ᵗ   ← análisis editorial Pro (espejo de los 4 análisis de scouting, reducido a 1-2 campos)
plan_public plan NOT NULL DEFAULT 'free'
avatar_url text NOT NULL DEFAULT '/images/coach-default.jpg'
hero_url text / model_url_1 text     ← assets Pro (cutout)
transfermarkt_url text
visibility visibility NOT NULL DEFAULT 'public'
status player_status NOT NULL DEFAULT 'draft'
created_at / updated_at
```
(ᵗ = traducible → va al espejo en `coach_profile_translations`.) Se OMITEN de player: `foot`, `positions`, `height_cm`, `weight_kg`, `market_value_eur`, `besoccer_url`, los 4 análisis de scouting (reemplazados por `playing_style`/`methodology_analysis`).

**`coach_applications`** (espejo `player_applications` + fix B6):
`id, user_id NOT NULL (FK auth.users CASCADE), plan_requested plan DEFAULT 'free', full_name, birth_date, nationality text[], role_title, current_team_id FK teams SET NULL / proposed_team_* (name, country, country_code char(2), category, transfermarkt_url), transfermarkt_url, external_profile_url, id_doc_url, selfie_url (bucket kyc), notes, licenses_draft jsonb ('[{title, issuer, year}]' declaradas en el apply, se materializan al aprobar), status text DEFAULT 'pending', reviewed_by_user_id, reviewed_at, rejection_reason text ← NUEVA, free_agent bool DEFAULT false, created_at/updated_at`

**Trayectoria** (espejo exacto del juego player; mismo shape para que la UI portada funcione):
- `coach_career_items`: `id, coach_id FK coach_profiles CASCADE, team_id FK teams SET NULL, club text NOT NULL, role_title text ← NUEVA (cargo en esa etapa), division text / division_id FK divisions SET NULL / secondary_division(+_id), start_date date, end_date date, created_at/updated_at`
- `coach_career_item_proposals` (onboarding): espejo de `career_item_proposals` con `application_id FK coach_applications CASCADE` + `role_title`.
- `coach_career_revision_requests`: `id, coach_id FK CASCADE, status text DEFAULT 'pending' (pending|approved|rejected|cancelled a nivel código, paridad con player), submitted_by_user_id FK auth.users CASCADE, submitted_at, reviewed_by_user_id FK SET NULL, reviewed_at, resolution_note, change_summary, current_snapshot jsonb NOT NULL DEFAULT '[]', created_at/updated_at` — shape del snapshot: `[{id, club, role_title, team_id, division, start_date, end_date}]`.
- `coach_career_revision_items`: espejo (`request_id FK CASCADE, original_item_id FK coach_career_items SET NULL, club NOT NULL, role_title, division(+ids), start_year, end_year, team_id FK teams SET NULL, proposed_team_id FK coach_career_revision_proposed_teams SET NULL, order_index int DEFAULT 0, metadata jsonb`).
- `coach_career_revision_proposed_teams`: espejo (ojo: Postgres trunca el nombre del FK a 63 chars, precedente real en dev).

**`coach_honours`** (palmarés, "mismo modelo que players" = CRUD directo del owner, sin moderación):
`id, coach_id FK CASCADE, title NOT NULL, competition, season, awarded_on date, description ᵗ, career_item_id FK coach_career_items SET NULL, created_at/updated_at` + `coach_honour_translations` (PK `(honour_id, locale)`, CHECK locale, `title/competition/description`).

**`coach_licenses`** (NUEVA — credenciales verificadas, pre-moderadas):
`id, coach_id FK CASCADE, title text NOT NULL ("UEFA Pro"), issuer text ("UEFA"), awarded_year int, expires_year int NULL, doc_url text NULL (bucket kyc — privado, lo ve solo owner/admin), status review_status NOT NULL DEFAULT 'pending', reviewed_by_user_id FK auth.users SET NULL, reviewed_at, rejection_reason text, created_at/updated_at`
→ El público y el JSON-LD (`hasCredential`) leen SOLO `status='approved'`.

**`coach_media`** (espejo `player_media` con pre-moderación):
`id, coach_id FK CASCADE, type media_type NOT NULL, url NOT NULL, title, alt_text, tags text[], provider, season_year int, position int DEFAULT 0, is_primary bool DEFAULT false, status review_status NOT NULL DEFAULT 'pending' ← reemplaza is_approved/is_flagged, reviewed_by_user_id FK auth.users SET NULL, reviewed_at, rejection_reason text, created_at`
→ Filtro público: `status='approved'`. El avatar es la excepción práctica: se auto-aprueba al subirse durante onboarding aprobado (ver §5.4).

**Publicación/tema** (espejo de `profilePublishing.ts` / `agencyPublishing.ts`):
- `coach_theme_settings`: PK `coach_id` FK CASCADE; `layout text DEFAULT 'classic'`, 4 colores, `typography`, `cover_mode`, timestamps.
- `coach_sections_visibility`: `id, coach_id FK CASCADE, section text NOT NULL, visible bool DEFAULT true, settings jsonb` + **UNIQUE(coach_id, section)** (mejora: player no lo tiene y permite dups).
- `coach_links`: espejo `player_links`. — `coach_articles` (prensa/"notas"): espejo `player_articles`.
- `coach_personal_details`: espejo reducido (`document_*`, `languages text[]`, `phone`, `whatsapp`, `residence_*`, `show_contact_section bool DEFAULT false`) + UNIQUE(coach_id).

**i18n**: `coach_profile_translations` — PK `(coach_id, locale)`, CHECK `locale IN ('es','en','it','pt')` (text+CHECK, NO enum — patrón Tipo C), FK CASCADE; campos: `bio, career_objectives, playing_style, methodology_analysis, analysis_author` (espejo de los ᵗ). + `coach_honour_translations` (arriba). + `coach_ai_translation_events` (espejo de `ai_translation_events`: `coach_id FK CASCADE, locale CHECK, block, kind CHECK initial|regen, source_hash, created_at` + índice quota) — mirror en vez de tocar la tabla player (cero riesgo).

**Leads/analytics**: `coach_portfolio_leads` + `coach_contact_clicks` — espejos mínimos (las tablas player tienen FK `player_id` NOT NULL y son service-role-only; mirror es lo consistente con la casa). + `coach_change_logs` (espejo `profile_change_logs`).

**Compartidas que SÍ se tocan**:
- `user_tutorial_progress`: swap del CHECK `audience IN ('player','agency')` → `('player','agency','coach')` (constraint vivo `user_tutorial_progress_audience_check`; la tabla NO nació de Drizzle → va en complementario).

### 2.3 RLS (en complementario `NNNNa`, patrón `0009a_translations_rls.sql` — las policies vivas extraídas de pg_policies dev son la referencia, NO `src/db/schema.sql` que está stale)

- `coach_profiles`: `coach_profiles_select_public` ({public}, SELECT): `(status='approved' AND visibility='public') OR user_id=auth.uid() OR is_admin(auth.uid())`; `insert_self` (CHECK owner-or-admin); `update_own`; `delete_admin`.
- Hijas con gate por padre publicado (`coach_career_items`, `coach_honours`, `coach_links`, `coach_articles`, `coach_theme_settings`, `coach_sections_visibility`): `*_select_public` vía `EXISTS coach_profiles (approved+public OR owner OR admin)` + `*_manage_owner` (ALL, owner-or-admin).
- `coach_media`: SELECT público = `status='approved' OR owner OR admin` (por fila, como `player_media` pero con enum); manage owner-or-admin. **Límite por plan**: función `coach_can_add_media(p_user_id, p_coach_id, p_type)` espejo de `can_add_media` en policy de INSERT.
- `coach_licenses`: SELECT público = `status='approved' OR owner OR admin`; **`doc_url` nunca se expone en superficies públicas** (la columna existe pero las queries públicas no la seleccionan; el archivo vive en bucket privado).
- `coach_personal_details`: SIN select público (solo owner/admin) — datos privados.
- Moderación: `coach_applications` (select/update own-or-admin, insert self, delete admin); `coach_career_revision_requests` (insert self+owner-del-coach, select own/admin, update/delete owner-or-admin); items/proposed_teams: ALL vía EXISTS al request (submitted_by OR admin).
- Translations: `_read` = padre approved+public OR owner OR admin; `_cud` = owner OR admin (== patrón 0009a). `coach_ai_translation_events`: solo owner.
- `coach_portfolio_leads` / `coach_contact_clicks`: RLS enabled SIN policies (service-role only, patrón existente).
- GRANTs explícitos por tabla (authenticated CRUD, anon SELECT; eventos AI sin anon) — patrón 0009a; los DEFAULT PRIVILEGES de dev ya cubren, pero se emiten igual por prolijidad.

### 2.4 Storage

- **Bucket nuevo `coach-media`** (público, 5MB, `[jpeg,png,webp,avif]`), creado con el patrón `0006c_blog_media_bucket.sql` (INSERT ON CONFLICT DO UPDATE + 4 policies con DROP IF EXISTS). **Mejora vs `player-media`** (que permite a cualquier authenticated escribir lo que sea): policies scoped por carpeta `(storage.foldername(name))[1] = auth.uid()::text`. Paths: `gallery/{userId}/{uuid}.avif`, `avatars/{coachId}.jpg`, `gallery/{userId}/hero-...`.
- **KYC + docs de licencias** → bucket privado **`kyc`** existente (`{userId}/id-…`, `{userId}/selfie-…`, `{userId}/license-…` — el flujo manager ya usa exactamente ese tercer key); el admin los ve con `createSignedUrl` 24h (patrón `admin/applications/page.tsx`).

### 2.5 Funciones SQL y view (complementario; los cuerpos canónicos = los VIVOS extraídos de dev, no el dump)

- **`approve_coach_application(p_id uuid) RETURNS jsonb`** — espejo del `approve_player_application` VIVO: `SECURITY DEFINER SET search_path='public'`; guard `is_admin(auth.uid())`; **idempotencia** por `coach_profiles.user_id`; slug con `lower(regexp_replace(full_name,'[^a-z0-9]+','-','g'))` + left 60 + loop `-2..-999` (sin `slugify()`/unaccent → inmune a B10); INSERT `coach_profiles (status='approved', visibility='public')`; rol `user_profiles.role='coach'` SOLO si rol actual = 'member' (en el route handler, como player); NO toca subscriptions (las maneja webhook/comp-grants). + Materializa `licenses_draft` → filas `coach_licenses` `status='approved'` (el admin las revisó junto con la application).
- **`materialize_coach_career_from_application(p_application_id)`** — espejo del canon `0004a` (incluye division_ids) sobre `coach_career_item_proposals` → `coach_career_items`, resolviendo teams (`team_id` → `requested_from_*` → match por nombre approved>pending) y `make_date(start_year,1,1)/(end_year,12,31)`.
- **`coach_can_add_media` / `coach_max_media_allowed` / `get_limits_for_coach`** — espejos de las funciones de límites (toman `p_coach_id`, joinean `subscriptions` vía user del coach, leen `limits_json`).
- **View `coach_dashboard_state`** — espejo de `player_dashboard_state` (canon `0002b`): `auth.users LEFT JOIN coach_profiles + coach_personal_details + LATERAL última coach_application + subscriptions + LATERAL foto primaria approved`, **con `WHERE u.id = auth.uid()`** y sin security_invoker; GRANT SELECT a authenticated+service_role. Exponer `application_rejection_reason` (para el toast con motivo). **NO se crea view de publishing** (B13): el fetch de publishing del coach va directo a base tables (lo que hoy es "el fallback" es el camino).

### 2.6 Plan de migración versionada (dev → prod) — workflow `docs/db/migration-workflow.md`

**PR-0 (pre-requisito, chico, primero):**
1. **Resolver B8** (drift `player_honour_translations`): correr `npm run db:generate` para que Drizzle emita la migración `0010_*` que crea la tabla (ya está en `translations.ts`); **NO ejecutarla** contra dev/prod (la tabla ya existe en ambos): registrar el hash a mano en `drizzle.__drizzle_migrations` de dev y prod (técnica documentada y ya usada: entry `0003_register_drizzle_hash` en prod). Requiere verificación de que el SQL generado matchea la tabla viva (nombres de PK/FK difieren — vivos son default `_pkey/_fkey` — pero Drizzle solo valida hash, no introspección; documentar la diferencia en el header).
2. Re-versionar **B9**: crear `src/db/migrations/0002a_auth_user_profile_trigger.sql` con el SQL recuperado de supabase_migrations (solo commit al repo; ya aplicado en dev/prod — header "already applied").
3. Corregir **B11** (refs del doc) y, opcional, instalar `unaccent` en dev (B10).

**PR-1 (coach pack DB):**
1. Editar `src/db/schema/` (nuevos archivos: `coaches.ts`, `coachApplications.ts`, `coachCareer.ts`, `coachCareerRevisions.ts`, `coachMedia.ts`, `coachPublishing.ts`, `coachLicenses.ts`, `coachTranslations.ts`, `coachLeads.ts` + extender `relations.ts` e `index.ts`). `npm run db:generate` → **`0011_<generado>.sql`** (revisar el SQL: si emite DROPs por desync, NO aplicar — regla de oro #1).
2. **`0011a_coach_rls_and_infra.sql`** (complementario manual NO tracked, header obligatorio estilo 0009a): ENABLE RLS + policies (§2.3) + triggers `set_updated_at` + GRANTs + **FKs a `auth.users`** (Drizzle no los expresa — precedente verificado: ningún schema TS referencia auth.users) + UNIQUEs + bucket `coach-media` + storage policies + funciones §2.5 + view + **swap del CHECK de `user_tutorial_progress.audience`** (DROP CONSTRAINT + ADD con 'coach' — es un swap no destructivo de CHECK, mismo patrón que el CHECK de locale).
3. Aplicar **a dev primero** (`db:migrate` con DATABASE_URL del pooler dev para 0011; MCP `apply_migration` contra `ciolizjshimyvyonlssq` para 0011a). Smoke en Vercel preview (preview apunta a Supabase dev).
4. **Prod SOLO con OK explícito del owner** al mergear: aplicar 0011 + 0011a a `erdvpcfjynkhcrqktozd`, registrar el hash de 0011 en `drizzle.__drizzle_migrations` de prod, verificación de counts dev↔prod (§6 del workflow).
5. Nunca tocar `src/db/migrations/meta/` a mano; nada destructivo (el único swap de CHECK es expand-compatible).

---

## §3 Arquitectura de rutas y componentes

### 3.1 Qué se reutiliza TAL CUAL (cero cambios)
`SmoothScrollProvider` (Lenis), `ScrollMeasurementSync`, `PortfolioLocaleSwitcher`/`HeaderLocaleSwitcher`, `GlassCard`, `CountUp` (ui — con la salvedad GEO §4.6), `CountryFlag`, `ZoomLock`, `directoryJsonLd.tsx`, `hreflang.ts`, `baseUrl.ts`, `i18n/config.ts`, `KycUploader`, `AdminInboxLayout`, módulo `src/modules/notifications/` completo, patrón CSS vars de theming, `TeamPickerCombo`/`CareerEditor` (el editor de etapas sirve para DT con el agregado del campo cargo).

### 3.2 Qué se EXTIENDE (union/branch nuevo, archivos existentes)
| Archivo | Cambio |
|---|---|
| `src/lib/dashboard/plan-access.ts` | `PlanAudience = 'player'\|'agency'\|'coach'`; `hasPlanIdProTier` += `'pro-coach'`; `buildUpgradeUrl` |
| `src/lib/seo/indexable-profiles.ts` | `resolveProUserIds` += `'pro-coach'`; `getIndexableCoaches()` + `isCoachIndexable` (mismo umbral bio≥100) |
| `src/lib/seo/revalidate.ts` | `revalidateCoachPublicProfile(slug)` → `/coach/${slug}` + `/sitemap.xml` + `/llms.txt` (+ `/coaches` si hay hub) |
| `src/app/sitemap.ts` / `src/app/llms.txt/route.ts` | sección coaches (§4.3/§4.5) |
| `src/components/layout/footer/PortfolioFooter.tsx` | `ownerKind: 'player'\|'agency'\|'coach'` |
| `src/lib/admin/counters.ts` | counts coach (applications, revisions, media, licenses pendientes) |
| `(dashboard)/dashboard/layout.tsx` + `navigation.ts` | `audience` ternaria + `COACH_NAVIGATION` + bootstrap de notificaciones coach |
| `src/lib/dashboard/feature-gates.ts` | gates con `audience:'coach'` |
| Billing (~22 puntos) | §6.2 |
| `src/i18n/request.ts` + messages | namespace nuevo `coach.json` ×4 + keys en `onboarding/checkout/pricing/portfolio` (§7) |

### 3.3 Qué se CREA (espejo player, en `(public)/coach/[slug]/`)

```
src/app/[locale]/(public)/coach/[slug]/
  page.tsx                  ← generateMetadata + generateViewport + render (modelo player, dieta de queries §3.4)
  opengraph-image.tsx       ← espejo nodejs/1200×630 (Pro card / Free brand-only)
  components/
    CoachLayoutResolver.tsx
    ProCoachLayout.tsx      ← hero cutout (heroUrl gate + CTA), marquee, parallax — espejo ProAthleteLayout
    CoachHeader.tsx         ← nav pill scroll-spy (secciones coach)
    free/CoachFreeLayout.tsx ← dossier editorial espejo FreeLayout (ProSpot/viewer-identity reusados)
    modules/
      CoachBioModule        ← bio + vitales DT (edad, nacionalidad, cargo, club actual, "dirige desde {año}")
      CoachMethodologyModule ← ideas de juego + formaciones preferidas (pizarra SVG con la formación — texto SIEMPRE en HTML)
      CoachCareerTimelineModule ← trayectoria (cargo + club + años + división) + palmarés por etapa
      CoachLicensesModule   ← licencias aprobadas ("Posee licencia UEFA Pro desde {año}")
      CoachPressNotesModule ← notas (coach_articles, layouts newspaper|cards)
      CoachGalleryModule    ← galería status='approved'
      CoachContactModule    ← contacto con unlock CLIENT-SIDE (§3.4)
```
- **Los módulos coach implementan el gating REAL de `coach_sections_visibility`** (patrón agency: `sections.find → return null`), no el decorativo del player.
- Onboarding: `(onboarding)/onboarding/coach/apply/` (wizard 3 pasos espejo player: Datos+cargo / Trayectoria+licencias / KYC+términos) + `api/onboarding/coach/submit`. El card del chooser en `start/page.tsx:208-215` pasa de div muerto a `<Link>` (decisión de destino en §9-D3).
- Dashboard: `dashboard/edit-profile/*` ramas coach (datos personales, trayectoria con revisiones, licencias, multimedia, traducciones) + `dashboard/edit-template` coach. Server actions espejo con `ensureAuthenticatedCoach` + gates Pro **server-side en TODAS** (incluye pro-assets, cerrando el gap del player que solo gatea en UI).
- Admin: §5.

### 3.4 Contrato de performance de `/coach/[slug]` (presupuesto: ISR REAL + ≤12 queries)

1. **Sin `await searchParams` incondicional**: el override dev se lee solo si `process.env.NODE_ENV !== 'production'` ANTES del await (en prod el código no toca la API dinámica → ISR se mantiene).
2. **Contact sin `cookies()`/`auth.getUser()` server-side**: el unlock (cookie `bh_lead_unlocked` / sesión) se resuelve client-side (mismo truco de `viewer-identity.ts` que ya existe para los ProSpot del Free) — el módulo SSR-renderiza el estado locked y el cliente desbloquea.
3. **Una sola pasada de fetching**: `page.tsx` carga todo con `Promise.all` y los módulos reciben props (NO re-fetchean — se elimina la duplicación 3× de `playerProfiles` del patrón player; el streaming con Suspense se conserva para los módulos pesados pasándoles promises). Helpers i18n envueltos en `react.cache`.
4. **Imágenes**: TODO por `next/image` (cutout patrón PR #186 con `priority` + sizes; galería `fill` lazy; cero `<img>` raw de assets Supabase — el anti-ejemplo es `modelUrl1/2` del TacticsModule).
5. Animaciones pesadas con `dynamic ssr:false` + gates de IntersectionObserver para cualquier video (patrón VideoWall, no DashJourney).
6. Al guardar desde dashboard/admin: `revalidateCoachPublicProfile(slug)` SIEMPRE (incluida la aprobación de revisiones — cerrando el gap del player donde el approve de career no revalida el slug).

### 3.5 APIs nuevas
`api/portfolio/coach/[slug]/contact-click` y `/lead` (espejo player sobre `coach_contact_clicks`/`coach_portfolio_leads` + upsert marketing + `sendLeadWelcomeEmail`), `api/coach-media/upload|[id]|reorder` (espejo media con transcode AVIF/sharp, cap por plan vía `limits_json`, **`status:'pending'`** al insertar), `api/admin/coach-*` (§5).

---

## §4 Plan SEO + GEO

### 4.1 `generateMetadata` (`/coach/[slug]`, por locale)
Espejo del player con:
- Title: `{fullName} — {roleTitle localizado} · {currentClub}` (ej. "Carlos Pérez — Director Técnico · Club Atlético X"). Description: bio localizada 158 chars o fallback compuesto con cargo+club+licencia principal.
- `alternates` = `conditionalAlternates(locale, '/coach/'+slug, availableLocales)` (canonical self-referente; hreflang SOLO de locales con fila en `coach_profile_translations`; `x-default`→es).
- OG `type:'profile'`, `siteName "'BallersHub"`, image = avatar (+ `opengraph-image.tsx` file-convention como en player); twitter `summary_large_image`.
- `generateViewport` con theme-color del `coach_theme_settings` (react.cache).

### 4.2 Matriz estado → robots (idéntica a player, sin el gap B1 de agency)

| Estado | Render | Meta robots | Sitemap/llms | JSON-LD |
|---|---|---|---|---|
| `draft` / `pending_review` / `rejected` / `visibility='private'` | **404 duro** (notFound) | `noindex,nofollow` en el branch not-found | excluido | no se emite |
| `approved+public` Pro | render Pro | index,follow | ✅ priority 0.9 | @graph completo |
| `approved+public` Free, bio ≥ 100 | render Free | index,follow | ✅ priority 0.6 | Person mínimo |
| `approved+public` Free, bio < 100 | render Free | **soft-noindex** `{index:false, follow:true}` | excluido (mismo predicado) | Person mínimo |
| Locale sin traducción | `redirect('/coach/'+slug)` | noindex (cinturón pre-redirect) | sin alternate de ese locale | — |
| `?force_free=1` | solo dev (NODE_ENV) | sin efecto en metadata (no lee searchParams) | — | — |
| Contenido por pieza | galería/licencias: SOLO `status='approved'`; trayectoria: SOLO tabla live | — | — | SOLO approved (regla transversal) |

### 4.3 JSON-LD (`src/lib/seo/coachJsonLd.tsx`, espejo tier-gated de `personJsonLd.tsx`)

- **Free**: nodo `Person` único — `@id ${canonical}#person`, `name`, `url`, `image` (solo avatar real), **`jobTitle` localizado** (`{es:"Director Técnico", en:"Football Manager", it:"Allenatore", pt:"Treinador de Futebol"}` — ajustable a `role_title`), `birthDate`, `nationality` (Country + ISO), `description` (bio localizada), `knowsAbout` = formaciones + ideas de juego (["4-3-3", "Juego de posición", …] localizables).
- **Pro**: `@graph` = [
  - `Person` (todo lo de Free + `sameAs` con transfermarkt + **redes de `coach_links`** — cerrando el gap del player que nunca conecta sus links al schema + author-hub si bloguea via `cross-ref` extendido, + altura de entidad: `worksFor` → `#current-team`),
  - **`hasCredential` → `EducationalOccupationalCredential[]`** por cada licencia `approved`: `{ @type, name: "UEFA Pro Licence", credentialCategory: "license", recognizedBy: {@type:"Organization", name: issuer}, dateCreated: awarded_year }`,
  - **`award`**: títulos del palmarés (strings de `coach_honours`),
  - `SportsTeam` `#current-team` (club actual; Schema.org tiene la propiedad inversa `coach` en SportsTeam — se emite `coach: {@id #person}` en el nodo del team, hoy sin usar en el sitio),
  - `alumniOf`/`memberOf` NO se fuerzan; la trayectoria pasada se modela como `worksFor` previo no estándar → se omite del graph y queda como texto citables (más seguro para Rich Results),
  - `SportsOrganization` (agencia que lo representa, si tiene, cross-ref `@id /agency/<slug>#organization`),
  - `BreadcrumbList` (`Inicio → Entrenadores → {nombre}`, labels localizados) — también en Free si se decide paridad exacta con player (player Free no lo emite; recomendación: emitirlo en ambos tiers de coach, costo cero).
  ]
- `mainEntityOfPage` WebPage con `inLanguage` por locale. Validar con Rich Results Test antes del merge (criterio de done de la fase 4).

### 4.4 Sitemap + hreflang
Sección nueva en `src/app/sitemap.ts`: `getIndexableCoaches()` → entries `/coach/{slug}` con `lastModified: updatedAt`, `changeFrequency: 'weekly'`, `priority: isPro ? 0.9 : 0.6`, `alternates.languages` vía `conditionalSitemapLanguages` (bulk `getTranslatedCoachLocalesBySlug`, 1 query). Solo `status='approved' AND visibility='public'` + predicado thin-Free. Hub `/coaches` como entry estática cuando exista (fase posterior).

### 4.5 GEO / AI search
- **robots.txt**: la política vigente (allow-all + 7 disallows) ya permite TODOS los bots de IA (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, Bingbot) vía `userAgent:"*"` — es política deliberada documentada en `docs/seo/geo-ai-audit-spec.md`. **Propuesta**: mantenerla y NO agregar reglas por bot (regla explícita = misma semántica + superficie de drift); `/coach/[slug]` queda cubierto sin tocar nada. Si el owner prefiere reglas explícitas por declaración de intención, es un bloque adicional inocuo (decisión §9-D11).
- **`llms.txt`**: sección `## Entrenadores` en `src/app/llms.txt/route.ts` con `getIndexableCoaches()` y **descripción rica por entrada**: `- [{nombre}](…/coach/{slug}): {role_title}{club ? " de "+club : ""}{licencia ? " — Licencia "+licencia : ""}` (mejora sobre la descripción genérica de players). `llms-full.txt` queda fuera de alcance (no existe hoy; backlog GEO).
- **Citabilidad passage-level (regla de diseño de los módulos coach)**: los datos clave SIEMPRE como texto HTML semántico en el SSR — pasajes auto-contenidos tipo *"{Nombre} dirigió a {Club} entre {año} y {año} ({división})"*, *"Posee la licencia UEFA Pro desde {año}"*, *"Su idea de juego se basa en {estilo}; formaciones preferidas: 4-3-3, 3-5-2"*. **Prohibido en datos load-bearing**: `CountUp` desde 0, `ScrambleText` (nbsp en SSR), contenido editorial solo dentro de accordions `{isOpen && }` — los 3 anti-patrones medidos en el portfolio player. Animar con CSS/initial-visible, no con estado React que vacíe el HTML.
- **Entidad/marca**: `'BallersHub` con apóstrofe en metadata/JSON-LD/copy del coach; `name`/`sameAs` consistentes entre HTML visible, metadata y JSON-LD.
- **Middleware**: nada que tocar (geo-redirect solo afecta `/`).

### 4.6 OG image + drift + admin/seo
- `opengraph-image.tsx` espejo (Pro: avatar + nombre + cargo + club + licencia badge; Free: brand-only con nombre).
- **SEO drift**: post-launch con el primer coach real en prod, agregar `/coach/<slug>` + re-capturar baseline (`scripts/seo/capture-baseline.cjs` const URLS + `npm` script).
- `/admin/seo`: incluir coaches Pro en el universo del KPI (espejo de `player-rank-tracking.ts` o parametrización) — fase de polish.

---

## §5 Plan de moderación / Admin

### 5.1 Colas nuevas en `/admin` (nav `admin/layout.tsx` NAV_SECTIONS + counters)

| Cola | Ruta | Contenido | Roles |
|---|---|---|---|
| Alta de coaches | `admin/coach-applications` | `coach_applications` pending (KYC firmado 24h, overrides del admin, licencias declaradas) | admin |
| Trayectoria de onboarding | `admin/coach-career` (o tab en la anterior) | `coach_career_item_proposals` por application | admin, analyst |
| Revisiones de trayectoria | `admin/coach-revisions` | `coach_career_revision_requests` + **diff** | admin, analyst (lectura), approve solo admin |
| Multimedia | `admin/coach-media` | `coach_media` `status='pending'` (cola REAL de pre-publicación, no reactiva) | admin, moderator* |
| Licencias | tab dentro de coach-revisions o cola propia | `coach_licenses` pending (con doc firmado) | admin |

(*) moderator: como `is_admin()` SQL no lo contempla (verificado), las mutaciones de moderación coach van SIEMPRE por **route handler server-side con `createSupabaseAdmin()`** (no el patrón client-side RLS de media-moderation) — así un moderator habilitado a nivel app puede operar sin tocar RLS. UI con `AdminInboxLayout` (tabs Pendientes/Historial).

### 5.2 Flujo de alta
1. Coach manda apply → `coach_applications` `pending` + `coach_career_item_proposals` + `audit_logs` (espejo de `api/onboarding/submit`). Dashboard muestra "Solicitud en revisión" (lock por `resolveDashboardAccess` espejo).
2. Admin aprueba → route `api/admin/coach-applications/[id]/approve`: overrides → RPC `approve_coach_application` (rol member→coach, perfil approved, slug, licencias) → `materialize_coach_career_from_application` → `revalidateCoachPublicProfile(slug)` + `revalidateAdminCounters()`.
3. Rechaza → `status='rejected'` + **`rejection_reason`** + cascada de proposals → el dashboard del coach lo ve vía `coach_dashboard_state.application_rejection_reason` → `NotificationBootstrap` dispara `onboarding.rejected` **con `moderatorMessage`** (el template ya lo renderiza, `messages.tsx:53-66`; solo hay que pasarle el dato + `retryHref:'/onboarding/coach/apply'`).

### 5.3 Ediciones de trayectoria (re-revisión) + DIFF
1. Coach edita en `dashboard/edit-profile/.../trayectoria` → `submitCoachCareerRevision` (espejo de `submitCareerRevision`): regla 1-pending, snapshot a `current_snapshot`, items con `original_item_id`, teams/divisiones propuestos `pending`. UI se lockea mientras pending; el público sigue viendo `coach_career_items` (la última versión aprobada) — **cero cambios en el render público**.
2. **`CoachRevisionDiff` (NUEVO — el deliverable que player nunca construyó)**: el panel del revisor computa, comparando `current_snapshot` vs items propuestos por `original_item_id`:
   - 🟢 **Agregada** (sin original_item_id) — card completa en verde.
   - 🟡 **Modificada** — por campo: `club: "X" → "Y"`, `start_year: 2019 → 2020` (solo los campos que cambian, lado a lado).
   - 🔴 **Eliminada** (id del snapshot ausente en la submission — el approve hace sync destructivo, el revisor TIENE que verlas).
   Componente genérico (`src/components/admin/RevisionDiff.tsx` parametrizado por shape) para poder adoptarlo en el panel player después (B5).
3. Approve/Reject = espejo de los handlers player (`update/insert/DELETE-sync` + materialización de teams + cierre de envelope con `resolution_note`) **+ `revalidateCoachPublicProfile`** (el player no lo hace — gap cerrado en coach) + counters. El coach puede **cancelar** su request pending (action `cancelCoachCareerRevision`, paridad con agency — player no la tiene).
4. Notificación: patrón `CareerManager` (enqueue client desde el snapshot server con eventId `coach.review.{approved|rejected}:${id}:${reviewedAt}` + `moderatorMessage: resolution_note` + `retryHref` coach).

### 5.4 Multimedia y licencias (pre-moderación)
- Upload → `coach_media.status='pending'` → **invisible en público** → cola admin → approve (`status='approved'` + `reviewed_by/at` + revalidate) o reject (`status='rejected'` + `rejection_reason` + cleanup del objeto en Storage si era upload propio). El owner ve sus pending/rejected en el dashboard con badge de estado (RLS owner ya lo permite).
- Excepción avatar: al aprobarse la application, el avatar subido en onboarding se marca `approved` (si no, el coach quedaría sin imagen); cambios posteriores de avatar → pending como el resto (el público mantiene el anterior aprobado hasta el approve — el `avatar_url` del perfil solo se pisa al aprobar).
- Licencias: mismo ciclo (`pending → approved/rejected` + motivo); editar una licencia aprobada la vuelve a `pending` (el público deja de mostrarla hasta re-aprobación — es una credencial, mejor ausente que sin verificar).
- Notificaciones in-app por cada resolución (templates `review.*` existentes con `topicLabel: "tu galería" / "tus licencias"`).

### 5.5 Reglas transversales
- **Solo `approved` se renderiza/indexa/inyecta en JSON-LD/expone a llms.txt** — implementado por construcción: queries públicas filtran por estado (media/licencias) o leen solo tablas live (trayectoria), y el predicado `getIndexableCoaches` alimenta sitemap+llms+robots-meta desde un único lugar.
- Guards estandarizados: toda action/route coach con check `role==='admin'` server-side (sin repetir B3), writes con service-role, RLS `is_admin()` defense-in-depth.
- Emails de resolución: fuera de alcance v1 (paridad con players, que tampoco los manda); queda wireado el punto de inserción y es backlog explícito (§9-D9).

---

## §6 Planes Free/Premium + checkout

### 6.1 Definición
- **`pro-coach`** se suma a `CheckoutPlanId`. Precio: **decisión del owner** (§9-D2; referencia: pro-player USD 85/año, pro-agency USD 169/año placeholder). Free coach = portfolio dossier indexable (con umbral bio), 1 idioma, sin cutout/scrolljack, caps de galería bajos.
- Pro coach (paridad player): template Pro (cutout + scrolljack), galería/videos ampliados (`limits_json`), licencias y palmarés destacados, traducciones hasta 4 locales + asistente IA, JSON-LD @graph + OG image rica, prioridad 0.9 en sitemap, indexable siempre.

### 6.2 Inventario de touch points (verificado con paths — la checklist de implementación)

1. `src/lib/billing/plans.ts:7,20-33,53-55` — union + `TABLE` precios + `isCheckoutPlanId`.
2. `src/lib/billing/createCheckout.ts:391-399` — `planLabel()`/`planDescription()`.
3. Env vars (accessors ya genéricos, `env.ts`): `STRIPE_PRICE_PRO_COACH_USD/EUR` + `MP_PLAN_PRO_COACH_ARS` (+ provisioning: Stripe MCP/dashboard + `scripts/provision-mp-plans.ts` array `PLANS`).
4. `src/components/site/pricing/data.ts` — `Audience` += coach, `PLAN_META` += `free-coach`/`pro-coach`, `PRO_COACH_PRICES`, accent propio; `messages/<locale>/pricing.json` `plans.{freeCoach,proCoach}` + `comparison.coach`.
5. `src/app/[locale]/(site)/pricing/page.tsx:40` — parser de `?audience=` ternario + `PricingContext`.
6. `src/components/site/checkout/data.ts:38` — `PLAN_COPY['pro-coach']`; `CheckoutOrderSummary.tsx:19-22` — `ROLE_BY_PLAN['pro-coach']`.
7. `checkout/success/page.tsx:222-300` — `resolveNextStep`: check temprano de perfil/application coach + branch `pro-coach` → `/onboarding/coach/apply`; ídem `src/lib/dashboard/onboarding-href.ts:24-25` y `onboarding/start/page.tsx:59-64`.
8. `src/lib/dashboard/plan-access.ts:19,90` — `PlanAudience` + `hasPlanIdProTier`.
9. `src/lib/billing/subscriptionSideEffects.ts:53-65` — rama coach: revalidar `/coach/${slug}` al cambiar tier.
10. `(dashboard)/dashboard/layout.tsx:113` + `settings/subscription/page.tsx:105-138` — audience ternaria + `PRO_COACH_FEATURES` (keys i18n).
11. `src/lib/resend.ts:251-360` — tipos de planId + labels en welcome/dunning; `handlers/stripe.ts:340-342` y `mercadopago.ts:460-462` — `normalizePlanId` (si no se extiende, **silencia los emails** del plan nuevo).
12. `src/app/actions/admin-comp-accounts.ts:53` — `planIdSchema` += `pro-coach` (+ UI CompAccountsClient) para regalar Pro coach.
13. `src/lib/seo/offerJsonLd.tsx` — Offers de pricing desde las tablas display.
14. `src/lib/seo/indexable-profiles.ts:113-115` — `resolveProUserIds`.
15. `src/lib/dashboard/feature-gates.ts` — gates audience coach.

### 6.3 Reglas
- `subscriptions` mantiene **UNIQUE(user_id)**: un user = un plan → un mismo user NO puede ser Pro player y Pro coach a la vez (cuenta separada si se da el caso). Recomendado mantener en v1 (§9-D4).
- Checkout Pro coach ANTES e independiente de la aprobación (paridad player); Free CTA va directo al apply.
- Límites por plan vía `subscriptions.limits_json` (mismo mecanismo `max_photos`/`max_videos`).

---

## §7 i18n de la vertical

- **Namespace nuevo** `src/i18n/messages/{es,en,it,pt}/coach.json` (portfolio público + dashboard coach) + keys en `onboarding.json` (`start.chooser.coach.*`, bloque `coachApply.*` hermano de `apply.*`), `pricing.json` (planes + comparison), `portfolio.json` (módulos coach si se comparte namespace). Registrar en `src/i18n/request.ts`. `npm run i18n:check` en verde (paridad ×4).
- **Contenido dinámico**: `coach_profile_translations` + read-layer espejo en `src/lib/i18n/profile-content.ts` (`getCoachTranslation`, `mergeCoachContent`, `getAvailableCoachLocales`, `getTranslatedCoachLocalesBySlug`) — fila = locale publicado/indexable; redirect si falta; Free=1 (excluido del editor) / Pro=4; asistente IA con `coach_ai_translation_events` (glosario: agregar términos DT — "Director Técnico|Manager/Head Coach|Allenatore|Treinador" — a `src/i18n/glossary.md` y `GLOSSARY` de `ai-translate.ts`).
- Taxonomías localizadas en código: `COACH_ROLE_LABELS` (cargo ×4 locales — espejo de `positions.ts`) para title/jobTitle/knowsAbout.
- **IMPORTANTE**: la implementación parte de `origin/main` actualizado (PR #206 ya tradujo onboarding/checkout y agregó los namespaces; este worktree NO los tiene).

---

## §8 Roadmap por fases (PRs)

> Convención: una fase = un PR bundleado (preferencia del owner para trabajo acoplado). Siempre `dev` primero; prod con OK explícito. Branch base: `main` actualizado (post-#206).

| PR | Contenido | Depende de | DB |
|---|---|---|---|
| **PR-0** `chore/db-drift-coach-prereqs` | B8 (hash-register `player_honour_translations` como 0010), B9 (re-versionar 0002a), B11 (refs del doc), opc. unaccent dev | — | registro de hash dev+prod (sin DDL) |
| **PR-1** `feat/coach-db` | Schema TS coach completo + `0011` Drizzle + `0011a` complementario (RLS/buckets/RPCs/view/CHECK swap) + types + relations. Aplicado a dev; smoke en preview | PR-0 | **0011 + 0011a → dev**; prod al aprobar |
| **PR-2** `feat/coach-onboarding-admin` | Wizard `/onboarding/coach/apply` + `api/onboarding/coach/submit` + chooser card activo + colas `admin/coach-applications`/`coach-career` + approve/reject (RPCs) + rejection_reason e2e + notificaciones + counters + i18n onboarding keys | PR-1 | — |
| **PR-3** `feat/coach-portfolio-seo` | `/coach/[slug]` Free+Pro (ISR real, contrato §3.4) + `coachJsonLd` + `opengraph-image` + sitemap + llms.txt + `indexable-profiles` + `revalidate` + hreflang + lead/contact APIs + namespace `coach.json` | PR-1 (datos), PR-2 (para tener coaches aprobados) | — |
| **PR-4** `feat/coach-editing-moderation` | Dashboard coach (edit-profile completo: datos/trayectoria/licencias/multimedia/translations/edit-template) + `submitCoachCareerRevision` + colas `admin/coach-revisions` (con **RevisionDiff**) y `admin/coach-media` + pre-moderación media/licencias + notificaciones + gates Pro server-side | PR-2, PR-3 | — |
| **PR-5** `feat/coach-billing` | `pro-coach` end-to-end (§6.2 completo) + pricing page coach + provisioning Stripe/MP + env vars + comp-accounts + emails billing | PR-2 (onboarding destino) | — |
| **PR-6** `polish/coach-geo-drift` | Drift baseline con coach real, admin/seo rank-tracking coach, hub `/coaches` (directorio marketing + DirectoryJsonLd), llms descripciones ricas retro-fit players, fixes B1/B2/B5-player si se aprueban | PR-3 en prod | — |

Orden de valor: con PR-1..3 ya hay coaches Free públicos e indexables (alta vía admin); PR-4 habilita self-service con moderación total; PR-5 monetiza. Criterios de done por PR: typecheck+lint+`i18n:check`, smoke en preview (apunta a Supabase dev), Rich Results Test (PR-3), counts dev↔prod tras cada apply (PR-1).

---

## §9 Riesgos y decisiones abiertas (para aprobar ANTES de implementar)

**Decisiones de producto (bloqueantes):**
- **D1 — Campos del perfil DT**: ¿la lista §2.2 (cargo, dirige-desde, ideas de juego, formaciones, licencias, palmarés, notas/prensa, galería) está completa? ¿Algo de player que quieras conservar (ej. market value de DT)?
- **D2 — Precio `pro-coach`** (USD/EUR/ARS) — y de paso confirmar los de pro-agency que siguen placeholder.
- **D3 — Card del chooser**: ¿"Soy DT" linkea a `/pricing?audience=coach` (paridad player/agencia) o directo a `/onboarding/coach/apply` hasta que exista el pricing coach? (Si PR-5 va después de PR-2, recomiendo directo al apply y switch al pricing en PR-5.)
- **D4 — Un user no puede ser Pro player Y Pro coach** (UNIQUE(user_id) en subscriptions). Recomiendo mantener (cuenta separada para el caso borde). ¿OK?
- **D5 — Licencias pre-moderadas** (recomendado: sí, son LA credencial) y ¿editar una aprobada la despublica hasta re-aprobar? (recomendado: sí).
- **D6 — Stats de DT** (record W-D-L por etapa): fuera de v1 (sin fuente de datos verificable). ¿OK?
- **D7 — Toggles de secciones**: coach implementa gating real (patrón agency). ¿OK? (player seguiría decorativo hasta otro PR).

**Decisiones técnicas (necesitan tu OK por tocar cosas sensibles):**
- **D8 — Estrategia del drift B8** (`player_honour_translations`): hash-register de la 0010 sin ejecutar (recomendado, precedente `0003_register_drizzle_hash`) vs editar el SQL generado con IF NOT EXISTS. También confirmar cómo se creó esa tabla en prod (¿F5-apply-supabase.sql?).
- **D9 — Notificaciones por email** en aprobaciones/rechazos: hoy NINGUNA vertical las manda (helpers huérfanos). v1 coach = solo in-app (paridad) y email queda backlog. ¿OK, o lo cerramos para las 3 verticales en un PR aparte?
- **D10 — Fixes de deudas ajenas a coach** detectadas (B1 agency sin gate is_approved — hoy una agencia no aprobada indexa; B2 policies tautológicas; B3 action sin guard): ¿spawneamos PRs chicos aparte? Son fixes de seguridad/SEO reales.
- **D11 — robots.txt**: mantener allow-all implícito para bots IA (recomendado) vs agregar reglas explícitas por bot (cosmético).
- **D12 — Pre-moderación de media = fricción**: el coach sube una foto y no la ve pública hasta el approve. Es lo que pide el requerimiento (divergencia deliberada vs player reactivo) — confirmar que el equipo de confirmación va a tener SLA para esa cola.

**Riesgos:**
- **R1** — El espejo es grande (~20 tablas nuevas): el costo está acotado por seguir patrones probados, pero un 4º vertical debería disparar la generalización (envelope polimórfico, JsonLd factory). Documentado como límite consciente del enfoque mirror.
- **R2** — Migración 0011 falla si el drift B8 no se resuelve primero (por eso PR-0 es bloqueante).
- **R3** — Paridad dev↔prod de lo aplicado post-restore (0004a, 0006c/d, 0009a) no se verificó contra prod en este análisis (permiso read-only limitado): correr el check de counts del workflow §6 antes de aplicar 0011 a prod.
- **R4** — `/coach/[slug]` con ISR real depende de disciplina (ningún `cookies()`/`searchParams` en el árbol): agregar test de humo "x-vercel-cache: HIT" al criterio de done de PR-3.
- **R5** — El worktree está 2 commits detrás de main: cualquier número de línea de onboarding/checkout citado acá corresponde a main post-#206 (ya verificado por el research), pero la implementación debe rebasear.

---

## Apéndice — fuentes del análisis

Research multi-agente 2026-06-12 (9 misiones + crítico + 4 follow-ups): código del worktree + `origin/main`, Supabase MCP **solo lectura** contra dev `ciolizjshimyvyonlssq` (tablas/enums/policies/funciones/views/buckets/trackers vivos) y prod `erdvpcfjynkhcrqktozd` (solo list_tables/list_migrations), Vercel MCP + REST (proyecto `ballers-hub`, iad1, env names). Docs leídos: `docs/db/migration-workflow.md`, `docs/seo/HANDOFF.md`, `docs/seo-per-player-handoff.md`, `docs/seo/geo-ai-audit-spec.md`, `docs/i18n/HANDOFF.md`, `docs/checkout-*.md`, `docs/pricing-matrix.md`, `docs/client-dashboard-*.md`, `docs/db/client-dashboard-*.sql`, `docs/notifications/USAGE.md`.
