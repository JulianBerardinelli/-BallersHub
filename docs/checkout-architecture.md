# 'BallersHub — Checkout Architecture

> **Status**: 🟡 Draft v1
> **Owner**: @julian-berardinelli
> **Audience**: dev. Diseño técnico del flujo de checkout end-to-end (UI + servidor + webhooks + estado).
>
> Este documento es la fuente de verdad de **CÓMO** se cobra. Las **CONDICIONES** del cobro (precios, planes, refund) viven en `docs/pricing-matrix.md`.

---

## 1. Routing de procesador por moneda

| Moneda | Procesador | Modo |
|---|---|---|
| ARS | **Mercado Pago** | Checkout Pro (redirect) |
| USD | **Stripe** | Checkout Sessions `mode: 'subscription'` |
| EUR | **Stripe** | Checkout Sessions `mode: 'subscription'` |

- La moneda se **resuelve al iniciar** el checkout y se persiste en el `checkout_sessions.currency`.
- Una vez generada la sesión, **no se puede cambiar moneda** (cambia el procesador y los IDs de Stripe price). El usuario tendría que abandonar y reabrir el flow.
- Los precios viven en cada procesador (Stripe Prices + MP preferences) y la matriz local en `data.ts` es sólo para **display** en la pricing page.

## 2. Modelo de plan

- **Cadencia única anual** (no mensual). En Stripe, esto es un `Price` con `recurring.interval: 'year'`. En MP, es un cobro único por preference (la renovación se gestiona programáticamente al cumplirse el año vía webhook + creación de nueva preferencia o vía MP Subscriptions API).
- **Trial de 7 días** sólo aplica en Stripe (`subscription_data.trial_period_days: 7`). MP no tiene trial nativo en Checkout Pro — para Argentina simulamos el trial creando la suscripción interna pero retrasando el primer cobro 7 días con un cron job, o usando la API de Subscriptions de MP cuando esté soportada.
- **Refund window**: 3 días post-cobro anual. En Stripe se hace via Customer Portal (configurado en dashboard) o vía API. En MP es manual desde el dashboard del comerciante.

## 3. Estado y persistencia

### Tablas nuevas

```
subscriptions
├── id (uuid pk)
├── user_id (fk users)
├── plan_id (string: 'pro-player' | 'pro-agency')
├── status (enum: trialing | active | past_due | canceled | incomplete | paused)
├── currency (enum: USD | ARS | EUR)
├── processor (enum: stripe | mercado_pago)
├── processor_subscription_id (nullable string — Stripe sub_... or MP id)
├── processor_customer_id (nullable string — Stripe cus_... or MP customer)
├── trial_ends_at (timestamptz, nullable)
├── current_period_starts_at (timestamptz)
├── current_period_ends_at (timestamptz)
├── cancel_at_period_end (boolean, default false)
├── canceled_at (timestamptz, nullable)
├── billing_address_id (fk billing_addresses, nullable)
├── created_at (timestamptz)
└── updated_at (timestamptz)

billing_addresses
├── id (uuid pk)
├── user_id (fk users)
├── full_name (text)
├── tax_id (text, nullable — DNI / CUIT / NIE / VAT / etc.)
├── tax_id_type (enum: dni | cuit | cuil | nie | vat | other, nullable)
├── country_code (text — ISO-2, e.g. AR, ES, US)
├── state (text, nullable)
├── city (text)
├── postal_code (text)
├── street_line_1 (text)
├── street_line_2 (text, nullable)
├── phone (text, nullable)
├── created_at, updated_at

checkout_sessions
├── id (uuid pk)
├── user_id (fk users, nullable — se permite checkout sin sesión inicial)
├── plan_id (string)
├── currency (enum)
├── processor (enum)
├── status (enum: pending | redirected | completed | expired | failed)
├── billing_address_id (fk, nullable)
├── processor_session_id (text — Stripe cs_... or MP preference id)
├── processor_session_url (text — Stripe.url or MP.init_point)
├── client_secret (text, nullable — para Stripe embedded mode futuro)
├── amount_minor (integer — monto total en menor unidad: centavos / centavos ARS / centavos EUR)
├── trial_days (integer, default 7)
├── metadata (jsonb — para audit)
├── expires_at (timestamptz)
├── completed_at (timestamptz, nullable)
└── created_at

payment_events
├── id (uuid pk)
├── processor (enum)
├── processor_event_id (text — Stripe evt_... or MP id, único por procesador)
├── event_type (text — e.g. checkout.session.completed, payment.created)
├── checkout_session_id (fk, nullable)
├── subscription_id (fk, nullable)
├── payload (jsonb — body completo del webhook)
├── processed (boolean, default false)
├── processed_at (timestamptz, nullable)
├── error_message (text, nullable)
└── received_at (timestamptz)
```

