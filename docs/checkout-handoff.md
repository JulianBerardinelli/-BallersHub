# Checkout Handoff — Estado al 2026-05-06 (post-Phase 5)

> **Para el próximo chat / dev**: este documento describe en qué etapa está el sistema de checkout/billing, qué se hizo, qué falta, y qué decisiones quedaron abiertas. Es un complemento a [`docs/checkout-architecture.md`](./checkout-architecture.md) (cómo funciona) y [`docs/pricing-matrix.md`](./pricing-matrix.md) (qué se cobra).
>
> **Branches activos**:
> - `claude/clever-fermi-9074ed` — primera tanda (Phase 1-3 + 4 parcial). PR #42 → `dev`.
> - `claude/brave-turing-d80c39` — continuación (Phase 5 mínima + emails + dunning + MP authorized_payment).
>
> **Last working state**: dev server local con keys en `.env.local`, `stripe listen` corriendo, Stripe E2E test exitoso. Build production passa (`npm run build`). Typecheck limpio (`tsc --noEmit`). Lint sin errores.

---

## Visión rápida (TL;DR)

| Fase | Status | Comentario |
|---|---|---|
| 1 — Foundation | ✅ done | Migración DB aplicada, schemas Drizzle, SDKs instalados, server actions, webhook routes |
| 2 — UI shell | ✅ done | `/checkout/[planId]`, `/success`, `/failure`, `/pending`, `/processing`, `/receipt` |
| 2.5 — Visual match Claude Design | ✅ done | Topbar/stepper/method picker/coupon/sticky summary, todos los componentes según handoff |
| 3 — Stripe E2E | ✅ done | Productos+prices provisionados via MCP, webhook funcionando, reconcile fallback, success page rutea dashboard/onboarding |
| 4 — Mercado Pago E2E | 🟡 partial | Código + `authorized_payment` handler completo. Falta test E2E + URL pública del webhook |
| 5 — Self-service portal | ✅ done (mín) | Stripe portal endpoint, MP cancel endpoint, settings UI con CTAs por procesador, refund-window banner, multi-sub guard |
| 6 — Edge cases & hardening | 🟡 partial | Dunning (`invoice.payment_failed` → `past_due` + email), multi-sub guard. Falta 3DS test, chargeback handler |

---

## Stack del checkout

- **Procesadores**: Stripe (USD/EUR) + Mercado Pago (ARS) ruteado por `processorFor(currency)` en `src/lib/billing/plans.ts`.
- **Modelo**: subscripción anual recurring + 7 días de trial nativo en ambos procesadores.
- **Source of truth**:
  - `docs/pricing-matrix.md` — qué cobramos (planes, precios, features, gating UX).
  - `docs/checkout-architecture.md` — cómo cobramos (state machine, security, phase rollout).
  - `src/lib/billing/plans.ts` — server-side price table (debe coincidir con la matriz).
- **DB tables** (migración `0024_checkout_foundation.sql`):
  - `billing_addresses` — snapshot por checkout
  - `checkout_sessions` — pending → redirected → completed | expired | failed
  - `payment_events` — audit append-only, idempotent en (processor, processor_event_id)
  - `subscriptions` — extendida con plan_id, currency, processor, processor_subscription_id, status_v2, trial_ends_at, etc.

---

## Phase 1 — Foundation ✅

**Done**:
- Migración `0024_checkout_foundation.sql` aplicada en DB (idx 24 en journal).
- Drizzle schemas: `billingAddresses.ts`, `checkoutSessions.ts`, `paymentEvents.ts`, `subscriptions.ts` extendido.
- SDK initializers: `lib/billing/{stripe,mercadopago}.ts` (singletons memoizados, env-aware con errores descriptivos).
- Server action: `src/app/actions/checkout.ts` con validación zod + auth opcional (guests).
- Webhook routes: `src/app/api/webhooks/{stripe,mercadopago}/route.ts` con signature verification.
- Helper de idempotencia: `src/lib/billing/recordEvent.ts`.
- Verificación HMAC MP: `src/lib/billing/verifyMpSignature.ts`.
- Handlers tipados: `src/lib/billing/handlers/{stripe,mercadopago}.ts`.

