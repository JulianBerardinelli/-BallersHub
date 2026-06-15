# Iter-2 — GA4 conversion funnel en `/admin/seo`

> **Status**: ✅ **IMPLEMENTADO** (2026-06-14). Fase A = PR #218, Fase B = PR #221.
> Este doc dejó de ser un spec a-futuro: ahora describe lo que se construyó y
> los pasos de **activación del owner** (crear propiedad GA4, habilitar API,
> dar acceso a la SA, env vars, marcar eventos clave).

## Qué hace

Mide el embudo de conversión del tráfico **orgánico** en `/admin/seo/funnel`:

```
Sesiones orgánicas → Vieron /pricing → Signups → Activaciones Pro
```

Cada etapa muestra su conversión vs la etapa previa y vs el tope del embudo.
Fuente: **GA4 Data API**, filtrado a `sessionDefaultChannelGroup = "Organic Search"`.

## ⚠️ Lo que cambió vs el plan original

El spec viejo asumía que GA4 ya estaba instalado y enviando eventos. **No lo
estaba** — el sitio sólo tenía Vercel Analytics (cookieless). Por eso iter-2
terminó siendo 2 fases:

- **Fase A (#218)** — *instrumentar* GA4: instalar el tag + emitir los eventos.
- **Fase B (#221)** — el *panel* del funnel que lee la GA4 Data API.

Otros desvíos respecto del plan viejo: nombres de evento **`sign_up`** /
**`pro_activation`** (no `signup`); paths bajo `src/app/[locale]/...`; el repo
usa **npm**; el sub-nav vive en `SEO_NAV` de `_shared.tsx` (no en
`admin/layout.tsx`); y la lógica GA4 quedó en `ga4-queries.ts` + helpers en
`google-clients.ts` (en vez de los 3 archivos planeados).

## Fase A — instrumentación (PR #218)

- **Tag**: `@next/third-parties` → `<GoogleAnalytics gaId={NEXT_PUBLIC_GA_ID}>`
  en `src/app/[locale]/layout.tsx`, al lado de Vercel Analytics. **Sólo carga
  cuando `VERCEL_ENV === "production"`** → preview/dev no contaminan la
  propiedad aunque la env var esté seteada en los 3 environments.
- **Eventos** (`src/lib/analytics/ga.ts`, no-op si `NEXT_PUBLIC_GA_ID` ausente):
  - `sign_up` → en el éxito del alta (`(auth)/auth/sign-up/page.tsx`).
  - `pro_activation` → en `/checkout/success` con sesión completada, vía
    `CheckoutSuccessAnalytics` (client; guard de `sessionStorage` anti
    doble-conteo; sólo si hay `session`, nunca en el fallback de bookmark).

## Fase B — panel (PR #221)

- `src/lib/seo/google-clients.ts` — la misma SA/JWT del panel GSC + el scope
  `analytics.readonly` → `getAnalyticsDataClient()` + `getGa4Property()`
  (throws `GoogleApiConfigError` si falta `GA4_PROPERTY_ID`).
- `src/lib/seo/ga4-queries.ts` — `getOrganicFunnel()` (3 `runReport` en
  paralelo, `unstable_cache` 1h, filtrado a Organic Search) +
  `deriveFunnelStages()` + `safeGa4()` (espejo de `safeGsc`). La etapa
  `/pricing` cuenta **sesiones** (no page views, para no inflar con reloads) y
  matchea `ENDS_WITH "/pricing"` (captura `/en|/it|/pt/pricing`).
- `src/app/[locale]/(dashboard)/admin/seo/funnel/page.tsx` — UI con barras por
  etapa, `force-dynamic`, `ConfigErrorBanner`/`EmptyState`. Entry **"Funnel"**
  en `SEO_NAV`.

**Degradación graciosa**: sin `GA4_PROPERTY_ID` (o sin acceso de la SA / API
deshabilitada) muestra el banner amarillo; no rompe el panel.

## Activación (owner) — pasos reales

### Una vez (datos clave)
- **Propiedad GA4** de `ballershub.co` → Measurement ID `G-XXXXXXXXXX` +
  Property ID numérico. (La de prod es **`541737421`**.)
- Reusa la **misma Service Account** de GSC (`ballershub-seo-reader@
  ballershub-469810.iam.gserviceaccount.com`).

### Habilitar
1. GCP → APIs & Services → Library → habilitar **"Google Analytics Data API"**
   (proyecto `ballershub-469810`).
2. GA4 → Administrar → **Gestión de acceso a la propiedad** → agregar el
   `client_email` de la SA como **Viewer/Lector**.
3. Vercel (Production):
   - `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX` (Fase A — el tag).
   - `GA4_PROPERTY_ID=properties/541737421` (Fase B — el panel).
4. **Mergear #218 + #221** + deploy. Recién con el tag en prod GA4 empieza a
   recibir eventos.
5. GA4 → Administrar → **Eventos clave** → "Nuevo evento clave" → crear
   **`sign_up`** y **`pro_activation`** (a mano, antes de que se disparen, para
   que cuenten desde el primer registro/pago).

### Decisión pendiente — cookies / consentimiento
GA4 usa **cookies** (Vercel Analytics no). Hoy el tag va plano, sin banner —
pragmático para un sitio joven es-AR. Para tráfico EU/IT conviene GA4 **consent
mode** + banner (follow-up, no incluido).

## Verificación (tooling)

Scripts en `~/.config/claude-seo/` (venv con `google-api-python-client`):
- `ga4_test.py <property>` — smoke-test de acceso a la GA4 Data API.
- `ga4_events.py <property> [días]` — lista los eventos que GA4 registró
  (sirve para confirmar que el tag está recolectando y que `sign_up` /
  `pro_activation` aparecen).

`GOOGLE_APPLICATION_CREDENTIALS=<sa.json> python ga4_test.py properties/541737421`

## Fuera de scope (futuro)

- GA4 **consent mode** + cookie banner.
- Otros funnels (paid → Pro, blog → signup) — sería un iter-3.
- Cruce GSC × GA4 ("qué queries orgánicas generan más signups") — el panel hoy
  muestra el embudo; el cruce con queries de GSC queda para una iteración.
- GA4 audiences / e-commerce detallado (ya hay `/admin/checkout`) / real-time.

## Cosas que NO hacer

1. **No mezclar paid + organic** en el funnel — el KPI es el orgánico.
2. **No mostrar números sin contexto** — cada etapa con su % vs previa + vs tope.
3. **No exponer la SA key** en logs ni client-side — server-only.
4. **No setear `NEXT_PUBLIC_GA_ID` esperando que filtre a preview/dev** — el
   gate `VERCEL_ENV` ya lo evita, pero el principio es: GA sólo en producción.

## Cross-references

- Setup GSC/SA + env vars: [`docs/seo/admin-seo-setup.md`](./admin-seo-setup.md)
- Handoff general: [`docs/seo/HANDOFF.md`](./HANDOFF.md)
- KPIs: [`docs/seo-strategy.md`](../seo-strategy.md) § "Métricas y KPIs"
