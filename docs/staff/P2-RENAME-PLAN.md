# P2 — Rename estructural `coach_*` → `staff_*` (PLAN, sin ejecutar)

> Doc canónico de planificación para los **dos últimos bloques** del roadmap de la
> vertical Staff (ver `docs/staff/PLAN.md` §Roadmap). Son los más sensibles:
> destructivos y de deploy coordinado (lockstep). **No ejecutar sin OK explícito
> del owner.** Estado al 2026-06-30: P0 + P1 (incl. pizarra y logros) + P2.1 (job
> board `/staff`) completos y en prod; sólo restan P2.2 y P2.3.

## Contexto

La URL pública ya es `/staff/[slug]` (rebrand previo, con 301 desde `/coach/*`),
pero **las tablas siguen llamándose `coach_*`** y el plan de billing `pro-coach`.
Es deuda de naming, no funcional. El censo de prod es chico (pocos perfiles, 0
suscripciones Pro de coach al momento del rebrand), lo que **reduce el riesgo**:
no hay tráfico alto ni cobros en vuelo.

---

## P2.3 — Billing `pro-coach` → `pro-staff` (hacer PRIMERO, bajo riesgo)

Es independiente de P2.2 y más simple. Conviene de "calentamiento".

**Pasos:**
1. `src/lib/billing/plans.ts`: agregar el slug `pro-staff` apuntando al **mismo
   `price_id` de Stripe/MP** (el precio no cambia, sólo el slug interno).
2. **Alias legacy**: en `resolvePlanAccess`, mapear `pro-coach` → `pro-staff`
   (por si queda un registro histórico o un webhook con el slug viejo). Barato y
   seguro; no romper suscripciones existentes.
3. Ruta de checkout: `/checkout/pro-staff` + **301** desde `/checkout/pro-coach`.
   Actualizar todas las referencias en código (links de checkout, gates Pro,
   `?currency=ARS`, etc.).
4. Stripe/MP: NO se toca el price ni el producto; sólo el slug del plan en el
   código BallersHub.
5. Data-migration (idempotente): `UPDATE subscriptions SET plan_id='pro-staff'
   WHERE plan_id='pro-coach'` — verificar el count antes; al momento del plan
   eran 0 filas, confirmar de nuevo antes de correr.
6. **Verificar E2E** el checkout en dev con Stripe + MP test (ver
   `reference_mp_test_setup` en memoria) antes de prod.

**Riesgo:** medio-bajo. El alias legacy protege contra slugs viejos.

---

## P2.2 — Rename físico de tablas `coach_*` → `staff_*` (el más delicado)

**Por qué es destructivo:** `ALTER TABLE … RENAME` rompe el código viejo (que
referencia `coach_x`) en el instante del rename → exige **lockstep DB + código**
y toca cientos de referencias en `src`.

**Enfoque recomendado (dado el censo chico): rename directo con ventana corta, NO
expand→contract.** El expand→contract (views compat `coach_x AS SELECT * FROM
staff_x` + `INSTEAD OF` triggers + re-grant de RLS) es mucho más trabajo y sólo
se justifica con tráfico alto. Con este censo, una ventana de minutos basta.

### Inventario (tablas `coach_*` a renombrar)
`coach_profiles`, `coach_applications`, `coach_career_items`,
`coach_career_item_proposals`, `coach_career_revision_*`, `coach_stats_seasons`,
`coach_media`, `coach_methodology_rubros`, `coach_game_ideas`, `coach_honours`,
`coach_honour_translations`, `coach_licenses`, `coach_links`,
`coach_personal_details`, `coach_theme_settings`, `coach_articles`,
`coach_leads`, `coach_methodology_rubro_translations`, … (~20-23 tablas; hacer un
`SELECT tablename FROM pg_tables WHERE tablename LIKE 'coach\_%'` para el set exacto).

### Pasos
1. **Inventario completo** de cada tabla + sus dependientes: índices,
   constraints (FK entrantes/salientes), **policies RLS**, secuencias, triggers
   (`set_updated_at`), y vistas que las referencien. `RENAME TABLE` conserva las
   FKs/triggers/policies (van por OID) pero NO renombra sus nombres → quedan con
   nombre legacy (cosmético, conviene renombrarlos para evitar drift).
2. **Migración `00XX_staff_rename.sql`** (manual): `ALTER TABLE coach_x RENAME TO
   staff_x` × N + renombrar policies/constraints/índices a `staff_*`. Idempotente
   donde se pueda.
3. **Sweep de código** `coach_*` → `staff_*`: schema drizzle (`src/db/schema/
   coach*.ts` → `staff*.ts` + el barrel `index.ts`), TODAS las queries
   (`.from("coach_x")`, drizzle table refs), los `.sql` de RLS, loaders, actions,
   counters. `grep -rE "coach_[a-z]" src/` exhaustivo + `tsc` + build + smoke test.
4. **Decisión de scope (recomendada): renombrar SÓLO las tablas.** Las rutas
   internas `/dashboard/coach/*`, `/admin/coach*`, `/api/coach/*` son internas
   (no SEO) — renombrarlas agrega 301s + churn sin valor. **Dejarlas como
   `coach`** o hacerlo en un paso separado opcional. La URL pública `/staff/*` ya
   está.
5. **Drizzle journal**: la migración genera entrada nueva → registrar hash como
   siempre (sha256 del `.sql` en `drizzle.__drizzle_migrations`).
6. **Deploy lockstep**: probar en dev clonado de prod (aplicar migración + smoke
   test del onboarding + perfil público + dashboard + admin), y aplicar a prod
   **en la misma ventana** que el deploy del código. Tener la **migración inversa**
   (`RENAME staff_x TO coach_x`) + el revert del deploy listos como rollback ANTES
   de tocar prod.

**Riesgo residual:** una referencia `coach_x` que se escape → 500 en runtime.
Mitigación: grep exhaustivo + tsc + build + smoke test en dev clonado de prod.

---

## Orden sugerido

1. **Fix del onboarding (PR #278)** — pre-requisito, ya hecho (bug global de
   dropdowns de HeroUI). Mergear primero.
2. **P2.3** (billing rename, bajo riesgo) — calentamiento.
3. **P2.2** (rename de tablas, alto riesgo, lockstep) — con rollback listo.

Cada uno con su propia PR + verificación (tsc + build + smoke test en dev clonado
de prod). NO autónomo: coordinar la ventana de deploy de P2.2 con el owner.
