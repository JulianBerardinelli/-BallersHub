<!--
  Generado por análisis multi-agente (7 especialistas en paralelo: routing/config, namespaces,
  DB constraints, SEO/hreflang, docs canónicos, market ROI, locale-tech) + síntesis + review
  adversarial + revisión final. 2026-06-22.
  Companion de docs/i18n/HANDOFF.md (el plan de los 4 locales actuales). Este doc cubre la
  expansión a 8 (añadir de/fr/el/fi). Aún NO ejecutado — requiere decisiones del owner (§2).
-->

# Plan de Implementación — Expansión a 8 Locales (añadir `de`, `fr`, `el`, `fi`)

**Documento canónico de trabajo. Versión 2.0 — 2026-06-22.** (Revisada con review adversarial: incorpora 11 bloques de email COPY, `SoccerPitch3D`, corrección de fuentes griegas, gate `i18n:check` como precondición dura, y guards de tier verificados.)
Locales existentes: `es` (default, sin prefijo), `en`, `it` (`it-IT`), `pt` (`pt-BR`). Locales nuevos: `de` (alemán), `fr` (francés), `el` (griego), `fi` (finés).
Ejecutar contra **`origin/main`** (no contra este worktree, que está en una branch stale con 8 namespaces; `main` tiene 19).

---

## 0. TL;DR + insight de arquitectura

**TL;DR.** Añadir 4 locales es una **expansión aditiva de bajo riesgo estructural**: la arquitectura i18n+DB de BallersHub se diseñó deliberadamente para escalar. El trabajo se concentra en (a) widening de un puñado de `Record<Locale, ...>` que el compilador TypeScript fuerza —**incluyendo dos superficies que el draft v1 omitió: los 11 bloques `COPY` de emails transaccionales y `SoccerPitch3D.PITCH_CHROME`**—, (b) un único swap de 11 CHECK constraints no-destructivo, y (c) el volumen real: ~13.896 strings de chrome (3.474 × 4) **+ la suite completa de emails transaccionales (~11 plantillas × 4)** que requieren MT + revisión humana. El único bloqueador técnico genuino es la **fuente griega** —pero más acotado de lo que se creía: solo la familia **Geist** carece de subset `greek`; Barlow/DM Sans sí lo ofrecen. Las decisiones pendientes son de producto: el tope Pro y el orden de lanzamiento.

**Insight de arquitectura (con evidencia).** Cuatro decisiones de diseño hacen esto aditivo:

1. **`text`+CHECK en vez de `pgEnum`** — `src/db/schema/translations.ts:38-41`: *"kept as a text CHECK (not a pgEnum) so adding a locale later is a non-destructive constraint swap, not an ALTER TYPE."* Widening un `IN (...)` solo **añade** valores → ninguna fila existente viola la constraint → valida sin reescritura de tabla, sin expand/contract de 2 PRs.
2. **`localePrefix: "as-needed"`** (`src/i18n/routing.ts:15`) — `/` sirve `es` sin prefijo para siempre; los nuevos son `/de`, `/fr`, `/el`, `/fi`, puramente aditivos.
3. **Namespace-per-file con import dinámico** — `src/i18n/request.ts` usa `` import(`./messages/${locale}/...`) `` (loop sobre namespaces, `${locale}` dinámico): apenas existan las carpetas `messages/{de,fr,el,fi}/`, cargan **sin tocar `request.ts`** (verificado).
4. **hreflang/sitemap data-driven** — los helpers en `src/lib/seo/hreflang.ts` iteran `routing.locales` y gatean por `availableLocales`; añadir 4 códigos ensancha un loop.

El `Locale` union (`src/i18n/routing.ts:24`) deriva de `routing.locales`: ensanchar ese array convierte cada `Record<Locale, ...>` **no-`Partial`** en un **error de compilación** que apunta a cada sitio pendiente. Ese es el guardarraíl. **Caveat:** los `Record<Locale>` con fallback en runtime (`?? X.es`, p.ej. `SoccerPitch3D`, `position-tactics`) **igualmente fallan `tsc --noEmit`** porque el tipo exige todas las keys — el fallback evita el crash, no el error de compilación. Por eso F-G (typecheck) los atrapa, pero hay que enumerarlos en F-A para no descubrirlos tarde.

---

## 1. Alcance y no-objetivos

