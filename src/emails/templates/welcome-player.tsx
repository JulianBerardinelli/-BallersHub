import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailStep,
} from "@/emails";

export type WelcomePlayerProps = {
  playerName: string;
  dashboardUrl: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
};

/**
 * Welcome flow for newly-registered players. Three concrete next steps
 * that map to the dashboard sections (datos personales → datos
 * futbolísticos → media), framed as "the path to publication".
 */
export default function WelcomePlayerEmail({
  playerName,
  dashboardUrl,
  recipientEmail,
  unsubscribeToken,
}: WelcomePlayerProps) {
  const firstName = (playerName || "").split(" ")[0] || playerName;

  return (
    <EmailLayout
      preheader={`${firstName}, así arrancás en BallersHub.`}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>Bienvenida</EmailEyebrow>
      <EmailHeading level={1}>Bienvenido, {firstName}</EmailHeading>

      <EmailParagraph>
        Diste el primer paso. Clubes, agencias y scouts buscan jugadores en BallersHub
        todos los días — para destacar, te recomendamos seguir esta hoja de ruta corta.
      </EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailStep index={1} title="Completá tus datos personales">
        Foto, nacionalidad, altura/peso, idiomas y datos de contacto. Es lo
        primero que se ve en tu perfil público.
      </EmailStep>

      <EmailStep index={2} title="Cargá tus datos futbolísticos" badge="Paso clave">
        Posiciones, pierna hábil, club actual y trayectoria. Mientras más completo
        esté, más fácil es que te encuentren con búsquedas específicas.
      </EmailStep>

      <EmailStep index={3} title="Subí media (foto + video)">
        Fotos en alta, video resumen y notas de prensa. Tu portfolio Pro toma
        vida cuando hay material: el branding lo armamos nosotros automáticamente.
      </EmailStep>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={dashboardUrl} variant="lime">
          Ir a mi dashboard
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        ¿Necesitás ayuda con algún paso? Respondé este email — leemos cada uno.
      </EmailParagraph>
    </EmailLayout>
  );
}
