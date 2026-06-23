<!--
  Generado por análisis multi-agente (7 especialistas en paralelo: routing/config, namespaces,
  DB constraints, SEO/hreflang, docs canónicos, market ROI, locale-tech) + síntesis + review
  adversarial + revisión final. 2026-06-22.
  Companion de docs/i18n/HANDOFF.md (el plan de los 4 locales actuales). Este doc cubre la
  expansión Fase 1 con 3 locales nuevos (añadir de/fr/fi); el griego `el` queda DIFERIDO a
  fase 2 (ver §8). Aún NO ejecutado — requiere decisiones del owner (§2).
-->

# Plan de Implementación — Expansión de Locales — Fase 1: añadir `de`, `fr`, `fi` (griego `el` diferido)

**Documento canónico de trabajo. Versión 2.1 — 2026-06-22 (griego diferido por decisión del owner; era el único bloqueador técnico real).** (Revisada con review adversarial: incorpora 11 bloques de email COPY, `SoccerPitch3D`, gate `i18n:check` como precondición dura, y guards de tier verificados.)
Locales existentes: `es` (default, sin prefijo), `en`, `it` (`it-IT`), `pt` (`pt-BR`). Locales nuevos: `de` (alemán), `fr` (francés), `fi` (finés).
Ejecutar contra **`origin/main`** (no contra este worktree, que está en una branch stale con 8 namespaces; `main` tiene 19).

---

## 0. TL;DR + insight de arquitectura

**TL;DR.** Añadir 3 locales es una **expansión aditiva de bajo riesgo estructural**: la arquitectura i18n+DB de BallersHub se diseñó deliberadamente para escalar. Con `de`/`fr`/`fi` **NO hay ningún bloqueador técnico genuino** — los tres están completamente cubiertos por el subset `latin` ya existente (umlauts alemanes ä ö ü ß, acentos franceses é è ê ç à, finés å ä ö son todos Latin-1/latin-ext). El trabajo se reduce a (a) los widenings de `Record<Locale, ...>` que el compilador TypeScript fuerza —**incluyendo dos superficies que el draft v1 omitió: los 11 bloques `COPY` de emails transaccionales y `SoccerPitch3D.PITCH_CHROME`**—, (b) un único swap de 11 CHECK constraints no-destructivo, (c) el volumen real de traducción: ~10.422 strings de chrome (3.474 × 3) **+ la suite completa de emails transaccionales (~11 plantillas × 3)** que requieren MT + revisión humana, y (d) el gap de tier-guard en agency/coach. Las decisiones pendientes son de producto: el tope Pro y el orden de lanzamiento.

**Insight de arquitectura (con evidencia).** Cuatro decisiones de diseño hacen esto aditivo:

1. **`text`+CHECK en vez de `pgEnum`** — `src/db/schema/translations.ts:38-41`: *"kept as a text CHECK (not a pgEnum) so adding a locale later is a non-destructive constraint swap, not an ALTER TYPE."* Widening un `IN (...)` solo **añade** valores → ninguna fila existente viola la constraint → valida sin reescritura de tabla, sin expand/contract de 2 PRs.
2. **`localePrefix: "as-needed"`** (`src/i18n/routing.ts:15`) — `/` sirve `es` sin prefijo para siempre; los nuevos son `/de`, `/fr`, `/fi`, puramente aditivos.
3. **Namespace-per-file con import dinámico** — `src/i18n/request.ts` usa `` import(`./messages/${locale}/...`) `` (loop sobre namespaces, `${locale}` dinámico): apenas existan las carpetas `messages/{de,fr,fi}/`, cargan **sin tocar `request.ts`** (verificado).
4. **hreflang/sitemap data-driven** — los helpers en `src/lib/seo/hreflang.ts` iteran `routing.locales` y gatean por `availableLocales`; añadir 3 códigos ensancha un loop.

El `Locale` union (`src/i18n/routing.ts:24`) deriva de `routing.locales`: ensanchar ese array convierte cada `Record<Locale, ...>` **no-`Partial`** en un **error de compilación** que apunta a cada sitio pendiente. Ese es el guardarraíl. **Caveat:** los `Record<Locale>` con fallback en runtime (`?? X.es`, p.ej. `SoccerPitch3D`, `position-tactics`) **igualmente fallan `tsc --noEmit`** porque el tipo exige todas las keys — el fallback evita el crash, no el error de compilación. Por eso F-G (typecheck) los atrapa, pero hay que enumerarlos en F-A para no descubrirlos tarde.

---

## 1. Alcance y no-objetivos

**En alcance:**
- Registro de los 3 locales en routing, config maps, middleware geo, switchers, editores de dashboard, blog, auth, API, **emails transaccionales**, **animación de pitch**.
- Migración DB: widening de 11 CHECK constraints a la lista de 7.
- Traducción del chrome (19 namespaces × 3 = 10.422 strings) **+ suite de emails transaccionales (~11 plantillas × 3)** con gate de paridad.
- Wiring de `i18n:check` a `prebuild` + CI como **precondición de merge** (hoy es gate manual, no bloquea `next build`).
- Fuentes/layout: audit de overflow de/fi + verificación de tags `Intl` (sin cambios de subset — `latin` ya cubre los tres).
- SEO: hreflang/sitemap/JSON-LD scale, GSC properties, indexación ROI-ordenada; **fix del leak `inLanguage` hardcodeado** (promovido desde "flag aparte", ver §1 no-objetivos revisado).
- Habilitación de contenido per-profile (CHECK + `CONTENT_LOCALES`) + targets/glosario del asistente IA.

