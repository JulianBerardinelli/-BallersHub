# Sistema de mailing — 'BallersHub

Documento self-contained: cualquier dev (o agente) que abra este archivo
debe poder operar todo el módulo de mailing sin abrir otro doc primero.

> Última auditoría: 2026-06-15 (día de lanzamiento).

---

## 1. Stack

| Pieza | Implementación |
|---|---|
| Provider transaccional + marketing | **Resend** |
| Render de templates | **React Email** (`@react-email/components`) |
| Templates de auth | **Supabase** (HTML pegado en dashboard, generado por `supabase/templates/build.mjs`) |
| Sender oficial | `'BallersHub <info@ballershub.co>` |
| Soporte público | `info@ballershub.co` |
| Design tokens | `src/emails/tokens.ts` (fondo `#080808`, lime `#CCFF00`) |
| Logo en header | `public/images/logo/imagotipo-lime.png` (PNG 200×32, 2× rasterizado del SVG) |

Por qué Resend + React Email: deliverability sólida, batch.send con tags
para tracking, soporte first-class de Next.js, plantillas tipadas en TSX.

---

## 2. Env vars

Documentadas en [`.env.example`](../../.env.example). Para producción **deben estar todas seteadas**:

| Variable | Obligatorio | Para qué sirve |
|---|---|---|
| `RESEND_API_KEY` | ✅ Sí | Sin esto los sends caen a mock log. |
| `RESEND_WEBHOOK_SECRET` | ✅ Sí | Sin esto el endpoint `/api/webhooks/resend` rechaza eventos y se pierde tracking + supresión por bounce. |
| `MARKETING_UNSUB_SECRET` | ✅ Sí | HMAC secret de los tokens de unsubscribe (CAN-SPAM / GDPR). Generar con `openssl rand -hex 32`. |
| `NEXT_PUBLIC_SITE_URL` | ✅ Sí | Usado en logos, links y CTAs. Falla a `https://ballershub.co` si no se setea. |

Verificación post-deploy:

```bash
vercel env ls
# Deben aparecer las 3 RESEND_* + MARKETING_UNSUB_SECRET en production.
```

---

## 3. Inventario completo de plantillas

### 3.1 Transaccionales (Resend + React Email)

Archivos en `src/emails/templates/`, registradas en `_registry.ts`.

| `templateKey` | Categoría | Cuándo se dispara | Dónde se dispara |
|---|---|---|---|
| `welcome_player` | transactional | Admin **aprueba** una `player_application` | [src/app/api/admin/applications/[id]/approve/route.ts:236](../../src/app/api/admin/applications/[id]/approve/route.ts) |
| `welcome_agency` | transactional | Admin **aprueba** una `manager_application` | [src/app/actions/manager-applications.ts:120](../../src/app/actions/manager-applications.ts) |
| `lead_welcome` | marketing | Visitante deja email en un portfolio público | [src/app/api/portfolio/[slug]/lead/route.ts](../../src/app/api/portfolio/[slug]/lead/route.ts) |
| `profile_completion` | marketing | Drip cron — usuario con perfil incompleto | `src/lib/marketing/drips.ts` |
| `agency_staff_invite` | transactional | Manager invita staff | `src/app/actions/agency-invites.ts` |
| `player_agency_invite` | transactional | Agencia invita jugador a representación | `src/app/actions/player-invites.ts` |
| `player_disconnect` | transactional | Jugador cancela representación | `src/app/actions/agency-representation.ts` |
| `subscription_welcome` | transactional | Primer pago / trial via Stripe o MP | `src/lib/billing/handlers/{stripe,mercadopago}.ts` |
| `comp_grant_welcome` | transactional | Admin otorga / extiende Pro de cortesía | `src/app/actions/admin-comp-accounts.ts` |
| `payment_failed` | transactional | Falla cobro de renovación | `src/lib/billing/handlers/{stripe,mercadopago}.ts` |
| `blog_post_pending_admin` | transactional | Blogger submitea post a review | `src/app/[locale]/(site)/blog/write/actions.ts` |
| `blog_post_approved_author` | transactional | Admin aprueba post | `src/app/[locale]/(dashboard)/admin/blog/actions.ts` |
| `blog_post_rejected_author` | transactional | Admin rechaza post con feedback | `src/app/[locale]/(dashboard)/admin/blog/actions.ts` |
| `custom_broadcast` | marketing | Broadcasts ad-hoc desde admin (sin código) | UI: `/admin/marketing` |
| `launch_announcement` ✨ | marketing | Campaña de lanzamiento + feature drops | UI: `/admin/marketing` |
| `re_engagement` ✨ | marketing | Re-activación manual de usuarios con perfil incompleto | UI: `/admin/marketing` |

✨ = templates nuevos sumados en la auditoría del 2026-06-15.

### 3.2 Supabase Auth (HTML en dashboard)

Generados por `supabase/templates/build.mjs`, outputs en `supabase/templates/*.html`.
**Hay que pegarlos manualmente** en Supabase → Authentication → Emails. Ver [`supabase/templates/README.md`](../../supabase/templates/README.md).