> **Idempotencia**: `processor_event_id` tiene UNIQUE constraint para que reprocesar un webhook por reintentos no genere duplicados.

### Estados de subscription

```
            +----------+    pago aprobado    +--------+
checkout -->| trialing |-------------------->| active |
            +----------+                     +--------+
                 |                                |
                 | cancel durante trial           | cancel
                 v                                v
            +----------+                     +----------+
            | canceled |                     | canceled |
            +----------+                     +----------+
                                                  |
                                                  | + refund window
                                                  v
                                              [refund issued]
```

- `incomplete`: pago iniciado pero no aprobado (3DS pending, MP `in_process`).
- `past_due`: cobro de renovación falló, en período de gracia.
- `paused`: para casos especiales (chargeback, fraude).

## 4. API surface

### Server actions (server-only, llamadas desde React Server Components o forms)

```ts
// src/app/actions/checkout.ts
async function createCheckoutSession(input: {
  planId: PlanId;
  currency: Currency;
  billingAddress: BillingAddressInput;
  // opcional: si el user no está logueado, lo creamos al confirmar el pago
}): Promise<{ sessionId: string; redirectUrl: string }>;

async function getCheckoutSessionStatus(sessionId: string): Promise<{
  status: CheckoutStatus;
  subscription?: SubscriptionSummary;
}>;

async function cancelSubscription(input: {
  subscriptionId: string;
  reason: string;
}): Promise<{ ok: boolean; refundIssued: boolean }>;
```

### Routes

```
GET  /pricing                      — pricing page (existing)
GET  /checkout/[planId]            — multi-step wizard
GET  /checkout/[planId]/details    — paso 1: cuenta + facturación
GET  /checkout/[planId]/payment    — paso 2: redirect a procesador
GET  /checkout/[planId]/review     — paso 3: resumen
GET  /checkout/success             — post-payment landing (verifica server-side)
GET  /checkout/failure             — pago rechazado
GET  /checkout/pending             — pago en proceso (3DS, transferencia, efectivo MP)

POST /api/webhooks/stripe          — Stripe webhook
POST /api/webhooks/mercadopago     — MP webhook
```

## 5. Flow de checkout (paso a paso)

### Camino feliz USD/EUR (Stripe)

1. User en `/pricing` → click "Probar 7 días gratis" en Pro Player USD.
2. Redirect a `/checkout/pro-player?currency=USD`.
3. Si **no logueado** → modal de login/signup integrado en el flow (no romper el flow).
4. Step `details`: form de billing address (nombre, dirección, país, postal, tax id si corresponde).
5. Submit → server action `createCheckoutSession`:
   - Inserta `billing_addresses` y `checkout_sessions` (status: `pending`).
   - Llama Stripe `checkout.sessions.create` con:
     - `mode: 'subscription'`
     - `line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }]`
     - `subscription_data.trial_period_days: 7`
     - `customer_email: user.email`
     - `success_url: BASE/checkout/success?cs_id={CHECKOUT_SESSION_ID}`
     - `cancel_url: BASE/checkout/[planId]/details?canceled=1`
     - `metadata: { internal_session_id, plan_id, user_id }`
   - Marca session como `redirected`, guarda `processor_session_id` y `processor_session_url`.
   - Devuelve `redirectUrl`.
6. User completa pago en Stripe Checkout (hosted).
7. Stripe redirige a `/checkout/success?cs_id=...`.
8. Página de success:
   - Server side: lee `checkout_sessions` por `cs_id`, llama `stripe.checkout.sessions.retrieve(processor_session_id)` para verificar `payment_status: 'paid'` o `status: 'complete'`.
   - Si OK: muestra confirmación + estado del trial activo.
   - Si pending: muestra "estamos procesando", redirige a `/checkout/pending`.