**No-objetivos (explícitos):**
- **No** se traduce contenido per-profile de usuarios automáticamente para indexación (regla de oro HANDOFF §4 — el autor firma cada versión).
- **No** se cambia `defaultLocale` ni el prefijo de `es`. URLs `es` quedan byte-idénticas (sin ruptura de backlinks/GSC/drift).
- **No** se sube el tier Free a multi-locale (queda mono-`es`).
- **No** se editan archivos de migración históricos ni `meta/` (golden rule 3).
- **PROMOVIDO desde no-objetivo a EN ALCANCE:** el leak pre-existente `inLanguage: "es-AR"` de `articleJsonLd.tsx:63` / `profilePageJsonLd.tsx:71`. Razón del cambio: con 3 locales nuevos, un `inLanguage` hardcodeado a `es-AR` queda **incorrecto en 6 de 7 locales** (antes 3 de 4); el blast radius crece y el fix es de bajo esfuerzo (cablear a `HTML_LANG[locale]`). Se incluye en F-E.

---

## 2. Decisiones que necesita el OWNER

> Cada una con recomendación + rationale. Bloquean fases específicas; marcadas abajo.

### (a) Tope de traducciones Pro con 7 locales — **BLOQUEA F-F (y agency/coach actions)**
**Estado verificado del código:**
- **Player** SÍ tiene guard numérico real: `tierLimit = 4` + `available.length >= tierLimit` (`edit-profile/translations/actions.ts:211-212`, confirmado).
- **Agency** capea SOLO vía `z.enum(["en","it","pt"])` de 3 valores en **8 puntos** de `agency-translations.ts` (L23,29,178,184,286,293,401,408) — **sin guard numérico**.
- **Coach** capea SOLO vía `TRANSLATABLE_LOCALES = ["en","it","pt"]` (`coach-translations.ts:13`) consumido por `z.enum` — **sin guard numérico**.

**Implicación (P0 de negocio, no P1):** si ensanchas los enums de agency/coach de 3→6 sin añadir un count guard, un Pro agency/coach podría publicar los 6 locales extra (7 totales), rompiendo silenciosamente la regla "es + hasta 3".

**Recomendación: mantener el tope en 4 totales (es + 3 elegidos de 6), NO subirlo.** Rationale: (1) menor cambio — `tierLimit` queda en 4, solo se ensancha el set seleccionable; (2) **costo IA plano** (ver decisión recalculada abajo); (3) evita el toggle de pestañas que HANDOFF §12 advierte genera carga cognitiva; (4) preserva el incentivo de upgrade.

**Acción asociada OBLIGATORIA (sin esto, ensanchar el enum rompe el negocio):** añadir guard numérico explícito a `agency-translations.ts` y `coach-translations.ts`, espejando el patrón `available.length >= tierLimit` del player. **No** ensanchar el `z.enum` a 6 sin el count check. (Tarea concreta de código, no "espejá el patrón" a mano: leer el flujo `getAvailableLocales` de agency/coach e insertar el chequeo antes del upsert.)

**Costo IA (recalculado, ya no es un "recalcular" abierto):** el modelo es `google/gemini-2.5-flash` (`ai-translate.ts:21`), ya barato — el owner bajó de tier desde Sonnet deliberadamente. Bajo la recomendación (tope = 4), el costo per-profile es **idéntico al de hoy** (sigue siendo es + hasta 3; solo se amplía el set elegible, no la cantidad). El "<$1/mes peor caso" de HANDOFF §5.1 **no cambia**. El costo solo escalaría si el owner **sube** el tope: ahí sí 7×6=42 primeras traducciones/perfil (peor caso) vs 24 hoy, y habría que rehacer la cuenta. La fila de riesgo "costo IA sube" aplica **solo si se override 2(a)**.

**Si** el owner quiere diferenciación premium: alternativa "es + 5" como tier superior con precio distinto (decisión de pricing pura).

### (b) Orden de lanzamiento — **gobierna F-C…F-G secuenciación**
**Recomendación (ROI): `de → fr → fi`.**
- **de primero**: Bundesliga top-4 europeo, mercado importador denso; `de` cubre DE+AT+CH-de (máxima cobertura/costo).
- **fr segundo**: Ligue 1 fábrica de talento + reach a África francófona (mayor pipeline de scouting sin firmar); `fr` cubre FR+BE+CH-fr+CA.
- **fi último**: Veikkausliiga el mercado más chico, sin leverage multi-país (FI solo), análogo defensivo a EN.

Confirmar contra datos reales del pipeline de scouting (regla de evidencia HANDOFF §16).

### (c) ¿Los 3 chrome juntos o escalonado? — **gobierna F-C**
**Recomendación: chrome de los 3 juntos** (chrome = costo marginal bajo, evita re-trabajo; el escalonado aplica solo al SEO de contenido real). **Pero** desacopla el *activado del locale* (routing) del *lanzamiento SEO*: el chrome puede estar listo y mergeado mientras el GSC property + push de indexación de cada locale se hacen en orden ROI (b). Esto evita over-advertising de hreflang en marketing no traducido.

### (d) MT vs traducción humana por mercado — **gobierna F-C revisión + F-F quality**
**Recomendación:** **de/fr → copy revisado por humano** (más tráfico, más superficie comercial: pricing/landing/agency; jerga futbolística idiomática). **fi → MT aceptable** para contenido per-profile y strings UI al lanzamiento, con QA nativo ligero solo en marketing/legal conversion-critical. **Nota añadida:** los emails transaccionales son conversion/legal-sensitive — su revisión sigue la misma matriz pero con bar más alto (de/fr humano; fi MT + QA nativo obligatorio en welcome/subscription/payment-failed).

