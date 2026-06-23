# BallersHub — i18n / Multilang HANDOFF

> **Status:** 🟢 **EJECUTADO** — el plan (§13, F0–F7) está en prod. Ver **§0.1 (Estado de ejecución + tareas pendientes)** para el estado real al 2026-06-12.
> **Expansión a 8 locales (de/fr/el/fi):** plan profesional self-contained en [`EXPANSION-8-LOCALES.md`](./EXPANSION-8-LOCALES.md) (2026-06-22, aún NO ejecutado — requiere decisiones del owner). Este HANDOFF cubre los 4 actuales (es/en/it/pt).
> **Owner:** @julian-berardinelli
> **Entry point:** este doc es self-contained. Un chat nuevo que retome i18n arranca leyendo esto **+ §0.1**.
> **Relación con SEO:** adelanta y reemplaza la Phase 4 de [`../seo-strategy.md`](../seo-strategy.md) §8 ("Evaluate English `/en/[slug]` hreflang once AR-only growth plateaus") — ahora se hace bien desde el principio, con 4 locales.

---

## 0. TL;DR

BallersHub pasa de mono-locale (es-AR) a **4 idiomas**: ES (default, sin prefijo), EN, IT, PT-BR. El objetivo es que **los jugadores Pro puedan enviar su portfolio y ser entendidos en los mercados objetivo** (Brasil, Italia, anglosfera) sin perder SEO ni corporativo ni per-player. La UI se traduce con diccionarios JSON (asistido por LLM). El contenido del jugador NO se auto-traduce para indexación: el jugador Pro lo escribe (con un asistente "Auto-completar con Claude" que genera borrador editable). Free queda mono-locale (es).

---

## 0.1 Estado de ejecución + tareas pendientes (2026-06-12)

> El plan original (§13, F0–F7) está **ejecutado y en prod**. Esta sección es el estado real y, sobre todo, **lo que falta para cerrar el 100%** (auditoría de código 2026-06-12).