9. Stripe webhook `checkout.session.completed` llega → handler:
   - Inserta/actualiza `subscriptions` con datos del Stripe sub.
   - Marca `checkout_sessions.completed_at`.
   - Dispara email de bienvenida + activa Pro en el dashboard del user.

### Camino feliz ARS (Mercado Pago)

1-4. Idénticos a Stripe.
5. Server action `createCheckoutSession`:
   - Crea preferencia MP con `items`, `payer.email`, `back_urls`, `notification_url`, `external_reference: internal_session_id`, `auto_return: 'approved'`.
   - Para el trial: el primer cobro tiene amount = ARS plan.annual y `expires: 7d` desde alta — **NO ideal**. Alternativa para v1: cobrar el día 7 mediante un job que crea la preferencia ese día. Para v0 podemos cobrar inmediato (sin trial).
   - Devuelve `init_point`.
6. User completa pago en MP (redirect, hosted).
7. MP redirige a `back_url` con query params (`collection_id`, `status`, `external_reference`).
8. Página `/checkout/success`:
   - Verifica `external_reference` matchea con `checkout_sessions.id`.
   - Llama MP API `payments.get(collection_id)` para confirmar `status: 'approved'`.
   - Si OK: muestra confirmación.
9. MP webhook `payment.updated` → handler:
   - Inserta/actualiza `subscriptions` (trial_ends_at = +7d, current_period_ends_at = +1y).
   - Marca `checkout_sessions.completed_at`.

> Para MVP, podemos shippear sólo Stripe primero (USD/EUR) y dejar ARS para una iteración posterior. Argentina puede ver "próximamente" o usar USD provisorio.

## 6. Seguridad

### Stripe

- **Sólo `stripe` SDK server-side** con `STRIPE_SECRET_KEY`. Nunca en client.
- **Webhook**: verificar firma con `stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET)`.
- **Idempotency**: cada `payment_events.processor_event_id` es único.
- **Restricted API key**: usar `rk_*` con permisos mínimos (Checkout Sessions, Customers, Subscriptions read/write) en producción, en vez de `sk_*` full access.

### Mercado Pago

- `MP_ACCESS_TOKEN` server-only.
- `MP_PUBLIC_KEY` cuando uses Bricks (no en Checkout Pro).
- **Webhook**: verificar firma usando `x-signature` header con HMAC-SHA256 sobre `x-request-id` + payload. Sigue el patrón documentado en MP.

### Variables de entorno necesarias

```
# Stripe
STRIPE_SECRET_KEY=sk_test_...           # rotará a sk_live_ en prod
STRIPE_PUBLISHABLE_KEY=pk_test_...      # client-side, no sensible
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_PLAYER_USD=price_...
STRIPE_PRICE_PRO_PLAYER_EUR=price_...
STRIPE_PRICE_PRO_AGENCY_USD=price_...
STRIPE_PRICE_PRO_AGENCY_EUR=price_...

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-...
MP_PUBLIC_KEY=APP_USR-...
MP_WEBHOOK_SECRET=...

# General
NEXT_PUBLIC_APP_URL=https://app.ballershub.app  # base para back_urls/success_url
```

## 7. Phase rollout

### Phase 1 (esta iteración) — Foundation
- [x] Skills + arquitectura entendida
- [x] SDKs instalados (`stripe`, `mercadopago`)
- [ ] Migración SQL + Drizzle schema
- [ ] Server SDK initializers
- [ ] Server actions skeleton (Stripe + MP)
- [ ] Webhook routes con verificación de firma + persistencia en `payment_events`
- [ ] Variables de entorno documentadas (`.env.example`)

### Phase 2 — UI shell
- [ ] `/checkout/[planId]` con steps
- [ ] Reuse del design system (bh-glass, bh-text-shimmer, etc.)
- [ ] Done pages (success / failure / pending)
- [ ] CTAs de PricingPlans wired a `/checkout/[planId]`

### Phase 2.5 — Visual upgrade matching Claude Design handoff

El handoff de Claude Design (`tmp/bh-design/.../checkout/`) define un flow más rico que el shell actual. Cuando lo adoptemos, agregar:

