# Plan — Bloque "Trayectoria a Nivel Selección Nacional"

> **Estado:** Diseño / planificación. **No** implementado, **no** se tocó la DB, **no** hay migraciones aplicadas.
> **Fecha:** 2026-06-22 · **Autor:** handoff Claude · **Alcance:** cuentas de jugadores/jugadoras.
> **Verificación:** todo lo de abajo fue confirmado vía MCP de Supabase (prod `erdvpcfjynkhcrqktozd`) + lectura del repo. Lo no confirmado está marcado **(a confirmar)**.

---

## 0. TL;DR

Bloque nuevo de portfolio para registrar experiencia a **nivel selección nacional** (juveniles Sub-15…Sub-20 o Mayor; tipos de participación: convocado/jugó/sparring/concentración). Es una "medalla" de alto valor, por eso **no es pública hasta que un admin la aprueba**.

Decisiones recomendadas:
- **Modelo:** tabla dedicada `national_team_stints` + `national_team_media` (hasta 4 fotos), referenciando `teams(kind='national')`. Género derivado de `player_profiles.gender`.
- **Control de acceso:** **Híbrido** — la primera carga ES la solicitud; queda `pending_review`; el admin revisa el contenido + fotos y aprueba/rechaza. Un solo paso, reusa el ADN de moderación existente.
- **Moderación:** status-on-row (como `teams`/`divisions`/`player_media`), replicando la UX de trayectoria sin tablas de revisión pesadas.
- **Planes:** Free = badge compacto (sin fotos/stats) + upsell; Pro/Pro+ = bloque completo.

---

## 1. Arquitectura actual relevante

**Stack:** Next.js 15.5 App Router (Turbopack), app bajo `src/app/[locale]/` con **next-intl** (4 locales: `es` default sin prefijo, `en`, `it`, `pt-BR`). Drizzle ORM sobre Postgres/Supabase, schema modular en `src/db/schema/*.ts`. HeroUI + Tailwind, react-hook-form + zod (dashboard; el onboarding usa `useState` puro), framer-motion, Stripe + Mercado Pago, Resend. Deploy en Vercel (Node 22, prod `ballershub.co`, branch prod `main`).

### 1.1 Modelo de datos (jugador)

| Tabla | Rol | Notas clave |
|---|---|---|
| `player_profiles` | Perfil | `id`, `user_id`, `slug`, **`gender` enum NOT NULL** ✅, `nationality[]`/`nationality_codes[]`, `positions[]`, `current_team_id→teams`, análisis posicional (`top_characteristics[]` + `tactics/physical/mental/technique_analysis`), `status` (`draft\|pending_review\|approved\|rejected`), `plan_public` (cache, **no** gating real). |
| `career_items` | Trayectoria (1 fila = 1 paso por club) | `team_id→teams` (nullable) + `club` (texto legacy), `division_id→divisions`, `secondary_division_id`, **`start_date`/`end_date` (DATE)**. **No** hay flag juvenil/actual: juvenil = `divisions.is_youth`; actual = `end_date IS NULL`. |
| `teams` | Catálogo equipos | **`kind` enum incluye `national`** 🎯, `category` (text), `country_code`, `crest_url`, `slug`, `status` (`pending\|approved\|rejected`). |
| `divisions` | Divisiones/ligas | `is_youth` (bool), `level` (int), `status`. |
| `stats_seasons` | Stats por temporada (opcionales) | `player_id`, `season`, `career_item_id` (nullable), matches/starts/goals/assists/minutes/cards. |
| `player_media` | Catálogo multimedia | `type` (`photo\|video\|doc`), `url`, `alt_text`, `tags[]`, `season_year`, `position`, `is_primary`, **`is_approved`/`is_flagged`/`reviewed_by`** (moderación por fila). |
| `player_honours` | Palmarés | `title`, `competition`, `season`, `description`, `career_item_id`. Editor dashboard **Pro-only (soft-save)**. |
| `subscriptions` | **Fuente de verdad del plan** | `plan` (`free\|pro\|pro_plus`), `status_v2`, `processor` (null = grant admin), `current_period_end`, **`limits_json`** (`{max_photos, max_videos}`). |

**Enums reales en prod:** `gender {male,female,unspecified}`, `team_kind {club,national,academy,amateur}`, `plan {free,pro,pro_plus}`, `player_status {draft,pending_review,approved,rejected}`, `media_type {photo,video,doc}`, `review_status {pending,approved,rejected}`, `reviewer_perm_status {pending,granted,revoked}`.

