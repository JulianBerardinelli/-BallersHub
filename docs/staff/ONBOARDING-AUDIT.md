# Auditoría — Onboarding de Staff (reestructuración)

> Auditoría multi-agente (2026-06-30) del módulo de onboarding `coach/apply`,
> disparada por el owner al probar el alta. Doc canónico para la **"vuelta más"**
> de reestructuración. Implementación pensada para una **sesión fresca** (ver
> §Handoff al final). Complementa `docs/staff/PLAN.md` y `docs/staff/P2-RENAME-PLAN.md`.

## Resumen ejecutivo

El onboarding nació **DT-céntrico** (el comentario del propio tipo dice *"Una
etapa de la trayectoria del DT"*, `Step2Career.tsx:16`) pero la vertical ya es
**multi-rol de 13 oficios** (`STAFF_ROLES` en `src/lib/staff/roles.ts`): scout,
analista, físico, director deportivo, etc. **Lo bueno:** el modelo de datos ya es
role-agnostic (P0.1 cerrado — `primary_role`/`secondary_roles[]` + `roles[]` por
etapa) y el **backend de team-linking ya existe end-to-end** (proposals → approve
→ RPC `materialize_coach_career_from_application`); nada de esto requiere
migración nueva. Lo que hay que reestructurar: (1) todo el copy/naming sigue
diciendo "coach"/"Entrenador"/"Clubes dirigidos"; (2) la trayectoria del
onboarding usa **texto libre** en vez del `TeamPicker` (el stack de players ya
tiene el componente compartido listo para portar); (3) no hay validación de
overlaps de fechas (permitido por omisión, pero sin guard contra fechas
invertidas). **El hilo conductor: el modelo ya generalizó, la UI del onboarding
quedó atrás** — la mayor parte del trabajo es copy barato + reuso de componentes
ya existentes, no schema.

## Hallazgos por tema

| # | Tema | Severidad | Estado actual | Recomendación |
|---|---|---|---|---|
| 1 | **Naming/copy DT-céntrico** | P1 | `step2Sub`="Clubes dirigidos y titulaciones"; `careerTitle`="Clubes dirigidos"; `subtitle`="los clubes que dirigiste"; badge="Entrenador · Paso {step}"; `fullNamePlaceholder`="Ej: Marcelo Bielsa"; cargo="Ej: Director Técnico". En 7 locales (`*/onboarding.json`, ns `coachApply.*`). | Neutralizar a genérico staff o hacerlo **role-aware** (derivar del `primaryRole`, igual que el portfolio con `isHeadCoachLayout`). Solo i18n. |
| 2 | **Ruta `/onboarding/coach`** | P2 | URL `/onboarding/coach/apply`; no existe `/onboarding/staff`. API `/api/onboarding/coach/submit`. 5 links internos hardcodeados + 1 self-redirect. El 301 de `next.config.ts` solo cubre `/coach/:slug→/staff/:slug` público, NO el onboarding. | Diferir hasta lockstep con el rename físico `coach_*→staff_*` (P2.2), o aislado con 301. Decisión owner (a). |
| 3 | **Club texto libre vs TeamPicker** | **P0** | El club de cada etapa es un `<FormField>` texto plano (`Step2Career.tsx:198-205`). `TeamPickerCombo` solo se usa para el **equipo actual** (`:154-166`). El tipo `CoachCareerStage` (`:18-26`) **no tiene `teamId`**. | Portar `CareerEditor`/`CareerRowEditor` de players (ya staff-aware vía `showRole`/`showRoles`). El submit ya consume `team_id`/`proposed`/`roles`/`division_id` por etapa — no hace falta backend. |
| 4 | **Falta "agregar equipo si no está en base"** (controlado) | **P0** | No hay UI de "este equipo no está, proponelo" por etapa. Como `team_id` siempre es null, el submit fija `proposed_team_name = c.club` (`submit/route.ts:248`) y el RPC materialize **crea un `teams` pending por cada club no catalogado** → spam de equipos pending + slug sin `unaccent`. Sucede por detrás, sin control. | El `TeamCombobox` de players ofrece "agregar mi club" mientras se tipea (modal guiado con país + Transfermarkt) → emite `mode:"new"`. Reusar elimina el spam silencioso. |
| 5 | **Overlaps de fechas** | P1 | Step2Career **no valida fechas** (solo el team actual). La action valida cada año por rango pero no `end>=start` ni overlap. DB (`coach_career_items`) usa `date` nullable **sin** EXCLUDE/GiST. Overlap simultáneo permitido por omisión, sin guard contra fechas invertidas. | `CareerEditor` de players ya tiene `rangesOverlap` (`career-utils.tsx:15`) client-side. Decisión owner (c). |
| 6 | **"Cargo" libre Step1 vs `roles[]` estructurado** (redundancia) | P1 | Tres capturas de rol: `primaryRole`+`secondaryRoles[]` (select, Step1), `roleTitle` "Cargo" libre (Step1, placeholder="Director Técnico" = label del `head_coach` de arriba), y `roles[]` por etapa (Step2) + `roleTitle` libre por etapa (LEGACY). El código admite *"ex cargo libre"*. | Degradar/relabelear el "Cargo" libre (no parecer duplicado del select de arriba). Esconder el `role_title` libre por etapa. Decisión owner (d). |
| 7 | **Marco "clubes dirigidos" vs "experiencias laborales"** | P1 | El framing asume que dirige clubes. Un físico/analista/scout (2 de 3 perfiles vivos en prod NO son DT, censo §2 del PLAN) "no dirige clubes". El `roles[]` por etapa SÍ los soporta, pero el copy los excluye conceptualmente. | El PLAN ya resuelve no-DT con taxonomía universal (misma `coach_career_items`, distinto `roles[]`). Solo falta el copy genérico. Decisión owner (b). |
| 8 | **Labels de roles hardcodeadas (sin i18n)** | P2 | Multi-select de roles por etapa con strings es hardcodeados en el JSX (`Step2Career.tsx:207-212`); igual en Step1. | Mover a namespace i18n (`staffApply.*`). |

## Qué es COPY (barato) vs ESTRUCTURA (modelo/migración)

**COPY / i18n / cosmético — sin riesgo, sin migración:**
- Renombrar claves DT-céntricas en los 7 `*/onboarding.json` (ns `coachApply.*`):
  `header.step2Sub`, `header.badge`, `header.title`/`titleHighlight`,
  `step2.careerTitle`, `step2.subtitle`, `step2.licensesSubtitle`,
  `step1.fullNamePlaceholder`, `step1/step2.roleTitlePlaceholder`, `roleTitleError`.
- Mover los strings hardcodeados de Step1/Step2 a i18n.
- Consolidar el i18n muerto del chooser: `start.chooser.coach.*` (renderizado,
  "Cuerpo Técnico") convive con `start.chooser.staff.*` **huérfano** ("Soy DT /
  Scout / Dirigente" + "Próximamente").
- Comentarios "del DT" en el código (`Step2Career.tsx:16-17`, `:168`).

**ESTRUCTURA — pero YA HECHO (no hay deuda de modelo):**
- `primary_role`/`secondary_roles[]` + `roles[]` por etapa + normalizadores en el
  submit + fork de layout por `isHeadCoachLayout`. **P0.1 cerrado.**
- **Team-linking: schema completo.** `coach_career_items.team_id` (FK→teams),
  payload `proposed_team_*` en `coach_career_item_proposals`
  (`coachCareer.ts:50-54`), y el RPC `materialize_coach_career_from_application`
  (mig. `0015h`, dev+prod) convierten propuesta→team pending→FK. **El onboarding
  ya ESCRIBE estos campos**; falta que la UI los **pueble** (hoy solo manda `club`
  texto). → **Es UI, no migración.**

**ESTRUCTURA que SÍ faltaría (solo si se decide):**
- **Prohibir overlaps a nivel DB** requeriría migración nueva (`EXCLUDE USING gist`
  con `btree_gist` + `daterange`). Hoy NO existe ni está planeado. El modelo es
  **permisivo** por diseño. Si el owner quiere multi-equipo simultáneo como caso de
  1ª clase, **no falta nada**.
- ⚠️ **Migración `0022_flawless_jubilee.sql`** (ADD COLUMN `roles` a
  `coach_career_revision_items`) está **PENDIENTE dev+prod** (P0.1). Afecta al
  editor del **dashboard**, no al onboarding ni al admin-live, pero conviene
  aplicarla antes de tocar el flujo de trayectoria.

## Reuso desde players (target de port)

| Asset | Path | Estado |
|---|---|---|
| `TeamPickerCombo` (club actual + free-agent + `request_team_from_application`) | `src/components/teams/TeamPickerCombo.tsx` | Ya compartido (player+coach). |
| `TeamCombobox` (search-or-propose + modal "agregar mi club" + `onProposeNew`) | `src/components/teams/TeamCombobox.tsx` | Listo, target real. |
| `CareerEditor` (1 row/etapa + sync row actual + detección overlap) | `src/components/career/CareerEditor.tsx` | Acepta `showRole`/`showRoles`; montar ambos `true`. |
| `CareerRowEditor` (TeamCombobox + división 1ª/2ª + años + multi-select roles) | `src/components/career/CareerRowEditor.tsx` | Listo (`TeamCombobox variant="field"`). |
| `career-utils` (`rangesOverlap`, `sortCareer`, `validateYears`) | `src/components/career/career-utils.tsx` | Listo (overlap guard que el onboarding hoy no tiene). |
| `CareerRowRead` (vista read, ya renderiza `roles`) | `src/components/career/CareerRowRead.tsx` | Listo. |
| Referencia de cómo lo monta el player | `src/app/[locale]/(onboarding)/onboarding/player/apply/Step2Football.tsx:170-194` | Patrón a espejar. |
| Backend coach (ya existe, NO tocar) | `src/app/api/onboarding/coach/submit/route.ts:216-269`, `src/app/api/admin/coach-applications/[id]/approve/route.ts:188-204`, RPC `0015h`/`0020a` | Ya consume `team_id`/`proposed`/`roles`/`division_id`. |

**Acción de port (1 cambio central):** en `Step2Career.tsx`, reemplazar el bloque
`career.map(...)` de `FormField`s por `<CareerEditor items={career}
onChange={setCareer} showRole showRoles ... />`, y cambiar el shape
`CoachCareerStage` por el `CareerItemInput`/`RowDraft` que ya producen los
componentes compartidos, para que `team_id`/`team_meta`/`proposed`/`roles`/
`division_id` fluyan al submit (que ya los espera). Las licencias (coach-only, sin
análogo player) quedan tal cual.

## Decisiones de producto para el owner (con recomendación)

**(a) ¿Renombrar `/onboarding/coach`→`/onboarding/staff` ahora o diferir?**
→ **Recomendación: diferir** (lockstep con el rename físico de tablas P2.2). El
público no ve esta URL (onboarding autenticado). Fase A (copy) ahora; la ruta con P2.

**(b) "Experiencias laborales" role-agnóstico vs fork DT en el onboarding.**
→ **Recomendación: copy genérico universal ahora** ("Trayectoria profesional"),
role-aware copy (derivado del `primaryRole`) como nice-to-have posterior. El
onboarding **no debe forkear estructura** (no lo hace hoy; el fork DT vive solo en
el portfolio público vía `isHeadCoachLayout`).

**(c) ¿Cómo modelar overlaps?**
→ **Recomendación: permitir overlap libremente** (un `career_item` por cargo,
fechas libres) — el owner explícitamente lo quiere ("un club y a la vez otro cargo
en un juvenil"). El schema ya lo aguanta. Solo agregar: validación `end>=start`
(evita fechas invertidas) + aviso informativo no-bloqueante "estas etapas se
solapan". **NO** agregar constraint de exclusión. El render del timeline público
debe tolerar dos etapas con el mismo período.

**(d) ¿El "Cargo" libre de Step1 se elimina?**
→ **Recomendación: degradar, no borrar.** El schema ya lo marca
`role_title_custom` "solo display". Conserva el sabor libre que algunos perfiles
quieren, pero **reubicarlo/relabelearlo** para que no parezca duplicado del select
de arriba. El `role_title` libre **por etapa** (LEGACY) sí puede esconderse, ya que
`roles[]` lo cubre.

## Plan por fases (la "vuelta más")

**Fase A — Copy/naming** (bajo riesgo, sin migración, no lockstep). 7×
`onboarding.json` (`coachApply.*` + `start.chooser.*`) + hardcodes en Step1/Step2.
Neutralizar DT→genérico, mover hardcodes a i18n, consolidar el chooser muerto,
limpiar comentarios. Mergeable sola.

**Fase B — TeamPicker + add-team** (reuso players). `Step2Career.tsx`: reemplazar el
bloque career por `CareerEditor` con `showRole showRoles`; mapear `CoachCareerStage`
→ `CareerItemInput`; verificar que `team_id`/`proposed`/`roles`/`division_id` llegan
a `submit/route.ts:218-256` (ya los lee). Sin migración (backend + schema existen).
Riesgo medio (shape + integración). **Pre-req sugerido:** aplicar `0022` antes.

**Fase C — Overlaps + rol por etapa** (depende de (c)). Si Opción 1: mantener el
warning no-bloqueante de `CareerEditor` + guard `end>=start`; confirmar que el
render del timeline público tolera períodos solapados. `roles[]` por etapa ya
cableado (P0.1). Sin migración salvo que se elija prohibir overlaps.

**Fase D — Rename de ruta** (solo si se decide, diferido). `git mv` de
`onboarding/coach/apply/` + `api/onboarding/coach/submit/`; 5 links hardcodeados
(`start/page.tsx:66,212`, `CoachOverview.tsx:105,120`, `CoachDashboardShell.tsx:73`)
+ self-redirect (`coach/apply/page.tsx:18`); 301 en `next.config.ts`; rename de
componentes + namespace i18n `coachApply.*`→`staffApply.*`. **Lockstep con P2.2.**
Riesgo medio-alto. **Al final.**

## Mapa de archivos clave

| Path | Rol |
|---|---|
| `onboarding/coach/apply/page.tsx` | RSC gate (lee `coach_profiles`/`coach_applications`, redirige si ya aplicó). |
| `onboarding/coach/apply/CoachApplyFlow.tsx` | Orquestador de los 3 pasos. |
| `onboarding/coach/apply/StepHeader.tsx` | Badge + título + stepper (copy DT). |
| `onboarding/coach/apply/Step1Identity.tsx` | Identidad + `primaryRole`/`secondaryRoles[]` + "Cargo" libre redundante (hardcodes). |
| `onboarding/coach/apply/Step2Career.tsx` | **Trayectoria** — club texto libre (no TeamPicker), `roles[]` por etapa, licencias, sin validación de fechas. |
| `onboarding/coach/apply/Step3Verify.tsx` | KYC + submit (POST a `/api/onboarding/coach/submit`). |
| `onboarding/start/page.tsx` | Chooser jugador/staff (link a `/onboarding/coach/apply`; i18n muerto `start.chooser.staff`). |
| `api/onboarding/coach/submit/route.ts` | Escribe `coach_career_item_proposals` (ya consume `team_id`/`proposed`/`roles`/`division_id`). |
| `api/admin/coach-applications/[id]/approve/route.ts` | Accept proposals + RPC materialize. |
| `actions/coach-career.ts` | Editor de trayectoria del **dashboard** (SÍ tiene picker/proposedTeam — contraste con onboarding). |
| `components/teams/TeamPickerCombo.tsx` / `TeamCombobox.tsx` | Picker compartido + search-or-propose. |
| `components/career/CareerEditor.tsx` / `CareerRowEditor.tsx` / `career-utils.tsx` / `CareerRowRead.tsx` | Stack de trayectoria de players a portar (overlap guard incluido). |
| `lib/staff/roles.ts` | 13 roles, `MAX_STAGE_ROLES=3`, `isHeadCoachLayout`. |
| `db/schema/coachCareer.ts` | `coach_career_items` (`team_id` FK, `roles[]`, `date` nullable sin EXCLUDE) + proposals (`proposed_team_*`). |
| `db/migrations/0015h_*.sql` / `0020a_coach_materialize_roles.sql` | RPC materialize (proposal→team pending→FK + `roles[]`). |
| `db/migrations/0022_flawless_jubilee.sql` | ⚠️ `roles` en `coach_career_revision_items` — **PENDIENTE dev+prod** (editor dashboard). |
| `i18n/messages/*/onboarding.json` | Copy `coachApply.*` + `start.chooser.*` (7 locales). |
| `next.config.ts` | Redirects 301 (hoy solo `/coach/:slug`, NO el onboarding). |

## Handoff (para la sesión fresca de implementación)

1. Leé este doc + `docs/staff/PLAN.md` (§4 modelado, §5.2 trayectoria, Roadmap) +
   `docs/staff/P2-RENAME-PLAN.md`. Memoria del proyecto: `project_staff_refactor`.
2. **Esperá las respuestas del owner a las decisiones (a)-(d)** antes de Fase B/C/D.
   Fase A (copy) se puede arrancar sin bloqueo.
3. Convenciones: branch desde `origin/main`, **una PR = base main (NO apilar** —
   lección de #271/#272), commits en español, tsc + next build verde antes de
   pushear, owner mergea. Migraciones a prod requieren OK explícito.
4. ⚠️ El `<body>` ya NO debe llevar `relative` (fix #278, bug global de dropdowns
   HeroUI). No reintroducir.
