import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailLinkInline,
  EmailParagraph,
} from "@/emails";

export type LeadWelcomeProps = {
  /** Display name of the player whose portfolio captured the lead. */
  playerName: string;
  /** Public URL of the portfolio they were viewing. */
  portfolioUrl: string;
  /** URL to create an account (so they can browse + save). */
  signUpUrl: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
};

/**
 * First touch for visitors that left their email on a public portfolio
 * (lead capture flow). Soft pitch: thanks them, sets expectation
 * ("te vamos a avisar de nuevos perfiles"), and offers the upgrade path
 * to a real account.
 */
export default function LeadWelcomeEmail({
  playerName,
  portfolioUrl,
  signUpUrl,
  recipientEmail,
  unsubscribeToken,
}: LeadWelcomeProps) {
  const firstName = (playerName || "").split(" ")[0] || playerName;

  return (
    <EmailLayout
      preheader={`Te avisamos cuando aparezcan nuevos perfiles como el de ${firstName}.`}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>Acceso desbloqueado</EmailEyebrow>
      <EmailHeading level={1}>Gracias por sumarte</EmailHeading>

      <EmailParagraph>
        Dejaste tu email para ver los datos de contacto de{" "}
        <EmailLinkInline href={portfolioUrl}>{playerName}</EmailLinkInline>. Listo —
        ahora ves los canales completos en el portfolio cada vez que vuelvas.
      </EmailParagraph>

      <EmailParagraph tone="muted">
        Te vamos a avisar cuando se sumen perfiles nuevos relevantes para vos.
        Sin spam: 1 email cada dos semanas como máximo, y siempre con jugadores reales.
      </EmailParagraph>

      <EmailDivider tone="subtle" spacing={24} />

      <EmailHeading level={3}>¿Querés más control?</EmailHeading>
      <EmailParagraph tone="muted">
        Crea una cuenta gratis para guardar perfiles favoritos, recibir alertas
        personalizadas por posición y país, y desbloquear contactos sin volver
        a llenar formularios.
      </EmailParagraph>

      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <EmailButton href={signUpUrl} variant="lime">
          Crear mi cuenta gratis
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="subtle">
        ¿Sos jugador o representás una agencia? También podés{" "}
        <EmailLinkInline href={signUpUrl} tone="subtle">
          crear tu propio perfil profesional
        </EmailLinkInline>{" "}
        en BallersHub.
      </EmailParagraph>
    </EmailLayout>
  );
}
