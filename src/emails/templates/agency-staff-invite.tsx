import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";

export type AgencyStaffInviteProps = {
  managerName: string;
  agencyName: string;
  inviteUrl: string;
  recipientEmail?: string;
  /** Invites are transactional — no unsubscribe link needed. */
  unsubscribeToken?: string;
};

export default function AgencyStaffInviteEmail({
  managerName,
  agencyName,
  inviteUrl,
  recipientEmail,
  unsubscribeToken,
}: AgencyStaffInviteProps) {
  return (
    <EmailLayout
      preheader={`${managerName} te invitó a unirte a ${agencyName} en BallersHub.`}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>Invitación · Staff</EmailEyebrow>
      <EmailHeading level={1}>Sumate a {agencyName}</EmailHeading>

      <EmailParagraph>
        <strong>{managerName}</strong> te invitó a formar parte del staff de la
        agencia <strong>{agencyName}</strong> en BallersHub.
      </EmailParagraph>

      <EmailParagraph tone="muted">
        Si ya tenés cuenta, te pedimos iniciar sesión para confirmar la
        vinculación. Si no, podés registrarte con este mismo email en menos
        de un minuto.
      </EmailParagraph>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={inviteUrl} variant="lime">
          Aceptar invitación
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="subtle">
        Si no esperabas esta invitación podés ignorarla — el enlace expira automáticamente.
      </EmailParagraph>
    </EmailLayout>
  );
}