| Archivo | Template en Supabase | Subject |
|---|---|---|
| `confirm-signup.html` | Confirm signup | `Confirmá tu cuenta en 'BallersHub` |
| `reset-password.html` | Reset Password | `Restablecé tu contraseña de 'BallersHub` |
| `magic-link.html` | Magic Link | `Tu enlace de acceso a 'BallersHub` |
| `invite.html` | Invite user | `Te invitaron a 'BallersHub` |
| `change-email.html` | Change Email Address | `Confirmá tu nuevo email en 'BallersHub` |

---

## 4. Design system

Templates **solo** componen desde primitives en `src/emails/components/`.
No escribir HTML/colores raw dentro de un template — el punto del módulo
es que un re-skin estacional toque `tokens.ts` y nada más.

| Componente | Uso |
|---|---|
| `EmailLayout` | Wrapper master: head, body, header, footer. Todo template lo usa. |
| `EmailHeader` | Logo lime 200×32 PNG (no SVG — Outlook lo come). |
| `EmailFooter` | Legal + unsubscribe + soporte. Token HMAC inyectado por dispatcher. |
| `EmailButton` | CTA con variantes `lime` / `blue` / `outline`. |
| `EmailHeading` | H1/H2/H3 en Barlow Condensed. |
| `EmailParagraph` | Body en DM Sans con tonos `default` / `muted` / `subtle`. |
| `EmailEyebrow` | Etiqueta lime uppercase chiquita arriba de los headings. |
| `EmailCard` | Surface card con variantes `neutral` / `lime` / `blue`. |
| `EmailStep` | Card numerado con stamp lime — para flows step-by-step. |
| `EmailDivider` | `<Hr>` con tonos `subtle` / `default` / `strong`. |
| `EmailLinkInline` | Link inline con estilos de marca. |

---

## 5. Cómo agregar una plantilla nueva

```bash
# 1. Crear el componente
touch src/emails/templates/mi-nuevo-template.tsx

# 2. Componerlo SOLO de primitives de @/emails
# 3. Exportar default + el type de Props
# 4. Registrarlo en src/emails/templates/_registry.ts
#    - Importar
#    - Sumar key al type TemplateKey union
#    - Sumar entry al TemplatePropsMap
#    - Sumar entry al objeto `components`
#    - Sumar descriptor a TEMPLATE_DESCRIPTORS
# 5. Si es transaccional: agregar un helper `sendMiNuevoEmail()` en src/lib/resend.ts
# 6. Si va a usarse desde /admin/marketing: agregar sample props en
#    src/app/[locale]/(dashboard)/admin/marketing/actions.ts → buildSampleProps()
# 7. pnpm typecheck (el exhaustive default case te avisa si faltó algo)
```

---

## 6. Dispatcher & infraestructura de campañas

### 6.1 Modelo de datos

| Tabla | Para qué |
|---|---|
| `marketing_campaigns` | Una fila por campaña (template_key, props snapshot, audience filter, status). |
| `marketing_sends` | Snapshot idempotente recipient × campaign. PK `(campaign_id, email)` evita dobles envíos. |
| `marketing_subscriptions` | Estado de opt-in/out por email. Respeta unsubscribe + bounces. |
| `marketing_email_events` | Webhook events de Resend (open, click, bounce, complaint). |
| `marketing_drip_configs` | Configuración por tipo de drip. |
| `marketing_drip_enrollments` | Estado por usuario × drip. Cron worker procesa. |

### 6.2 Flujo de dispatch

```
admin/marketing UI (crear campaña)
  ↓ actions.ts → DB snapshot (status=draft)
  ↓
admin acción "Enviar" o cron schedule
  ↓
resolveAudience() → filtra suppression + frequency cap
  ↓
runCampaign() en src/lib/marketing/dispatch.ts
  ↓ snapshot recipients a marketing_sends (idempotente)
  ↓ batches de 100 con resend.batch.send + 150ms pause
  ↓ por cada recipient: renderTemplate(key, {...props, recipientEmail, unsubscribeToken})
  ↓ tags: [campaign:slug, campaign_id:uuid]
  ↓
Resend → recipient
  ↓ eventos open/click/bounce/complaint
  ↓
POST /api/webhooks/resend (verificado con RESEND_WEBHOOK_SECRET)
  ↓ marketing_email_events + actualiza marketing_sends.status
  ↓ bounce/complaint → bloquea futuras campañas a ese email
```

### 6.3 Frequency cap

Configurable en cada disparo (`applyFrequencyCap` en `runCampaign` input). Por defecto: no más de **1 email** a la misma dirección dentro de **3 días** (ver `ESTIMATE_FREQUENCY_CAP_DAYS`).

---

## 7. Deploy checklist (lanzamiento)

### 7.1 Pre-deploy (ya hecho en este worktree)

- [x] Bug fix: welcome email dispara en aprobación de jugador.
- [x] Bug fix: welcome email dispara en aprobación de agencia.
- [x] 5 templates de Supabase regenerados (`node supabase/templates/build.mjs`).
- [x] `.env.example` documenta todas las vars de email.
- [x] Templates `launch_announcement` + `re_engagement` agregados al registry.
- [x] Typecheck + lint verde.