**Nada pendiente.**

---

## Phase 2 — UI shell ✅

**Done**:
- Route group `(checkout)/` con layout dedicado (no SiteHeader/Footer).
- `/checkout/[planId]?currency=USD|ARS|EUR` — form principal.
- `/checkout/{success,failure,pending,processing,receipt}/page.tsx`.
- Componentes en `src/components/site/checkout/`:
  - `CheckoutTopbar.tsx` (logo + secure pill + soporte)
  - `CheckoutFooterMini.tsx` (legal links + CUIT)
  - `CheckoutStepper.tsx` (Plan → Pago → Confirmación)
  - `CheckoutForm.tsx` (datos contacto + facturación + método pago + Cambiar plan)
  - `CheckoutOrderSummary.tsx` (sidebar sticky con plan row + trial + line items + cupón)
  - `PaymentMethodCard.tsx` (deprecated — la lógica está en CheckoutForm ahora)
  - `CheckoutDoneLayout.tsx` (deprecated — los done pages tienen su layout inline)

**Nada pendiente.**

---

## Phase 2.5 — Visual match con Claude Design handoff ✅

**Done**:
- Layout shell con ambient washes radiales lime+blue.
- Stepper 26px con glow lime.
- Form flat dark (`bg-bh-surface-1` + `bg-[#141414]` inputs).
- Method picker interactivo: Stripe (primario para USD/EUR) y Mercado Pago (primario para ARS), con la otra deshabilitada según moneda.
- Coupon BH20 = 20% off (UI-only, no integrado con Stripe Coupons / MP discounts todavía).
- Order summary con line items: Subtotal · Cupón · IVA 21% (sólo ARS) · A pagar hoy / Total · Después del trial.
- Sticky en columna derecha con `top-[92px]` para clear de topbar.
- Processor-not-ready banner cuando faltan env keys.
- Footer compacto con CUIT.

**Skipped por instrucción del owner**: toggle "Necesito factura A" (DNI ↔ CUIT) y campo Razón social.

---

## Phase 3 — Stripe end-to-end ✅

**Productos + prices provisionados via MCP** (test mode, account `acct_1TTVkQRCPWf3QH4L`):

| Plan / moneda | Producto | Price ID | Monto |
|---|---|---|---|
| Pro Player USD | `prod_USQmrpyRlfsXK5` | `price_1TTpIwRCPWf3QH4L24uUNXb3` | $85.00 / año |
| Pro Player EUR | `prod_USQmrpyRlfsXK5` | `price_1TTVupRCPWf3QH4LOtG6KAv1` | €73.00 / año |
| Pro Agency USD | `prod_USkoFY0OhGVwdL` | `price_1TTpJERCPWf3QH4LxKlyGQyE` | $169.00 / año |
| Pro Agency EUR | `prod_USkoFY0OhGVwdL` | `price_1TTpJQRCPWf3QH4LHfbZIT2y` | €146.00 / año |

Los IDs están pinneados en `.env.local` como `STRIPE_PRICE_PRO_PLAYER_USD` etc.