- **Stepper component** de 3 pasos visibles arriba del form (Plan / Pago / Confirmación). Numbered + check-on-done + line separator.
- **Topbar dedicada** del checkout con logo BallersHub a la izquierda + pill "Pago 100% seguro · SSL 256-bit" + link a Soporte. Es un layout DISTINTO al `(site)` (sin SiteHeader/SiteFooter normales) — pensar en dejarlo en una route group propia o pasar prop al layout.
- **Toggle "Necesito factura A (CUIT)"** en la card de billing. Switchea el label DNI ↔ CUIT y el placeholder. Cuando está ON, agrega un campo extra "Razón social".
- **Card "Método de pago"** con 2 opciones grandes (Stripe / MP), cada una con logo + descripción + tag pills (VISA/MC/AMEX para Stripe, 12x/ARS para MP). Lock icon "PCI DSS" en el header del card.
- **Coupon code** input en el order summary con un código demo `BH20` que aplica 20%. Implica `coupons` table + integración con Stripe Coupons / MP descuentos.
- **Pantallas adicionales**:
  - `processing.tsx` — loader animado + "Procesando pago" mientras esperamos confirmación (no redirect inmediato a éxito).
  - `email.tsx` — preview del recibo enviado por email, con botón a descargar PDF.

### Phase 3 — Stripe end-to-end (test mode)
- [ ] Crear products + prices en Stripe via MCP
- [ ] Conectar `STRIPE_PRICE_*` en `.env.local`
- [ ] Webhook handlers funcionales (`checkout.session.completed`, `customer.subscription.updated`, `invoice.paid`, `invoice.payment_failed`)
- [ ] Estado real de subscriptions persistido
- [ ] Trigger de email de bienvenida via Resend
- [ ] **Decidir hosted vs embedded**: el shell de Phase 1-2 usa hosted redirect (Stripe Checkout / MP Checkout Pro). El handoff de Claude Design prevé embedded UI (Stripe Elements / MP Payment Brick). Embedded = más conversion + más complejidad. Empezamos hosted, evaluamos embedded en Phase 3.5 si las métricas lo justifican.

### Phase 4 — Mercado Pago end-to-end (test mode)
- [ ] Crear access token de test user
- [ ] Server action MP funcional
- [ ] Webhook handler MP funcional
- [ ] Conciliación de estados con `subscriptions`

### Phase 5 — Self-service post-checkout
- [ ] Stripe Customer Portal access
- [ ] Cancel-subscription action (con regla de refund 3d)
- [ ] Pantalla en `/dashboard/settings/subscription` (ya existe a modo placeholder)

### Phase 6 — Edge cases & hardening
- [ ] 3DS / SCA en Stripe
- [ ] Pagos efectivo (Pago Fácil / Rapipago) en MP
- [ ] Pagos `pending` con resolución posterior
- [ ] Disputa / chargeback handling
- [ ] Renovación anual programada
- [ ] Dunning (reintentos automáticos en pago fallido)

## 8. Open questions

1. ¿Stripe Checkout (hosted, redirect) o Stripe Embedded Checkout (UI in-app)? Empezamos con **hosted** por simplicidad. Embedded es la siguiente iteración.
2. ¿Mercado Pago Checkout Pro (redirect) o Bricks (embedded)? Empezamos con **Pro**.
3. ¿Qué pasa si un user empieza checkout USD y a la mitad cambia el toggle de moneda en `/pricing`? Decisión: el checkout activo sigue con la moneda original; el toggle sólo afecta la próxima visita a `/pricing`.
4. ¿Cómo manejamos el upgrade de plan (Free → Pro)? Path: el botón "Probar 7 días gratis" siempre lleva a checkout. Si el user ya tiene una suscripción activa, el botón cambia a "Manage subscription" y abre el Customer Portal de Stripe.
5. Stripe Customer ID por user: ¿uno solo o uno por procesador? Decisión: el `subscriptions.processor_customer_id` es por procesador. Un user puede tener historial con ambos (cambió de país, etc.).

## 9. Changelog

- **2026-05-04 (v1)** — Draft inicial. Routing por moneda, modelo de subscriptions, schema de DB propuesto, phase rollout en 6 etapas.
