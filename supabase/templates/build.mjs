/**
 * Generador de las plantillas de email de Supabase Auth — 'BallersHub.
 *
 *   node supabase/templates/build.mjs
 *
 * Define UNA sola vez el "shell" branded (espeja src/emails/tokens.ts +
 * EmailLayout) y escupe un .html por cada template de auth. Los .html son
 * artefactos GENERADOS — no editar a mano; editar acá y regenerar.
 *
 * Cada .html se pega en Supabase → Authentication → Emails → <template>.
 * Ver README.md para el paso a paso.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));

// ── Design tokens (mirror de src/emails/tokens.ts) ────────────────────────
const FONT_DISPLAY = "'Barlow Condensed','Helvetica Neue',Helvetica,Arial,sans-serif";
const FONT_BODY = "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const C = {
  bg: "#080808", lime: "#CCFF00", limeHover: "#d8ff26",
  fg1: "#FFFFFF", fg2: "#B5B5B5", fg3: "#6B6B6B", fg4: "#393939",
  borderSubtle: "#171717",
};
const B = "&#39;BallersHub"; // brand con apóstrofo inicial, HTML-safe
const SUPPORT_EMAIL = "info@ballershub.co";

// ── Estilos inline reutilizables ──────────────────────────────────────────
const S = {
  eyebrow: `margin:0 0 8px 0; font-family:${FONT_BODY}; font-size:10px; font-weight:800; line-height:1.2; color:${C.lime}; text-transform:uppercase; letter-spacing:0.32em;`,
  h1: `margin:0 0 12px 0; font-family:${FONT_DISPLAY}; font-size:32px; font-weight:900; line-height:1.05; letter-spacing:-0.005em; color:${C.fg1}; text-transform:uppercase;`,
  p: `margin:0 0 16px 0; font-family:${FONT_BODY}; font-size:14px; line-height:1.6; color:${C.fg1};`,
  pMuted: `margin:0 0 6px 0; font-family:${FONT_BODY}; font-size:13px; line-height:1.55; color:${C.fg2};`,
  fallbackWrap: `margin:0 0 8px 0; font-family:${FONT_BODY}; font-size:12px; line-height:1.5; word-break:break-all;`,
  fallbackLink: `color:${C.lime}; text-decoration:underline;`,
  ctaCell: `border-radius:8px;`,
  cta: `display:inline-block; font-family:${FONT_BODY}; font-size:13px; font-weight:700; line-height:1.2; text-transform:uppercase; letter-spacing:0.08em; color:${C.bg}; background-color:${C.lime}; border:1px solid ${C.lime}; border-radius:8px; padding:13px 26px;`,
  footNote: `margin:0 0 12px 0; font-family:${FONT_BODY}; font-size:12px; line-height:1.55; color:${C.fg2};`,
  footSupport: `margin:0 0 8px 0; font-family:${FONT_BODY}; font-size:11px; line-height:1.55; color:${C.fg3};`,
  footSupportLink: `color:${C.fg2}; text-decoration:underline;`,
  legal: `margin:16px 0 0 0; font-family:${FONT_BODY}; font-size:11px; line-height:1.55; color:${C.fg4}; text-transform:uppercase; letter-spacing:0.08em;`,
};

const YEAR = 2026;
const CONFIRM = "{{ .ConfirmationURL }}";

function shell(t) {
  const paras = t.bodyParas.map((p) => `<p style="${S.p}">${p}</p>`).join("\n              ");
  return `<!--
  'BallersHub — Supabase Auth email: "${t.supabaseTemplate}"
  ============================================================================
  ARCHIVO GENERADO por supabase/templates/build.mjs — NO editar a mano.
  Pegá esto en: Supabase Dashboard → Authentication → Emails → "${t.supabaseTemplate}".
  Asunto sugerido: «${t.subject}»
  Variables Go usadas: ${t.vars.join(", ")}
  ============================================================================
-->
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark light">
  <title>${t.titleText} · 'BallersHub</title>
  <!--[if mso]>
  <style>
    table { border-collapse: collapse; border-spacing: 0; margin: 0; }
    div, td, a, span { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    .bh-preheader { display:none !important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; }
    a { text-decoration: none; }
    .bh-cta:hover { background-color:${C.limeHover} !important; }
    @media only screen and (max-width:600px) {
      .bh-h1 { font-size:28px !important; }
      .bh-pad { padding-left:20px !important; padding-right:20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; width:100%; background-color:${C.bg}; color:${C.fg1}; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; font-family:${FONT_BODY};">

  <span class="bh-preheader">${t.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.bg};">
    <tr>
      <td align="center" style="padding:24px;">

        <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; margin:0 auto; background-color:${C.bg};">

          <!-- ===== Header / wordmark ===== -->
          <tr>
            <td class="bh-pad" style="padding:8px 0 28px;">
              <a href="{{ .SiteURL }}" style="display:inline-block; text-decoration:none;">
                <img src="{{ .SiteURL }}/images/logo/imagotipo-lime.png" alt="&#39;BallersHub" width="200" height="32" style="display:block; border:0;">
              </a>
            </td>
          </tr>

          <!-- ===== Content ===== -->
          <tr>
            <td class="bh-pad" style="padding:8px 0 0;">

              <p style="${S.eyebrow}">${t.eyebrow}</p>
              <h1 class="bh-h1" style="${S.h1}">${t.heading}</h1>
              ${paras}

              <!-- ===== CTA ===== -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
                <tr>
                  <td bgcolor="${C.lime}" style="${S.ctaCell}">
                    <a class="bh-cta" href="${CONFIRM}" target="_blank" style="${S.cta}">${t.ctaLabel}</a>
                  </td>
                </tr>
              </table>

              <p style="${S.pMuted}">¿No funciona el botón? Copiá y pegá este enlace en tu navegador:</p>
              <p style="${S.fallbackWrap}"><a href="${CONFIRM}" target="_blank" style="${S.fallbackLink}">${CONFIRM}</a></p>

              <!-- ===== Footer ===== -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:32px 0 8px;">
                    <hr style="border:0; border-top:1px solid ${C.borderSubtle}; margin:0 0 24px 0;">
                    <p style="${S.footNote}">${t.footerNote}</p>
                    <p style="${S.footSupport}">¿Dudas? Escribinos a <a href="mailto:${SUPPORT_EMAIL}" style="${S.footSupportLink}">${SUPPORT_EMAIL}</a>.</p>
                    <p style="${S.legal}">© ${YEAR} ${B}. Todos los derechos reservados.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->

      </td>
    </tr>
  </table>

</body>
</html>
`;
}

// ── Contenido por template ────────────────────────────────────────────────
const templates = [
  {
    file: "confirm-signup.html",
    supabaseTemplate: "Confirm signup",
    subject: "Confirmá tu cuenta en 'BallersHub",
    titleText: "Confirmá tu cuenta",
    preheader: "Estás a un clic de activar tu cuenta en 'BallersHub.",
    vars: [CONFIRM, "{{ .SiteURL }}"],
    eyebrow: "Bienvenida",
    heading: "Confirmá tu cuenta",
    bodyParas: [
      `¡Te damos la bienvenida a ${B}! Estás a un paso de empezar. Confirmá tu email para activar tu cuenta y arrancar a armar tu perfil — clubes, agencias y scouts buscan talento en la plataforma todos los días.`,
    ],
    ctaLabel: "Confirmar mi cuenta",
    footerNote: `Si no creaste una cuenta en ${B}, podés ignorar este mail con tranquilidad — no se activará ninguna cuenta.`,
  },
  {
    file: "reset-password.html",
    supabaseTemplate: "Reset Password",
    subject: "Restablecé tu contraseña de 'BallersHub",
    titleText: "Restablecé tu contraseña",
    preheader: "Elegí una nueva contraseña para tu cuenta de 'BallersHub.",
    vars: [CONFIRM, "{{ .SiteURL }}"],
    eyebrow: "Seguridad",
    heading: "Restablecé tu contraseña",
    bodyParas: [
      "Recibimos un pedido para restablecer la contraseña de tu cuenta. Hacé clic en el botón para elegir una nueva. Por seguridad, el enlace vence en una hora.",
    ],
    ctaLabel: "Crear nueva contraseña",
    footerNote:
      "Si no pediste esto, ignorá este mail — tu contraseña actual sigue funcionando y tu cuenta está segura.",
  },
  {
    file: "magic-link.html",
    supabaseTemplate: "Magic Link",
    subject: "Tu enlace de acceso a 'BallersHub",
    titleText: "Tu enlace de acceso",
    preheader: "Entrá a 'BallersHub con este enlace, sin contraseña.",
    vars: [CONFIRM, "{{ .SiteURL }}"],
    eyebrow: "Acceso",
    heading: "Tu enlace de acceso",
    bodyParas: [
      `Usá este enlace para entrar a ${B} sin contraseña. Vence en poco tiempo y solo se puede usar una vez.`,
    ],
    ctaLabel: "Entrar a 'BallersHub".replace("'", "&#39;"),
    footerNote:
      "Si no pediste este enlace, ignorá este mail — nadie puede entrar a tu cuenta sin él.",
  },
  {
    file: "invite.html",
    supabaseTemplate: "Invite user",
    subject: "Te invitaron a 'BallersHub",
    titleText: "Te invitaron",
    preheader: "Aceptá tu invitación y creá tu cuenta en 'BallersHub.",
    vars: [CONFIRM, "{{ .SiteURL }}"],
    eyebrow: "Invitación",
    heading: `Te invitaron a ${B}`,
    bodyParas: [
      `Alguien te invitó a sumarte a ${B}. Aceptá la invitación para crear tu cuenta y empezar a usar la plataforma.`,
    ],
    ctaLabel: "Aceptar invitación",
    footerNote: "Si no esperabas esta invitación, podés ignorar este mail.",
  },
  {
    file: "change-email.html",
    supabaseTemplate: "Change Email Address",
    subject: "Confirmá tu nuevo email en 'BallersHub",
    titleText: "Confirmá tu nuevo email",
    preheader: "Confirmá el cambio de email de tu cuenta de 'BallersHub.",
    vars: [CONFIRM, "{{ .Email }}", "{{ .NewEmail }}", "{{ .SiteURL }}"],
    eyebrow: "Seguridad",
    heading: "Confirmá tu nuevo email",
    bodyParas: [
      `Recibimos un pedido para cambiar el email de tu cuenta a <strong style="color:${C.fg1};">{{ .NewEmail }}</strong>. Confirmá para aplicar el cambio.`,
    ],
    ctaLabel: "Confirmar nuevo email",
    footerNote:
      "Si no pediste este cambio, ignorá este mail y tu email actual seguirá igual.",
  },
];

for (const t of templates) {
  writeFileSync(join(OUT_DIR, t.file), shell(t), "utf8");
  console.log("✓", t.file, `(${t.supabaseTemplate})`);
}
console.log(`\n${templates.length} plantillas generadas en supabase/templates/`);