**Webhook setup local**:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed
```

**Test E2E confirmado** (2026-05-05): pagar con `4242 4242 4242 4242` → checkout.session.completed + customer.subscription.created + invoice.paid recibidos en webhook → DB updateada → `/checkout/success` muestra "iListo! Tu plan Pro Player está activo".

**Self-healing reconcile** ([`src/lib/billing/reconcileCheckout.ts`](../src/lib/billing/reconcileCheckout.ts) + [`api/billing/reconcile-checkout`](../src/app/api/billing/reconcile-checkout/route.ts)):
- Cuando webhook se pierde (stripe listen no corriendo, db pool dropped, etc.), el `/checkout/processing` después de 60s llama POST `/api/billing/reconcile-checkout?internal=<id>` que pull's la session de Stripe y replica la lógica del webhook. Idempotent, safe to call múltiples veces.

**Success page branching** ([`/checkout/success/page.tsx:resolveNextStep`](../src/app/(checkout)/checkout/success/page.tsx)):
- Tiene player profile o application en curso → CTA "Ir a mi dashboard"
- Tiene manager profile o agency vinculada → CTA "Ir a mi dashboard"
- Brand new user → CTA "Completar mi perfil" → `/onboarding/start`

**Pendiente Phase 3**:
- ❌ Email de welcome via Resend post-checkout. Resend está instalado pero el handler no triggerea email todavía.
- ❌ Webhook signing secret rotation (24h tolerance soporte ya está, falta UI/process).

---

## Phase 4 — Mercado Pago end-to-end 🟡

**Done**:
- Skill `mp-subscriptions` cargado y leído. Migración de Checkout Pro (one-time) → **Subscriptions API (preapproval)** completa.
- `lib/billing/mercadopago.ts` exporta `getMpPreApproval()` además de `getMpPreference()` y `getMpPayment()`.
- `lib/billing/createCheckout.ts` path MP usa `PreApproval.create()` con:
  - `auto_recurring.frequency: 12, frequency_type: 'months'` (anual)
  - `auto_recurring.free_trial: { frequency: 7, frequency_type: 'days' }`
  - `external_reference: internalSessionId`
  - `back_url` apunta a `/checkout/processing`
- `lib/billing/handlers/mercadopago.ts` reescrito para topics:
  - `subscription_preapproval` / `preapproval` → upserts subscription via `getMpPreApproval().get(id)`
  - `subscription_authorized_payment` / `authorized_payment` → fallback (TODO completar)
  - `payment.*` → fallback para refunds/chargebacks
- `reconcileCheckout` también soporta MP — si el webhook no llega, fetchea preapproval y forza el update.

**Pendiente para test E2E**:
1. ⚠️ **MP credentials en `.env.local`**: el user dijo que las pegó (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`). Hay que verificar que el banner "MP no configurado" desapareció en `/checkout/pro-player?currency=ARS`.
2. ❌ **MP webhook URL**: requiere URL pública. Local no funciona porque MP no tiene un equivalente directo a `stripe listen`. Opciones:
   - **ngrok**: `ngrok http 3000` → URL pública → registrarla en MP Dashboard → Webhooks → Notification URL.
   - **Vercel preview**: deploy del branch a Vercel preview → URL `https://<branch>-<project>.vercel.app/api/webhooks/mercadopago` → registrarla.
   - **MP MCP** tiene tool `save_webhook` (visto en el `/mcp` del user) que podría hacerlo programáticamente. Investigar.
3. ❌ **Test user MP**: crear test user via MP Dashboard o si el MCP tiene `create_test_user` (no aparecía en los 8 tools listados, hay que ver si existe en otro endpoint del MCP).
4. ❌ **End-to-end test**: completar pago en `/checkout/pro-player?currency=ARS`, autorizar preapproval en MP test environment, verificar webhook recibido + DB actualizada.

**MP MCP del user** tiene estas 8 tools (visto en `/mcp` listing):
1. quality_checklist
2. quality_evaluation
3. notifications_history
4. save_webhook
5. search_documentation
6-8. (no listadas)

`save_webhook` es el más relevante. Investigar su signature.

---

## Phase 5 — Self-service post-checkout ✅ (mínima)