**En alcance:**
- Registro de los 4 locales en routing, config maps, middleware geo, switchers, editores de dashboard, blog, auth, API, **emails transaccionales**, **animación de pitch**.
- Migración DB: widening de 11 CHECK constraints a la lista de 8.
- Traducción del chrome (19 namespaces × 4 = 13.896 strings) **+ suite de emails transaccionales (~11 plantillas × 4)** con gate de paridad.
- Wiring de `i18n:check` a `prebuild` + CI como **precondición de merge** (hoy es gate manual, no bloquea `next build`).
- Fuentes/layout: subset `greek` donde la familia lo soporte + sustituto solo para Geist; audit de overflow de/fi.
- SEO: hreflang/sitemap/JSON-LD scale, GSC properties, indexación ROI-ordenada; **fix del leak `inLanguage` hardcodeado** (promovido desde "flag aparte", ver §1 no-objetivos revisado).
- Habilitación de contenido per-profile (CHECK + `CONTENT_LOCALES`) + targets/glosario del asistente IA.

**No-objetivos (explícitos):**
- **No** se traduce contenido per-profile de usuarios automáticamente para indexación (regla de oro HANDOFF §4 — el autor firma cada versión).
- **No** se cambia `defaultLocale` ni el prefijo de `es`. URLs `es` quedan byte-idénticas (sin ruptura de backlinks/GSC/drift).
- **No** se mintan slugs en script griego (slugs Latin compartidos; ver F-E + P2 transliteración).
- **No** se sube el tier Free a multi-locale (queda mono-`es`).
- **No** se editan archivos de migración históricos ni `meta/` (golden rule 3).
- **PROMOVIDO desde no-objetivo a EN ALCANCE:** el leak pre-existente `inLanguage: "es-AR"` de `articleJsonLd.tsx:63` / `profilePageJsonLd.tsx:71`. Razón del cambio: con 4 locales nuevos, un `inLanguage` hardcodeado a `es-AR` queda **incorrecto en 7 de 8 locales** (antes 3 de 4); el blast radius se duplica y el fix es de bajo esfuerzo (cablear a `HTML_LANG[locale]`). Se incluye en F-E.

---

## 2. Decisiones que necesita el OWNER

> Cada una con recomendación + rationale. Bloquean fases específicas; marcadas abajo.

### (a) Tope de traducciones Pro con 8 locales — **BLOQUEA F-F (y agency/coach actions)**
**Estado verificado del código:**
- **Player** SÍ tiene guard numérico real: `tierLimit = 4` + `available.length >= tierLimit` (`edit-profile/translations/actions.ts:211-212`, confirmado).
- **Agency** capea SOLO vía `z.enum(["en","it","pt"])` de 3 valores en **8 puntos** de `agency-translations.ts` (L23,29,178,184,286,293,401,408) — **sin guard numérico**.
- **Coach** capea SOLO vía `TRANSLATABLE_LOCALES = ["en","it","pt"]` (`coach-translations.ts:13`) consumido por `z.enum` — **sin guard numérico**.

**Implicación (P0 de negocio, no P1):** si ensanchas los enums de agency/coach de 3→7 sin añadir un count guard, un Pro agency/coach podría publicar los 7 locales extra (8 totales), rompiendo silenciosamente la regla "es + hasta 3".

**Recomendación: mantener el tope en 4 totales (es + 3 elegidos de 7), NO subirlo.** Rationale: (1) menor cambio — `tierLimit` queda en 4, solo se ensancha el set seleccionable; (2) **costo IA plano** (ver decisión recalculada abajo); (3) evita el toggle de 8 pestañas que HANDOFF §12 advierte genera carga cognitiva; (4) preserva el incentivo de upgrade.

**Acción asociada OBLIGATORIA (sin esto, ensanchar el enum rompe el negocio):** añadir guard numérico explícito a `agency-translations.ts` y `coach-translations.ts`, espejando el patrón `available.length >= tierLimit` del player. **No** ensanchar el `z.enum` a 7 sin el count check. (Tarea concreta de código, no "espejá el patrón" a mano: leer el flujo `getAvailableLocales` de agency/coach e insertar el chequeo antes del upsert.)

**Costo IA (recalculado, ya no es un "recalcular" abierto):** el modelo es `google/gemini-2.5-flash` (`ai-translate.ts:21`), ya barato — el owner bajó de tier desde Sonnet deliberadamente. Bajo la recomendación (tope = 4), el costo per-profile es **idéntico al de hoy** (sigue siendo es + hasta 3; solo se amplía el set elegible, no la cantidad). El "<$1/mes peor caso" de HANDOFF §5.1 **no cambia**. El costo solo escalaría si el owner **sube** el tope: ahí sí 8×7=56 primeras traducciones/perfil (peor caso) vs 24 hoy, y habría que rehacer la cuenta. La fila de riesgo "costo IA sube" aplica **solo si se override 2(a)**.

**Si** el owner quiere diferenciación premium: alternativa "es + 5" como tier superior con precio distinto (decisión de pricing pura).