**Storage:** bucket **`player-media`** (público, 5MB, jpeg/png/webp/avif/svg). Toda foto → AVIF q60 server-side en `src/app/api/media/upload/route.ts`, path `gallery/{user_id}/{uuid}.avif`, se guarda public URL.

### 1.2 Planes (cómo gatean hoy)

- Resolver canónico `resolvePlanAccess(subscription)` → `{ isPro, effectivePlan, source }` en `src/lib/dashboard/plan-access.ts`. Pro = `plan ∈ {pro, pro_plus}` **y** `status_v2 ∈ {active, trialing}` (+ expiración lazy por `current_period_end`).
- Matriz declarativa: `src/lib/dashboard/feature-gates.ts` — 5 comportamientos: `hidden | blurred | soft-save | hard-cap | badge`. Ej.: videos Free=2, artículos Free=3, fotos Pro=5 (founders ilimitado vía `src/lib/dashboard/founder-emails.ts`), **palmarés = `honoursValuation` soft-save Pro-only**.
- `<PlanGate feature="...">` para hidden/blurred; soft-save/hard-cap imperativos con `useUpgradeModal`.
- Público: `src/app/[locale]/(public)/[slug]/page.tsx` resuelve plan; `LayoutResolver.tsx` decide **FreeLayout** (dossier, 10 secciones + 3 slots upsell) vs **ProAthleteLayout** (cinematográfico, 6 módulos async Suspense). Override dev `?force_free=1`.

### 1.3 Solicitudes / moderación de admin

Dos patrones ya consolidados:
1. **Status-on-row:** `teams`, `divisions`, `player_profiles`, `player_media` (`is_approved/is_flagged`). Admin aprueba flippeando estado.
2. **Cola de revisión:** trayectoria usa `career_revision_requests` → `career_revision_items` (`src/db/schema/careerRevisions.ts`). Jugador edita en `CareerManager.tsx`, se crea request `pending` (bloquea editor), admin aprueba en `/api/admin/career/revisions/[id]/approve`, **recién ahí** se materializa a `career_items` live. Onboarding hace lo análogo (`player_applications` + `career_item_proposals`).

Infra transversal reutilizable:
- Auth admin: `ensureAdminActor()` / `isAdmin` en `src/lib/admin/auth.ts`.
- Contadores sidebar: `src/lib/admin/counters.ts` + tag `admin-counters`.
- Nav admin: `NAV_SECTIONS` en `src/app/[locale]/(dashboard)/admin/layout.tsx`.
- Notificaciones: tabla `notifications` + `createNotification()` (`src/lib/notifications/server.ts`) + `src/modules/notifications/builders.ts`.
- Auditoría: `audit_logs` + `recordAdminPlayerEdit()` (`src/lib/admin/notify.ts`).
- CRUD master: `/admin/players/[id]/edit/*` reusa la capa de edición del dashboard.

> **ADN de la plataforma:** *el dato cargado por el usuario no es público hasta que un admin lo aprueba.* Esto resuelve casi solo el requisito "no cualquiera carga esto".

---

## 2. Modelo de datos propuesto

**Decisión:** una experiencia de selección es más rica que un `career_item` (mini descripción, stats, hasta 4 fotos, categoría, tipo de participación) → **tabla dedicada**, referenciando `teams(kind='national')` para reusar catálogo (crest, país, slug). **Género derivado de `player_profiles.gender`** (no se duplica). **Categoría** (Sub-15…Mayor) en la fila (enum). Moderación **status-on-row** con columnas de feedback que replican la UX de trayectoria, sin tablas `*_revision_*` pesadas.

### 2.1 SQL propuesto (para revisión — NO ejecutar)

