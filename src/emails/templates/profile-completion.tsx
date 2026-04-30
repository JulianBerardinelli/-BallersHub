import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailStep,
} from "@/emails";

export type ProfileCompletionProps = {
  firstName: string;
  /** Direct URL to /dashboard/edit-profile/personal-data */
  dashboardUrl: string;
  /**
   * Optional missing-section count surfaced from `task-context` —
   * if you pass `missingSections=4`, the email leads with that.
   */
  missingSections?: number;
  recipientEmail?: string;
  unsubscribeToken?: string;
};

/**
 * Reactivation email for users that registered but never completed
 * their profile. Sent at day 3 / 7 / 14 of the post-signup drip.
 *
 * Tone: friendly nudge, never guilt-trip. Concrete value prop ("clubes
 * te encuentran cuando…"), short list of what's missing, single CTA.
 */
export default function ProfileCompletionEmail({
  firstName,
  dashboardUrl,
  missingSections,
  recipientEmail,
  unsubscribeToken,
}: ProfileCompletionProps) {
  const intro =
    typeof missingSections === "number" && missingSections > 0
      ? `Te quedan ${missingSections} secciones por completar para publicar tu perfil.`
      : "Te falta poco para publicar tu perfil profesional.";

  return (
    <EmailLayout
      preheader={intro}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>A un paso de publicar</EmailEyebrow>
      <EmailHeading level={1}>{firstName}, te falta poco</EmailHeading>

      <EmailParagraph>{intro}</EmailParagraph>

      <EmailParagraph tone="muted">
        Los perfiles completos reciben hasta 5× más visitas de scouts y agencias
        — y cuando alguien busca por posición o liga, los incompletos no aparecen
        en los resultados. Es la diferencia entre estar visible o no.
      </EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailStep index={1} title="Datos personales y contacto">
        Foto, nacionalidad y datos básicos. Toma 2 minutos.
      </EmailStep>

      <EmailStep index={2} title="Datos futbolísticos" badge="Importante">
        Posiciones, club actual, trayectoria. Es lo primero que mira un scout.
      </EmailStep>

      <EmailStep index={3} title="Subí media">
        Fotos en alta y video resumen. El portfolio Pro toma vida con material.
      </EmailStep>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={dashboardUrl} variant="lime">
          Completar mi perfil
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        Si necesitás ayuda para completar alguna sección, respondé este email
        y te orientamos.
      </EmailParagraph>
    </EmailLayout>
  );
}