**Done en `claude/brave-turing-d80c39`**:
- **`POST /api/billing/portal`** — crea `billingPortal.sessions.create()` y devuelve la URL del portal de Stripe. Acepta `{ return_url }` opcional. Auth-gated.
- **`POST /api/billing/cancel`** — cancela la subscripción del user. Para Stripe: setea `cancel_at_period_end=true` (mantiene acceso hasta `current_period_end`). Para MP: llama a `PreApproval.update({ status: 'cancelled' })` (corta acceso inmediato).
- **`/dashboard/settings/subscription`** rewriteado:
  - Lee estado real de `subscriptions` via Drizzle
  - Muestra plan/estado/renewal date con `StatusPill` (success/warning/danger)
  - Banner "ya tenés un plan activo" si `?already_subscribed=1` (vino del guard)
  - Banner "tu cancelación quedó registrada" si `?canceled=1`
  - Refund-window banner: si dentro de `REFUND_GRACE_DAYS` desde `createdAt`, sugiere cancelar para reembolso
  - `<SubscriptionActions>` (client component) con CTA por procesador:
    - Stripe: botón "Abrir portal" → llama POST /api/billing/portal y redirige
    - MP: botón "Cancelar" con confirmación 2-pasos → llama POST /api/billing/cancel
- **Multi-subscription guard** en `/checkout/[planId]/page.tsx`: si el user ya tiene `statusV2 IN ('trialing','active','past_due')`, redirige a settings con `?already_subscribed=1`.

**Pendiente Phase 5 (futuro)**:
- ❌ Refund automático real (3-day window). Por ahora mostramos el banner pero el reembolso es manual via Stripe Dashboard.
- ❌ Plan switching (upgrade pro-player → pro-agency) sin cancelar primero.
- ❌ Resumir suscripción cancelada (reactivate) — Stripe portal lo maneja, MP no.

---

## Phase 6 — Edge cases & hardening 🟡

**Done en `claude/brave-turing-d80c39`**:
- ✅ **Dunning** — `invoice.payment_failed` (Stripe) + `subscription_authorized_payment` rejected/cancelled (MP) → flip `statusV2` a `past_due` + email transaccional `payment_failed` con link a settings.
- ✅ **Multi-subscription guard** (descripto en Phase 5).
- ✅ **Email transaccionales**:
  - `subscription_welcome.tsx` — disparado desde `handlers/{stripe,mercadopago}.ts` cuando se crea la primera fila de subscription en `trialing`/`active`. Confirma plan, monto, trial, próximo cargo.
  - `payment_failed.tsx` — disparado en dunning. Linkea a settings.
  - Helpers: `sendSubscriptionWelcomeEmail` y `sendPaymentFailedEmail` en `lib/resend.ts`.
  - Templates registrados en `src/emails/templates/_registry.ts`.
- ✅ **MP `subscription_authorized_payment` handler completo**: hace fetch a `/authorized_payments/{id}` y re-sincroniza el preapproval padre + dispara dunning si está `rejected` / `cancelled`.

**Pendiente Phase 6**:
- ❌ **3DS / SCA**: probar manualmente con `4000 0025 0000 3155`. Stripe hosted lo maneja automáticamente, hay que verificar que el redirect post-3DS no rompe el polling.
- ❌ **Chargebacks** (`charge.dispute.created`): hoy no se maneja. Cuando ocurra, deberíamos `pause` la sub.
- ❌ **MP cash methods** (Pago Fácil / Rapipago) en `payment.*`: el handler skipea actualmente. Para MP Subscriptions probablemente no aplica (el preapproval requiere tarjeta), pero confirmar.
- ❌ **Resumen anual / report email**: enviar resumen de cargos al renovar.

---

## Otros things done que no están en las fases

**Reliability fixes** (necesarios porque Supabase pool se cae intermitentemente en dev):
- `AuthGate.tsx` con doble try/catch (auth check + post-auth fetches) → fallback a anonymous + minimal UserMenu.
- `DashboardLayout.tsx` con try/catch global → fallback `<DashboardDegradedFallback>` con sesión activa visible + "Reintentar" button.
- `(site)/layout.tsx` con `overflow-x-clip` para soportar full-bleed breakouts.