```sql
-- ── Enums nuevos ──────────────────────────────────────────────
create type national_team_age_category as enum
  ('sub15','sub16','sub17','sub18','sub19','sub20','sub21','sub23','olympic','senior','other');

create type national_team_participation as enum
  ('called_up',     -- convocado / citado (no necesariamente jugó)
   'played',        -- jugó / debutó
   'sparring',      -- fue de sparring
   'training_camp'  -- concentración / microciclo
  );
-- Estado de moderación: REUSO el enum existente player_status
-- (draft | pending_review | approved | rejected) — mismo ciclo de vida, evita proliferar enums.

-- ── Tabla principal: 1 fila = 1 experiencia/convocatoria ──────
create table national_team_stints (
  id                   uuid primary key default gen_random_uuid(),
  player_id            uuid not null references player_profiles(id) on delete cascade,

  -- vínculo al equipo nacional (teams.kind='national'); null si aún no catalogado
  team_id              uuid references teams(id) on delete set null,
  proposed_team_name   text,                 -- fallback cuando team_id es null (lo cataloga el admin al aprobar)
  country_code         char(2),              -- denormalizado p/ display y filtro cuando team_id null

  age_category         national_team_age_category not null,
  participation        national_team_participation not null default 'called_up',

  start_year           integer,              -- "años" como el resto de la trayectoria (no DATE)
  end_year             integer,              -- null => actual / vigente
  description          text,                 -- mini descripción por convocatoria

  -- estadísticas OPCIONALES (todas nullable)
  caps                 integer,              -- partidos / apariciones
  goals                integer,
  assists              integer,
  minutes              integer,

  order_index          integer not null default 0,   -- orden manual en el portfolio

  -- moderación (status-on-row, paridad de UX con trayectoria)
  status               player_status not null default 'pending_review',
  submitted_by_user_id uuid,
  reviewed_by_user_id  uuid,
  reviewed_at          timestamptz,
  resolution_note      text,                 -- feedback del admin (rechazo/observación)

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index national_team_stints_player_idx on national_team_stints(player_id);
create index national_team_stints_status_idx on national_team_stints(status);

-- ── Fotos: hasta 4 por experiencia ───────────────────────────
create table national_team_media (
  id           uuid primary key default gen_random_uuid(),
  stint_id     uuid not null references national_team_stints(id) on delete cascade,
  player_id    uuid not null references player_profiles(id) on delete cascade, -- denorm p/ ownership/RLS
  url          text not null,               -- bucket player-media, path national-team/{user_id}/{stint_id}/{uuid}.avif
  alt_text     text,
  position     integer not null default 0,  -- 0..3
  is_approved  boolean not null default false,
  is_flagged   boolean not null default false,
  reviewed_by  uuid,
  created_at   timestamptz not null default now()
);
create index national_team_media_stint_idx on national_team_media(stint_id);
-- Cap de 4 se valida en app (cliente + endpoint), igual que el cap de 5 fotos del catálogo.
-- Opcional: trigger/CHECK para hard-enforce 4 por stint.
```

### 2.2 Relaciones y vínculos

- `national_team_stints.player_id → player_profiles.id` (cascade) — igual que `career_items`.
- `national_team_stints.team_id → teams.id` (set null) — equipo nacional ya en catálogo (`kind='national'`). Si no existe → `proposed_team_name`+`country_code`, el admin lo crea como `teams(kind='national', status='approved')` al aprobar (mismo flujo que `career_revision_proposed_teams`).
- `national_team_media.stint_id → national_team_stints.id` (cascade).
- **Género:** NO se duplica; se lee de `player_profiles.gender` en render/validación.
- **Stats:** inline opcionales en v1. *Alternativa futura:* extender `stats_seasons` con `national_team_stint_id`.

### 2.3 RLS y Drizzle

A authorear siguiendo `docs/db/migration-workflow.md`: políticas espejo de `career_items`/`player_media` → dueño CRUD sobre lo propio, público lee solo `status='approved'`/`is_approved=true`, `service_role`/admin full. Archivos nuevos: `src/db/schema/nationalTeams.ts` exportado en `src/db/schema/index.ts` + relations en `src/db/schema/relations.ts`. Migración vía `db:generate` (no a mano).

### 2.4 Alternativa de modelado (paridad exacta con trayectoria)

En vez de status-on-row, crear `national_team_revision_requests` + `_items` espejando `careerRevisions.ts`. **Pros:** UX idéntica (submit del bloque entero, snapshot, lock global). **Contras:** mucho más código y staging de fotos engorroso en una cola de revisión. **Recomendación:** status-on-row (más liviano; las fotos ya tienen `is_approved` nativo); dejar la cola de revisión como upgrade documentado.

---

## 3. Flujo de control de acceso (recomendación)

