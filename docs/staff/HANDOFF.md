# Staff vertical — HANDOFF de contexto

> Para quien continúe el módulo Staff. Self-contained. Leé esto + `docs/staff/PLAN.md` (canon) antes de tocar nada.

## Qué es

BallersHub generalizó la vertical "coaches" → vertical **STAFF** multi-rol. Un gran bloque ya shippeó (**PR #264 MERGED a `main` + prod**): modelo de roles (`staff_role_type`, 13 oficios), onboarding multi-rol, módulo **Metodología** universal (pre-moderado), traducción por-perfil de rubros, i18n (namespace `staff`, 7 locales), y el **rebrand público `/coach/[slug]` → `/staff/[slug]`** (redirect 301). Migraciones **0019–0021a aplicadas a dev + prod**. Las tablas siguen `coach_*` (rename físico diferido).

## Leé primero

- **`docs/staff/PLAN.md`** — plan completo, decisiones D1–D7, estado, y **§Roadmap** (P0/P1/P2 de lo que falta).
- **`docs/db/migration-workflow.md`** — protocolo de migraciones (OBLIGATORIO antes de tocar schema).
- Memoria persistente: `memory/project_staff_refactor.md`, `memory/feedback_migration_protocol.md`.

## Convenciones / lecciones (no re-aprender a los golpes)

- **Migraciones:** Drizzle es la fuente de verdad. Editar `src/db/schema/*.ts` → `DATABASE_URL=dummy npm run db:generate` → revisar el SQL → aplicar **DEV PRIMERO** (Supabase MCP `apply_migration` a `ciolizjshimyvyonlssq`) + `INSERT` del sha256 en `drizzle.__drizzle_migrations` → smoke → **prod (`erdvpcfjynkhcrqktozd`) SOLO con OK explícito del owner**. RLS/functions/buckets van en `NNNNa_*.sql` complementario (no tracked). NUNCA editar `meta/_journal.json` a mano.
- **`"use server"`**: un archivo de actions solo exporta funciones async + tipos. Consts → a un lib aparte (si no, rompe `next build`).
- **Storage uploads** al bucket `coach-media`: el path DEBE tener `user.id` (= `auth.uid()`) en el segmento 1 o 2 (lo exige la storage RLS de 0015a). Patrón: `<tipo>/${user.id}/...`. (Usar `coach.id` rompe el upload — bug real arreglado en `3a9689d`.)
- **Pre-moderación:** el contenido nace `status='pending'`; el dueño NO puede auto-aprobar (RLS WITH CHECK `status<>'approved'` + la action fuerza `pending` en cada edición); admin aprueba como service_role.
- **Taxonomía de roles:** `src/lib/staff/roles.ts` (`STAFF_ROLES`, `STAFF_ROLE_LABELS_ES`, `MAX_STAGE_ROLES`, `isStaffRole`, `staffRoleLabel`, `isHeadCoachLayout`). i18n: namespace `staff`, clave `roles.<key>`.
- **Build/typecheck:** `npx tsc --noEmit -p tsconfig.json` (debe dar 0). `next build` (turbopack) anda con env dummy (`DATABASE_URL=postgres://u:p@localhost:5432/db`, `NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co`, resto `dummy`); los errores de DB en static-gen son esperados (fallback graceful). `node_modules` ya instalado en el worktree.
- **Git:** worktree en branch `feat/staff-vertical` (ya merged a main vía #264). Para trabajo nuevo, branchear desde `feat/staff-vertical` (= main merged + este doc) o `origin/main`. Commits terminan con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Push + PR a main; **NO mergear** (lo hace el owner).
- **Owner:** Julián, trabaja en español, ships fast, espera ejecución autónoma. Código/comentarios en el idioma del codebase (mayormente español en esta vertical).

## Roadmap pendiente

Ver `docs/staff/PLAN.md §Roadmap (auditoría 2026-06-29)`. Resumen: **P0** = cablear UI a schema ya existente (roles[] por etapa visibles+editables; editor de datos personales; módulo de enlaces; primary/secondary_roles editables; 2.º asset Pro; admin edita metodología). **P1** = features con DB nueva (Ideas de Juego con pizarra `staff_game_ideas` + logros con video). **P2** = job board `/staff`, rename físico `coach_*`→`staff_*`, billing `pro-coach`→`pro-staff`.
