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

| Archivo | Template de Supabase | Variables Go |
|---|---|---|
| `confirm-signup.html` | **Confirm signup** | `{{ .ConfirmationURL }}`, `{{ .SiteURL }}` |

> Faltan (mismo shell, copy distinto): _Reset password_, _Magic Link_,
> _Invite user_, _Change email_. Pedírselas a Claude y se generan en minutos.

## Cómo aplicarla (Dashboard)

1. Supabase → proyecto de **producción** (el que sirve `ballershub.co`).
2. **Authentication → Emails → "Confirm signup"**.
3. **Subject** sugerido: `Confirmá tu cuenta en 'BallersHub`
4. **Message body**: pegar el contenido completo de `confirm-signup.html` (reemplaza el default gris).
5. Guardar. Probar con un signup real (o **Send test email** si está disponible).
6. (Opcional) Repetir en el branch de **dev** si testeás registros ahí.

> Nota: las variables `{{ .ConfirmationURL }}` / `{{ .SiteURL }}` las completa Supabase
> al enviar. En un preview local se ven literales — es esperado.

## Por qué no hay link de baja

Es un mail **transaccional de auth**, no de marketing: no aplica CAN-SPAM/GDPR
unsubscribe. El footer usa la variante "si no fuiste vos, ignoralo" en vez del
desuscribite de `EmailFooter.tsx`.
