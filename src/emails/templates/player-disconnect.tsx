import {
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";

export type PlayerDisconnectProps = {
  playerName: string;
  agencyName: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
};

/**
 * Notification to an agency when a player unilaterally cancels their
 * representation link. Strictly transactional — no CTA, just info.
 */
export default function PlayerDisconnectEmail({
  playerName,
  agencyName,
  recipientEmail,
  unsubscribeToken,
}: PlayerDisconnectProps) {
  return (
    <EmailLayout
      preheader={`${playerName} canceló la representación con ${agencyName}.`}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>Notificación · Desvinculación</EmailEyebrow>
      <EmailHeading level={2}>Cambio en tu roster</EmailHeading>

      <EmailParagraph>
        El jugador <strong>{playerName}</strong> canceló su vinculación con la
        agencia <strong>{agencyName}</strong> en BallersHub.
      </EmailParagraph>

      <EmailParagraph tone="muted">
        El cambio ya está aplicado: el portfolio público del jugador ya no
        muestra a {agencyName} como representante, y dejó de aparecer en tu
        directorio de roster.
      </EmailParagraph>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="subtle">
        Si pensás que esto es un error, contactá a tu jugador directamente.
        Las desvinculaciones son acciones del titular del perfil y no las
        gestiona BallersHub.
      </EmailParagraph>
    </EmailLayout>
  );
}