### (b) Orden de lanzamiento — **gobierna F-C…F-G secuenciación**
**Recomendación (ROI): `de → fr → el → fi`.**
- **de primero**: Bundesliga top-4 europeo, mercado importador denso; `de` cubre DE+AT+CH-de (máxima cobertura/costo).
- **fr segundo**: Ligue 1 fábrica de talento + reach a África francófona (mayor pipeline de scouting sin firmar); `fr` cubre FR+BE+CH-fr+CA.
- **el tercero**: Super League hub importador (246 extranjeros 2024/25) pero reach limitado (GR/CY).
- **fi último**: Veikkausliiga el mercado más chico, sin leverage multi-país (FI solo), análogo defensivo a EN.

Confirmar contra datos reales del pipeline de scouting (regla de evidencia HANDOFF §16).

### (c) ¿Los 4 chrome juntos o escalonado? — **gobierna F-C**
**Recomendación: chrome de los 4 juntos** (chrome = costo marginal bajo, evita re-trabajo; el escalonado aplica solo al SEO de contenido real). **Pero** desacopla el *activado del locale* (routing) del *lanzamiento SEO*: el chrome puede estar listo y mergeado mientras el GSC property + push de indexación de cada locale se hacen en orden ROI (b). Esto evita over-advertising de hreflang en marketing no traducido.

### (d) MT vs traducción humana por mercado — **gobierna F-C revisión + F-F quality**
**Recomendación:** **de/fr → copy revisado por humano** (más tráfico, más superficie comercial: pricing/landing/agency; jerga futbolística idiomática). **el/fi → MT aceptable** para contenido per-profile y strings UI al lanzamiento, con QA nativo ligero solo en marketing/legal conversion-critical. `el` además necesita check de display no-Latin (truncación, render). **Nota añadida:** los emails transaccionales son conversion/legal-sensitive — su revisión sigue la misma matriz pero con bar más alto (de/fr humano; el/fi MT + QA nativo obligatorio en welcome/subscription/payment-failed).

### (e) hreflang language-only + geo edge cases — **confirmar**
**Recomendación: SÍ, language-only `de`/`fr`/`el`/`fi`.** Coincide con la convención (`en` es language-only; `config.ts` usa códigos genéricos EXCEPTO pt-BR). Ninguno tiene divergencia regional contestada estilo pt-PT. Los tags region-specific quedan solo en `HTML_LANG`/`OG_LOCALE`/`Intl` (`de-DE`, `fr-FR`, `el-GR`, `fi-FI`).

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
| el | Ελληνικά | **`gr`** | `el` | `el-GR` | `el_GR` | `el-GR` |
| fi | Suomi | `fi` | `fi` | `fi-FI` | `fi_FI` | `fi-FI` |

**Nota crítica:** flag-icons de `el` es **`gr`** (ISO país Grecia), NO `el`.