| | **A — carga directa** | **B — pedir acceso → habilitar → cargar** | **★ Híbrido (recomendado)** |
|---|---|---|---|
| Qué pasa | Marca "sí" y publica solo | Solicita, admin aprueba el *permiso*, después carga | Carga la experiencia; queda `pending_review`; **no pública hasta aprobación del contenido** |
| Control | ❌ Nulo (inaceptable) | ✅ pero el admin aprueba a ciegas (no ve el dato) | ✅✅ Admin revisa **dato + fotos** = el control real |
| Fricción | Mínima | Alta (2 aprobaciones) | Baja (1 aprobación) |
| Reuso infra | — | Tabla de grants nueva | **Reusa status-on-row + cola admin existentes** |

**Recomiendo el Híbrido.** La primera carga ES la solicitud: el jugador completa su experiencia (categoría, años, tipo, descripción, fotos), se guarda `status='pending_review'`, el admin revisa con la evidencia a la vista y aprueba/rechaza con `resolution_note`. Un solo paso, nada falso se muestra (público = solo `approved`), reusa lo existente.

**Variante "B pura" (pre-filtrar el intento):** grant `national_team_access` por jugador (default: requiere request) que desbloquea el editor; las ediciones igual pasan por moderación. Solo si querés evitar gastar tiempo de admin con jugadores claramente inelegibles. Ver §9.2.

---

## 4. Flujo de onboarding

**Dónde:** justo después del paso de trayectoria. Onboarding = máquina de estados de 3 pasos hardcodeada en `src/app/[locale]/(onboarding)/onboarding/player/apply/ApplyFlow.tsx` (Step1 Personal → **Step2 Football/Trayectoria** → Step3 Verify/KYC), `useState`, submit final a `/api/onboarding/submit` (escribe `player_applications` + `career_item_proposals`, pending). Como la aplicación entera ya la revisa el admin, la respuesta de selección viaja con esa revisión — **cero infra de aprobación nueva en onboarding**.

**Inserción recomendada:** **Step 2b "Selección Nacional"** entre Trayectoria (2) y Verificación (3): `activeStep` → `1|2|3|4`, agregar `setS2b`, expandir `StepHeader.tsx`. En onboarding se captura lo mínimo (categoría + años + tipo + nota corta por experiencia); **las fotos se difieren al dashboard post-aprobación** (el KYC ya hace pesado el flujo). Al aprobar la aplicación → materializar a `national_team_stints` (`status='approved'`).

**Redacción de la pregunta** (ES; replicar en en/it/pt):

> **¿Tenés experiencia a nivel Selección Nacional?**
> Si fuiste **convocado/a, jugaste o participaste** (incluido sparring o concentración) en una selección nacional —juvenil o mayor—, contanos. Es un antecedente de mucho peso, así que **nuestro equipo lo verifica antes de publicarlo** en tu perfil.
> ○ Sí, tengo experiencia en selección  ○ No / Prefiero no cargarlo ahora
>
> *(si "Sí")* Por cada participación: **Categoría** (Sub-15 … Mayor) · **Años** · **Tipo de participación** (Convocado/a · Jugué · Sparring · Concentración) · **Descripción breve** (opcional). Vas a poder **agregar fotos y estadísticas más tarde, desde tu panel**, una vez aprobada.

Microcopy: *"La categoría femenina/masculina se toma de tu perfil. Cargá solo lo que puedas respaldar."*

---

## 5. UX/UI del bloque en el portfolio

**Posición:** sección propia **"Selección Nacional"**, inmediatamente **después de Trayectoria**.

**Pro (`ProAthleteLayout`):** nuevo módulo async `NationalTeamModule.tsx` en Suspense, en `LayoutResolver.tsx` entre `CareerTimelineModule` y `ProfilePressNotesModule`, + entrada en el scroll-spy de `ProPlayerHeader.tsx` (`{ id: 'national-team', Icon: Flag }`). Por experiencia:
- **Header de tarjeta:** crest/bandera + nombre selección + **chip categoría** (Sub-20) + **chip género** (♀/♂, del perfil) + rango de años ("Actual" si `end_year` null).
- **Chip de tipo de participación** (Convocado / Jugó / Sparring / Concentración) con color/ícono.
- **Mini descripción** (texto).
- **Stats** (si cargadas): fila compacta PJ · G · A · Min (oculta nulos).
- **Galería hasta 4 fotos:** reusa grid/lightbox de `PortfolioGallery`/`GalleryLightbox` en versión mini. Hereda CSS vars del tema Pro.