### (e) hreflang language-only + geo edge cases — **confirmar**
**Recomendación: SÍ, language-only `de`/`fr`/`fi`.** Coincide con la convención (`en` es language-only; `config.ts` usa códigos genéricos EXCEPTO pt-BR). Ninguno tiene divergencia regional contestada estilo pt-PT. Los tags region-specific quedan solo en `HTML_LANG`/`OG_LOCALE`/`Intl` (`de-DE`, `fr-FR`, `fi-FI`).

**Edge cases de geo (auto-redirect seeds, baja blast radius — el usuario puede cambiar):**
- **CH (Suiza)** → `de` vs `fr`. Rec: `de` (mayoría germanófona). Flag si owner prefiere `fr`.
- **BE (Bélgica)** → la recomendación lo manda a `fr`, **pero BE es ~60% neerlandófono (Flandes)**; no hay locale `nl`, así que `fr` es un default pragmático, **no** una mayoría lingüística. Documentado como tal.
- **LU (Luxemburgo)** → mayoría luxemburgués/alemán en uso diario; `fr` es default pragmático (lengua administrativa), no mayoría.

Estos tres son **seeds de auto-detección**, no asignaciones canónicas.

---

## 3. Rollout por fases

> Orden compile-safe global: **F-A (routing array + folders) primero** → TS apunta al resto vía errores. **F-C (chrome JSON) + scaffold debe existir y pasar `i18n:check` ANTES de activar el locale en routing en prod**, o `request.ts` lanza error en runtime. Ver F-C step "precondición dura".

### F-A — Código / Config

Metadata canónica a usar en todos lados:

| code | label | flag-icons | hreflang | html lang | og:locale | date tag |
|------|-------|-----------|----------|-----------|-----------|----------|
| de | Deutsch | `de` | `de` | `de-DE` | `de_DE` | `de-DE` |
| fr | Français | `fr` | `fr` | `fr-FR` | `fr_FR` | `fr-FR` |
| fi | Suomi | `fi` | `fi` | `fi-FI` | `fi_FI` | `fi-FI` |

**Checklist F-A:**
- [ ] `src/i18n/routing.ts:13` — añadir `"de","fr","fi"` a `locales[]` (keystone; `Locale` auto-ensancha). **No mergear este cambio en prod hasta que el chrome del locale pase `i18n:check` verde** (ver F-C).
- [ ] `src/i18n/config.ts` — los 5 `Record<Locale,string>`: `HREFLANG_CODE` (L11-16), `HTML_LANG` (L19-24), `OG_LOCALE` (L27-32), `LOCALE_LABEL` (L36-41), `LOCALE_FLAG` (L48-53).
- [ ] `src/middleware.ts:20` — ensanchar return union de `localeForCountry`; añadir sets antes de `return "en"`: `GERMAN{DE,AT,CH,LI}→de`, `FRENCH{FR,BE,MC,LU}→fr`, `FINNISH{FI}→fi`. (CH/BE/LU = defaults pragmáticos, decisión 2e.)
- [ ] `src/lib/i18n/profile-content.ts:31` — `CONTENT_LOCALES` += 3 (ensancha `isContentLocale`, `getAvailable*Locales`, hreflang per-profile, sitemap).
- [ ] `src/lib/i18n/dates.ts:7-12` — `DATE_TAG` += 3.
- [ ] `src/lib/i18n/ai-translate.ts:27` — `TranslateLocale` union += 3; `LOCALE_NAME` (L30-35) += 3; `GLOSSARY` (L39-54) extender con columnas de/fr/fi (sin esto la calidad IA degrada).
- [ ] `src/lib/i18n/positions.ts` — `POSITION_LABELS` (L14) + `FOOT_LABELS` (L62): 3 sub-maps cada uno.
- [ ] `src/lib/i18n/position-tactics.ts:18` — ensanchar key union + 3 sub-maps (tiene fallback `es` en runtime, pero **igual da error de compilación** hasta completar las keys).
- [ ] `src/lib/i18n/player-languages.ts:16` — añadir de/fr/fi a las filas. **Releer el archivo antes:** no usa el patrón `code:/name:` asumido en el draft v1 (grep dio 0 matches) → confirmar la shape real (probablemente array de objetos / tuplas) antes de editar. Decisión de contenido adyacente: si se quieren **nuevas filas de idioma nativo seleccionable** (p.ej. "Alemán" como lengua que un jugador declara hablar), eso es contenido, no solo traducción de labels.
- [ ] **`src/components/common/animations/SoccerPitch3D.tsx:93`** — `PITCH_CHROME: Record<Locale,{position,zone}>` (**MISSED en v1**). Tiene `?? PITCH_CHROME.es` en L107 (no crashea) pero **falla `tsc`** hasta añadir los 3 pares position/zone traducidos.
- [ ] SEO JSON-LD label maps: `src/lib/seo/personJsonLd.tsx` (`JOB_TITLE`, `HOME_LABEL`, `POSITION_LABELS` L76-118), `agencyJsonLd.tsx` (`HOME_LABEL`, `AGENCIES_LABEL`), `coachJsonLd.tsx` (`JOB_TITLE`, `HOME_LABEL`).
- [ ] Switchers: `HeaderLocaleSwitcher.tsx` (L21 `ORDER`, L22-27 `META`), `PortfolioLocaleSwitcher.tsx` (L19/L20-25), `LocaleSwitcher.tsx` (L11 `SHORT`: `DE/FR/FI`).
- [ ] Editores dashboard: `TranslationsEditor.tsx` (L32 `EditableLocale`, L55 `BASE_ORDER`, L57-62 `LOCALE_META`); `edit-profile/translations/actions.ts` (L43+L299 `z.enum`, y L49/L490/L497/L600 los enums de 3 valores — **ensanchar a 6 está OK aquí porque player tiene `tierLimit=4` real**); `edit-profile/translations/page.tsx:184`; `coach/translations/CoachTranslationsEditor.tsx` (L12+L22) y `page.tsx:13`; los 4 componentes agency (`AgencyTranslationsSection.tsx`, `AgencyCountryProfileTranslationsSection.tsx`, `AgencyMediaTranslationsSection.tsx`, `AgencyServicesTranslationsSection.tsx`); `settings/account/components/NativeLocaleCard.tsx` (L12-17) y `actions.ts:8`.
- [ ] **Server actions tier guards (decisión 2a, P0 de negocio):** `agency-translations.ts` (×8 `z.enum`) y `coach-translations.ts:13` `TRANSLATABLE_LOCALES` — ensanchar el set **Y añadir guard numérico** (`available.length >= 4`). NO solo ensanchar el enum.
- [ ] Blog: `posts.ts:14` `BLOG_LOCALES`, `validation.ts:44`, `BlogPostForm.tsx` (L46+L71), `blog/write/actions.ts:282`.
- [ ] Auth/API: `auth/callback/route.ts` (L14 return union + L15-16 `isExtra`), `api/portfolio/[slug]/lead/route.ts:16`.
- [ ] **Emails — maps de formato/subject:** `emails/format.ts` `DATE_LOCALE`, `emails/subjects.ts` `SUBJECTS`, `lib/resend.ts` (`LEAD_SUBJECT`/`DISCONNECT_SUBJECT`/`SUBSCRIPTION_SUBJECT`/`COMP_GRANT_SUBJECT`).
- [ ] **Emails — 11 bloques `COPY: Record<Locale, Copy>` (MISSED en v1; cada uno = un error de compilación + una superficie de traducción real):** `welcome-player.tsx:35`, `welcome-agency.tsx:34`, `lead-welcome.tsx:41`, `subscription-welcome.tsx:49`, `payment-failed.tsx:38`, `comp-grant-welcome.tsx:45`, `player-disconnect.tsx:29`, `profile-completion.tsx:39`, `admin-profile-corrected.tsx:36`, `blog-post-approved-author.tsx:39`, `blog-post-rejected-author.tsx:35`. Son copy hand-authored con funciones de interpolación (`heading: (n) => \`Bienvenido, ${n}\``) que viven en `.tsx`, **fuera de `messages/` → `i18n:check` NO los detecta.** Traducción incluida en F-C scope (ver volumen).
- [ ] `layout.tsx:78` — cablear `openGraph.locale` a `OG_LOCALE[locale]` (hoy hardcodeado `"es_AR"`).
- [ ] Ternarios inline: `ClassicAgencyLayout.tsx`, `AgencyReachModule.tsx`.

