import { Section } from "@react-email/components";
import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailStep,
} from "@/emails";

export type ReEngagementProps = {
  /**
   * Headline. Defaults to a generic "we miss you" line. Override for
   * specific re-engagement waves (post-launch, end-of-season, etc).
   */
  headline?: string;
  /**
   * Optional lead paragraph. If omitted, a default copy explaining the
   * platform-wide context renders.
   */
  leadParagraph?: string;
  /** CTA destination — usually `/dashboard` or `/onboarding`. */
  ctaUrl: string;
  ctaLabel?: string;
  /** Closing line under the divider. */
  postscript?: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
  preheader?: string;
};

/**
 * Re-engagement broadcast — designed for users who signed up but never
 * finished onboarding (or who haven't logged in for a while). Three
 * numbered reasons to come back, anchored by a single CTA pointing
 * back into the funnel.
 *
 * This is the marketing-classified counterpart to the transactional
 * `profile_completion` drip: profile_completion fires automatically
 * from the drip engine when a user remains incomplete; re_engagement
 * is for ad-hoc admin-driven waves.
 */
export default function ReEngagementEmail({
  headline = "Tu perfil te está esperando",
  leadParagraph,
  ctaUrl,
  ctaLabel = "Continuar mi perfil",
  postscript,
  recipientEmail,
  unsubscribeToken,
  preheader = "Te registraste pero todavía no terminaste — te contamos qué te estás perdiendo.",
}: ReEngagementProps) {
  return (
    <EmailLayout
      preheader={preheader}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>Volvé a la cancha</EmailEyebrow>
      <EmailHeading level={1}>{headline}</EmailHeading>

      <EmailParagraph>
        {leadParagraph ??
          "Te registraste en 'BallersHub pero todavía no completaste tu perfil. Acá tenés tres motivos para retomar ahora — el mercado de pases se mueve y cada semana cuenta."}
      </EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailStep index={1} title="Quedás visible para clubes y agencias">
        Cada portfolio aprobado entra en el directorio público y aparece en
        Google. Un perfil incompleto no se indexa — y nadie te encuentra.
      </EmailStep>

      <EmailStep index={2} title="Validación profesional incluida" badge="Sin costo">
        El proceso de KYC + revisión de trayectoria es gratis. Una vez
        validado, cada dato de tu perfil suma confianza cuando lo mira un
        scout.
      </EmailStep>

      <EmailStep index={3} title="Te toma menos de lo que pensás">
        El onboarding es de tres pasos. La mayoría lo termina en menos de 15
        minutos — y el resto es subir media cuando puedas.
      </EmailStep>

      <Section style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={ctaUrl} variant="lime">
          {ctaLabel}
        </EmailButton>
      </Section>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        {postscript ??
          "¿Quedaste trabado en algún paso? Respondé este email y te orientamos — leemos cada uno."}
      </EmailParagraph>
    </EmailLayout>
  );
}