**Checklist F-A:**
- [ ] `src/i18n/routing.ts:13` — añadir `"de","fr","el","fi"` a `locales[]` (keystone; `Locale` auto-ensancha). **No mergear este cambio en prod hasta que el chrome del locale pase `i18n:check` verde** (ver F-C).
- [ ] `src/i18n/config.ts` — los 5 `Record<Locale,string>`: `HREFLANG_CODE` (L11-16), `HTML_LANG` (L19-24), `OG_LOCALE` (L27-32), `LOCALE_LABEL` (L36-41), `LOCALE_FLAG` (L48-53, `el→gr`).
- [ ] `src/middleware.ts:20` — ensanchar return union de `localeForCountry`; añadir sets antes de `return "en"`: `GERMAN{DE,AT,CH,LI}→de`, `FRENCH{FR,BE,MC,LU}→fr`, `GREEK{GR,CY}→el`, `FINNISH{FI}→fi`. (CH/BE/LU = defaults pragmáticos, decisión 2e.)
- [ ] `src/lib/i18n/profile-content.ts:31` — `CONTENT_LOCALES` += 4 (ensancha `isContentLocale`, `getAvailable*Locales`, hreflang per-profile, sitemap).
- [ ] `src/lib/i18n/dates.ts:7-12` — `DATE_TAG` += 4.
- [ ] `src/lib/i18n/ai-translate.ts:27` — `TranslateLocale` union += 4; `LOCALE_NAME` (L30-35) += 4; `GLOSSARY` (L39-54) extender con columnas de/fr/el/fi (sin esto la calidad IA degrada).
- [ ] `src/lib/i18n/positions.ts` — `POSITION_LABELS` (L14) + `FOOT_LABELS` (L62): 4 sub-maps cada uno.
- [ ] `src/lib/i18n/position-tactics.ts:18` — ensanchar key union + 4 sub-maps (tiene fallback `es` en runtime, pero **igual da error de compilación** hasta completar las keys).
- [ ] `src/lib/i18n/player-languages.ts:16` — añadir de/fr/el/fi a las filas. **Releer el archivo antes:** no usa el patrón `code:/name:` asumido en el draft v1 (grep dio 0 matches) → confirmar la shape real (probablemente array de objetos / tuplas) antes de editar. Decisión de contenido adyacente: si se quieren **nuevas filas de idioma nativo seleccionable** (p.ej. "Alemán" como lengua que un jugador declara hablar), eso es contenido, no solo traducción de labels.
- [ ] **`src/components/common/animations/SoccerPitch3D.tsx:93`** — `PITCH_CHROME: Record<Locale,{position,zone}>` (**MISSED en v1**). Tiene `?? PITCH_CHROME.es` en L107 (no crashea) pero **falla `tsc`** hasta añadir los 4 pares position/zone traducidos.
- [ ] SEO JSON-LD label maps: `src/lib/seo/personJsonLd.tsx` (`JOB_TITLE`, `HOME_LABEL`, `POSITION_LABELS` L76-118), `agencyJsonLd.tsx` (`HOME_LABEL`, `AGENCIES_LABEL`), `coachJsonLd.tsx` (`JOB_TITLE`, `HOME_LABEL`).
- [ ] Switchers: `HeaderLocaleSwitcher.tsx` (L21 `ORDER`, L22-27 `META`), `PortfolioLocaleSwitcher.tsx` (L19/L20-25), `LocaleSwitcher.tsx` (L11 `SHORT`: `DE/FR/EL/FI`).
- [ ] Editores dashboard: `TranslationsEditor.tsx` (L32 `EditableLocale`, L55 `BASE_ORDER`, L57-62 `LOCALE_META`); `edit-profile/translations/actions.ts` (L43+L299 `z.enum`, y L49/L490/L497/L600 los enums de 3 valores — **ensanchar a 7 está OK aquí porque player tiene `tierLimit=4` real**); `edit-profile/translations/page.tsx:184`; `coach/translations/CoachTranslationsEditor.tsx` (L12+L22) y `page.tsx:13`; los 4 componentes agency (`AgencyTranslationsSection.tsx`, `AgencyCountryProfileTranslationsSection.tsx`, `AgencyMediaTranslationsSection.tsx`, `AgencyServicesTranslationsSection.tsx`); `settings/account/components/NativeLocaleCard.tsx` (L12-17) y `actions.ts:8`.
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
- [ ] Editar 4 schema files (cubren las 11 vía consts compartidas): `translations.ts:41` (`LOCALE_CHECK`), `coachTranslations.ts:38`, `blog.ts:118`, `users.ts:28` → nueva lista `('es','en','it','pt','de','fr','el','fi')`.
- [ ] `npm run db:generate` → nuevo SQL. **NO hardcodear el ordinal:** usar el que Drizzle emita y **confirmar que no colisiona con ninguna migración manual `0015x`** antes de aplicar (MEMORY: hubo colisión de numeración en la vertical coach). Renombrar si colisiona.
- [ ] **Revisar SQL generado**: exactamente 11 pares `DROP CONSTRAINT` + `ADD CONSTRAINT`, nombres byte-idénticos, sin DROP TABLE ni diffs inesperados. Si aparece algo raro → arreglar TS, NO aplicar.
- [ ] Confirmar `user_profiles_preferred_locale_check` está en el diff.
- [ ] Aplicar a **supabase-dev primero** (`ciolizjshimyvyonlssq`) vía `db:migrate` o MCP `apply_migration`.
- [ ] Smoke en preview: publicar una traducción `de`/`fr`/`el`/`fi` E2E; confirmar hreflang + fallback noindex.
- [ ] **Owner autoriza + aplica a prod** (`erdvpcfjynkhcrqktozd`).
- [ ] **apply-then-register-hash**: `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('<sha256 del archivo>', <epoch ms>);` en prod.
- [ ] Verificar: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%locale_check'` muestra las 11 con la lista de 8 en ambas branches.
- [ ] Commit `meta/_journal.json` + snapshot + schema TS juntos. NUNCA editar `meta/` a mano.

### F-C — Traducción del chrome + emails

**Volumen (verificado):** 19 namespaces, 3.474 leaf keys en `es/` → **13.896 strings** de chrome para 4 locales. Namespaces pesados: `dashEditProfile` (545), `portfolio` (397), `dashAgency` (392), `pricing` (361), `dashboard` (318), `legal` (269).
**+ Emails (añadido):** ~11 plantillas × 4 locales de copy hand-authored con interpolación, en `.tsx` (no en `messages/`). **Volumen separado, no cubierto por `i18n:check`** — trackear manualmente la paridad de los 11 `COPY` blocks.