**Auto-scale (verificar, no editar):** `request.ts` (loop dinámico, confirmado), `navigation.ts`, `layout.tsx` generateStaticParams, `hreflang.ts`, `sitemap.ts`, `LocaleFlag.tsx`, `UserMenu.tsx`, `getAvailable*Locales`.

### F-B — Migración DB

**Naturaleza:** Tipo A (Drizzle-managed), **non-destructiva, single-PR, sin backfill** (widening solo añade valores; toda fila existente ya satisface; valida sin scan). 11 constraints en 10 tablas (count verificado):

`player_profile_translations`, `player_honour_translations`, `agency_profile_translations`, `agency_media_translations`, `agency_country_profile_translations`, `ai_translation_events` (6 en `translations.ts`), `coach_profile_translations`, `coach_honour_translations`, `coach_ai_translation_events` (3 en `coachTranslations.ts`), `blog_posts` (1), y **`user_profiles.preferred_locale`** (1 — ¡columna distinta, fácil de olvidar!).

**Checklist F-B:**
- [ ] Editar 4 schema files (cubren las 11 vía consts compartidas): `translations.ts:41` (`LOCALE_CHECK`), `coachTranslations.ts:38`, `blog.ts:118`, `users.ts:28` → nueva lista `('es','en','it','pt','de','fr','fi')`.
- [ ] `npm run db:generate` → nuevo SQL. **NO hardcodear el ordinal:** usar el que Drizzle emita y **confirmar que no colisiona con ninguna migración manual `0015x`** antes de aplicar (MEMORY: hubo colisión de numeración en la vertical coach). Renombrar si colisiona.
- [ ] **Revisar SQL generado**: exactamente 11 pares `DROP CONSTRAINT` + `ADD CONSTRAINT`, nombres byte-idénticos, sin DROP TABLE ni diffs inesperados. Si aparece algo raro → arreglar TS, NO aplicar.
- [ ] Confirmar `user_profiles_preferred_locale_check` está en el diff.
- [ ] Aplicar a **supabase-dev primero** (`ciolizjshimyvyonlssq`) vía `db:migrate` o MCP `apply_migration`.
- [ ] Smoke en preview: publicar una traducción `de`/`fr`/`fi` E2E; confirmar hreflang + fallback noindex.
- [ ] **Owner autoriza + aplica a prod** (`erdvpcfjynkhcrqktozd`).
- [ ] **apply-then-register-hash**: `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('<sha256 del archivo>', <epoch ms>);` en prod.
- [ ] Verificar: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%locale_check'` muestra las 11 con la lista de 7 en ambas branches.
- [ ] Commit `meta/_journal.json` + snapshot + schema TS juntos. NUNCA editar `meta/` a mano.

