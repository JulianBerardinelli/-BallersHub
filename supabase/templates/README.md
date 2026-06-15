# Supabase Auth — plantillas de email branded

Los mails de **autenticación** (confirmar cuenta, reset de password, magic link, etc.)
los manda **Supabase Auth**, no Resend. Por eso su HTML **no vive en `src/emails/`**:
se configura en el **Dashboard de Supabase** (o vía `config.toml` si algún día se
adopta el CLI). Estos archivos son la **fuente de verdad versionada** de ese HTML.

El diseño espeja `src/emails/tokens.ts` + `EmailLayout` (el mismo design system que
los mails de `/admin/marketing`): fondo `#080808`, lime `#CCFF00`, wordmark
'BALLERSHUB, Barlow Condensed (headings) + DM Sans (body) con fallback a Helvetica/Arial.
Todo inline para compatibilidad con Gmail / Outlook / Apple Mail.

## Plantillas

Las cinco están generadas y listas para pegar:

| Archivo | Template en Supabase | Subject sugerido | Variables Go |
|---|---|---|---|
| `confirm-signup.html` | **Confirm signup** | `Confirmá tu cuenta en 'BallersHub` | `{{ .ConfirmationURL }}`, `{{ .SiteURL }}` |
| `reset-password.html` | **Reset Password** | `Restablecé tu contraseña de 'BallersHub` | `{{ .ConfirmationURL }}`, `{{ .SiteURL }}` |
| `magic-link.html` | **Magic Link** | `Tu enlace de acceso a 'BallersHub` | `{{ .ConfirmationURL }}`, `{{ .SiteURL }}` |
| `invite.html` | **Invite user** | `Te invitaron a 'BallersHub` | `{{ .ConfirmationURL }}`, `{{ .SiteURL }}` |
| `change-email.html` | **Change Email Address** | `Confirmá tu nuevo email en 'BallersHub` | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .SiteURL }}` |

> Los `.html` son **artefactos generados** — no editar a mano. Editar
> `build.mjs` (subject, copy, design tokens) y regenerar con:
> `node supabase/templates/build.mjs`.

## Cómo aplicarlas (Dashboard)

1. Entrar al proyecto Supabase de **producción** (`erdvpcfjynkhcrqktozd` — el que sirve `ballershub.co`).
2. **Authentication → Emails → \<template name\>**.
3. **Subject**: pegar el sugerido de la tabla de arriba.
4. **Message body**: pegar el contenido **completo** del `.html` correspondiente (reemplaza el default gris).
5. Guardar. Probar con un signup real (o **Send test email** si está disponible).
6. Repetir paso 2–5 para cada uno de los **5 templates**.
7. (Opcional) Repetir todo el ciclo en el branch de **dev** (`ciolizjshimyvyonlssq`) si testeás registros allí.

## Verificación post-deploy

Después de pegar los 5 en prod:

- [ ] Signup desde cero → llega `Confirm signup` con branding lime + logo.
- [ ] Pedir reset desde `/auth/forgot-password` → llega `Reset Password`.
- [ ] Pedir magic link desde `/auth/login` → llega `Magic Link`.
- [ ] Cambiar email en `/dashboard/settings` → llega `Change Email Address` al **nuevo** email.
- [ ] (Si hay flow de invite) Invitar desde admin → llega `Invite user` al destinatario.

Si alguno llega con el default gris de Supabase, **el paste no se guardó** —
volver al dashboard y reintentar.

## Por qué no hay link de baja

Estos son mails **transaccionales de auth**, no de marketing: no aplica
CAN-SPAM / GDPR unsubscribe. El footer usa la variante "si no fuiste vos,
ignoralo" en vez del desuscribite del `EmailFooter.tsx` de los mails React Email.