**Free (`FreeLayout`):** versión **compacta, sin fotos/galería**: tras "§ 02 Career", una **fila/badge por experiencia** ("🇦🇷 Selección Argentina · Sub-20 · 2019–2021 · Jugó") + slot upsell ("Hacé **Pro** para mostrar fotos y estadísticas de tu paso por la selección"). Insertar en `FreeLayout.tsx` después de Career.

**Datos:** agregar fetch al `Promise.all` de `[slug]/page.tsx` (`national_team_stints WHERE player_id=? AND status='approved' ORDER BY order_index, start_year DESC` + `national_team_media WHERE is_approved`). i18n: namespace nuevo en `src/i18n/messages/{es,en,it,pt}/portfolio.json` (`modules.nationalTeam.*`, `free.nationalTeam*`, `nav.nationalTeam`, `loading.nationalTeam`).

---

## 6. Integración con planes Pro/Free

| Capacidad | **Free** | **Pro / Pro+** |
|---|---|---|
| Cargar experiencias (dashboard) | ✅ (van a moderación) | ✅ |
| Render público | **Badge compacto** (categoría · años · tipo), sin fotos/stats | **Bloque completo** (módulo cinematográfico, descripción, stats, hasta 4 fotos/exp.) |
| Fotos por experiencia | ❌ (soft-save / upsell, como `honoursValuation`) | ✅ hasta 4 |
| Stats | ❌ ocultas en público | ✅ |
| Nº de experiencias | (a confirmar) sugiero cap Free (p.ej. 2) vs Pro ilimitado | ilimitado |

Implementación: entrada `nationalTeam` en `feature-gates.ts` (fotos/stats con `soft-save`/`hard-cap`; badge Free siempre visible). `pro_plus` = igual que `pro` salvo diferencial (a confirmar). Cap de 4 fotos configurable vía `subscriptions.limits_json` (`max_national_team_photos`).

> **Racional:** national team es una medalla aún más fuerte que el palmarés. Mostrar un badge en Free beneficia al jugador y es un gancho de upgrade potente; reservar fotos+stats+módulo Pro mantiene la motivación de pago.

---

## 7. Integración con el panel de admin

- **Cola nueva:** `/admin/national-team` lista `national_team_stints WHERE status='pending_review'` (espejo de `/admin/career`), con datos del jugador + fotos para revisar.
- **Endpoints:** `/api/admin/national-team/[id]/approve` y `/reject`: `ensureAdminActor()` → set `status` + `reviewed_by_user_id` + `reviewed_at` + `resolution_note`, aprobar fotos (`is_approved=true`), materializar `proposed_team_name`→`teams(kind='national')`.
- **Contadores/badge:** count pendiente en `counters.ts` + `revalidateAdminCounters()`.
- **Nav:** entrada en `NAV_SECTIONS` de `admin/layout.tsx` (sección Onboarding/Moderación, `roles:['admin']`).
- **Notificaciones + email:** kinds `admin.nationalTeamApproved`/`admin.nationalTeamRejected` en `builders.ts` + plantillas Resend.
- **Auditoría:** `audit_logs` action `admin.nationalTeam.approve|reject` vía `notify.ts`.
- **CRUD master:** tab "Selección Nacional" en `/admin/players/[id]/edit/*`, reusando el editor del dashboard.

---

## 8. Archivos a crear / modificar

### Crear
- `src/db/schema/nationalTeams.ts` — tablas + enums + tipos.
- Migración Drizzle `src/db/migrations/00XX_*.sql` (vía `db:generate`) + RLS.
- Dashboard: `…/dashboard/edit-profile/national-team/{page.tsx, actions.ts, schemas.ts}` + `components/{NationalTeamManager, NationalTeamRowEditor, NationalTeamPhotoUploader}.tsx`.
- Onboarding: `…/onboarding/player/apply/Step2bNationalTeam.tsx`.
- Público: `…/[slug]/components/modules/NationalTeamModule.tsx` (+ cliente `ProfileNationalTeamModule.tsx`) y `…/components/free/NationalTeam.tsx`.
- Admin: `…/admin/national-team/page.tsx` + `…/api/admin/national-team/[id]/{approve,reject}/route.ts`.
- Upload: `…/api/media/upload/national-team/route.ts` (o param en endpoint actual) reusando transcode AVIF.

