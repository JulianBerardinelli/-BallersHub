import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailStep,
} from "@/emails";

export type WelcomeAgencyProps = {
  managerName: string;
  dashboardUrl: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
};

/**
 * Welcome flow for agencies/managers. Three steps mapped to their
 * dashboard: agency setup → import roster → publish portfolios.
 */
export default function WelcomeAgencyEmail({
  managerName,
  dashboardUrl,
  recipientEmail,
  unsubscribeToken,
}: WelcomeAgencyProps) {
  const firstName = (managerName || "").split(" ")[0] || managerName;

  return (
    <EmailLayout
      preheader={`${firstName}, organizá tu cartera en BallersHub.`}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>Bienvenida — Agencia</EmailEyebrow>
      <EmailHeading level={1}>Hola {firstName}</EmailHeading>

      <EmailParagraph>
        BallersHub es tu directorio de talento. Acá centralizás scouting, gestionás
        a tus representados y publicás portfolios profesionales con un nivel de
        terminación de élite. Estos tres pasos son tu setup inicial.
      </EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailStep index={1} title="Configurá tu agencia">
        Subí logo corporativo, completá biografía y datos de contacto. Es el
        primer toque que ven los jugadores cuando los invitás.
      </EmailStep>

      <EmailStep index={2} title="Sumá a tus jugadores" badge="Paso clave">
        Usá el sistema de invitaciones para vincular formalmente a cada futbolista.
        Una vez vinculados, su portfolio público muestra tu agencia como representante.
      </EmailStep>

      <EmailStep index={3} title="Publicá portfolios profesionales">
        Cada perfil aprobado se renderiza con el layout Pro de BallersHub —
        animaciones, datos validados y media en alta. Listos para mandar a clubes.
      </EmailStep>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={dashboardUrl} variant="lime">
          Ir a mi panel
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        Cualquier pregunta, respondé este email y te orientamos.
      </EmailParagraph>
    </EmailLayout>
  );
}