### 7.2 En el dashboard de Supabase (manual — bloqueante)

- [ ] Authentication → Emails → **Confirm signup**: pegar `supabase/templates/confirm-signup.html` + subject.
- [ ] Authentication → Emails → **Reset Password**: pegar `supabase/templates/reset-password.html` + subject.
- [ ] Authentication → Emails → **Magic Link**: pegar `supabase/templates/magic-link.html` + subject.
- [ ] Authentication → Emails → **Invite user**: pegar `supabase/templates/invite.html` + subject.
- [ ] Authentication → Emails → **Change Email Address**: pegar `supabase/templates/change-email.html` + subject.
- [ ] Probar **un signup real** y verificar que el mail llega branded.

### 7.3 En Vercel (env vars)

```bash
vercel env add RESEND_API_KEY production
vercel env add RESEND_WEBHOOK_SECRET production
vercel env add MARKETING_UNSUB_SECRET production
# (NEXT_PUBLIC_SITE_URL ya está set para ballershub.co)
```

### 7.4 En Resend (webhook)

- [ ] Resend → Webhooks → Add endpoint
- [ ] URL: `https://ballershub.co/api/webhooks/resend`
- [ ] Eventos: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`
- [ ] Signing secret → copiar y pegar en Vercel como `RESEND_WEBHOOK_SECRET`.

### 7.5 QA post-deploy

- [ ] Signup desde cero → llega `Confirm signup` branded.
- [ ] Aprobar un jugador desde admin → llega `welcome_player` branded.
- [ ] Aprobar una agencia desde admin → llega `welcome_agency` branded.
- [ ] Reset password → llega `Reset Password` branded.
- [ ] (Cuando haya un cobro real) → llega `subscription_welcome` branded.

---

## 8. Cómo armar la campaña de lanzamiento

1. Entrar a `/admin/marketing` con cuenta admin.
2. **Nueva campaña**.
3. Llenar:
   - **Name**: `Lanzamiento oficial 2026-06-15`
   - **Slug**: `launch-2026-06-15`
   - **Subject**: `Hoy lanzamos 'BallersHub — entrá antes que el resto`
   - **Preheader**: `Nuevo directorio profesional de talento futbolístico. Portfolios validados, scouting global, datos verificados.`
   - **Template**: `Lanzamiento — anuncio` (`launch_announcement`)
   - **Template props** (JSON): puede dejarse vacío `{}` para usar defaults, o:
     ```json
     {
       "ctaPrimaryUrl": "https://ballershub.co/auth/sign-up",
       "ctaPrimaryLabel": "Crear mi cuenta",
       "ctaAgencyUrl": "https://ballershub.co/onboarding/manager",
       "ctaAgencyLabel": "Soy agencia / manager"
     }
     ```
   - **Audience filter**:
     - `leads_recent` con `withinDays: 90` → 90 días de leads del portfolio.
     - O `custom` con lista propia.
4. **Preview** — verificar el render.
5. **Enviar** (idealmente con `applyFrequencyCap = true` para evitar superposición con drips).

Para re-engagement: misma UI, template `re_engagement`, audience filter para usuarios sin perfil completado (queda pendiente armar el segmento — hoy `re_engagement` se puede usar con audience `custom` o `members_no_profile` si se agrega).

---

## 9. Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| Sends caen a "mock log" en prod | `RESEND_API_KEY` no seteado | Setearlo en Vercel + redeploy. |
| Recipients no reciben mails de auth | Templates no pegados en Supabase dashboard | Ver §7.2. |
| Mails llegan al spam | DKIM/SPF no configurado para `ballershub.co` | Resend → Domains → verificar `ballershub.co` y agregar DNS records. |
| No se cuentan opens/clicks | Webhook no configurado o secret mal | Ver §7.4. |
| Unsubscribe link rompe | `MARKETING_UNSUB_SECRET` no seteado | Setearlo en Vercel. Tokens viejos firmados con NEXTAUTH_SECRET dejarán de validar — esperable. |
| Campaña no envía / queda en `draft` | Audience vacía o frequency cap filtró todo | Logs en `marketing_email_events`, o re-ejecutar con `applyFrequencyCap=false`. |

---

## 10. Gaps conocidos / futuro

Nada de esto es bloqueante para launch:

- **i18n**: los templates están en español 🇦🇷. Cuando se haga el i18n full (per `docs/i18n/HANDOFF.md`), agregar diccionarios para emails y rendrear según locale del recipient.
- **Login security emails** ("nuevo dispositivo", "login desde IP nueva"): no implementado. Requiere hook en Supabase auth o un job que mire `auth.sessions`. Mediano esfuerzo.
- **Email archive en admin**: la UI de `/admin/marketing` muestra estados de envío pero no el HTML renderizado por send. Útil para soporte.
- **A/B testing de templates**: posible registrar `template_variant_key` en `marketing_campaigns` y rotar. No urgent.
- **SMS fallback** para `payment_failed`: para usuarios paganos, un SMS reduce churn más que un mail. Requiere integrar Twilio.