### Modificar
- `src/db/schema/{index.ts, relations.ts, translations.ts}`.
- Onboarding: `ApplyFlow.tsx`, `StepHeader.tsx`, `Step2Football.tsx`/`Step3Verify.tsx`, `/api/onboarding/submit/route.ts`.
- Plan/gating: `feature-gates.ts` (+ `subscriptions.limits_json` opcional).
- Público: `[slug]/page.tsx`, `LayoutResolver.tsx`, `FreeLayout.tsx`, `ProPlayerHeader.tsx`.
- Admin: `admin/layout.tsx`, `lib/admin/counters.ts`, `src/modules/notifications/builders.ts`, plantillas Resend.
- i18n: `src/i18n/messages/{es,en,it,pt}/{portfolio,dashboard,onboarding,admin}.json`.

### Skills a cargar en implementación (no ahora)
`vercel-react-best-practices`, `design:design-system` / `web-design-guidelines` (UX), `react-email` / `resend` (mails). Leer `docs/db/migration-workflow.md` antes de tocar schema.

---

## 9. Riesgos, dudas y decisiones abiertas (necesito confirmación)

1. **Granularidad de "experiencia"** ⭐ (impacta schema): ¿1 fila = *período por categoría* o = *convocatoria individual*? La propuesta soporta ambas en la misma tabla; convocatorias anidadas con descripción propia requerirían tabla hija `national_team_callups`. **Recomiendo v1 = una fila por experiencia.**
2. **Control de acceso:** ¿**Híbrido** (carga → moderación, sin grant) o grant previo "B pura"?
3. **Gating Free:** ¿badge compacto en Free (recomendado) o Pro-only total?
4. **`pro_plus`:** ¿diferencial sobre `pro` (más experiencias/fotos)? Hoy iría igual.
5. **Catálogo de selecciones:** ¿una `teams(kind='national')` por país (categoría en la fila) o por país×género×categoría? Recomiendo país-nivel + categoría en el stint.
6. **Stats:** ¿inline opcional (PJ/G/A/Min) para v1, o desglose temporada-a-temporada vía `stats_seasons`?
7. **Tipo de participación:** ¿`convocado/jugó/sparring/concentración` cubren todo, o agrego (debut, capitán, etc.)?
8. **Fotos:** ¿4 por experiencia (propuesto) o 4 totales por jugador? ¿Mismo bucket `player-media` (recomendado) o uno nuevo?
9. **Verificación de evidencia:** ¿el admin necesita doc/respaldo extra además de las fotos, o alcanza la revisión visual?
10. **(menor) UX:** ¿el bloque va antes o después del módulo Tactics en Pro? Propuesto: después de Trayectoria (antes de Press).

---

## Apéndice — verificaciones MCP

- `team_kind` enum incluye `national` ✅ · `gender` enum existe en `player_profiles` y `player_applications` ✅ · `plan = {free,pro,pro_plus}` ✅
- `career_items` sin flags juvenil/actual (derivados) ✅ · No existe tabla de selección (greenfield) ✅
- Bucket `player-media` público 5MB AVIF/webp/png/jpeg/svg ✅
- Vercel: proyecto `ballers-hub`, Next.js, Node 22, prod `ballershub.co`, branch `main` ✅

---

## 13. Decisiones confirmadas (owner, 2026-06-23)

- **Solo plan Pro de players. NO existe `pro_plus`** → gating binario Free/Pro.
- **(1)** Una fila por experiencia (sin tabla de convocatorias anidadas en v1).
- **(2)** Control de acceso: **Híbrido** (carga → moderación `pending_review` → admin aprueba).
- **(3)** Free: **no se renderiza en el portfolio público**. PERO la pregunta **sí se hace en onboarding aunque el plan sea Free** (para futuras cuentas de cortesía); el dato se captura/modera igual.
- **(4)** Sin diferencial pro_plus (no existe).
- **(5)** Selección a nivel país; categoría (Sub-XX/Mayor) en la fila.
- **(6)** Stats inline opcionales (caps/goals/assists/minutes).
- **(7)** Campo de "info extra" (debut, capitán, etc.) → `highlights text[]` (chips sugeridos, set abierto).
- **(8)** **4 fotos TOTALES** del bloque (no por experiencia), en catálogo aparte (`national_team_media`, keyed por jugador) → no cuentan contra el cap de 5 de la galería.
- **(9)** El admin debe poder verificar con dato real → campo `reference_url` (fuente verificable) por experiencia.
- **(10)** El bloque va **ANTES de Trayectoria** en el portfolio (Pro module + orden).