### ✅ Hecho (en `main`)
- **F0 routing**: árbol bajo `app/[locale]/` + middleware. **`localeDetection: false`** (una URL sin prefijo SIEMPRE sirve es; el geo de 1ª visita va por IP en `src/middleware.ts`, no por cookie — no re-activar sin entender el loop `/pt/slug`→`/pt`). [#190]
- **F1/F2 chrome + marketing**: header/footer/pricing/auth/dashboard + `generateMetadata` multilang + sitemap `alternates`.
- **F3 SEO**: JSON-LD person/agency (POSITION_LABELS, `inLanguage`, `jobTitle`) + OG + **hreflang per-player y per-agency** (dinámico, solo locales con traducción real).
- **F4/F5 editor**: editor de traducciones Pro **unificado** — un solo selector de idioma maneja bio+scouting+**palmarés**; **es NO editable** (es la base, se edita en Football data); % relativo a la base. Asistente **"Auto-completar"** traduce SIEMPRE desde es (jugador + palmarés) con tier-gate + anti-abuso (§5.1). [#175, #192, #193]
- **F5 contenido per-profile**: jugador (8 campos) + agencia (description/tagline) + **palmarés/honores** (tabla `player_honour_translations` + render + editor + IA). [#185, #187]
- **Perfil `/[slug]` localizado**: posiciones, pie, tarjeta bio, labels+fechas de prensa, **pitch** (zonas/fortalezas), redirect a `/slug` si falta la traducción, switcher dentro del header.  [#183, #188, #190, #203]
- **⚠️ Módulos Pro stremeados ahora aplican la traducción** (`ProfileBioModule`, `TacticsModule`) — eran EL bug "la data no traduce" (re-fetcheaban sin mergear). [#203]
- **F6 emails per-locale** (3 fases). [#177, #179, #181]
- **F7**: CI lint de paridad de keys (`npm run i18n:check`) + re-baseline seo-drift.
- **Agencia**: editor de traducciones (description/tagline) + render mergeado + switcher + redirect. [#190]

### ⬜ Pendiente para cerrar el 100%

**P0 — Paridad de la AGENCIA (mismo bug de chrome es-only que tenía el jugador, visible en `/en|/it|/pt /agency/[slug]`):**
- [ ] Loading states de agencia hardcodeados en es → `AgencyLayoutResolver.tsx` ("Cargando agencia/equipo/roster/galería"). Mismo fix que `LayoutResolver` del jugador.
- [ ] Chrome de módulos de agencia hardcodeado → `AgencyReachModule` ("Operamos globalmente", "/ Alcance", país/países, "equipos"), `AgencyServicesModule` ("Lo que ofrecemos", "/ Servicios", subtítulo), `RosterClient` ("Jugadores Representados"). Pasar a `useTranslations`/messages.
- [ ] Switcher de agencia: hoy usa el flotante standalone; unificar con el patrón del header del jugador si la agencia tiene header equivalente.

**P1 — Free-text fuera del sistema de traducción (siempre renderiza es). Necesita DECISIÓN del owner (traducir = nueva superficie tipo F5, o dejar es):**
- [ ] **Galería**: captions/altText de fotos (`player_media`/`agency_media` → `title` + `alt_text`). Render en `MediaGalleryModule`/`AgencyGalleryModule`.
- [ ] **Datos personales del jugador**: `languages`, `education`, `residence_city/country` (`player_personal_details`, render en `BioClientCard`). *languages* es mapeable (nombres de idioma); educación/residencia son texto libre / nombres propios.
- [ ] **Contenido de agencia**: `services[]` (title+description, en `agency_profiles.services` JSONB) y narrativas por país (`agency_country_profiles.description`). Hoy es-only.

**P2 — Otras superficies grandes:**
- [ ] **Blog multilang** (F6 del plan original, NUNCA hecho): `blog_posts.locale` + `translation_of_id` + UI por locale + hreflang. Es la última superficie de contenido grande.
- [ ] **Cuerpos de páginas marketing** aún en es: `/como-validamos` (body), y auditar about/FAQ por texto hardcodeado.

**Verificación:**
- [ ] Confirmar en prod (tras deploy de #203) que `/en/julian-berardinelli` muestra **bio + scouting en inglés** (no solo el esqueleto).

### Decisiones que necesita el owner (P1)
- **¿Galería / datos-personales / contenido-de-agencia se traducen o quedan es?** Es free-text de bajo volumen; traducirlo implica nuevas tablas o JSONB-por-locale + UI de editor (esfuerzo tipo F5). Recomendación: *languages* (mapeo de nombres) y captions de galería **sí**; educación/residencia/nombres propios **no** (dejar es). Servicios/narrativas de agencia: traducibles si las agencias lo piden.
- **¿Blog multilang ahora o backlog?** Última pieza grande del plan original.

---

## 1. Decisiones cerradas (no re-litigar sin el owner)

| Decisión | Valor | Estado |
|---|---|---|
| URL `/` | **es-AR para siempre** (sin prefijo, default). Cero ruptura de SEO/backlinks/GSC actuales | ✅ cerrada |
| Locales soportados | `es` (default), `en`, `it`, `pt` | ✅ cerrada |
| Variante PT | **pt-BR** estricto (Brasil = target; pt-PT es ROI bajo) | ✅ default tomado |
| Variante IT | **it-IT** estricto, con auto-detect Geo que igual atrape CH italiana → `/it/` | ✅ default tomado |
| Free tier | **1 idioma** (es). Sin multilang. El público se sirve solo en es-AR | ✅ cerrada |
| Pro tier | Nativo + hasta **3 traducciones = 4 totales** (ES+EN+IT+PT). El jugador elige cuáles activar | ✅ cerrada |
| Asistente "Auto-completar con Claude" | **Pro-only**. Diferenciador de upgrade | ✅ cerrada |
| Orden lanzamiento SEO real | **PT → IT → EN** (por ROI/afinidad de mercado) | ✅ cerrada |
| UI multilang (chrome/dashboard/marketing) | Los **4 idiomas juntos** (costo marginal bajo, evita re-trabajo). El escalonado PT→IT→EN aplica solo al SEO real de contenido | ✅ default tomado |
| Auto-detect home | `Accept-Language` + Vercel Geo header, **nunca para bots** | ✅ cerrada |
| Stack core | `next-intl` + Vercel AI Gateway + AI SDK v6 + Drizzle/Supabase | ✅ cerrada |

### Diferido a backlog ("cuando haya más presupuesto")

- **Traducción on-demand para Free**: botón "Translate this profile (powered by Claude)" en portfolios Free para visitantes extranjeros, client-side, `robots: noindex`. **NO se implementa ahora.** Mantener Free 100% mono-locale refuerza el incentivo de upgrade a Pro.

---

## 2. Routing

```
ballershub.co/...           → es-AR (default, SIN prefijo) — INTOCABLE
ballershub.co/en/...        → en
ballershub.co/it/...        → it-IT
ballershub.co/pt/...        → pt-BR
```

`next-intl` config:
```ts
// src/i18n/routing.ts
{
  locales: ['es', 'en', 'it', 'pt'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',   // '/' no lleva prefijo, los demás sí
  localeDetection: false       // ⚠️ CAMBIADO en ejecución (ver §0.1): una URL sin
                               // prefijo SIEMPRE sirve es. El geo de 1ª visita va por
                               // IP en src/middleware.ts. Con `true`, sacar /pt de
                               // /pt/slug rebotaba a /pt por la cookie NEXT_LOCALE.
}
```

**Por qué sub-path (no sub-dominio ni parámetro):** concentra autoridad de dominio, simplifica deploy/SSL, soportado nativo por `next-intl` + `MetadataRoute.Sitemap`.

**Por qué `/` sin prefijo:** todas las URLs actuales (`/julian`, `/agency/x`, `/blog/post`) quedan idénticas → cero impacto en backlinks, GSC histórico y drift baselines existentes. `/en`, `/it`, `/pt` son **aditivas**.

---

## 3. Auto-detect en la home

```
Prioridad de match (sin pedir permisos al usuario):
1. Cookie NEXT_LOCALE (si existe)              → respetar SIEMPRE
2. Vercel Geo header (x-vercel-ip-country):
   - BR                                          → pt
   - IT, CH (italoparlante), SM                  → it
   - AR, ES, MX, CL, CO, UY, PE, ...             → es  (queda en '/')
   - US, UK, AU, IE, DE, FR, otros               → en
3. Accept-Language (fallback):
   - starts-with 'pt' → pt | 'it' → it | 'es' → es | 'en' → en | else → es
```

**🚨 Regla SEO crítica:** la redirección por idioma se aplica **solo a usuarios, NUNCA a bots**. `next-intl` middleware excluye user-agents conocidos (Googlebot/Bingbot) por defecto — **verificar en Fase 0**. Si redirigís a Googlebot desde `/` por `Accept-Language`, Google lo lee como cloaking y penaliza.

**Selector manual** además del auto-detect: dropdown en navbar (`ES | EN | IT | PT`) que setea cookie `NEXT_LOCALE` y navega a `/{locale}/...`. En el portfolio público el selector es un `<Link>` (navega a URL distinta), **nunca** un toggle de estado client-side.

---

## 4. Las 5 capas de contenido (regla de oro)

| Capa | Quién traduce | Riesgo SEO |
|---|---|---|
| A. UI/chrome (botones, labels, errores, navbar, dashboard) | Diccionarios JSON + LLM | Ninguno |
| B. Marketing (home, pricing, about, FAQ, blog UI) | Diccionarios JSON + review humano | Bajo |
| C. Contenido del jugador (bio, análisis, objetivos) | El jugador Pro (asistido por Claude, review obligatorio) | 🚨 ALTO — auto-traducir indexable = thin/duplicate content |
| D. Blog editorial | Autor + LLM + review | 🚨 ALTO — necesita `locale` en DB |
| E. Schema/JSON-LD, OG, sitemap, llms.txt, emails | Bilingüe en código + plantillas por locale | 🚨 ALTO — `inLanguage`, hreflang, position labels por locale |

**Regla de oro:** la UI **sí** se auto-traduce con LLM. El contenido escrito por usuarios **NO se auto-traduce nunca para indexación** — o el jugador provee la versión por idioma (con asistente), o ese locale no se indexa (fallback + `noindex`).

---

## 5. Asistente "Auto-completar con Claude" (Pro-only)

Feature **dentro del editor del dashboard**, NO traducción automática en el sitio público.

### Flujo
```
1. Jugador completa su perfil en ES.
2. Tab del editor → cambia a [EN] (campos vacíos).
3. Botón por card: "✨ Auto-completar desde ES con Claude".
4. Click → 3-5s → campos se llenan con traducción marcada como BORRADOR (badge amarillo).
5. Jugador edita lo que quiera → "Guardar versión EN".
6. RECIÉN AHÍ se inserta fila en player_profile_translations.
7. RECIÉN AHÍ /en/julian queda indexable.
```

### 3 garantías SEO no negociables
- **Nunca auto-guarda.** El borrador vive solo en el form client-side hasta que el jugador clickea "Guardar".
- **Nunca auto-publica.** `/{locale}/{slug}` responde fallback ES + `robots: noindex` hasta que la fila exista en DB.
- **El jugador ES el autor.** Firma su versión al guardar → contenido original, no traducción algorítmica indexable.

### Stack
- **Vercel AI Gateway** con string `"anthropic/claude-sonnet-4.7"` (NO `@ai-sdk/anthropic` directo). Observability + fallbacks + zero data retention.
- **AI SDK v6** (`ai`) → `generateObject()` con schema Zod (estructura exacta del output, campo por campo).
- **Prompt caching** del system prompt + glosario (~2KB) → costo marginal mínimo por llamada.

### Costo
- ~$0.03–0.05 USD por traducción asistida de los 8 campos de un jugador.
- ~$0.10–0.15 USD por Pro que activa los 3 idiomas extra.
- Asumible como costo de plataforma (no facturable por uso).

### Gate
```ts
await assertPro(playerId);  // tier gate server-side, ANTES de llamar al modelo
```

### 5.1 Control de abuso / rate limiting (el botón es vulnerable sin esto)

Sin límite, un Pro puede tirarle al botón ilimitadas veces = agujero de costos. Defensa en capas (toda **server-side**; la UI solo refleja estado):

| Capa | Regla |
|---|---|
| **1. Lock** | Botón disabled mientras genera (anti doble-click). |
| **2. Hash idempotente** | Guardar `source_hash = hash(campos ES del bloque)` por (player, locale, block). Si el usuario re-clickea y el ES **no cambió** → devolver la traducción anterior desde caché, **sin llamar al modelo** ($0). Mata el spam de clicks. |
| **3. Primera vez = libre** | Traducir un bloque que **nunca** se tradujo a ese locale NO consume cuota. Se determina por `last_translated_at IS NULL`, **no** por si está vacío ahora — así borrar la traducción no resetea el contador (cierra el gaming). Onboarding sin fricción: el Pro traduce todo su perfil de una al activar multilang. |
| **4. Regeneración = limitada** | source cambió, o el user fuerza "otra versión" → consume **1 de la cuota mensual**. Acá vive el único vector de abuso real. |
| **5. Cuota mensual flexible** | **40 regeneraciones/mes por perfil** (configurable por env `AI_TRANSLATION_MONTHLY_REGEN_LIMIT`). Compartida entre todos los bloques. Reset el día 1. Por **perfil** (no por cuenta): una agencia con N jugadores tiene N×40 → el techo de costo escala con el revenue. |
| **6. Cuota agotada** | Botón disabled + mensaje "Alcanzaste tu límite mensual de traducción automática. La edición manual sigue disponible." |

**Trato.** `generateObject` se llama SOLO en: (a) primera vez de un (bloque, locale), o (b) regeneración con cuota disponible. Re-clicks sin cambios nunca llegan al modelo.

**Persistencia.** Tabla `ai_translation_events (id, player_id, locale, block, kind 'initial'|'regen', source_hash, created_at)`. La cuota = `COUNT(*) WHERE player_id=? AND kind='regen' AND created_at >= date_trunc('month', now())` — sin cron de reset, y de paso da auditoría de costos. No hace falta Redis para esta frecuencia; Postgres alcanza.

**Costo acotado por perfil/mes:** ~24 "primera vez" (8 bloques × 3 locales, one-time) + 40 regeneraciones × ~$0.01 ≈ **< $1/mes peor caso**.

---

## 6. Tier gating

| Tier | Idiomas perfil público | Cómo se elige |
|---|---|---|
| Free | 1 (es, automático) | Sin elección, sin multilang |
| Pro | Nativo + hasta 3 = 4 totales | El jugador activa cuáles desde dashboard |

**Validación server-side** (en el action que guarda translation, NO en UI):
```ts
const tierLimit = tier === 'pro' ? 4 : 1;
if (existingLocales.length >= tierLimit && !existingLocales.includes(newLocale)) {
  throw new Error('TIER_LIMIT_REACHED');
}
```

---

## 7. DB schema (migration — la aplica el OWNER en Supabase, no el agente)

> Recordá `feedback_migration_protocol`: el agente prepara el SQL, el owner lo aplica. Default branch = `supabase-dev`.

```sql
-- Blog: locale + traducciones
ALTER TABLE blog_posts ADD COLUMN locale text NOT NULL DEFAULT 'es'
  CHECK (locale IN ('es','en','it','pt'));
ALTER TABLE blog_posts ADD COLUMN translation_of_id uuid REFERENCES blog_posts(id);
CREATE UNIQUE INDEX blog_posts_slug_locale_idx ON blog_posts(slug, locale);

-- Traducciones de jugador (Pro-only, validado en server actions)
CREATE TABLE player_profile_translations (
  player_id uuid REFERENCES player_profiles(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('es','en','it','pt')),
  bio text,
  career_objectives text,
  top_characteristics text[],
  tactics_analysis text,
  physical_analysis text,
  mental_analysis text,
  technique_analysis text,
  analysis_author text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (player_id, locale)
);

-- Análogo para agencias
CREATE TABLE agency_profile_translations (
  agency_id uuid REFERENCES agency_profiles(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('es','en','it','pt')),
  description text,
  about text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (agency_id, locale)
);

-- Idioma nativo del usuario (auto-detect inicial + emails)
ALTER TABLE user_profiles ADD COLUMN preferred_locale text DEFAULT 'es'
  CHECK (preferred_locale IN ('es','en','it','pt'));
```

**Campos estructurados que NO se traducen** (se editan una vez, compartidos entre locales): `birth_date`, `height_cm`, `weight_kg`, `foot`, `positions[]`, `current_club`, `nationality[]`, `market_value_eur`.

**Campos texto-libre que SÍ se traducen** (los 8 de `player_profile_translations`): `bio`, `career_objectives`, `top_characteristics[]`, `tactics_analysis`, `physical_analysis`, `mental_analysis`, `technique_analysis`, `analysis_author`.

**RLS:** las tablas nuevas heredan política de su tabla padre (owner read/write; public read solo si el perfil es público/aprobado).

---

## 8. Impacto en archivos SEO existentes

| Archivo | Cambio |
|---|---|
| `src/app/layout.tsx:108` | `<html lang>` dinámico: `es-AR` \| `en` \| `it-IT` \| `pt-BR` |
| `src/app/layout.tsx:71` | OG locale: default + `alternateLocale` array (`es_AR`, `en_US`, `it_IT`, `pt_BR`) |
| `src/lib/seo/personJsonLd.tsx` | `POSITION_LABELS` × 4 locales + `jobTitle` por locale + `inLanguage` dinámico |
| `src/lib/seo/organizationJsonLd.tsx` | `ORG_DESCRIPTION`/`APP_DESCRIPTION` (hoy hardcoded ES) → maps × 4 |
| `src/lib/seo/agencyJsonLd.tsx` | `description` × 4 + breadcrumb labels por locale |
| `src/app/sitemap.ts` | `alternates.languages` por URL (solo locales que existen en DB) |
| `src/lib/seo/indexable-profiles.ts` (de PR #135) | **Extender con param `locale`** — NO duplicar. Reusar el predicate `isPlayerIndexable` para emitir `/pt/jugadores`, `/it/jugadores`, `/en/jugadores` |
| `/{locale}/[slug]` hreflang | `es-AR`, `en`, `it-IT`, `pt-BR`, `x-default=es-AR` — emite SOLO los que existen en `player_profile_translations` |
| `src/emails/templates/*` | Plantillas por locale (`welcome.es.tsx`, `.en`, `.it`, `.pt`) según `user_profiles.preferred_locale` |

### Reglas hreflang per-player (no romper)
- **Canonical self-referente**: `/en/julian` → canonical `/en/julian` (NUNCA `/julian`).
- **hreflang SOLO entre traducciones reales**: si el jugador no tiene IT, no emitir `hreflang it-IT` en ninguna URL.
- **Si falta traducción**: render fallback ES + `robots: { index: false, follow: true }` (navegable, no indexable).
- **hreflang bidireccional y completo** en las N URLs que existen, o Google ignora el cluster entero.
- **JSON-LD `inLanguage` + `jobTitle` en el idioma de la URL** (`/en/...` → `"Footballer"`, no `"Futbolista"`).

---

## 9. Stack — qué sumar

| Tecnología | Para qué |
|---|---|
| `next-intl` | Core: routing `[locale]`, middleware (Accept-Language + cookie), `getTranslations()` en Server Components, `alternates.languages` en `generateMetadata` |
| `@vercel/functions` | Geo headers (`geolocation()`) para reforzar auto-detect |
| `ts-morph` (dev) | Script de extracción de strings (AST) → semilla `es.json` |
| `ai` (AI SDK v6) + AI Gateway | Pipeline traducción + asistente dashboard. `"anthropic/claude-sonnet-4.7"` vía gateway |
| Script CI paridad de keys | `scripts/i18n-check.ts` en GH Actions: si `es/*.json` cambia, `en/it/pt` deben tener las mismas keys |

**Reusar del proyecto:** Next 15.5 App Router, React 19, Drizzle/Supabase, Resend, HeroUI (toggle = `Tabs` + `Progress`), Zod + react-hook-form.

**Skills a invocar por fase:** `claude-seo:seo-hreflang` (Fase 3/5), `claude-seo:seo-drift` (baseline antes de F0 + después de cada fase), `claude-seo:seo-schema` (F3), `claude-seo:seo-sitemap` (F2), `vercel:ai-sdk` + `vercel:ai-gateway` (asistente), `vercel:nextjs` (F0 mover árbol), `react-email` + `email-best-practices` (F6 emails), `design:ux-copy` (review microcopy EN/IT/PT).

---

## 10. Estructura de archivos i18n

```
src/
  i18n/
    config.ts          ← locales = ['es','en','it','pt'] + defaultLocale
    request.ts         ← getRequestConfig (next-intl)
    routing.ts         ← localePrefix 'as-needed'
    glossary.md        ← contrato de términos para la pipeline LLM (ver §11)
    messages/
      es/ en/ it/ pt/   ← common.json, home.json, pricing.json, dashboard.json,
                           auth.json, player-profile.json, agency-profile.json,
                           blog.json, emails.json, onboarding.json
  app/
    [locale]/          ← TODO el árbol actual se mueve adentro
      layout.tsx        ← html lang + OG locale dinámicos
      (site)/ (public)/ (dashboard)/ ...
    api/                ← FUERA de [locale] (no localizado)
    sitemap.ts robots.ts llms.txt/
  middleware.ts        ← next-intl middleware
scripts/
  extract-i18n.ts      ← AST seed del es.json
  i18n-check.ts        ← CI paridad de keys
```

---

## 11. Glosario seed (expandir en Fase 0 → `src/i18n/glossary.md`)

| ES | EN | IT | PT-BR |
|---|---|---|---|
| Futbolista | Footballer | Calciatore | Futebolista |
| Agencia | Agency | Agenzia | Agência |
| Perfil | Profile | Profilo | Perfil |
| Iniciar sesión | Sign in | Accedi | Entrar |
| Registrarse | Sign up | Registrati | Cadastrar-se |
| Plan Pro | Pro plan | Piano Pro | Plano Pro |
| Mediocampista central | Central midfielder | Centrocampista centrale | Médio-centro |
| Delantero | Forward | Attaccante | Atacante |
| Defensa central | Center back | Difensore centrale | Zagueiro |
| Lateral | Full back | Terzino | Lateral |
| Arquero / Portero | Goalkeeper | Portiere | Goleiro |
| Trayectoria | Career history | Carriera | Trajetória |
| Análisis táctico | Tactical analysis | Analisi tattica | Análise tática |
| Pie hábil | Preferred foot | Piede preferito | Pé dominante |
| Club actual | Current club | Squadra attuale | Clube atual |
| Mercado de pases | Transfer market | Calciomercato | Mercado de transferências |
| Selección | National team | Nazionale | Seleção |
| Verificado | Verified | Verificato | Verificado |

---

## 12. Dashboard editor — UX (4 idiomas)

Toggle global persistente en el header del editor (NO selector por card individual — genera carga cognitiva):

```
┌────────────────────────────────────────────────────┐
│  Editando perfil  ·  Idioma: [ES] [EN] [IT] [PT]   │
│  ES ●●●●●●●● 100%   ← nativo, completo             │
│  EN ●●●○○○○○ 38%    ← incompleto                   │
│  IT ○○○○○○○○ 0%     ← vacío → "Auto-completar"     │
│  PT ●●●●●●●○ 87%    ← casi completo                │
└────────────────────────────────────────────────────┘
```

- Cambiar de idioma rerenderea TODOS los cards con la versión de ese locale (no estado mixto).
- Campos estructurados se editan una vez, compartidos entre locales (el toggle solo afecta los 8 texto-libre).
- Badge "Versión: XX" + indicador de paridad por card.
- Botón "Auto-completar con Claude" por card (Pro-only, §5).
- Referencia UX: Notion, Webflow, Strapi (toggle global validado).

---

## 13. Roadmap por fases

> ✅ **F0–F7 ejecutadas y en prod.** Lo que falta (paridad de agencia, free-text, blog multilang) está en **§0.1**, no acá.

| Fase | Alcance | PRs | Sesiones |
|---|---|---|---|
| 0 | Setup `next-intl` + middleware + mover árbol a `app/[locale]/` + glosario + script extracción AST | 1 PR grande | 1 |
| 1 | UI chrome: `common.json` (header, footer, errors, auth) ES/EN/IT/PT | 1 PR | 1 |
| 2 | Marketing: home/pricing/about/blog UI + `generateMetadata` multilang + sitemap alternates | 1 PR | 1-2 |
| 3 | JSON-LD multilang (POSITION_LABELS, jobTitle, inLanguage) + OG dinámica + hreflang en `/[slug]` y `/agency/[slug]` | 1 PR | 1 |
| 4 | Dashboard editor: toggle global + indicadores de completitud + asistente "Auto-completar con Claude" (Pro-only) | 2 PRs | 2-3 |
| 5 | DB migration (`player_profile_translations` + `blog_posts.locale`) + UI Pro-only traducciones + tier validation. **Lanzar PT-BR primero** | 1 PR migration + 1 PR UI | 2 |
| 5.5 | **Lanzar IT** (scouts/agencias italianas) | — | parte de F5 |
| 6 | **Lanzar EN** (defensivo, long-tails) + Blog multilang + Resend templates por locale + `preferred_locale` | 1 PR | 1-2 |
| 7 | CI lint paridad de keys + re-baseline `seo-drift` post-deploy | 1 PR | 0.5 |

---

## 14. Dependencias / triggers ANTES de arrancar Fase 0

1. **PR #135 (`/jugadores` + `/agencias` indexación) debe estar en prod estabilizado.** Toca `sitemap.ts`, crea `indexable-profiles.ts` (single source of truth que i18n va a extender). Mergear i18n antes = conflict storm.
2. **`dev` sincronizado con `main`.** PR #135 hizo divergir dev↔main (aterriza solo en main). Portar a dev / mergear `main → dev` primero.
3. **Re-baseline `seo-drift`** después del preview de Fase 0 (mover árbol a `[locale]/` cambia paths internos aunque las URLs externas no cambien).
4. **Crear propiedades GSC** `/en/`, `/it/`, `/pt/` cuando se lance cada locale (la principal `ballershub.co/` queda intacta).
5. **Setup GCP Service Account** sigue pendiente del owner (ver `project_seo_plan_status` en memoria).

---

## 15. Puntos débiles / riesgos asumidos

1. PR de Fase 0 es grande (~580 archivos al mover `app/*` → `app/[locale]/*`). Mecánico: `git mv` + E2E antes/después.
2. Traducciones del jugador no se auto-indexan: requiere que el Pro las escriba/apruebe. Educar UX ("multiplica tu visibilidad ante scouts en BR/IT/EU").
3. `organizationJsonLd.tsx` tiene copy ES hardcoded → refactor a maps por locale.
4. Emails Resend: duplicar templates × 4 locales.
5. Tier validation: server action + test E2E (no confiar en UI).
6. PT-BR vs PT-PT: posiciones difieren (meio-campista vs médio-centro) — glosario lo resuelve.
7. EN ROI bajo a corto plazo (Transfermarkt DA ~88) → por eso va último.

---

## 16. Triggers para re-evaluar `/` = EN-first en el futuro (NO ahora)

Solo si en mes 6-12 se cumple alguno (decisión sobre evidencia, no emocional):
- `/en/` orgánico > 50% del tráfico del cluster `/...` (GSC).
- > 30% de Pro players completaron perfil EN.
- Backlinks desde dominios EN tier-1 > backlinks AR.
- Pipeline de scouting europeo activo (acuerdos con clubes EU).

---

## 17. Reglas hreflang autoritativas (validado con skill `claude-seo:seo-hreflang`)

**Fuente canónica de códigos** — supersede menciones sueltas en §8. Códigos elegidos:

| Locale | URL | hreflang | `<html lang>` | Razón |
|---|---|---|---|---|
| es (default) | `/...` | `es` | `es-AR` | hreflang genérico capta AR+ES+MX+resto LATAM. lang describe el contenido real (AR) |
| en | `/en/...` | `en` | `en` | genérico capta toda la anglosfera (scouts globales) |
| it | `/it/...` | `it` | `it-IT` | genérico capta IT + CH-it + SM |
| pt | `/pt/...` | `pt-BR` | `pt-BR` | **región explícita**: Brasil es el target y evita ambigüedad con pt-PT |
| — | `/...` | `x-default` | — | apunta SIEMPRE a la URL es sin prefijo |

> Mezclar genéricos (es/en/it) con región (pt-BR) es correcto y deliberado: región solo donde hay variante divergente con riesgo (pt). Códigos ISO 639-1 (idioma) + ISO 3166-1 Alpha-2 (región).

### Checklist que el plan DEBE cumplir (de la skill)

1. **Self-referencing**: cada URL incluye un hreflang apuntando a sí misma, idéntico a su `canonical`. Falta → Google ignora TODO el set.
2. **Return tags / full mesh bidireccional**: si `/julian` lista `/en/julian`, entonces `/en/julian` debe listar `/julian` (y todas entre sí). Falta un return tag → set inválido para ambas.
3. **x-default único**: uno solo por set, apunta a `/` (es). Debe tener return tags desde todas las demás.
4. **Códigos válidos**: `es`, `en`, `it`, `pt-BR`. NUNCA `esp`/`eng` (ISO 639-2), ni `en-uk` (no existe; es `en-GB`), ni región sin idioma.
5. **hreflang SOLO en canonical**: si una página tiene `canonical` apuntando a otra, su hreflang se ignora. Canonical **self-referente** por locale (`/en/julian` → canonical `/en/julian`, NUNCA `/julian`).
6. **Consistencia de protocolo + trailing slash**: todas las URLs del set en `https://` y mismo formato de slash que el canonical.
7. **Falta de traducción (caso central nuestro)**: si un locale NO existe en `player_profile_translations`:
   - NO emitir su hreflang en NINGUNA de las URLs del cluster (si emitís hreflang a una URL que devuelve noindex/404, Google degrada el cluster entero).
   - La URL faltante (`/it/julian` sin trad IT) renderiza fallback es + `robots: { index: false, follow: true }`.
   - Ergo: el set hreflang es **dinámico por jugador** — se calcula en `generateMetadata` leyendo qué locales existen.

### Errores clásicos a evitar
- Canonical de `/en/...` apuntando a `/...` (anula la indexación EN). ← el más común.
- Emitir hreflang de un locale sin traducción real (degrada el cluster).
- Set incompleto en alguna de las N URLs (Google necesita el mesh completo en cada una).
- `x-default` duplicado o ausente.

### Implementación en Next 15 `generateMetadata`
```ts
// /[locale]/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const available = await getAvailableLocales(slug); // ['es','en'] p.ej. (Pro + trad real)
  const langs: Record<string,string> = {};
  for (const l of available) {
    langs[HREFLANG_CODE[l]] = l === 'es' ? abs(`/${slug}`) : abs(`/${l}/${slug}`);
  }
  langs['x-default'] = abs(`/${slug}`);
  const thisExists = available.includes(locale);
  return {
    alternates: {
      canonical: locale === 'es' ? abs(`/${slug}`) : abs(`/${locale}/${slug}`), // self-ref
      languages: langs,
    },
    ...(thisExists ? {} : { robots: { index: false, follow: true } }),
  };
}
```
Next emite `<link rel="alternate" hreflang=...>` desde `alternates.languages` automáticamente. `x-default` se pasa como key literal `'x-default'`.

### Sitemap con alternates (`MetadataRoute.Sitemap`)
- Cada entrada incluye `alternates.languages` con TODOS los locales reales de esa URL (incl. self).
- Solo URLs canónicas e indexables (reusar `isPlayerIndexable` de `indexable-profiles.ts`).
- Next genera el namespace `xmlns:xhtml` + los `<xhtml:link>` por entrada nativamente.
- Split a `/sitemap-index.xml` si se superan ~50k URLs (ya previsto en seo-strategy §8).

---

## 18. Runbook Fase 0 — migración a `app/[locale]/` (verificado contra el código, 2026-06-07)

**Hechos reales del repo** (no estimaciones):
- **313 archivos** bajo `src/app/` (no 580). Groups a mover dentro de `[locale]/`: `(site)` 18, `(auth)` 7, `(dashboard)` 141, `(checkout)` 7, `(onboarding)` 13, `(public)` 56.
- **FUERA de `[locale]/`** (raíz `app/`): `api/` (42 rutas), `llms.txt/route.ts`, `robots.ts`, `sitemap.ts`, `layout.tsx` root, `providers.tsx`, `favicon.ico`. `actions/` (20) puede quedar en raíz (se importa por alias `@/`).
- **Imports**: ~866 con alias `@/` (NO se rompen al mover) ✅. **~48 imports relativos `../`** que SÍ se rompen (el peor: `(public)/agency/[slug]/components/` sube 3 niveles a `[slug]/components/`). → convertir esos 48 a alias `@/` ANTES o durante el move.
- **NO existe** `middleware.ts` (crear), **NO** hay `generateStaticParams` (ok), **NO** hay `error/not-found/loading.tsx` (ok). 8 `layout.tsx`, 39 `page.tsx`, 3 `opengraph-image.tsx`.
- `next.config.ts` **limpio** (sin redirects/rewrites/i18n legacy) → solo envolver con `createNextIntlPlugin()`.
- `robots.ts` líneas 32-39 disallowa `/dashboard/`, `/admin/`, etc. → cambiar a wildcard que cubra default + locales (`/dashboard/`, `/*/dashboard/`, ...).
- ~95 `redirect()` con paths hardcoded (`/dashboard`, `/auth/sign-in?next=...`) + ~30 `href` absolutos en `src/components/layout/` → usar el navigation helper localizado de next-intl (`Link`/`redirect` de `@/i18n/routing`).
- `src/lib/seo/baseUrl.ts` agnóstico ✅, pero `toCanonicalUrl()` debe recibir/insertar locale para canonicals por idioma.

**Orden de ejecución (incremental, verificable):**

| Paso | Acción | Riesgo | Gate de validación |
|---|---|---|---|
| 0a. Scaffolding | `npm i next-intl @vercel/functions`; crear `src/i18n/{config,routing,request}.ts` + `src/i18n/glossary.md`; `src/middleware.ts`; envolver `next.config.ts` con `createNextIntlPlugin`. **NO mueve archivos** | Bajo | `npm run build` sigue verde |
| 0b. Pre-fix imports | Convertir los ~48 imports relativos `../` a alias `@/` (commit aparte, sin mover nada) | Bajo | `typecheck` + `build` verdes ANTES de mover |
| 0c. Move árbol | `git mv` de los 6 groups a `src/app/[locale]/`; crear `[locale]/layout.tsx` (lang dinámico + `NextIntlClientProvider`); root `layout.tsx` queda mínimo | Alto | `typecheck` + `build` |
| 0d. Routing/links | Reemplazar `redirect()`/`<Link>` hardcoded por los helpers de `@/i18n/routing`; ajustar `robots.ts` (wildcards) y `sitemap.ts`/`baseUrl` para locale | Medio | E2E smoke: `/`, `/en`, `/it`, `/pt`, `/dashboard` cargan |
| 0e. Verificación SEO | Preview deploy; `seo-drift compare` contra baseline; confirmar `/` intacto (mismo title/canonical/JSON-LD que prod) + bots NO redirigidos | — | drift = 0 regresiones en `/` y slugs es |

**Criterio de "Fase 0 done":** `/` (es) responde idéntico a hoy (cero cambio de title/canonical/lang/JSON-LD), `/en` `/it` `/pt` resuelven con UI default, build/typecheck verdes, drift sin regresiones, middleware NO redirige a Googlebot. Recién entonces Fase 1.

**Skills por fase:** F0 `seo-drift` (baseline antes + compare después) · F2 `seo-sitemap` · F3 `seo-hreflang` + `seo-schema` · F5 `seo-hreflang` (per-player) · F6 `seo-geo`. Vercel: `vercel:nextjs` (F0 move), `vercel:ai-sdk`+`vercel:ai-gateway` (F4 asistente), `react-email` (F6 emails).
