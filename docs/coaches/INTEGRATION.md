# Vertical Entrenadores (Coaches / DT) — Integración completa

> **Estado:** ✅ **LIVE en `main`** (merge consolidado #237 → commit `6bbcc13`, 2026-06-15).
> **Plan original (pre-implementación):** [`docs/coaches/HANDOFF.md`](./HANDOFF.md) — mapa del sistema, decisiones D1–D12, research multi-agente.
> **Este doc:** referencia canónica de lo que se construyó, cómo está armado, el journey de migraciones y las lecciones. Self-contained.

La tercera vertical de BallersHub (junto a **Jugadores** y **Agencias**): un entrenador se registra, carga su perfil profesional (trayectoria, ideas de juego, metodología, licencias, palmarés, estadísticas, multimedia), pasa por moderación y publica una página pública en **`ballershub.co/coach/[slug]`** — indexable y citable por buscadores con IA. Plan **Free** (dossier sobrio) o **Pro** (layout cinematográfico con colores propios), facturable al mismo precio que Pro Player.

Diseñada con **paridad** a las verticales existentes y **modularidad** para una eventual 4ª vertical (reúsa enums, patrones de RLS, layout Pro, footer, billing, i18n).

---

## 1. Resumen por capas

| Capa | Qué | Dónde |
|---|---|---|
| **DB** | 23 tablas `coach_*` + 3 columnas de theme en `coach_profiles` | `src/db/schema/coach*.ts`, migraciones `0014_fair_shiva`/`0015_spotty_blindfold`/`0015a_coach_rls_and_infra.sql` |
| **Onboarding** | Wizard `/onboarding/coach/apply` (identidad → trayectoria/licencias → verificación) | `src/app/[locale]/(onboarding)/onboarding/coach/apply/` + `api/onboarding/coach/submit` |
| **Dashboard DT** | Shell aislado + editores (perfil/apariencia, trayectoria con revisiones, licencias, multimedia, idiomas) | `src/app/[locale]/(dashboard)/dashboard/coach/` + `CoachDashboardShell.tsx` + `src/app/actions/coach-*.ts` |
| **Moderación admin** | Cola de solicitudes + revisiones de trayectoria (RevisionDiff) + media + licencias | `src/app/[locale]/(dashboard)/admin/coach-*` + `api/admin/coach-*` |
| **Portfolio público** | `/coach/[slug]` — Free (dossier) / Pro (scrolljacking + theme) + SEO/GEO | `src/app/[locale]/(public)/coach/[slug]/` |
| **Billing** | Plan `pro-coach` (= precio Pro Player) | `src/lib/billing/plans.ts`, `createCheckout.ts`, `/checkout/pro-coach` |
| **i18n** | es (default) / en / it / pt | namespace `portfolio.coach.*`, `footer.portfolio.*Coach`, `coachApply.*` |

---

## 2. El plan y las decisiones

Roadmap ejecutado en PRs (todos consolidados en #237). Decisiones del owner cerradas durante la ejecución:

| # | Decisión | Resolución |
|---|---|---|
| D1 | Set de tablas | Espejo `coach_*` de player/agency, enums reusados (cero `ALTER TYPE`) |
| D2 | Precio `pro-coach` | **= Pro Player** (USD 85 / ARS 131.999 / EUR 73 anual) |
| D3 | Onboarding | "Soy DT" → link directo a `/onboarding/coach/apply` (no `/pricing`) |
| D5 | Licencias | **Pre-moderadas**; editar una aprobada la vuelve a `pending` |
| D6 | Estadísticas | SÍ, results-based: PJ / PG / PE / PP / GF / GC; **% en el front** |
| D7 | Gating | Real (patrón agency) |

### Orden de PRs (histórico)

- **PR-0** — Reconciliar drift de Drizzle + versionar trigger auth (prereqs).
- **PR-1** — Schema pack: 23 tablas + RLS/RPCs/buckets/view (`0011` complementario `0011a`).
- **PR-2a** — Onboarding wizard + submit API + card "Soy DT" del chooser.
- **PR-2b** — Moderación admin: cola de solicitudes + approve/reject.
- **PR-3a** — Portfolio público v1 (dossier) + SEO/GEO completo.
- **PR-4a** — Dashboard shell coach-aware + toast de aprobación.
- **PR-4b** — Editores: trayectoria-con-revisiones, licencias, multimedia, idiomas.
- **PR-4c** — Admin: cola de revisiones con **RevisionDiff** + moderación media/licencias.
- **PR-6** — Record/estadísticas con % + galería en el portfolio + JSON-LD enriquecido.
- **PR-5** — Billing `pro-coach`.
- **PR-3b** — Layout Pro premium (scrolljacking) + theme propio del coach + variante coach del footer.

---

## 3. Modelo de datos

### Tablas (`src/db/schema/coach*.ts`)

- **`coach_profiles`** — perfil core (slug, full_name, role_title, nacionalidad, bio, ideas de juego, metodología, formaciones, club actual, hero/avatar, plan_public, status, visibility) + **theme** (`theme_primary_color` / `theme_accent_color` / `theme_background_color`, hex, NULL → marca).
- **`coach_applications`** + **`coach_career_item_proposals`** — solicitud de alta y trayectoria propuesta.
- **`coach_career_items`** — trayectoria materializada (club, role_title, división, fechas).
- **`coach_career_revision_requests`** + `_proposed_teams` + `_items` + **`coach_stats_revision_items`** — envelope de revisión moderada (trayectoria + stats juntos), con `current_snapshot` (jsonb) para el diff.
- **`coach_stats_seasons`** — estadísticas por temporada (matches/wins/draws/losses/goals_for/goals_against).
- **`coach_media`** (`status` pre-moderado) + **`coach_articles`** (prensa).
- **`coach_licenses`** (`status` pre-moderado, `doc_url` privado, `position`).
- **`coach_honours`** (palmarés) + **`coach_links`** (perfiles externos).
- **`coach_profile_translations`** + **`coach_honour_translations`** + **`coach_ai_translation_events`** — i18n por-perfil (en/it/pt; es nativo).
- **`coach_theme_settings`** — tabla del pack original **no usada** (el theme vive en columnas de `coach_profiles`; ver §11).
- **`coach_leads`**, **`coach_change_logs`**, view **`coach_dashboard_state`**.

### Enums (reusados, cero `ALTER TYPE`)

`role` (ya incluía `'coach'`), `review_status` (pending/approved/rejected), `media_type` (photo/video/doc), `player_status`, `visibility`, `plan`.

### RLS — modelo de **pre-moderación**

A diferencia del player (`is_approved` default `true`, moderación reactiva), el coach es **pre-moderado**: el contenido sensible nace `pending` y se oculta del público hasta que un reviewer aprueba.

- **Public SELECT** gateado por el padre: visible solo si `coach_profiles.status='approved' AND visibility='public'` (o owner, o admin).
- **Owner INSERT/UPDATE de media/licencias**: `WITH CHECK (status <> 'approved' AND owns coach)` → **el owner no puede auto-aprobar** (la pre-moderación se hace cumplir a nivel SQL). `USING` de UPDATE = solo ownership → editar una aprobada es posible y la **revierte a `pending`**.
- **Revisiones de trayectoria**: el envelope + items se insertan como el usuario (sesión); el `approve` materializa con el service-role.
- `doc_url` de licencias: `REVOKE` table-level a `anon` + GRANT por columna → nunca expuesto al público.

> ⚠️ **Gotcha:** dev/prod tienen `DEFAULT PRIVILEGES` que dan SELECT table-level a `anon` en tablas nuevas → para ocultar una columna hay que `REVOKE` table-level + GRANT por columna.

### RPCs (SECURITY DEFINER, guard `is_admin`)

- `approve_coach_application(p_id)` → crea `coach_profile` (approved + slug único), materializa `licenses_draft` → `coach_licenses` (approved), marca la app. Idempotente por user.
- `materialize_coach_career_from_application(p_application_id)` → vuelca proposals `accepted` → `coach_career_items` (year→date).
- `coach_can_add_media(p_user_id, p_coach_id, p_type)` / `coach_max_media_allowed(p_coach_id, p_type)` → gating de multimedia por plan.

### Storage

Bucket **`coach-media`** (público) + 4 storage policies. El `doc_url` de licencias quedó **diferido** (necesita bucket privado + policies; ver §11).

---

## 4. Superficies (rutas y componentes)

### Onboarding — `/onboarding/coach/apply`
Wizard de 3 pasos (Step1Identity → Step2Career[trayectoria + licencias + team picker] → Step3Verify) → `api/onboarding/coach/submit` (Bearer, inserta `coach_applications` + `coach_career_item_proposals`). Card "Soy DT" del chooser `/onboarding/start`.

### Dashboard del DT — `/dashboard/coach/*`
`dashboard/layout.tsx` tiene una **rama temprana** (`loadCoachShellData`) que detecta coach (role=`coach` o member+coach_application) y renderiza **`CoachDashboardShell`** propio (cero regresión player/agency). Incluye:
- `/coach/edit` — perfil (cargo, bio, ideas de juego, formaciones, metodología, objetivos) + card **"Apariencia" (Pro)** con 3 color pickers (theme).
- `/coach/career` — trayectoria + stats **con revisión** (`submitCoachCareerRevision`: envelope + snapshot; 1 request in-flight; locked mientras pending).
- `/coach/licenses` — CRUD pre-moderado (`upsert/deleteCoachLicense`).
- `/coach/multimedia` — upload a `coach-media` (`/api/coach/media/upload`, sharp→AVIF, gating por RPC, `status=pending`).
- `/coach/translations` — editor **Pro-gated** (en/it/pt) sobre `coach_profile_translations`.
- Upsell `CoachProUpsell` (3 monedas) para coaches Free.

Server actions: `src/app/actions/coach-{profile,career,licenses,media,translations}.ts`.

### Moderación admin — `/admin/coach-*`
- `/admin/coach-applications` — cola de altas (approve = RPCs + rol member→coach + enrich; reject = `rejection_reason`).
- `/admin/coach-career-revisions` — cola de revisiones con **`RevisionDiff`** (Antes/Después de trayectoria + stats, tinte add/remove). Approve **materializa** a `coach_career_items` + `coach_stats_seasons` (year→date, replace seguro insert-new-then-delete-old).
- `/admin/coach-media` + `/admin/coach-licenses` — moderación (approve/reject status + reviewed_by + rejection_reason).
- Sección **"Entrenadores"** en el nav admin + 3 counters (`getAdminCounters`).

Rutas API: cookie-client para el guard admin + service-role para las escrituras (patrón player).

### Portfolio público — `/coach/[slug]`
`page.tsx` (ISR `revalidate=3600`): gate `approved+public`→404, soft-noindex si Free thin, hreflang condicional. **Free** → `CoachPortfolio` (dossier semántico). **Pro** → `ProCoachLayout` (ver §6).

---

## 5. SEO / GEO

- **JSON-LD** (`src/lib/seo/coachJsonLd.tsx`): `Person` (Director Técnico) con `hasCredential` (licencias = `EducationalOccupationalCredential`), `award` (palmarés), `worksFor`/`memberOf` (SportsTeam), `knowsAbout` (formaciones), `sameAs` (Transfermarkt + redes), `additionalProperty` (record: partidos dirigidos + % victorias), `BreadcrumbList`. Free = Person mínima; Pro = `@graph` completo.
- **hreflang** condicional (solo locales con traducción real), **canonical** por locale.
- **OG image** dinámica (`opengraph-image.tsx`).
- **Sitemap** (`sitemap.ts`) + **llms.txt** (sección "## Entrenadores") + indexable-profiles (`getIndexableCoaches`, `resolveProUserIds += pro-coach`).
- **GEO**: la página tiene texto real citable (record en prosa, secciones semánticas) en el HTML inicial.

Solo contenido **`approved`** entra a render público / sitemap / JSON-LD / llms.txt.

---

## 6. Portfolio Pro (layout cinematográfico)

`src/app/[locale]/(public)/coach/[slug]/components/pro/`. Es una **copia adaptada del Pro de players** (`ProAthleteLayout`):

- **Scroll infra** (`SmoothScrollProvider` Lenis + `ScrollMeasurementSync`) copiada verbatim (audience-agnostic).
- **`ProCoachHeader`** — nav pill glassmorphism, scroll-spy, share, locale switcher.
- **`ProCoachLayout`** — hero cinematográfico (orbs, marquee, ghost-trails parallax, sándwich de nombre); centro adaptado: **cutout si `hero_url` existe, si no avatar enmarcado**; stats-strip de record con CountUp. Usa los **colores del theme del coach** (`theme_*`, fallback marca) en orbs/strokes/strip/`--theme-*` vars.
- **`CoachProContent`** — secciones fed by props: bio/ideas/formaciones, trayectoria timeline + tabla stats, **bloque Metodología scroll-jacked** (200vh sticky, espejo del módulo Tactics), licencias+palmarés, galería, contacto.
- Mobile: composición centrada en todos los breakpoints, record strip que wrappea, min-h responsive (ver commits `6a5bb87`).

**Footer**: `PortfolioFooter` soporta `ownerKind="coach"` (copy propia es/en/it/pt).

---

## 7. Billing (`pro-coach`)

`src/lib/billing/plans.ts`: `CheckoutPlanId += 'pro-coach'`, precios = Pro Player. El checkout es **genérico** sobre `planId` → `/checkout/pro-coach` funciona reutilizando todo. **Fallback dinámico** (`price_data` Stripe / inline `auto_recurring` MP) → no requirió crear recursos Stripe/MP. `buildUpgradeUrl(coach)` → `/checkout/pro-coach`. Webhook escribe `subscriptions.plan_id='pro-coach'` → `resolvePlanAccess` da Pro (`hasPlanIdProTier` incluye `pro-coach`). Emails (welcome/payment-failed/comp-grant) 3-way.

> **Ops pendiente para cobro real en prod:** provisionar Stripe Prices canónicos + MP `preapproval_plan` y pinear envs `STRIPE_PRICE_PRO_COACH_*` / `MP_PLAN_PRO_COACH_ARS` (igual que player/agency; sin esto el fallback cobra pero MP queda sin trial nativo).

---

## 8. El loop de contenido moderado

```
Cargar (dashboard DT)  →  pending  →  Moderar (admin)  →  Publicado + GEO-citable en /coach/[slug]
```
Aplica a **trayectoria, estadísticas, multimedia y licencias**. La pre-moderación se hace cumplir a nivel RLS (el owner no puede setear `approved`). El `current_snapshot` de la revisión alimenta el **RevisionDiff** del admin.

---

## 9. Migraciones — historia y técnicas de reconciliación

El schema coach se aplicó a **dev + prod** vía MCP (`apply_migration`) + **hash-register** en `drizzle.__drizzle_migrations`, no vía `db:migrate` (las tablas ya existían). La numeración **colisionó dos veces** con migraciones que entraron a `main` mientras la rama coach estaba sin mergear:

1. `0011_coach_pack` chocó con `0011_flaky_blade` (main) → regenerado a **`0014_easy_warbird`** vía `db:generate`.
2. `0014_easy_warbird` chocó con `0014_fair_shiva` (#232) → regenerado a **`0015_spotty_blindfold`** (acumulativo, incluye las columnas de theme).

### Técnicas usadas (documentar para futuro)

- **Hash-register**: aplicar la DDL por fuera de `db:migrate` y registrar `INSERT (hash, created_at)` en `drizzle.__drizzle_migrations`. El `hash` = `sha256` del contenido del `.sql` (validado reproduciendo un hash conocido). El gate del migrator es `lastDbMigration.created_at < migration.folderMillis`.
- **Mover `created_at`**: al renumerar una migración ya aplicada, un `UPDATE created_at` deja la fila registrada en la nueva posición → el migrator la saltea.
- **Pinear el `when` del journal** al `max(created_at)` de dev/prod: el migrator saltea la migración regenerada (cuando `when ≤ max`) **sin** necesitar un write a la DB, y un entorno fresco la aplica en orden. ← lo usado para `0015_spotty_blindfold`.
- **Complementarios `NNNNa_*.sql`** (RLS/GRANTs/buckets/RPCs/view): manuales, **no** tracked en el journal.

Estado final en main: `0014_fair_shiva` + `0015_spotty_blindfold` + `0015a_coach_rls_and_infra` (sin duplicados). dev+prod consistentes; `db:migrate` futuro es no-op para coach.

---

## 10. Lecciones aprendidas

1. **Correr `next build` completo, no solo `tsc --noEmit`, antes de confiar en una rama con server actions.** La regla de Next "un archivo `"use server"` solo puede exportar funciones async" **escapa al typecheck** y solo la caza el build. (Caso: `coach-career.ts` exportaba schemas zod → rompió el deploy de Vercel; fix = schemas module-private.)
2. **Una rama grande sin mergear colisiona migraciones** cada vez que un PR con migración entra a `main`. → mergear rápido, o coordinar.
3. **Pre-moderación a nivel RLS** (split de policies owner con `status<>'approved'`) es más robusto que confiar solo en la UI.
4. Verificar el commit/línea específico en `origin/main` tras un merge (`git merge-base --is-ancestor`), no solo que la PR diga MERGED.

---

## 11. Estado final + pendientes menores + extender

**LIVE en main** (#237, `6bbcc13`). DB en dev+prod. Las 8 PRs apiladas de review se cerraron como "Superseded by #237".

**Pendientes menores (no bloquean, anotados):**
- Upload de `doc_url` de licencias (necesita bucket privado coach + storage policies).
- Asistente "Auto-completar con Claude" de traducciones (tabla `coach_ai_translation_events` ya existe).
- Editor de palmarés/honours del DT (hoy solo se materializa de la application).
- Redundancia `coach_theme_settings` (tabla del pack no usada; el theme vive en columnas de `coach_profiles`) — limpiar con una migración cuando convenga.
- Provisión canónica de Stripe Prices + MP plans para cobro real (§7).
- Borrar branches viejas `feat/coach-*` / `integ/coach-to-main` / `merge/coach-vertical`.

**Cómo extender a una 4ª vertical:** reúsa el patrón — tablas espejo con enums existentes, RLS pre-moderado, rama temprana en `dashboard/layout.tsx` + shell propio, `LayoutResolver` Free/Pro reutilizando `SmoothScrollProvider`/`ScrollMeasurementSync` + adaptar `ProCoachLayout`, `PortfolioFooter` con `ownerKind` nuevo, `CheckoutPlanId += 'pro-X'` (checkout genérico), namespace i18n `portfolio.X.*`.