## 14. Estado de implementación

**Increment 1 — Capa de datos + plan gating ✅ (aplicado a DEV `ciolizjshimyvyonlssq`, verificado; PROD pendiente de OK del owner)**
- `src/db/schema/nationalTeams.ts` — enums `national_team_age_category`, `national_team_participation`; tablas `national_team_stints`, `national_team_media`. Status-on-row vía `playerStatusEnum`. Fotos keyed por jugador (cap 4 total).
- `src/db/schema/index.ts` + `relations.ts` — export + relations.
- `src/db/migrations/0017_demonic_changeling.sql` (Drizzle, journaled) + `0017a_national_team_rls.sql` (RLS + GRANTs, complementario).
- `src/lib/dashboard/feature-gates.ts` — gate `nationalTeam` (soft-save, Pro-only).
- `src/lib/dashboard/national-team.ts` — `NT_PHOTO_CAP=4`, labels de categorías/participación, chips de highlights.
- Verificación dev: 2 tablas, 2 enums, 4 policies, RLS activo. `typecheck` limpio (2 errores preexistentes ajenos: `@next/third-parties`).

**Increment 2 — Backbone de servidor ✅ (typecheck verde)**
- `…/national-team/schemas.ts` (zod: upsert/delete/reorder de etapas).
- `…/national-team/actions.ts` (server actions: `upsertNationalTeamStint` [status-on-row, toda edición → `pending_review`], `deleteNationalTeamStint`, `reorderNationalTeamStints`).
- `src/app/api/media/upload/national-team/route.ts` (upload, cap 4, AVIF, `is_approved=false`).
- `src/app/api/media/national-team/[id]/route.ts` (DELETE) + `…/reorder/route.ts` (PATCH).

**Increment 3 — Dashboard editor Pro-gated ✅ (typecheck verde)**
- `…/national-team/page.tsx` (RSC: carga stints + media + countries, resuelve plan).
- `…/components/NationalTeamManager.tsx` (manager per-row: alta/edición/borrado de etapas, soft-save gate Pro, chips de estado + nota de rechazo, highlights, stats opcionales, link de respaldo).
- `…/components/NationalTeamPhotoManager.tsx` (fotos, reusa `MediaGalleryGrid` + `useReorderable`, cap 4).
- `navigation.ts`: tab "Selección Nacional" tras "Datos futbolísticos".
- Decisión de diseño: **status-on-row per-etapa** (no cola de revisión global) → editar una etapa no esconde las demás aprobadas. Fotos gateadas a Pro en el dashboard; editor de etapas soft-save (Free completa, no guarda).

**Increment 5 — Render público Pro ✅ (typecheck + eslint verde)**
- `…/[slug]/components/modules/NationalTeamModule.tsx` (async server: fetch etapas+fotos APROBADAS, getTranslations) + `ProfileNationalTeamModule.tsx` (client: cards + grid de fotos).
- `LayoutResolver.tsx`: módulo en Suspense **antes de `CareerTimelineModule`** (solo Pro; FreeLayout no lo renderiza). Retorna null si no hay etapas aprobadas.
- `ProPlayerHeader.tsx`: entrada `national-team` en el scroll-spy.
- i18n: `nav.nationalTeam`, `loading.nationalTeam`, `modules.nationalTeam.{title,subtitle,current,noStats}` en es/en/it/pt (parity OK).

**Increment 6 — Moderación admin ✅ (typecheck + eslint verde)**
- `/admin/national-team/page.tsx` (cola de `pending_review` + datos del jugador) + `NationalTeamReviewList.tsx` (approve/reject con nota, link a la fuente).
- `/api/admin/national-team/[id]/approve` + `/reject` (ensureAdminActor admin-only; approve también pone `is_approved=true` a las fotos del jugador; audit; revalidate público+dashboard+counters; guard idempotente 409).
- `counters.ts`: cuenta de pendientes + badge. `admin/layout.tsx`: NAV "Selección Nacional" (admin/analyst).
- Feedback al jugador vía dashboard (chip de estado + nota por etapa). Email + toast con kind nuevo = follow-up (tocan registries tipados).