**Pricing page** (Phase pre-checkout, ya en `dev` mergeable):
- Cards (Free/Pro × Player/Agency) con audience toggle + currency toggle.
- Comparison table audience-aware con accent dinámico (lime/blue).
- Detail panel con scrolljack + 3 device-frame mockups por plan.
- Fix Lightning CSS bug donde `backdrop-filter` se dropeaba en favor de `-webkit-backdrop-filter`.
- `bh-tex-mesh` texture upgrade para diferenciar el panel del page bg.

---

## Open questions / decisiones pendientes

Tracked en `docs/pricing-matrix.md` §8 y `docs/checkout-architecture.md` §8. Las más importantes:

1. **Pro Agency final prices** — placeholders proporcionales (USD 169, ARS 264.999, EUR 146). Owner debe confirmar.
2. **ARS price quarterly review** — proceso definido (cada 3 meses, version en docs) pero no automatizado. Cuando bumpee el rate USD/ARS, hay que actualizar `lib/billing/plans.ts` + crear nuevo Stripe Price (los precios viejos quedan referenciados por subs existentes).
3. **MP webhook URL** — sin definir cómo se va a configurar (ngrok dev / vercel preview / save_webhook MCP / dashboard manual).
4. **Geo-IP detection para default currency** — el toggle existe pero defaultea a USD. Falta middleware de Next.js que lea `request.geo` y pase como prop.
5. **Coupon system real** — `BH20` actualmente es UI-only. Para ser real: tabla `coupons` en DB + integración con `Stripe.coupons.create` + MP discounts (que MP no soporta nativamente — tendríamos que implementar como ajuste manual del `transaction_amount`).
6. **Dashboard subscription card** — visualizar estado para el user. Diseño mental ya en este doc, falta implementarlo.
7. **Cap de invitaciones de reviews/semana** (de la matriz original) — sin definir.
8. **Resend email triggers** — instalado pero no wireado a webhooks.

---

## Próximas 3 prioridades sugeridas (en orden)

### 1. Mergear este PR a `dev` y deployar a Vercel preview
- Phases 1-5 completas + Phase 6 parcial. El bundle (entre `clever-fermi` y `brave-turing`) está listo para preview.
- En Vercel preview con URL pública: registrar el webhook URL de MP (intentar primero con MP MCP `save_webhook`; si no, manual).
- Vars Vercel a setear: `STRIPE_*`, `MP_*`, `RESEND_API_KEY`, `SUPABASE_*`, `NEXT_PUBLIC_APP_URL`.

### 2. Test E2E de Mercado Pago
- Completar pago en `/checkout/pro-player?currency=ARS` con un test user de MP.
- Verificar que `subscription_preapproval` webhook llega + `subscriptions` row se crea con `status_v2 = 'trialing'`.
- Probar también flujo de cancelación desde `/dashboard/settings/subscription` (botón "Cancelar" de MP).
- Si falla por la signature: revisar `lib/billing/verifyMpSignature.ts` (HMAC SHA256 sobre `id;request-id;ts`).

### 3. Hardening adicional (Phase 6)
- 3DS test (`4000 0025 0000 3155`) — confirmar que el redirect post-challenge no rompe el polling de `/checkout/processing`.
- Chargeback handler (`charge.dispute.created`) — flip a `paused` y notificar admin.
- Refund automático real en la ventana de 3 días (hoy es banner-only en settings).

---

## Archivos clave para arrancar el siguiente chat