**Proceso:**
1. **Scaffold chrome:** `cp -r src/i18n/messages/es src/i18n/messages/<locale>` (4 dirs × 19 = 76 archivos). Estructura de keys idéntica → paridad verde antes de traducir.
2. **Registrar parity gate:** `routing.locales` (F-A) + **editar el array hardcodeado en `scripts/i18n/check-parity.cjs:18`** (hoy `["es","en","it","pt"]`, verificado; sin esto las nuevas dirs ni se chequean).
3. **PRECONDICIÓN DURA — wire `i18n:check` a `prebuild` + CI ANTES de registrar cualquier locale en `routing.locales` en prod.** Hoy `package.json` solo tiene `build: next build --turbopack` y `typecheck: tsc --noEmit`; **no hay prebuild hook ni workflow CI que invoque `check-parity.cjs`** (verificado). Sin esto, no hay garantía automática de que los 19 namespaces estén completos antes de activar el locale, y un namespace faltante/vacío hace que `request.ts` lance en runtime. **Tareas concretas:** (a) `"prebuild": "node scripts/i18n/check-parity.cjs"` en `package.json` para que `next build` falle ante drift; (b) un job CI que corra el mismo script en cada PR. **Regla de merge:** scaffold + traducción completa + `i18n:check` verde es **precondición bloqueante del cambio a `routing.locales`** para cada locale. Esto convierte la garantía de paridad de "condicional a un TODO" en estructural.
4. **MT batch por namespace** con system prompt que enforce la **do-not-blind-translate list**:
   - Marca `#` de acento en `home.hero.headlines.*` (mantener `#` pegado a la palabra resaltada, array length = 3).
   - Abreviaturas de pie `footLeft`/`footRight`: de `LF`/`RF`, fr `PG`/`PD`, el `ΑΠ`/`ΔΠ`, fi `VJ`/`OJ` (futbolista nativo, no MT).
   - **Categorías plurales CLDR**: **fr necesita `one`/`many`/`other`** (¡branch `many` obligatorio!); el/fi `one`/`other`. Namespaces con plurales: `portfolio` (8), `scouting` (6), `blog` (4), `mobileNav` (1), `dashAgency` (1).
   - Tags HTML/rich-text (8 namespaces: `portfolio, onboarding, site, scouting, checkout, dashEditProfile, dashboard, auth`) preservados verbatim.
   - Placeholders ICU (`{age}`, `{count}`, `{n}`, `{countries}`); sufijo de edad locale-específico: de `J`, fr `a`, el `ε`, fi `v`.
   - `BallersHub` verbatim siempre. Traducir solo values, nunca keys ni array lengths.
5. **Emails:** traducir los 11 `COPY` blocks manualmente (cuidando las funciones de interpolación — son código, no strings planos). MT permitido pero con la matriz 2d más estricta (conversion/legal-sensitive).
6. **Revisión humana** (decisión 2d): de/fr ligera (terminología + plural `many` fr), **el/fi obligatoria** (script no-Latin + morfología aglutinante). Emails welcome/subscription/payment-failed → QA nativo obligatorio en los 4.
7. **Gate:** `npm run i18n:check` verde (detecta keys faltantes, drift de array length, archivos faltantes); luego `npm run typecheck`/`next build` (errores de sintaxis ICU + todos los `Record<Locale>` cerrados, **incl. los 11 COPY + PITCH_CHROME**). Paridad de emails se verifica a mano (fuera de `i18n:check`).

### F-D — Fonts / Layout

**Hallazgo clave (medido):** `latin` subset ya cubre **de/fr/fi cero cambios** (umlauts/acentos/å-ä-ö en Latin-1). El único bloqueador es **griego** (U+0370-03FF).

**Corrección sobre el draft v1 (font claim acotado):** las familias en `layout.tsx:4` son `Barlow, Barlow_Condensed, DM_Mono, DM_Sans, Geist, Geist_Mono`, todas hoy con `subsets:["latin"]` (verificado L19-43). En Google Fonts el subset es **por-familia**: **Barlow y DM Sans SÍ ofrecen `greek`**; solo **Geist + Geist_Mono carecen de griego**. La remediación es más estrecha que "sustituir todo por Noto":