**Verificación:** `npm run typecheck` limpio (solo 2 errores preexistentes ajenos: `@next/third-parties`); `npx eslint` exit 0 en todos los archivos nuevos; i18n parity OK; DB en dev OK.

**Increment 4 — Onboarding ✅ (typecheck + eslint 0 errores)**
- `…/onboarding/player/apply/Step2bNationalTeam.tsx` (nuevo step "Selección Nacional" tras trayectoria, para TODOS los planes; picker de país = nacionalidades del paso 1; agregar/quitar experiencias).
- `ApplyFlow.tsx` (4 pasos), `StepHeader.tsx` (4 pasos + 2 claves i18n ×4 locales), `Step3Verify.tsx` (recibe `nationalTeam`, lo incluye en el payload).
- `/api/onboarding/submit/route.ts`: sanitiza y guarda `national_team` en `player_applications.notes`.
- `/api/admin/applications/[id]/approve/route.ts`: **materializa** las etapas a `national_team_stints` como **`pending_review`** (capa TS, leyendo `app.notes`, con `newProfileId`) — **sin tocar** la función PL/pgSQL `approve_player_application`. Pasan por la cola `/admin/national-team` igual que las del dashboard. No-fatal.

**✅ TODOS LOS INCREMENTS COMPLETOS (1–6 + 4).** Flujo completo: onboarding (captura, todos los planes) **o** dashboard (Pro soft-save) → moderación admin → render público Pro (antes de Trayectoria).

**DB:** `0017` + `0017a` aplicadas a **dev Y prod** (verificadas: 2 tablas, 2 enums, 4 policies, RLS activo) + row registrado en `drizzle.__drizzle_migrations` en ambos (db:migrate no las re-aplica). ✅

**Pendiente:** commit + PR (branch `claude/upbeat-moser-cccd31`).

**Follow-ups de pulido — ✅ COMPLETOS (2026-06-23).** Los tres ítems menores que se habían dejado fuera del core (tocan registries tipados):

1. **Notificación + email de aprobación/rechazo** ✅ — kinds nuevos `admin.nationalTeamApproved`/`admin.nationalTeamRejected` (builder + template/renderer en `src/modules/notifications/{types,builders,messages}.tsx`, snapshot + effect en `NotificationBootstrap.tsx`, query en `dashboard/layout.tsx`). Email Resend `national_team_reviewed` (template `src/emails/templates/national-team-reviewed.tsx` parametrizado por `result`, registrado en `_registry.ts` + sample en marketing preview, `sendNationalTeamReviewedEmail` en `resend.ts`). Helper `sendNationalTeamReviewedNotification` en `lib/admin/notify.ts` (espeja `sendAdminReviewNotification`). Las rutas `approve|reject/route.ts` lo disparan (no-fatal). i18n del toast en ES (es la copy del notification center, ya ES como el resto).
2. **Tab "Selección Nacional" en el CRUD master** ✅ — nuevo dominio `seleccion` en `edit-domains.ts` (+ LABELS/NOTICE/HREFS) y `edit-sections.ts` (tab tras Trayectoria). Página `…/admin/players/[id]/edit/seleccion/page.tsx` reusa `NationalTeamManager` con `adminMode` + acciones inyectadas `adminUpsertNationalTeamStint`/`adminDeleteNationalTeamStint` (en `edit/actions.ts`, service-role, escriben LIVE como `approved` — espeja `adminSubmitCareerLive`). El manager se parametrizó (`upsertAction`/`deleteAction`/`adminMode`) sin romper el flujo del jugador (defaults = acciones del dashboard). "Finalizar revisión · Selección Nacional" funciona vía el `FinalizeReviewBar` genérico.
3. **i18n de labels en el render público** ✅ — `modules.nationalTeam.ageCategory.*` (11) + `modules.nationalTeam.participation.*` (4) en los 4 locales (es/en/it/pt, parity OK). `NationalTeamModule.tsx` arma los maps con `getTranslations` y los pasa a `ProfileNationalTeamModule.tsx` vía `labels.{ageCategory,participation}`; ya no usa las constantes ES (`NT_*_LABELS` siguen vivas para los editores dashboard/admin).

**Verificación follow-ups:** `npm run typecheck` limpio (solo los 2 errores preexistentes ajenos de `@next/third-parties`); `npx eslint` exit 0 en los 19 archivos tocados; i18n parity OK (11 cat + 4 part × 4 locales). DB sin cambios (no se tocó schema).
