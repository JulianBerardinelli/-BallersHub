import {
  EmailButton,
  EmailCard,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";

export type PlayerAgencyInviteProps = {
  managerName: string;
  agencyName: string;
  inviteUrl: string;
  /** Display string of the contract expiry, e.g. "30/06/2027". */
  contractEndDate: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
};

export default function PlayerAgencyInviteEmail({
  managerName,
  agencyName,
  inviteUrl,
  contractEndDate,
  recipientEmail,
  unsubscribeToken,
}: PlayerAgencyInviteProps) {
  return (
    <EmailLayout
      preheader={`${agencyName} te invitó a sumarte como representado.`}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>Invitación · Representación</EmailEyebrow>
      <EmailHeading level={1}>Te invitan desde {agencyName}</EmailHeading>

      <EmailParagraph>
        La agencia <strong>{agencyName}</strong> (representada por{" "}
        <strong>{managerName}</strong>) te invitó a sumarte a su cartera de
        futbolistas en BallersHub.
      </EmailParagraph>

      <EmailCard tone="lime">
        <EmailParagraph tone="muted">
          Vínculo de representación vigente hasta el{" "}
          <strong style={{ color: "#fff" }}>{contractEndDate}</strong>.
        </EmailParagraph>
      </EmailCard>

      <EmailParagraph tone="muted">
        Una vez que confirmes, tu portfolio público mostrará a {agencyName} como
        agencia representante. Podrás cancelar el vínculo en cualquier momento
        desde tu dashboard.
      </EmailParagraph>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={inviteUrl} variant="lime">
          Vincularme a la agencia
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="subtle">
        Si no esperabas esta invitación podés ignorarla — el enlace expira automáticamente.
      </EmailParagraph>
    </EmailLayout>
  );
}
