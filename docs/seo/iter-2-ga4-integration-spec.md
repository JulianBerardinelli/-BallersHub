# Iter-2 — GA4 integration en `/admin/seo`

> **Audiencia**: agente nuevo que va a implementar esta iteración
> cuando el owner lo priorice.
> **Status**: 📋 spec — **NO ejecutar todavía**. Esperar trigger.
> **Tiempo estimado de implementación**: 4-6 horas (incluyendo setup
> GA4 API + UI + tests).

## Qué hace

Agrega un **conversions funnel** al panel `/admin/seo` para medir el
embudo completo del tráfico orgánico:

```
Organic search session
   ↓
Pricing page view
   ↓
Signup
   ↓
Pro activation (checkout completed)
```

Mostrando para cada etapa: cantidad, % conversión vs etapa anterior, %
conversión vs top-of-funnel. Permite identificar dónde se pierde la
mayor parte de los users orgánicos.

## Trigger — cuándo arrancar

**No arrancar antes de** que se cumpla:

1. **Setup GCP completo**: env vars `GOOGLE_SERVICE_ACCOUNT_KEY` +
   `GSC_SITE_URL` configuradas en Vercel (i.e. `/admin/seo` muestra
   data GSC real, no banner amarillo)
2. **GA4 property activa** en el sitio prod (`G-XXXXXXX` ya enviando
   eventos)
3. **Conversions configuradas en GA4**: al menos `signup` y
   `pro_activation` registradas como events de conversión

Si alguno falla, primero ayudar al owner a completarlo. La iteración
no rinde sin esos cimientos.

## Output esperado

- Nueva env var Vercel: `GA4_PROPERTY_ID` (formato `properties/123456789`)
- Habilitar GA4 Data API en el mismo GCP project del SA actual
- Agregar el SA actual como user del GA4 property con permission
  `Viewer`
- Código:
  - `src/lib/seo/ga4-clients.ts` — auth con la misma SA
  - `src/lib/seo/ga4-queries.ts` — query wrappers con `unstable_cache`
  - `src/lib/seo/conversion-funnel.ts` — combina GSC clicks + GA4
    events
- UI: nueva tab `/admin/seo/funnel` con la visualización
- Sidebar: agregar entry "Funnel" debajo de "Pages" en la sección SEO
- Doc setup: actualizar `docs/seo/admin-seo-setup.md` con paso de GA4
- Update: `docs/seo/HANDOFF.md` mover este item de "pending" a "done"

## Arquitectura

### Decisión: reusar Service Account