```
docs/
├── pricing-matrix.md           — qué cobramos (planes, precios, features)
├── checkout-architecture.md    — cómo cobramos (state machine, security)
└── checkout-handoff.md         — este archivo

src/lib/billing/
├── env.ts                       — env accessor + isProcessorConfigured
├── plans.ts                     — server-side price table
├── stripe.ts                    — Stripe SDK singleton
├── mercadopago.ts               — MP SDK + PreApproval/Preference/Payment exports
├── createCheckout.ts            — entry point: insert local + create processor session
├── reconcileCheckout.ts         — self-healing fallback for missed webhooks
├── recordEvent.ts               — idempotent event persistence
├── verifyMpSignature.ts         — HMAC verification for MP
└── handlers/
    ├── stripe.ts                — checkout.session.completed + subscription.* + invoice.*
    └── mercadopago.ts           — subscription_preapproval + authorized_payment

src/app/(checkout)/
├── layout.tsx                   — dedicated checkout chrome
└── checkout/
    ├── [planId]/page.tsx        — main checkout form
    ├── processing/page.tsx      — polling + reconcile fallback
    ├── success/page.tsx         — confirmation + branched CTA (dashboard | onboarding)
    ├── failure/page.tsx
    ├── pending/page.tsx
    └── receipt/page.tsx

src/app/api/
├── webhooks/
│   ├── stripe/route.ts
│   └── mercadopago/route.ts
└── billing/
    ├── checkout-status/route.ts — used by /processing for polling
    └── reconcile-checkout/route.ts — manual + auto recovery

src/components/site/checkout/    — UI components (form, summary, stepper, topbar, footer)
```

---

## Comandos útiles

**Run dev**:
```bash
cd /Users/jberardinelli/Dev/ballershub/.claude/worktrees/clever-fermi-9074ed
npm run dev
```

**Run stripe listen** (en otra terminal):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed
```

**Manual reconcile** (rescatar un checkout stuck):
```bash
curl -X POST "http://localhost:3000/api/billing/reconcile-checkout?internal=<UUID>"
```

**Verificar DB state** (Supabase SQL editor):
```sql
SELECT id, plan_id, currency, status_v2, processor, processor_subscription_id,
       trial_ends_at, current_period_end
FROM subscriptions
WHERE user_id = '<USER_UUID>'
ORDER BY created_at DESC LIMIT 5;

SELECT id, processor, status, completed_at, processor_session_id
FROM checkout_sessions
ORDER BY created_at DESC LIMIT 5;

SELECT processor_event_id, event_type, processed, error_message, received_at
FROM payment_events
ORDER BY received_at DESC LIMIT 10;
```

**Stripe MCP tools usadas** (loaded en este chat):
- `get_stripe_account_info` — verificar conexión
- `list_products`, `list_prices` — auditar
- `create_product`, `create_price` — provision
- `stripe_api_search`, `stripe_api_details`, `stripe_api_execute` — para webhooks/portals/etc.

**MP MCP tools** (8 disponibles según user):
- `save_webhook`, `search_documentation`, `notifications_history`, `quality_checklist`, `quality_evaluation`, +3 más.

---

## Test cards rápidas

**Stripe** (test mode):
- `4242 4242 4242 4242` — succeed (default)
- `4000 0025 0000 3155` — requires 3DS
- `4000 0000 0000 9995` — fondos insuficientes
- `4000 0000 0000 0002` — generic decline

**Mercado Pago** (cuando esté configurado): ver `mp-checkout-online/SKILL.md` § Testing.

---

## Notas finales

- **No mergear `STRIPE_SECRET_KEY` ni `MP_ACCESS_TOKEN` en código**. Ya están en `.env.local` (gitignored).
- **El stripe listen tiene que estar corriendo** durante todos los tests locales o los webhooks se pierden y hay que llamar reconcile a mano.
- **Supabase free tier se pausa** después de 1 semana sin tráfico. Si volvés y todo da "Connection closed" — restaurar en el dashboard.
- **`overflow: hidden`** en ancestors rompe `position: sticky` (lección aprendida con el panel scrolljack en /pricing). Usar `overflow-x-clip` cuando se quiere clip sin scrollbar.
