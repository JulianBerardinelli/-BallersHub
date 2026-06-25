# Plan: de "coaches" a vertical **Staff** multi-rol

> **Estado:** EN EJECUCIÓN. Branch `feat/staff-vertical` (basado en `main`). Sin PR aún.
> **Doc canon previo de la vertical actual:** [`docs/coaches/INTEGRATION.md`](../coaches/INTEGRATION.md).
> **Tesis:** `coaches` no está mal arquitecturado — está mal **nombrado**. Es un clon estructural de `players` (~23 tablas `coach_*`) con `coach` hardcodeado y una suposición de "1 rol = texto libre". Generalizar a *staff* es barato **si se hace ahora**.
> Self-contained: leer esto primero si se continúa el refactor.

---

## ✅ Estado de ejecución (2026-06-24)

**Fase 0-A (DB aditiva) — APLICADA a Supabase dev + prod (2026-06-24).**

Decisión clave del protocolo: el RENAME `coach_*`→`staff_*` es destructivo (regla de oro #4 → two-step), así que la Fase 0 arranca **aditiva sobre las tablas `coach_*`** y el rename físico queda diferido. El rebrand público `/staff` + "Cuerpo Técnico" es sólo rutas+redirects (no DB).

- Branch: `feat/staff-vertical` (desde `origin/main`; `main` ya tenía `0018_swift_baron_zemo` del national team → mi migración quedó en **`0019`**).
- Schema TS: `enums.ts` (+`staff_role_type` 13 valores), `coaches.ts` (+`primary_role`/`secondary_roles[]`/`role_title_custom`), `coachCareer.ts` (+`roles[]` en items y proposals), `coachMedia.ts` (+`rubro_id`), `coachMethodology.ts` (tabla `coach_methodology_rubros`).
- Migraciones: `0019_chilly_cannonball.sql` (Drizzle, aditiva) + `0019a_staff_methodology_rls.sql` (RLS pre-moderada) + `0019b_coach_media_bucket_ppt.sql` (bucket ppt/pptx + 25MB).
- **Aplicado a dev + prod** vía MCP (apply_migration 0019/0019a + execute_sql 0019b) + hash de 0019 registrado en `drizzle.__drizzle_migrations` en ambos. Smoke test OK en los dos (enum 13, tabla+RLS 4 policies, columnas, bucket 25MB). dev `coach_profiles`=0; **prod backfill aplicado**: rivero→`fitness_coach`, dante→`tactical_analyst`, emiliano→`head_coach`+`{tactical_analyst}`.

**Layer de código (Fase 1) — en progreso:**
- ✅ `src/lib/staff/roles.ts` — taxonomía canónica de los 13 roles + grouping + `isHeadCoachLayout()` + validadores (commit `560a912`). Typecheck del proyecto: 0 errores.
- ✅ Onboarding multi-rol (incremento 2): Step1 pickers (rol principal req + hasta 2 secundarios, agrupados Cuerpo Técnico/Especialistas) + Step2 multi-select de hasta 3 roles por etapa + submit + approve/materialize (RPC `0020a`) + display en cola admin. Migración `0020` (coach_applications role cols) + `0020a` (RPC roles) en **dev+prod**. role_title pasó a "título específico" opcional. Typecheck 0.
- ✅ Portfolio: display del rol estructurado (`primary_role` + secundarios) + fork `isHeadCoachLayout` (Free + Pro), commit `b6dae9f`. null → comportamiento viejo (hasta onboarding). Typecheck 0 errores.
- ✅ Módulo Metodología (incremento 3, commits `519d308`/`358ce78`/`a6386b6`): universal (todos los oficios, NO usa el fork DT), pre-moderado. Editor `/dashboard/coach/methodology` (rubros título+ícono+body+adjuntos, estados, cap Free 2) + actions + ruta upload PDF/PPT (Pro-gate, 25MB) + render público Free(≤2, sin docs)/Pro(todo+docs) + cola admin `/admin/coach-methodology` (approve/reject, docs en cascada) + counter/badge. `coach_media type='doc'` excluido de la cola Multimedia. Typecheck 0. ⚠️ `next build` no corrido en el worktree (sin deps full); auditado el rule "use server" a mano (FREE_RUBRO_CAP movido a methodology-data).
- ✅ i18n namespace `staff` (commit `00567d4`): 7 locales (paridad 17 keys) con labels de los 13 roles + grupos + títulos de Metodología; registrado en `request.ts`; wireado en portfolio público (rol estructurado + metadata), pickers de onboarding y títulos del módulo Metodología. `STAFF_ROLE_LABELS_ES` queda como fallback. (Editor de metodología en dashboard sigue es-only — sesión propia del coach.)
- ✅ Rebrand público `/coach/[slug]` → `/staff/[slug]` (commit `f3f0c54`): `git mv` de la ruta + **redirect 301** en `next.config` (regex de locale, no pisa `/dashboard/coach/*`) + todas las refs de URL (canonical/hreflang/sitemap/llms/JSON-LD/locale-switcher/"ver perfil") + label del chooser de onboarding → "Cuerpo Técnico" (7 locales). Rutas internas `/dashboard/coach/*` + tablas `coach_*` NO renombradas (invisible al público).
- ✅ `next build` (turbopack) **verde** (exit 0 + BUILD_ID, 638 páginas) tras `npm ci` en el worktree — verificó route move/use-server/i18n/módulo. Fix: 2 `<a href="/checkout/pro-coach">` → `<Link>` (regla `no-html-link-for-pages`). (Los errores de DB en static-gen son por env dummy, fallback graceful.)
- ✅ Copy sweep DT→"Cuerpo Técnico"/"Staff": fallback público del portfolio + nav admin (sección "Cuerpo Técnico", labels "... Staff"). Footer queda en i18n (razonable).
- ✅ **Traducción por-perfil de los rubros de Metodología** (commit `b01dc9f`): el CONTENIDO (title/body) se traduce desde Idiomas (Pro, nativa+3) — tabla `coach_methodology_rubro_translations` (0021+0021a, dev+prod) + merge público + sección en `CoachTranslationsEditor`. (El CHROME del editor sigue es-only, consistente con todo el dashboard coach.)
- ⏳ (opcional) JSON-LD jobTitle podría usar el rol estructurado; i18n del chrome del dashboard (todos los editores, no solo metodología) si se decide.

El rename físico `coach_*`→`staff_*` sigue diferido (two-step).

---

## 0. Decisiones del owner ya cerradas (2026-06-24)

| # | Decisión | Resolución |
|---|---|---|
| D1 | Layout fork DT vs Canvas | **Solo el `primaryRole`** decide (determinístico). |
| D2 | URL pública | **`/staff/[slug]` plano** (un slug por persona, multi-rol no encaja en carpeta por oficio). |
| D3 | Gating del módulo Metodología | **Híbrido por plan**: Free = teaser de *datos* (roles por etapa + esquemas favoritos/formaciones como chips). El **módulo rico** (rubros, archivos, pizarra, logros con video) es **gancho Pro**. |
| **D7** | **Nivel Free de Metodología** | Free = **hasta 2 rubros de texto, sin archivos**; Pro = rubros ilimitados (~6) + archivos PDF/PPT. (El especialista Free no queda con página vacía.) |
| D4 | Rename timing | Pendiente confirmación final; prod revisado (ver §2). Recomendación: **Fase 0 ahora** con backfill por-fila. |
| **D5** | **Metodología = universal, no DT-only** | Es un **campo libre para cualquier oficio**. Esto **fusiona el viejo módulo "Canvas" dentro de Metodología** (son lo mismo: rubros con ícono + texto libre). El fork DT ahora **solo** agrega *Ideas de Juego (pizarra)*. |
| **D6** | **Archivos en Metodología** | Cada rubro permite adjuntar **PDF / PPT / PPTX** (común en el rubro). Aplica a **todos los oficios**. Se reusa `staff_media` con `type='doc'` (ver §5.2). |
| — | Label público "Staff" vs "Cuerpo Técnico" | Abierto (recomendado: ruta `/staff` interna, label UI "Cuerpo Técnico"). |
| — | Glosario de 13 roles + mapeo de oficios sueltos ("Captación", "Coord. General", "Asesor Deportivo") | Abierto (ver §3). |

---

## 1. Estado actual — lo que YA existe (no reconstruir)

- **El "rol" hoy es texto libre, no taxonomía.** `coach_profiles.role_title` es `text`; los campos DT viven hardcodeados en la fila: `methodology_analysis`, `playing_style`, `preferred_formations[]` (`src/db/schema/coaches.ts`). `coach_career_items.role_title` es **un solo** texto por etapa → no soporta multi-rol por etapa.
- **El portfolio es un único renderer DT-céntrico**: `coach/[slug]/components/CoachPortfolio.tsx` (Free dossier) y `pro/ProCoachLayout` → `CoachProContent` (Pro, 7 módulos: Bio, Tactics=metodología+formaciones, CareerTimeline, Honours+Licenses, MediaGallery, PressNotes, Contact). No existe "canvas genérico".
- **Medio wishlist ya está en DB, solo falta surfacearlo:**
  - `coach_personal_details` ya tiene `languages`, `education`, `residence_city/country`, `phone`, `whatsapp`, `show_contact_section` → **edad/residencia/educación/idiomas = puro UI+onboarding** (¡la tabla ni se llena hoy! `has_pd_row=false` en los 3 perfiles de prod).
  - `coach_links` existe pero **sin editor en el dashboard** (falta UI; portar el `ExternalLinks`/`EXT_THEMES` de players).
  - `coach_media` ya soporta `type='doc'` (`media_type` enum = photo/video/doc) → base lista para los archivos de §5.2.
  - `model_url_1` / `model_url_2` ya son 2 slots de asset Pro (el 2.º no se renderiza).
- **Enums compartidos (NO tocar):** `status` reusa `player_status` (`draft|pending_review|approved|rejected`), `visibility`=`public|private`, `plan`=`free|pro|pro_plus`. El theme vive en **columnas** de `coach_profiles` (no en tabla aparte como players).
- **Billing:** `pro-coach` (= precio Pro Player) en `src/lib/billing/plans.ts`, cableado a `resolvePlanAccess` y `/checkout/pro-coach`.
- **El `role` enum de auth** (`user_profiles.role`: member/player/coach/manager/reviewer/admin/moderator/analyst) es el eje **permisos** — ortogonal al `staff_role_type` (oficio) que agregamos. **No** mezclarlos.

---

## 2. Censo de producción (2026-06-24) — lo que el owner pidió revisar

Supabase prod `erdvpcfjynkhcrqktozd`. **3 perfiles, todos aprobados, todos Free, 0 Pro.** 3 applications, 36 career items, 13 licencias, 10 multimedia, 1 link, 0 stats_seasons, 0 honours.

| Slug | role_title (texto libre) | primaryRole mapeado | bio/style/method/form | Layout correcto |
|---|---|---|---|---|
| `rivero-paulo-ezequiel` | "Preparador Físico de Fútbol" | `fitness_coach` | ✗/✗/✗/0 | **Canvas (no-DT)** |
| `dante-curi-huespe` | "Analista Táctico" | `tactical_analyst` | ✓/✓/✗/0 | **Canvas (no-DT)** |
| `emiliano-zoppi` | "Entrenador y Analista Táctico" | `head_coach` (+ `tactical_analyst`) | ✓/✓/✓/4 | **DT** |

**Conclusiones del censo:**
1. **2 de 3 perfiles vivos NO son entrenadores** (un físico y un analista) y hoy ven un layout DT con secciones vacías/irrelevantes. → La cara no-DT no es "futuro Fase 2": ya hay demanda real.
2. **Multi-rol ya pasa**: Emiliano escribió "Entrenador y Analista Táctico" en un campo. Y los `role_title` por etapa muestran hasta **3 roles con "/"**: `"Entrenador Asistente Sub-16 / Analista Táctico / Scout"`, `"Analista de Rendimiento / Entrenador Asistente / Entrenador Filial"`. → Valida `secondaryRoles[]` (máx 2) y `roles[]` por etapa (cap **3**, confirmado).
3. **0 perfiles Pro** → rename `pro-coach`→`pro-staff` limpio, sin suscripciones en vuelo, **sin alias**.
4. **`coach_personal_details` nunca se llena** → idiomas/educación/residencia es gap de UI, no de schema.
5. Hay **datos reales** (36 career items, 13 licencias) y **3 slugs públicos vivos** → rename seguro (`ALTER … RENAME` no destructivo) pero exige **301 redirects** y deploy lockstep con el código.

---

## 3. Taxonomía de los 13 roles (`staff_role_type` enum)

**Grupo Cuerpo Técnico (rol principal aquí → el portfolio agrega *Ideas de Juego*):**
1. `head_coach` — Entrenador
2. `assistant_head_coach` — Segundo Entrenador
3. `assistant_coach` — Entrenador Asistente

**Grupo Especialistas (rol principal aquí → portfolio sin *Ideas de Juego*):**
4. `fitness_coach` — Preparador Físico
5. `rehab_physio` — Readaptador / Fisio
6. `goalkeeping_coach` — Entrenador de Arqueros
7. `set_piece_coach` — Entrenador de Balón Parado
8. `tactical_analyst` — Analista Táctico
9. `data_analyst` — Analista de Datos
10. `scouting` — Scouting
11. `sporting_director` — Director Deportivo
12. `academy_coordinator` — Coordinador de Cantera
13. `methodology_director` — Director de Metodología

> Tras D5, los dos grupos **comparten** Metodología (universal). El grupo **solo** define si se monta *Ideas de Juego (pizarra)*.

**Oficios sueltos vistos en prod a mapear (decisión de glosario):** "Captación" → `scouting`; "Coordinador General de Fútbol" → `academy_coordinator`/`sporting_director`; "Asesor Deportivo" / "Secretaría de fútbol" → `sporting_director`; "Analista de Rendimiento" → `data_analyst`; "Entrenador Filial" → `head_coach`/`assistant_coach`. (¿"Captación" merece rol propio o se funde en scouting?)

> El enum + labels es/en/it/pt es **glosario caro de cambiar post-launch** → congelar antes de Fase 0.

---

## 4. Decisión núcleo de modelado

Evaluadas 3 opciones: **(A)** rename `coach_*`→`staff_*` + roles; **(B)** dejar `coach_*` + join tables; **(C)** `staff_*` paralelo dejando `coach_*` vivo.

**Recomendación: A** (rename + roles híbridos), como migración expand→contract.
- **C** = dos renderers/onboardings/colas admin/sitemaps/RLS → la duplicación que se quiere evitar. Rechazado.
- **B** deja una mentira en el schema (`coach_profiles` guardando físicos y scouts). El costo extra de A sobre B es ~un `RENAME` por tabla.

**Almacenamiento de roles (híbrido enum + arrays):**

| Qué | Cómo | Por qué |
|---|---|---|
| Taxonomía | `pgEnum staff_role_type` (13 valores) en `enums.ts` | type-safety + keys i18n estables + filtros del job board |
| Roles del perfil | `primary_role staff_role_type NOT NULL` + `secondary_roles staff_role_type[]` (máx 2, validado en action) | `WHERE primary_role = X` indexado; set 1-3 no justifica join table |
| Sabor libre | `role_title_custom text` (nullable, solo display) | conservar "DT principal de la cantera" |
| Roles por etapa | `roles staff_role_type[]` (máx 3) en `staff_career_items` | real en prod hasta 3 |
| Key de layout | **derivado, no se guarda**: `isHeadCoachLayout = primary_role ∈ {head_coach, assistant_head_coach, assistant_coach}` | fork determinístico (D1) |

---

## 5. Arquitectura de layout — base universal + un add-on DT

Una ruta `/staff/[slug]` + un resolver. Dos ejes ortogonales:
- `isFree`/`isPro` (`resolvePlanAccess`, ya existe) → riqueza de cada módulo.
- `isHeadCoachLayout` (`primary_role`) → si se monta *Ideas de Juego*.

Servido por `ProStaffLayout` (ex-`ProCoachLayout`) + `StaffProContent` (ex-`CoachProContent`).

**Clasificación de módulos (post-D5):**
- **Universales (todos los oficios):** Bio/identidad (edad·residencia·educación·idiomas·rol principal + **enlaces en bio bajo el nombre**), Trayectoria (+ `roles[]` por etapa, crests, transfermarkt), Palmarés+Licencias, Multimedia, Prensa, Contacto, **Metodología** (rubros con ícono + texto libre + **archivos PDF/PPT** — absorbe el viejo "Canvas").
- **Solo si `isHeadCoachLayout`:** **Ideas de Juego** (formaciones + pizarra `jsonb` + blurb + link + logros por etapa con video).

**Regla de render:** `StaffProContent` monta `[Bio, Trayectoria, Palmarés, Multimedia, Prensa, Contacto, Metodología]` siempre; agrega `[Ideas de Juego]` solo si `isHeadCoachLayout`. El dossier Free espeja el condicional con menos riqueza (ver §5.1).

### 5.1 Gating Free/Pro (eje ortogonal al oficio)

| Superficie | Free | Pro |
|---|---|---|
| Esquemas favoritos (chips `preferred_formations[]`) | ✅ | ✅ |
| Roles por etapa de trayectoria (chips `roles[]`) | ✅ | ✅ |
| Metodología: rubros de texto | ✅ **hasta 2 rubros** (sin archivos) | ✅ ilimitado (~6) |
| Metodología: archivos PDF/PPT | ❌ | ✅ |
| Ideas de Juego: pizarra interactiva + logros con video (DT) | ❌ | ✅ |

> Resumen del owner (D3 + D7): en Free, **solo el dato** (puestos/roles por etapa, esquemas favoritos) **+ hasta 2 rubros de metodología en texto** (sin adjuntos) → el especialista Free tiene una página usable. Pro desbloquea rubros ilimitados + archivos PDF/PPT + Ideas de Juego.

### 5.2 Modelado de los módulos nuevos/cambiados

- **Metodología (UNIVERSAL — D5):** promover `methodology_analysis text` plano a tabla hija `staff_methodology_rubros (id, staff_id, title, icon, body /* texto libre */, position, status /* pre-moderado */)` (los ~4 rubros, flexible hasta ~6) + mantener `methodology_analysis`/`analysis_author` como "descripción general". Disponible para **todos los oficios**.
- **Archivos en Metodología (D6):** **reusar `staff_media`** (ex `coach_media`) con `type='doc'` + nueva columna nullable **`rubro_id`** FK a `staff_methodology_rubros`. Reusa bucket + RLS + moderación + upload action; los `doc` no aparecen en la galería de fotos/videos. Allowlist PDF/PPT/PPTX (opc. DOCX/XLSX/Keynote), validar **magic bytes** server-side, tope tamaño ~25–50 MB, tope de cantidad por plan, **pre-moderado**. Render público: PDF → preview inline + descargar; PPT/PPTX → card de descarga (conversión server-side a PDF/thumbnail = nice-to-have posterior). El `body` del rubro queda como pasaje citable (GEO); los archivos son apoyo.
- **Ideas de Juego (DT, Pro):** `staff_game_ideas (id, staff_id, formation, blurb, pitch_board jsonb, link, position)` — `pitch_board jsonb` = estado de la pizarra (fichas + flechas). Hasta 3. **Logros por etapa** extienden `staff_stats_seasons` (PJ/PG/PE/PP/GF/GC + `career_item_id`): + `achievement_kind` (juvenil/campeonato/ascenso/playoff) + `highlight_video_url`.
- **Trayectoria rica:** `staff_career_items` ya tiene `team_id` (→ crest), divisiones y transfermarkt vía proposals; + `roles[]` (chips por etapa); stats/palmarés opcionales por etapa.

> Nota de fusión: el viejo módulo "Canvas" (categorías con íconos + texto + work samples para no-DTs) **no existe como tabla aparte** — es exactamente `staff_methodology_rubros` + sus archivos. Un físico crea rubros "Planificación de cargas", "Prevención de lesiones" y adjunta su periodización en PDF; un scout, su metodología de captación; etc.

---

## 6. Mapa de reuso (generalizar vs construir)

**Generalizar (rename en sitio, ya agnósticos):** `SmoothScrollProvider`/`ScrollMeasurementSync`, `ProCoachLayout`→`ProStaffLayout`, contacto lead-gated, `PortfolioFooter(ownerKind)`, átomos (`BlockReveal`/`ScrambleText`/`CountUp`/`CountryFlag`), **theme en columnas** (no migrar a `profileThemeSettings`), plan-gating (`resolvePlanAccess`/`FEATURE_GATES`/`<PlanGate>` — agregar `'staff'` a `PlanAudience`), billing (`pro-coach`→`pro-staff`), SEO (`isCoachIndexable`→`isStaffIndexable` + `sitemap.ts` + `FREE_BIO_INDEX_MIN_CHARS`), i18n (namespace `staff` + tabla translations + cuota IA), onboarding (`coach_applications`→`staff_applications` + selección de roles), **`coach_media` (type='doc') + su bucket/moderación/upload action** → base de los archivos de Metodología.

**Construir nuevo:** enum `staff_role_type` + columnas de rol + `roles[]` por etapa; `StaffMethodologyModule` (rubros + adjuntos, **universal**) + su editor; `StaffGameIdeasModule` (+ editor de pizarra, DT); columna `rubro_id` en `staff_media` + render de adjuntos PDF/PPT; **editor de Enlaces** (tabla existe, falta UI); **editor de datos personales** (`/dashboard/staff/contact`); nav de dashboard role-aware (DT ve Ideas de Juego; todos ven Metodología); directorio `/staff` (Fase 3).

---

## 7. Ruta de rollout ágil

- **Fase 0 — Rename + modelo de roles** (1 PR coordinado, dev→prod):
  1. Drizzle: renombrar tablas `coach_*`→`staff_*` (`ALTER … RENAME`, no destructivo). Agregar `staff_role_type`, `primary_role`/`secondary_roles[]`/`role_title_custom`, `roles[]` en career items.
  2. **Backfill por-fila** (3 filas en prod):
     - `rivero-paulo-ezequiel` → `primary_role = fitness_coach`
     - `dante-curi-huespe` → `primary_role = tactical_analyst`
     - `emiliano-zoppi` → `primary_role = head_coach`, `secondary_roles = {tactical_analyst}`
  3. `db:generate` → revisar SQL → **dev primero, smoke-test**, luego **prod con OK explícito**. Renombrar el SQL RLS (`0015a_coach_rls_*`) en lockstep.
  4. Renombrar rutas/actions/componentes/i18n. `pro-coach`→`pro-staff` + env. **301 redirects** `/coach/[slug]`→`/staff/[slug]` y `/dashboard/coach/*`→`/dashboard/staff/*` (3 slugs vivos).
  5. Verificar con `git merge-base --is-ancestor` que los commits del rename llegaron a `origin/main`.
- **Fase 1 — Entrenadores + Metodología universal (con archivos) + onboarding multi-rol.** Como 2/3 perfiles vivos son no-DT, construir la **base universal** (Bio/datos personales/Enlaces/Trayectoria/Metodología+archivos) junto al add-on DT (Ideas de Juego). Backfill ya rutea cada perfil a su cara.
- **Fase 2 — Pulido por rol + `roles[]` por etapa en editor de trayectoria + 2.º asset Pro + (opc.) conversión PPT→PDF/thumbnail.**
- **Fase 3 — Job board `/staff`.** Directorio + `getIndexableStaff()` + sitemap/hreflang; filtros por rol (enum), nacionalidad, idioma.

> Ajuste vs plan original: la cara no-DT (ahora = Metodología universal) sube a Fase 1 porque ya hay usuarios reales que la necesitan.

---

## 8. Riesgos

- **Colisión de migraciones** (ya pasó en coaches 0014→0015 por hash-register fuera de `db:migrate`): mergear Fase 0 rápido y verificar ancestría.
- **No tocar** `role`/`player_status`/`visibility`/`plan`/`media_type`/`review_status` (compartidos).
- **Datos + slugs reales en prod** (3 perfiles): rename no destructivo pero deploy lockstep + 301 obligatorios.
- **Archivos subidos (PDF/PPT) servidos en página pública** (D6): validar magic bytes (no extensión), tope tamaño/cantidad, **pre-moderar** antes de exponer, servir con headers correctos (`Content-Disposition`), considerar que PPTX puede traer macros → solo descarga, nunca ejecución. Storage cost crece con archivos → de ahí el gating por plan.
- Dejar que `db:generate` autoree el SQL del rename; `meta/_journal.json` + snapshots intocables.

---

## 9. Archivos que más se tocan

`src/db/schema/coach*.ts` (→ `staff*.ts`), `src/db/schema/enums.ts`, `src/db/schema/coachMedia.ts` (+ `rubro_id`), `src/lib/billing/plans.ts`, `src/lib/dashboard/plan-access.ts`, `src/lib/dashboard/feature-gates.ts`, `src/lib/seo/indexable-profiles.ts`, `src/app/sitemap.ts`, `src/app/[locale]/(public)/coach/[slug]/**`, `src/app/[locale]/(dashboard)/dashboard/coach/**`, `src/app/[locale]/(dashboard)/dashboard/navigation.ts`, `src/app/[locale]/(onboarding)/onboarding/coach/**`, `src/app/actions/coach-*.ts`, el SQL RLS `0015a_coach_*`, y `docs/coaches/INTEGRATION.md`.

---

## 10. Decisiones abiertas

1. ~~Nivel Free del módulo Metodología~~ → **RESUELTO (D7)**: Free = hasta 2 rubros de texto sin archivos; Pro = ilimitado + archivos.
2. **Label público** "Staff" vs "Cuerpo Técnico" (ruta `/staff` interna + label UI).
3. **Glosario de los 13 roles** + mapeo de oficios sueltos ("Captación" ¿rol propio o scouting?, "Coordinador General", "Asesor Deportivo").
4. **Allowlist de archivos**: ¿solo PDF/PPT/PPTX o también DOCX/XLSX/Keynote? Tope de tamaño y de cantidad por plan.
