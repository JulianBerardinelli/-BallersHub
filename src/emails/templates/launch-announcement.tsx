import { Link, Section } from "@react-email/components";
import {
  EmailButton,
  EmailCard,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  emailColors,
  emailFonts,
} from "@/emails";

export type LaunchAnnouncementProps = {
  /** Headline. Defaults to a launch hero line — override for follow-ups. */
  headline?: string;
  /**
   * Lead paragraph. Defaults to a generic launch story. Override to
   * tailor the message per audience (jugadores vs agencias vs leads).
   */
  leadParagraph?: string;
  /** Primary CTA — usually a sign-up or login URL. */
  ctaPrimaryUrl: string;
  ctaPrimaryLabel?: string;
  /** Secondary path for agencies/managers. Hidden if URL is empty. */
  ctaAgencyUrl?: string;
  ctaAgencyLabel?: string;
  /** Optional closing line shown muted under the divider. */
  postscript?: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
  /** Inbox preview text. Falls back to a launch-flavored line. */
  preheader?: string;
};

/**
 * Launch-day broadcast template — designed for the FIRST email from
 * 'BallersHub to a user who may not know the brand yet. The layout
 * leans on three points of differentiation (Portfolio Pro, scouting
 * global, validación) rendered as branded surface cards.
 *
 * Defaults are written for the public launch ("Hoy lanzamos…"). To
 * reuse the template for a feature drop, override `headline` /
 * `leadParagraph` from the admin marketing wizard.
 */
export default function LaunchAnnouncementEmail({
  headline = "Llegó 'BallersHub",
  leadParagraph = "Hoy lanzamos la plataforma que estabamos construyendo: un directorio profesional de talento futbolístico. Portfolios validados, scouting global y datos verificados — todo en un solo lugar.",
  ctaPrimaryUrl,
  ctaPrimaryLabel = "Crear mi cuenta",
  ctaAgencyUrl,
  ctaAgencyLabel = "Soy agencia / manager",
  postscript,
  recipientEmail,
  unsubscribeToken,
  preheader = "Hoy lanzamos 'BallersHub. Tu próximo paso en el fútbol profesional empieza acá.",
}: LaunchAnnouncementProps) {
  const showAgencyCta = Boolean(ctaAgencyUrl);

  return (
    <EmailLayout
      preheader={preheader}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>Lanzamiento oficial</EmailEyebrow>
      <EmailHeading level={1}>{headline}</EmailHeading>

      <EmailParagraph>{leadParagraph}</EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailCard tone="lime">
        <EmailHeading level={3}>Portfolio Pro para jugadores</EmailHeading>
        <EmailParagraph tone="muted">
          Una página propia con tu trayectoria, posiciones, media en alta y
          datos validados — lista para mandarle a un club o agencia con un solo
          link.
        </EmailParagraph>
      </EmailCard>

      <EmailCard tone="neutral">
        <EmailHeading level={3}>Scouting global para agencias</EmailHeading>
        <EmailParagraph tone="muted">
          Centralizá tu cartera, sumá jugadores con un sistema de invitaciones
          formal y mostrá representaciones reales en cada portfolio.
        </EmailParagraph>
      </EmailCard>

      <EmailCard tone="blue">
        <EmailHeading level={3}>Datos verificados</EmailHeading>
        <EmailParagraph tone="muted">
          Cada trayectoria pasa por revisión. Cada agencia, por validación.
          Cuando alguien aparece en &apos;BallersHub, ya sabés que los datos están en serio.
        </EmailParagraph>
      </EmailCard>

      <Section style={{ marginTop: 12, marginBottom: 8 }}>
        <EmailButton href={ctaPrimaryUrl} variant="lime">
          {ctaPrimaryLabel}
        </EmailButton>
      </Section>

      {showAgencyCta ? (
        <EmailParagraph tone="muted">
          <Link href={ctaAgencyUrl} style={inlineLinkStyle}>
            {ctaAgencyLabel} →
          </Link>
        </EmailParagraph>
      ) : null}

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        {postscript ??
          "Cualquier duda sobre cómo arrancar, respondé este email — leemos cada uno."}
      </EmailParagraph>
    </EmailLayout>
  );
}

const inlineLinkStyle: React.CSSProperties = {
  fontFamily: emailFonts.body,
  color: emailColors.lime,
  textDecoration: "underline",
  fontWeight: 600,
};
