import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailStep,
} from "@/emails";

export type CompGrantWelcomeProps = {
  /** Display name shown in the greeting; falls back to email handle. */
  displayName: string;
  /** Plan id from the pricing matrix. */
  planId: "pro-player" | "pro-agency";
  /** ISO date when the comp expires; null = permanent. */
  expiresAt: string | null;
  /** Whether this is the first grant for this user, or an extension. */
  variant: "grant" | "extend";
  /** Where to send the user. */
  dashboardUrl: string;
  manageSubscriptionUrl: string;
  recipientEmail?: string;
};

/**
 * Sent when an admin grants Pro access without payment (cuenta de cortesía)
 * or extends an existing comp. The copy avoids billing language since
 * there's no charge involved — this is a gift from the team.
 */
export default function CompGrantWelcomeEmail({
  displayName,
  planId,
  expiresAt,
  variant,
  dashboardUrl,
  manageSubscriptionUrl,
  recipientEmail,
}: CompGrantWelcomeProps) {
  const firstName = (displayName || "").split(" ")[0] || displayName;
  const planLabel =
    planId === "pro-agency" ? "BallersHub Pro Agency" : "BallersHub Pro Player";

  const expiryLine = expiresAt
    ? `Tu acceso es válido hasta el ${formatDate(expiresAt)}.`
    : "Tu acceso es permanente — sin fecha de vencimiento.";

  const heading = variant === "extend"
    ? `Extendimos tu acceso, ${firstName}`
    : `Activamos tu acceso, ${firstName}`;

  const intro = variant === "extend"
    ? `El equipo de BallersHub extendió tu cuenta de cortesía a ${planLabel}.`
    : `El equipo de BallersHub te activó una cuenta de cortesía a ${planLabel} — sin cargo.`;

  return (
    <EmailLayout
      preheader={`${firstName}, tu acceso a ${planLabel} ya está activo.`}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>Cuenta de cortesía</EmailEyebrow>
      <EmailHeading level={1}>{heading}</EmailHeading>

      <EmailParagraph>
        {intro} {expiryLine}
      </EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailStep index={1} title="Tenés todas las features Pro disponibles">
        Plantilla Pro Athlete, valoraciones, palmarés, valor de mercado, scouting analítico,
        galería catálogo y más. Aprovechalas para destacar tu perfil.
      </EmailStep>

      <EmailStep index={2} title="No hay tarjeta ni facturación involucrada" badge="Sin cargo">
        Esta cuenta está gestionada directamente por el equipo de BallersHub. No vas a recibir
        cobros ni necesitás registrar un método de pago.
      </EmailStep>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={dashboardUrl} variant="lime">
          Ir a mi dashboard
        </EmailButton>
      </div>

      <div style={{ marginTop: 12, marginBottom: 8 }}>
        <EmailButton href={manageSubscriptionUrl} variant="outline">
          Ver mi suscripción
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        ¿Dudas o problemas? Respondé este email y te ayudamos.
      </EmailParagraph>
    </EmailLayout>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