### F-C — Traducción del chrome + emails

**Volumen (verificado):** 19 namespaces, 3.474 leaf keys en `es/` → **10.422 strings** de chrome para 3 locales. Namespaces pesados: `dashEditProfile` (545), `portfolio` (397), `dashAgency` (392), `pricing` (361), `dashboard` (318), `legal` (269).
**+ Emails (añadido):** ~11 plantillas × 3 locales de copy hand-authored con interpolación, en `.tsx` (no en `messages/`). **Volumen separado, no cubierto por `i18n:check`** — trackear manualmente la paridad de los 11 `COPY` blocks.

**Proceso:**
1. **Scaffold chrome:** `cp -r src/i18n/messages/es src/i18n/messages/<locale>` (3 dirs × 19 = 57 archivos). Estructura de keys idéntica → paridad verde antes de traducir.
2. **Registrar parity gate:** `routing.locales` (F-A) + **editar el array hardcodeado en `scripts/i18n/check-parity.cjs:18`** (hoy `["es","en","it","pt"]`, verificado; sin esto las nuevas dirs ni se chequean).
3. **PRECONDICIÓN DURA — wire `i18n:check` a `prebuild` + CI ANTES de registrar cualquier locale en `routing.locales` en prod.** Hoy `package.json` solo tiene `build: next build --turbopack` y `typecheck: tsc --noEmit`; **no hay prebuild hook ni workflow CI que invoque `check-parity.cjs`** (verificado). Sin esto, no hay garantía automática de que los 19 namespaces estén completos antes de activar el locale, y un namespace faltante/vacío hace que `request.ts` lance en runtime. **Tareas concretas:** (a) `"prebuild": "node scripts/i18n/check-parity.cjs"` en `package.json` para que `next build` falle ante drift; (b) un job CI que corra el mismo script en cada PR. **Regla de merge:** scaffold + traducción completa + `i18n:check` verde es **precondición bloqueante del cambio a `routing.locales`** para cada locale. Esto convierte la garantía de paridad de "condicional a un TODO" en estructural.
4. **MT batch por namespace** con system prompt que enforce la **do-not-blind-translate list**:
   - Marca `#` de acento en `home.hero.headlines.*` (mantener `#` pegado a la palabra resaltada, array length = 3).
   - Abreviaturas de pie `footLeft`/`footRight`: de `LF`/`RF`, fr `PG`/`PD`, fi `VJ`/`OJ` (futbolista nativo, no MT).
   - **Categorías plurales CLDR**: **fr necesita `one`/`many`/`other`** (¡branch `many` obligatorio!); fi `one`/`other`. Namespaces con plurales: `portfolio` (8), `scouting` (6), `blog` (4), `mobileNav` (1), `dashAgency` (1).
   - Tags HTML/rich-text (8 namespaces: `portfolio, onboarding, site, scouting, checkout, dashEditProfile, dashboard, auth`) preservados verbatim.
   - Placeholders ICU (`{age}`, `{count}`, `{n}`, `{countries}`); sufijo de edad locale-específico: de `J`, fr `a`, fi `v`.
   - `BallersHub` verbatim siempre. Traducir solo values, nunca keys ni array lengths.
5. **Emails:** traducir los 11 `COPY` blocks manualmente (cuidando las funciones de interpolación — son código, no strings planos). MT permitido pero con la matriz 2d más estricta (conversion/legal-sensitive).
6. **Revisión humana** (decisión 2d): de/fr ligera (terminología + plural `many` fr), **fi obligatoria** (morfología aglutinante). Emails welcome/subscription/payment-failed → QA nativo obligatorio en los 3.
7. **Gate:** `npm run i18n:check` verde (detecta keys faltantes, drift de array length, archivos faltantes); luego `npm run typecheck`/`next build` (errores de sintaxis ICU + todos los `Record<Locale>` cerrados, **incl. los 11 COPY + PITCH_CHROME**). Paridad de emails se verifica a mano (fuera de `i18n:check`).

### F-D — Fonts / Layout

**Hallazgo clave (medido):** `latin` subset ya cubre **de/fr/fi cero cambios de fuente** (umlauts/acentos `ä ö ü ß`, `é è ê ç à`, `å ä ö` en Latin-1/latin-ext). **Sin Greek u otro script no-Latin en el alcance Fase 1, NO hay ningún cambio de fuente:** las familias en `layout.tsx:4` (`Barlow, Barlow_Condensed, DM_Mono, DM_Sans, Geist, Geist_Mono`, todas con `subsets:["latin"]`, verificado L19-43) y la display local `Zuume` (`src/lib/fonts.ts`, `.otf`) renderizan los tres locales sin tocar nada. F-D se reduce a layout: overflow de palabras largas + formateo `Intl`.