**Checklist F-D:**
- [ ] **`el` — fonts, paso 1:** añadir `"greek"` a `subsets` de `Barlow`, `Barlow_Condensed`, `DM_Sans`, `DM_Mono` (one-liner cada uno, **verificando per-familia en Google Fonts que el subset existe**; confirmado para Barlow y DM Sans).
- [ ] **`el` — fonts, paso 2 (acotado a Geist):** `Geist`/`Geist_Mono` NO tienen griego → o (a) sustituir esas dos por una familia Greek-capable (Noto Sans / Noto Sans Mono) **solo donde se use Geist**, o (b) añadir un fallback Greek-capable a la cadena `--font-geist-sans`/`--font-geist-mono` que entre para `el`. NO tocar Barlow/DM Sans (ya resueltos en paso 1).
- [ ] **`el` — display font Zuume** (`src/lib/fonts.ts`, local `.otf`, sin glifos griegos): el hero/headline cae a fallback. Sin fix rápido de `subsets` para font local → sourcing de display face Greek-capable o fallback Greek en la cadena de display para `el`. (Este punto del v1 es correcto y se mantiene.)
- [ ] **Audit overflow de/fi (`fi` el peor offender por compuestos aglutinantes; `de` compuestos #1):** superficies de ancho fijo — header pill (`nav-items.ts` vía `common.nav.*`), mobile docks (`DashboardDock/PublicDock/FloatingDock.tsx`), sidebar (`dashboard/client/Sidebar.tsx`), pricing cards, hero CTAs, chips/badges. Preferir `min-w`/`truncate`/anchos flexibles. Testear con strings reales más largos, no lorem.
- [ ] Verificar `Intl.NumberFormat` usa el date/number tag, nunca tag hardcodeado (de/el coma decimal + punto miles `1.234,56`; fr/fi coma decimal + NBSP miles `1 234,56`).

### F-E — SEO

Casi todo data-driven; escala automático al ensanchar `routing.locales` + `CONTENT_LOCALES` + `BLOG_LOCALES` (juntos, o una fila `de` existe pero nunca recibe hreflang).

**Checklist F-E:**
- [ ] BCP47/og por locale ya en `config.ts` (F-A). hreflang language-only confirmado (decisión 2e).
- [ ] **Gating de contenido:** traducir dicts marketing (home/pricing/about/legal/blog UI) ANTES de añadir el locale a `routing.locales` en prod, o `sitemapLanguages` over-advertise hreflang en páginas no traducidas.
- [ ] Per-profile hreflang/sitemap escalan solos vía `CONTENT_LOCALES` — verificar, sin editar `hreflang.ts`/`sitemap.ts`.
- [ ] JSON-LD `inLanguage` vía `HTML_LANG` (auto); label maps llenados en F-A.
- [ ] **FIX promovido a este PR:** cablear `inLanguage` hardcodeado `"es-AR"` en `articleJsonLd.tsx:63` y `profilePageJsonLd.tsx:71` a `HTML_LANG[locale]`. Con 8 locales, el hardcode es incorrecto en 7/8. Bajo esfuerzo, win de correctness SEO.
- [ ] **Griego SEO:** mantener slugs Latin compartidos (NO mintar URLs griegas — rompería el shared-slug mesh). `<html lang="el-GR">` load-bearing para render no-Latin. Greek Unicode subset en `next/font` (overlap con F-D). Ver P2 transliteración para el pipeline de input.
- [ ] **Ops por locale (orden ROI decisión 2b):** registrar GSC properties `/de/`, `/fr/`, `/el/`, `/fi/` en cada lanzamiento; root `ballershub.co/` intacto. Re-baseline `seo-drift` post-deploy.
- [ ] Regresión: confirmar clusters `es/en/it/pt` byte-idénticos; `x-default → es` sin cambios.

### F-F — Contenido per-profile + asistente IA

- [ ] Habilitado por F-B (CHECK widening) + `CONTENT_LOCALES` (F-A): una fila `de` en `*_translations` fluye por `isContentLocale` → `getAvailable*Locales` → hreflang + flip de noindex. Sin cambios per-profile.
- [ ] **Tier-gate (decisión 2a):** `tierLimit` ya existe en player (verificado); **añadir guard numérico a agency/coach** (hoy ausente — P0 de negocio).
- [ ] `generateTranslationDraft`/`LOCALE_NAME`/`GLOSSARY` con targets nuevos (F-A). Sin glosario para los nuevos → calidad IA degrada.
- [ ] `REGEN_LIMIT` (40/mo) es locale-agnóstico — sin cambio.
- [ ] Costo IA: **plano** bajo tope=4 (recalculado, decisión 2a). Solo escala si se sube el tope.
- [ ] Quality review IA el/fi (decisión 2d).

### F-G — QA / Verificación

- [ ] `npm run i18n:check` verde (8 locales × 19 namespaces) — **ya wired a prebuild/CI** (F-C step 3).
- [ ] `npm run typecheck` + `next build` limpio (ICU + todos los `Record<Locale>` cerrados, **incl. 11 email COPY + SoccerPitch3D.PITCH_CHROME + position-tactics**).
- [ ] Paridad de emails verificada a mano (11 `COPY` blocks × 4 locales; fuera de `i18n:check`).
- [ ] Smoke por locale: home hero (`#`-words), `/pricing`, scouting counts, strings con rich-tags, switcher, fechas, **render de un email transaccional** (welcome-player) por locale.
- [ ] Validación hreflang (mesh bidireccional, `x-default → es`, self-canonical por locale).
- [ ] Deploy prod + migración aplicada **antes** del merge git (drift check HANDOFF §6).

---

## 4. Esfuerzo y secuenciación

| Workstream | Esfuerzo | Paraleliza con | Dependencia crítica |
|------------|----------|----------------|---------------------|
| F-A código/config (incl. emails maps + 11 COPY + PITCH_CHROME) | ~1.5-2 día eng | F-B, F-D fonts | Keystone: routing array primero |
| F-B migración DB | ~0.5 día + owner prod | F-A, F-C | Independiente; smoke necesita F-A |
| F-C MT batch chrome (4 locales) | ~1 día scripted | — | Scaffold + parity registrado |
| F-C wire `i18n:check` CI/prebuild | ~0.25 día eng | F-A | **Precondición de routing prod** |
| F-C traducción emails (11×4) | ~0.5-1 día | F-C chrome | — |
| F-C revisión humana | de/fr ~1-1.5d c/u, el/fi ~2-2.5d c/u + email QA → **~8-10 reviewer-días** | Sí, reviewers paralelos por idioma | MT batch hecho |
| F-D fonts el (Geist sub + Zuume) | ~0.75-1 día | F-A | Bloqueador de `el` launch |
| F-D audit overflow de/fi | ~0.5-1 día | F-C | Strings reales |
| F-E SEO ops + inLanguage fix | ~0.5 día/locale + ~0.25 fix | — | Dicts marketing traducidos |

**Dependencia crítica:** chrome JSON + `i18n:check` verde (F-C) **debe existir antes de activar el locale en routing en prod** (runtime crash si no). DB (F-B) puede ir antes o en paralelo. **Total ≈ 1.5-2.5 semanas calendario** con reviewers paralelos (subió ligeramente vs v1 por los emails); ~3-3.5 si serial. Eng glue ~0.75 día. **Cuello de botella real:** revisión humana el/fi + QA de emails.

**Lo que paraleliza:** F-B (DB) independiente de F-C (traducción); revisores por idioma en paralelo; F-D fonts el en paralelo a todo; emails traducción en paralelo al chrome una vez hecho el scaffold.

---

## 5. Riesgos y mitigaciones

| Riesgo | Sev | Mitigación |
|--------|-----|-----------|
| Activar locale en routing prod sin JSON completo → runtime crash en `request.ts` | Alta | **`i18n:check` wired a prebuild/CI como precondición dura de merge** (F-C step 3). Scaffold + traducción ANTES de routing prod. |
| Griego sin fuente → hero ilegible | Alta | F-D bloqueador: `"greek"` a Barlow/DM Sans + sustituto solo Geist + Zuume fallback antes del launch `el`. |
| 11 email COPY blocks olvidados → 11 compile errors + emails sin traducir | Alta | Enumerados en F-A; traducción en F-C scope; paridad manual (fuera de `i18n:check`). |
| Agency/coach sin guard numérico → Pro publica 8 locales | Alta | Decisión 2a + **añadir count guard** (`length >= 4`), no solo ensanchar enum. |
| `SoccerPitch3D.PITCH_CHROME` / `position-tactics` olvidados → `tsc` falla | Media | Enumerados en F-A; `typecheck` los atrapa aunque tengan fallback runtime. |
| fr plural sin branch `many` → ICU incompleto/render error | Media | Do-not-translate list + `typecheck`/build atrapa sintaxis ICU. |
| Over-advertising hreflang en marketing no traducida | Media | Gating: dicts marketing traducidos antes de routing prod. |
| Overflow de/fi en nav/docks/pricing | Media | Audit F-D con strings reales; `truncate`/`min-w`. |
| Migración: colisión de ordinal con `0015x` manuales | Media | No hardcodear ordinal; verificar colisión antes de aplicar (lección coach vertical). |
| `el` flag-icons `el` en vez de `gr` → bandera rota | Baja | Documentado: `LOCALE_FLAG.el = "gr"`. Smoke visual. |
| Slug de nombre griego sin transliterar → slug vacío/mojibake | Baja | P2: localizar slugifier, confirmar/añadir Greek→Latin ASCII-fold + test con nombre griego. |
| `generateStaticParams` 4→8 duplica params/route → build time / ISR ↑ | Baja | P2: la mayoría de combos (slug,locale) son páginas noindex vacías; monitorear build time. |
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

Estrategia recomendada: **mergear F-A+F-B+F-D-fonts+chrome+emails de un locale por vez** en orden ROI (de→fr→el→fi). Cada locale se activa cuando su chrome + fuente + GSC property están listos y `i18n:check` verde. Un locale con problemas no bloquea a los demás.

---

## 7. CHECKLIST consolidado accionable

**Decisiones owner (desbloquean):**
- [ ] (a) Tope Pro con 8 locales → rec: mantener 4 (es+3) + **count guard agency/coach** (P0 negocio). Costo IA plano bajo esta opción.
- [ ] (b) Orden launch → rec: de→fr→el→fi.
- [ ] (c) Chrome junto o escalonado → rec: junto, SEO escalonado.
- [ ] (d) MT vs humano → rec: de/fr humano, el/fi MT+QA; emails QA nativo en welcome/subscription/payment-failed.
- [ ] (e) hreflang language-only → rec: sí. Geo seeds: CH→de, BE→fr, LU→fr (pragmáticos, no mayorías).

**F-A Código:** routing array → config 5 maps → middleware geo → CONTENT_LOCALES/dates/ai-translate(+glosario)/positions/position-tactics/player-languages(releer shape) → **SoccerPitch3D PITCH_CHROME** → JSON-LD label maps → switchers → editores dashboard → **tier guards agency/coach (count guard)** → blog → auth/API → email maps (format/subjects/resend) → **11 email COPY blocks** → `og:locale` layout → ternarios inline.

**F-B DB:** editar 4 schema files → `db:generate` (no hardcodear ordinal, verificar colisión) → revisar 11 pares DROP/ADD → dev-first → smoke → owner prod → register-hash → verificar pg_constraint → commit.

**F-C Chrome+emails:** scaffold `cp -r es/` ×4 → registrar `routing.locales` + `check-parity.cjs:18` → **wire `i18n:check` a prebuild+CI (precondición dura)** → MT batch chrome (do-not-translate list) → traducir 11 email COPY → revisión humana (de/fr ligera, el/fi obligatoria, emails QA nativo) → `i18n:check` verde + paridad emails manual.

**F-D Fonts/layout:** `"greek"` a Barlow/DM Sans → sustituto Greek solo Geist + Zuume fallback (`el` bloqueador) → audit overflow de/fi → verificar Intl number/date tags.

**F-E SEO:** gating dicts marketing → verificar hreflang/sitemap auto-scale → **fix `inLanguage` hardcodeado** → slugs Latin `el` + `<html lang>` → GSC properties orden ROI → re-baseline seo-drift → regresión es/en/it/pt.

**F-F Per-profile+IA:** habilitado por F-A+F-B → **count guard agency/coach** → glosario IA nuevos targets → quality review el/fi.

**F-G QA:** `i18n:check` + paridad emails manual + `typecheck` + `next build` → smoke por locale (incl. render de email) → validación hreflang → deploy prod + migración antes de merge.

---

## 8. Hallazgos del review diferidos intencionalmente (con razón)

- **P2-1 `player-languages.ts` shape:** no se pre-resolvió la estructura exacta (grep dio 0 matches al patrón asumido). **Diferido a ejecución, no a planning:** la tarea F-A dice explícitamente "releer el archivo antes de editar". Razón: el widening es mecánico una vez vista la shape; no cambia secuenciación ni riesgo. La decisión de contenido (nuevas filas de idioma nativo seleccionable) se marca como adyacente, no bloqueante.
- **P2-2 pipeline de transliteración griega:** se documenta el requisito (slugifier debe Greek→Latin ASCII-fold) y se ubica como tarea en F-E + riesgo, pero **no se localiza la función exacta en este plan** (hay múltiples sitios que slugifican, ver lista en F-E). Razón del diferimiento: es localización + test puntual, bajo blast radius (slugs `es` no se tocan; solo afecta input de display name griego nuevo). Tarea concreta: localizar el slug generator, confirmar/añadir fold, test con nombre griego.
- **P2-3 `generateStaticParams` build/ISR multiplier:** se reconoce el factor ×2 de params/route y se añade como fila de riesgo Baja, pero **no se rediseña el build** en este plan. Razón: la mayoría de combos (slug,locale) son páginas noindex vacías (fallback `es`); el impacto real se mide post-deploy contra las preocupaciones de Speed Insights existentes (MEMORY), no se especula aquí.
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
- `src/lib/fonts.ts` + `src/fonts/Zuume/` (Greek display fallback)
- `src/lib/seo/{articleJsonLd.tsx:63,profilePageJsonLd.tsx:71}` (fix `inLanguage` hardcodeado)
- `src/i18n/messages/{de,fr,el,fi}/*.json` (76 archivos a crear)
- Doc canónico de referencia: `docs/i18n/HANDOFF.md` (§2, §5, §7, §8, §12, §13, §14, §17)