La iteración reusa la **misma SA del setup actual** (`ballershub-seo-reader`
de la PR #131). Esto evita:

- Crear nueva SA
- Manejar 2 sets de credenciales
- Confusión en el flow del setup

Solo requiere:

1. Habilitar GA4 Data API en GCP (mismo project que GSC)
2. Agregar el SA email al property GA4 como Viewer
3. Agregar `GA4_PROPERTY_ID` a Vercel env

### Decisión: cache 1h con `unstable_cache`

Mismo pattern que GSC queries (PR #131). GA4 API quota es 25K
requests/day en free tier — cache de 1h nos da margen amplio.

### Decisión: degradación graciosa

Si `GA4_PROPERTY_ID` no está seteada, mostrar banner amarillo
"GA4 no configurado — seguir paso X del setup". No romper el panel
existente.

## Datos a queryar

### Métricas GA4 base

```typescript
// src/lib/seo/ga4-queries.ts
export interface OrganicFunnel {
  organicSessions: number;        // sessionDefaultChannelGroup = "Organic Search"
  pricingPageViews: number;       // pagePath = "/pricing" AND firstUserDefaultChannelGroup = "Organic Search"
  signups: number;                // event "signup" AND firstUserDefaultChannelGroup = "Organic Search"
  proActivations: number;         // event "pro_activation" AND firstUserDefaultChannelGroup = "Organic Search"
}

export async function getOrganicFunnel(
  days = 30
): Promise<OrganicFunnel>;
```

### Métricas derivadas

```typescript
export interface FunnelStage {
  label: string;
  count: number;
  pctFromPrev: number | null;     // null en top-of-funnel
  pctFromTop: number;
}

export function deriveFunnelStages(
  raw: OrganicFunnel
): FunnelStage[];
```

### Cross-data con GSC

Para enriquecer:

```typescript
export interface FunnelWithSource {
  funnel: FunnelStage[];
  topOrganicQueries: { query: string; clicks: number }[]; // de GSC
  topOrganicPages: { page: string; sessions: number }[]; // de GA4
}
```

Esto permite contestar: "¿qué queries generan más signups orgánicos?"
(cruce GSC × GA4).

## UI

### `/admin/seo/funnel/page.tsx`

```
┌───────────────────────────────────────────────────────────┐
│ SEO — Conversion funnel                                   │
│ Last 30 days  ▼                                           │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Organic search sessions          2,341  100%       │ │
│  └─────────────────────────────────────────────────────┘ │
│           ↓ 23% conversión                                │
│  ┌──────────────────────────────────────────┐            │
│  │  Pricing page views      538  23% / 23%  │            │
│  └──────────────────────────────────────────┘            │
│           ↓ 4.1% conversión                               │
│  ┌─────────────────────────────────┐                     │
│  │  Signups          22  4.1% / 0.94%  │                  │
│  └─────────────────────────────────┘                     │
│           ↓ 18% conversión                                │
│  ┌─────────────────────┐                                  │
│  │  Pro activations  4   18% / 0.17%  │                   │
│  └─────────────────────┘                                  │
│                                                           │
├───────────────────────────────────────────────────────────┤
│ Top organic queries que generaron signups                 │
│ ┌─────────────────────────────────────┐                  │
│ │ Query              Clicks  Signups   │                  │
│ │ portfolio futbolista   124   3       │                  │
│ │ agente afa argentina    87   2       │                  │
│ │ ...                                  │                  │
│ └─────────────────────────────────────┘                  │
└───────────────────────────────────────────────────────────┘
```

### Sidebar

Agregar entry a `src/app/(dashboard)/admin/layout.tsx`, sección SEO:

```typescript
// antes:
{ label: "Pages", href: "/admin/seo/pages" }
// agregar después:
{ label: "Funnel", href: "/admin/seo/funnel" }
```

### Comportamiento sin env var

Si `GA4_PROPERTY_ID` no seteada:

```
┌───────────────────────────────────────────────────────────┐
│ ⚠️ GA4 no configurado                                     │
│                                                           │
│ Para ver el funnel de conversión orgánica, necesitás      │
│ completar el setup GA4. Doc: docs/seo/admin-seo-setup.md  │
│ § "GA4 Data API setup".                                   │
└───────────────────────────────────────────────────────────┘
```

## Cómo ejecutar

### Paso 1 — Verificar pre-requisitos

```bash
# 1. Owner confirma que /admin/seo muestra data GSC real
# 2. Verificar GA4 property ID en GA4 Admin → property settings
# 3. Verificar conversions configuradas:
#    GA4 Admin → Conversions → buscar "signup" y "pro_activation"
```

Si alguno no se cumple, **detener** y reportar al owner.

### Paso 2 — Crear worktree

```bash
git fetch origin main --quiet
git worktree add .claude/worktrees/admin-seo-ga4 -b claude/admin-seo-ga4 origin/main
cd .claude/worktrees/admin-seo-ga4
```

### Paso 3 — Instalar GA4 Data API client

Ya tenemos `googleapis` en el `package.json` (instalado en PR #131).
Confirmar:

```bash
grep '"googleapis"' package.json
```

El paquete `googleapis` incluye `analyticsdata` (GA4 Data API) — no
hace falta instalar nada nuevo.

### Paso 4 — Implementar código

Seguir el orden:

1. `src/lib/seo/ga4-clients.ts` — auth (reusar `getServiceAccountJwt`
   de `google-clients.ts`, sumar scope `https://www.googleapis.com/auth/analytics.readonly`)
2. `src/lib/seo/ga4-queries.ts` — wrappers + `unstable_cache` 1h
3. `src/lib/seo/conversion-funnel.ts` — combiner GSC + GA4
4. `src/app/(dashboard)/admin/seo/funnel/page.tsx` — UI
5. Sidebar update en `src/app/(dashboard)/admin/layout.tsx`

### Paso 5 — Update docs

- `docs/seo/admin-seo-setup.md`: agregar sección "GA4 Data API setup"
  con los pasos GCP + GA4 Admin + Vercel env var
- `docs/seo/HANDOFF.md`: mover "Iteración 2" de pending a done; sumar
  sección "Conversion funnel" al inventario

### Paso 6 — Verify

```bash
pnpm typecheck
pnpm lint
```

### Paso 7 — Commit + PR

```bash
git add -A
git commit -m "feat(admin/seo): conversion funnel con GA4 (orgánico → Pro)"
git push -u origin claude/admin-seo-ga4
gh pr create --title "feat(admin/seo): GA4 conversion funnel" --base main
```

PR body debe incluir:

- Pre-requisitos completados (owner confirma)
- Cómo activar (paso a paso: habilitar API, env var)
- Screenshots de degradación graciosa (banner amarillo)
- Screenshots de UI con data mockeada

### Paso 8 — Owner agrega env var + habilita API

Después del merge:

1. GCP → habilitar GA4 Data API en el project del SA
2. GA4 → Admin → Property User Management → agregar el SA email
   con role `Viewer`
3. Vercel → Settings → Environment Variables → agregar
   `GA4_PROPERTY_ID=properties/XXXXXXXXX` (Production env)
4. Vercel → Deployments → Redeploy (sin cambios) para que la nueva
   env var aplique

## Métricas que NO incluye esta iteración

Out of scope deliberado:

- **GA4 audiences**: too complex para v1
- **Custom funnels más allá del organic→Pro**: si el owner quiere
  trackear otro funnel (e.g. paid → Pro, blog → signup), abrir
  iteración 3
- **GA4 events de e-commerce detallados**: ya están en otro panel
  (`/admin/checkout`)
- **Real-time analytics**: GA4 ya tiene su propio dashboard real-time;
  no replicarlo

## Decisiones técnicas a justificar en el PR

### Por qué no usar GA4 GTAG directamente

GTAG es client-side y sólo expone datos al user. Para data agregada
admin necesitamos GA4 Data API server-side.

### Por qué cache 1h y no menos

GA4 data tiene latencia inherente de 24-48h para finalizar metrics
(específicamente conversiones). Cache de 1h es razonable; menos no
trae data más fresca pero sí gasta quota.

### Por qué reusar SA en lugar de OAuth

OAuth requiere user consent flow + refresh tokens. Para una herramienta
admin interna donde sólo el founder usa, SA con permissions explícitas
es más simple, audtable, y no rompe si el user del owner se desconecta.

## Cosas que NO hacer

1. **No mezclar paid + organic en el funnel**. El KPI primario es
   organic; mezclar oculta la efectividad SEO.
2. **No mostrar data crudo sin contexto**. Cada número debe estar
   acompañado de comparación (vs etapa previa + vs top-of-funnel)
   y rango temporal explícito.
3. **No agregar el funnel a la home `/admin/seo`** — la home es
   overview; el funnel va en su propia tab por densidad de info.
4. **No exponer la SA key en logs o en client-side**. Server-only.

## Cross-references

- PR #131 que dejó la SA + GSC setup: [`docs/seo/admin-seo-setup.md`](./admin-seo-setup.md)
- Handoff general: [`docs/seo/HANDOFF.md`](./HANDOFF.md)
- KPI estrategia: [`docs/seo-strategy.md`](../seo-strategy.md) §
  "Métricas y KPIs"