**Checklist F-D:**
- [ ] **Audit overflow de/fi (`fi` el peor offender por compuestos aglutinantes; `de` compuestos #1):** superficies de ancho fijo — header pill (`nav-items.ts` vía `common.nav.*`), mobile docks (`DashboardDock/PublicDock/FloatingDock.tsx`), sidebar (`dashboard/client/Sidebar.tsx`), pricing cards, hero CTAs, chips/badges. Preferir `min-w`/`truncate`/anchos flexibles. Testear con strings reales más largos, no lorem.
- [ ] Verificar `Intl.NumberFormat` usa el date/number tag, nunca tag hardcodeado (de coma decimal + punto miles `1.234,56`; fr/fi coma decimal + NBSP miles `1 234,56`).

### F-E — SEO

Casi todo data-driven; escala automático al ensanchar `routing.locales` + `CONTENT_LOCALES` + `BLOG_LOCALES` (juntos, o una fila `de` existe pero nunca recibe hreflang).

**Checklist F-E:**
- [ ] BCP47/og por locale ya en `config.ts` (F-A). hreflang language-only confirmado (decisión 2e).
- [ ] **Gating de contenido:** traducir dicts marketing (home/pricing/about/legal/blog UI) ANTES de añadir el locale a `routing.locales` en prod, o `sitemapLanguages` over-advertise hreflang en páginas no traducidas.
- [ ] Per-profile hreflang/sitemap escalan solos vía `CONTENT_LOCALES` — verificar, sin editar `hreflang.ts`/`sitemap.ts`.
- [ ] JSON-LD `inLanguage` vía `HTML_LANG` (auto); label maps llenados en F-A.
- [ ] **FIX promovido a este PR:** cablear `inLanguage` hardcodeado `"es-AR"` en `articleJsonLd.tsx:63` y `profilePageJsonLd.tsx:71` a `HTML_LANG[locale]`. Con 7 locales, el hardcode es incorrecto en 6/7. Bajo esfuerzo, win de correctness SEO.
- [ ] **Ops por locale (orden ROI decisión 2b):** registrar GSC properties `/de/`, `/fr/`, `/fi/` en cada lanzamiento; root `ballershub.co/` intacto. Re-baseline `seo-drift` post-deploy.
- [ ] Regresión: confirmar clusters `es/en/it/pt` byte-idénticos; `x-default → es` sin cambios.

### F-F — Contenido per-profile + asistente IA

- [ ] Habilitado por F-B (CHECK widening) + `CONTENT_LOCALES` (F-A): una fila `de` en `*_translations` fluye por `isContentLocale` → `getAvailable*Locales` → hreflang + flip de noindex. Sin cambios per-profile.
- [ ] **Tier-gate (decisión 2a):** `tierLimit` ya existe en player (verificado); **añadir guard numérico a agency/coach** (hoy ausente — P0 de negocio).
- [ ] `generateTranslationDraft`/`LOCALE_NAME`/`GLOSSARY` con targets nuevos (F-A). Sin glosario para los nuevos → calidad IA degrada.
- [ ] `REGEN_LIMIT` (40/mo) es locale-agnóstico — sin cambio.
- [ ] Costo IA: **plano** bajo tope=4 (recalculado, decisión 2a). Solo escala si se sube el tope.
- [ ] Quality review IA fi (decisión 2d).

### F-G — QA / Verificación

- [ ] `npm run i18n:check` verde (7 locales × 19 namespaces) — **ya wired a prebuild/CI** (F-C step 3).
- [ ] `npm run typecheck` + `next build` limpio (ICU + todos los `Record<Locale>` cerrados, **incl. 11 email COPY + SoccerPitch3D.PITCH_CHROME + position-tactics**).
- [ ] Paridad de emails verificada a mano (11 `COPY` blocks × 3 locales; fuera de `i18n:check`).
- [ ] Smoke por locale: home hero (`#`-words), `/pricing`, scouting counts, strings con rich-tags, switcher, fechas, **render de un email transaccional** (welcome-player) por locale.
- [ ] Validación hreflang (mesh bidireccional, `x-default → es`, self-canonical por locale).
- [ ] Deploy prod + migración aplicada **antes** del merge git (drift check HANDOFF §6).

---

## 4. Esfuerzo y secuenciación

| Workstream | Esfuerzo | Paraleliza con | Dependencia crítica |
|------------|----------|----------------|---------------------|
| F-A código/config (incl. emails maps + 11 COPY + PITCH_CHROME) | ~1.5-2 día eng | F-B, F-D | Keystone: routing array primero |
| F-B migración DB | ~0.5 día + owner prod | F-A, F-C | Independiente; smoke necesita F-A |
| F-C MT batch chrome (3 locales) | ~1 día scripted | — | Scaffold + parity registrado |
| F-C wire `i18n:check` CI/prebuild | ~0.25 día eng | F-A | **Precondición de routing prod** |
| F-C traducción emails (11×3) | ~0.5-1 día | F-C chrome | — |
| F-C revisión humana | de/fr ~1-1.5d c/u, fi ~2-2.5d + email QA → **~5-6 reviewer-días** | Sí, reviewers paralelos por idioma | MT batch hecho |
| F-D audit overflow de/fi + Intl | ~0.5-1 día | F-C | Strings reales |
| F-E SEO ops + inLanguage fix | ~0.5 día/locale + ~0.25 fix | — | Dicts marketing traducidos |

**Dependencia crítica:** chrome JSON + `i18n:check` verde (F-C) **debe existir antes de activar el locale en routing en prod** (runtime crash si no). DB (F-B) puede ir antes o en paralelo. **Total ≈ 1.5-2 semanas calendario** con reviewers paralelos; ~2.5-3 si serial. Eng glue ~0.75 día. **Cuello de botella real:** revisión humana fi + QA de emails + revisión humana de/fr.

**Lo que paraleliza:** F-B (DB) independiente de F-C (traducción); revisores por idioma en paralelo; emails traducción en paralelo al chrome una vez hecho el scaffold.

---

## 5. Riesgos y mitigaciones

| Riesgo | Sev | Mitigación |
|--------|-----|-----------|
| Activar locale en routing prod sin JSON completo → runtime crash en `request.ts` | Alta | **`i18n:check` wired a prebuild/CI como precondición dura de merge** (F-C step 3). Scaffold + traducción ANTES de routing prod. |
| 11 email COPY blocks olvidados → 11 compile errors + emails sin traducir | Alta | Enumerados en F-A; traducción en F-C scope; paridad manual (fuera de `i18n:check`). |
| Agency/coach sin guard numérico → Pro publica 7 locales | Alta | Decisión 2a + **añadir count guard** (`length >= 4`), no solo ensanchar enum. |
| `SoccerPitch3D.PITCH_CHROME` / `position-tactics` olvidados → `tsc` falla | Media | Enumerados en F-A; `typecheck` los atrapa aunque tengan fallback runtime. |
| fr plural sin branch `many` → ICU incompleto/render error | Media | Do-not-translate list + `typecheck`/build atrapa sintaxis ICU. |
| Over-advertising hreflang en marketing no traducida | Media | Gating: dicts marketing traducidos antes de routing prod. |
| Overflow de/fi en nav/docks/pricing | Media | Audit F-D con strings reales; `truncate`/`min-w`. |
| Migración: colisión de ordinal con `0015x` manuales | Media | No hardcodear ordinal; verificar colisión antes de aplicar (lección coach vertical). |
| `generateStaticParams` 4→7 duplica params/route → build time / ISR ↑ | Baja | P2: la mayoría de combos (slug,locale) son páginas noindex vacías; monitorear build time. |
| Migración prod sin register-hash → Drizzle re-aplica | Baja | Paso apply-then-register-hash obligatorio. |
| Costo IA per-profile sube | Baja | **Plano bajo tope=4 (recalculado)**; solo escala si owner sube el tope (decisión 2a). |

---

## 6. Rollback / Seguridad

**Aditivo por diseño = rollback trivial.** Un locale se "apaga" simplemente **no agregándolo**:
- **No incluirlo en `routing.locales`** → no se enruta, no aparece en switcher, no se genera hreflang/sitemap.
- **No incluirlo en `CONTENT_LOCALES`** → `isContentLocale` lo dropea; filas per-profile invisibles (fallback `es` + noindex).
- **No shippear su chrome** → no hay carpeta `messages/<locale>/`.
- **DB widening seguro independiente:** filas existentes intactas (solo añade valores permitidos).
- **URLs `es` byte-idénticas** → cero regresión a clusters `es/en/it/pt`; backlinks/GSC/drift baselines intactos.

**Runbook ordenado de re-narrow del CHECK (el orden importa — explícito):**
1. Confirmar si existen filas con el locale a remover: `SELECT count(*) FROM <tabla> WHERE locale = '<x>'`.
2. **Si hay filas:** `DELETE`/migrarlas PRIMERO (un `ADD CONSTRAINT` con scan fallaría contra filas que violan el nuevo CHECK más angosto).
3. **Luego** `DROP CONSTRAINT` + `ADD CONSTRAINT` con la lista angosta.
4. Register-hash + verificar `pg_get_constraintdef`.
Si no hay filas (caso normal de un locale recién apagado), pasos 2 se omite y el re-narrow es non-destructivo.

Estrategia recomendada: **mergear F-A+F-B+chrome+emails de un locale por vez** en orden ROI (de→fr→fi). Cada locale se activa cuando su chrome + GSC property están listos y `i18n:check` verde. Un locale con problemas no bloquea a los demás.

---

## 7. CHECKLIST consolidado accionable

**Decisiones owner (desbloquean):**
- [ ] (a) Tope Pro con 7 locales → rec: mantener 4 (es+3) + **count guard agency/coach** (P0 negocio). Costo IA plano bajo esta opción.
- [ ] (b) Orden launch → rec: de→fr→fi.
- [ ] (c) Chrome junto o escalonado → rec: junto, SEO escalonado.
- [ ] (d) MT vs humano → rec: de/fr humano, fi MT+QA; emails QA nativo en welcome/subscription/payment-failed.
- [ ] (e) hreflang language-only → rec: sí. Geo seeds: CH→de, BE→fr, LU→fr (pragmáticos, no mayorías).

**F-A Código:** routing array → config 5 maps → middleware geo → CONTENT_LOCALES/dates/ai-translate(+glosario)/positions/position-tactics/player-languages(releer shape) → **SoccerPitch3D PITCH_CHROME** → JSON-LD label maps → switchers → editores dashboard → **tier guards agency/coach (count guard)** → blog → auth/API → email maps (format/subjects/resend) → **11 email COPY blocks** → `og:locale` layout → ternarios inline.

**F-B DB:** editar 4 schema files → `db:generate` (no hardcodear ordinal, verificar colisión) → revisar 11 pares DROP/ADD → dev-first → smoke → owner prod → register-hash → verificar pg_constraint → commit.

**F-C Chrome+emails:** scaffold `cp -r es/` ×3 → registrar `routing.locales` + `check-parity.cjs:18` → **wire `i18n:check` a prebuild+CI (precondición dura)** → MT batch chrome (do-not-translate list) → traducir 11 email COPY → revisión humana (de/fr ligera, fi obligatoria, emails QA nativo) → `i18n:check` verde + paridad emails manual.

**F-D Fonts/layout:** audit overflow de/fi + verificar Intl number/date tags (sin cambios de subset — `latin` ya cubre los tres).

**F-E SEO:** gating dicts marketing → verificar hreflang/sitemap auto-scale → **fix `inLanguage` hardcodeado** → GSC properties orden ROI → re-baseline seo-drift → regresión es/en/it/pt.

**F-F Per-profile+IA:** habilitado por F-A+F-B → **count guard agency/coach** → glosario IA nuevos targets → quality review fi.

**F-G QA:** `i18n:check` + paridad emails manual + `typecheck` + `next build` → smoke por locale (incl. render de email) → validación hreflang → deploy prod + migración antes de merge.

---

## 8. Hallazgos del review diferidos intencionalmente (con razón)

- **GRIEGO (`el`) — DIFERIDO por decisión del owner (2026-06-22).** Se saca del alcance activo; se retomará como fase 2. Cuando se retome, re-añadir `el` a TODOS los surfaces de este plan (es mecánicamente idéntico a de/fr/fi: routing, los 5 maps de config, CONTENT_LOCALES, dates, ai-translate+glosario, positions, position-tactics, SoccerPitch3D, JSON-LD maps, switchers, editores, blog, auth/API, 11 email COPY, geo GREEK{GR,CY}→el) MÁS el trabajo EXCLUSIVO de griego que era el único bloqueador técnico del plan original: (1) FUENTE — `Geist`/`Geist_Mono` + el display local `Zuume` carecen de subset/glifos `greek`; `Barlow`/`DM_Sans` necesitan `subsets:['latin','greek']`; (2) SCRIPT no-Latin — slugs Latin/transliteración (Greek→Latin ASCII-fold en el slugifier, sin mintar URLs griegas), `<html lang='el-GR'>` load-bearing, check de display/truncación. Metadata canónico de `el` para cuando vuelva: hreflang `el`, html `el-GR`, og `el_GR`, **flag-icons `gr`** (no `el`), Intl/date tag `el-GR`, abreviaturas de pie `ΑΠ`/`ΔΠ`, sufijo edad `ε`, plural CLDR `one`/`other`. (Incluye lo que antes era el ítem standalone P2-2 de transliteración griega: la tarea de localizar el slug generator, confirmar/añadir Greek→Latin fold y testear con nombre griego queda absorbida aquí.)
- **P2-1 `player-languages.ts` shape:** no se pre-resolvió la estructura exacta (grep dio 0 matches al patrón asumido). **Diferido a ejecución, no a planning:** la tarea F-A dice explícitamente "releer el archivo antes de editar". Razón: el widening es mecánico una vez vista la shape; no cambia secuenciación ni riesgo. La decisión de contenido (nuevas filas de idioma nativo seleccionable) se marca como adyacente, no bloqueante.
- **P2-3 `generateStaticParams` build/ISR multiplier:** se reconoce el factor 4→7 de params/route y se añade como fila de riesgo Baja, pero **no se rediseña el build** en este plan. Razón: la mayoría de combos (slug,locale) son páginas noindex vacías (fallback `es`); el impacto real se mide post-deploy contra las preocupaciones de Speed Insights existentes (MEMORY), no se especula aquí.
- **Region-specific hreflang (de-DE, fr-FR, etc.):** deliberadamente NO se emiten como hreflang (solo language-only), per decisión 2e. Razón: ninguno tiene divergencia regional contestada estilo pt-PT; los tags regionales quedan en `HTML_LANG`/`OG_LOCALE`/`Intl`.

---

**Archivos clave (absolutos):**
- `src/i18n/routing.ts` (keystone array L13)
- `src/i18n/config.ts` (5 maps)
- `src/middleware.ts` (geo, `localeForCountry:20`)
- `src/lib/i18n/profile-content.ts` (`CONTENT_LOCALES:31`)
- `src/lib/i18n/ai-translate.ts` (`MODEL:21` = `google/gemini-2.5-flash`, `LOCALE_NAME`/`GLOSSARY`)
- `src/components/common/animations/SoccerPitch3D.tsx` (`PITCH_CHROME:93` — MISSED en v1)
- `src/emails/templates/{welcome-player,welcome-agency,lead-welcome,subscription-welcome,payment-failed,comp-grant-welcome,player-disconnect,profile-completion,admin-profile-corrected,blog-post-approved-author,blog-post-rejected-author}.tsx` (11 `COPY: Record<Locale>` — MISSED en v1)
- `src/app/actions/agency-translations.ts` + `src/app/actions/coach-translations.ts` (tier guards — **falta count guard**, ×8 enums + `TRANSLATABLE_LOCALES:13`)
- `src/app/[locale]/(dashboard)/dashboard/edit-profile/translations/actions.ts` (player `tierLimit=4` real, L211-212)
- `scripts/i18n/check-parity.cjs` (gate, `LOCALES:18`; wire a prebuild+CI)
- `src/db/schema/{translations.ts:41,coachTranslations.ts:38,blog.ts:118,users.ts:28}` (11 CHECK swap)
- `src/app/[locale]/layout.tsx` (`next/font` subsets L19-43, og:locale L78, generateStaticParams L115)
- `src/lib/seo/{articleJsonLd.tsx:63,profilePageJsonLd.tsx:71}` (fix `inLanguage` hardcodeado)
- `src/i18n/messages/{de,fr,fi}/*.json` (57 archivos a crear)
- Doc canónico de referencia: `docs/i18n/HANDOFF.md` (§2, §5, §7, §8, §12, §13, §14, §17)

> NOTA Fase 2 (griego diferido): cuando se retome `el`, además de los surfaces arriba se reactivan `src/app/[locale]/layout.tsx` (`next/font` subsets — añadir `"greek"` a Barlow/DM Sans + sustituto Greek-capable solo para Geist/Geist_Mono) y `src/lib/fonts.ts` + `src/fonts/Zuume/` (display face Greek-capable / fallback Greek). Ver §8 entrada GRIEGO.
