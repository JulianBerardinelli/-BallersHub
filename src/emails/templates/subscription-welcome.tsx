import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailStep,
} from "@/emails";

export type SubscriptionWelcomeProps = {
  /** Display name shown in the greeting; falls back to email handle. */
  displayName: string;
  /** Plan id from the pricing matrix (e.g. "pro-player", "pro-agency"). */
  planId: "pro-player" | "pro-agency";
  /** Formatted amount with currency suffix (e.g. "USD 85", "ARS 131.999"). */
  formattedAmount: string;
  /** ISO date string when the trial ends; null if there is no trial. */
  trialEndsAt: string | null;
  /** ISO date string when the next charge will hit (post-trial). */
  nextChargeAt: string | null;
  /** Where to send the user — defaults to /dashboard. */
  dashboardUrl: string;
  /** Where to manage the subscription. */
  manageSubscriptionUrl: string;
  recipientEmail?: string;
};

/**
 * Sent immediately after a successful checkout (Stripe or MP). Confirms
 * the trial period, amount, and next charge date — and routes the user
 * back into the product.
 */
export default function SubscriptionWelcomeEmail({
  displayName,
  planId,
  formattedAmount,
  trialEndsAt,
  nextChargeAt,
  dashboardUrl,
  manageSubscriptionUrl,
  recipientEmail,
}: SubscriptionWelcomeProps) {
  const firstName = (displayName || "").split(" ")[0] || displayName;
  const planLabel =
    planId === "pro-agency" ? "BallersHub Pro Agency" : "BallersHub Pro Player";
  const trialLine = trialEndsAt
    ? `Tu prueba gratuita corre hasta el ${formatDate(trialEndsAt)}. Si no cancelás antes, te cobramos automáticamente ${formattedAmount}.`
    : `Tu suscripción anual a ${planLabel} ya está activa por ${formattedAmount}.`;
  const nextChargeLine = nextChargeAt
    ? `Próximo cargo: ${formatDate(nextChargeAt)}.`
    : null;

  return (
    <EmailLayout
      preheader={`${firstName}, tu plan ${planLabel} ya está activo.`}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>Suscripción confirmada</EmailEyebrow>
      <EmailHeading level={1}>iListo, {firstName}!</EmailHeading>

      <EmailParagraph>
        Tu plan <strong>{planLabel}</strong> quedó activo. {trialLine}
        {nextChargeLine ? ` ${nextChargeLine}` : ""}
      </EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailStep index={1} title="Aprovechá los próximos días">
        Tenés acceso completo a todas las funcionalidades Pro durante este período.
        Subí material, completá tu perfil y dejalo listo para destacar.
      </EmailStep>

      <EmailStep index={2} title="Gestioná tu cuenta cuando quieras" badge="Self-service">
        Desde Configuración → Suscripción podés ver tu estado, descargar facturas y
        cancelar si necesitás. Sin llamadas, sin trámites.
      </EmailStep>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={dashboardUrl} variant="lime">
          Ir a mi dashboard
        </EmailButton>
      </div>

      <div style={{ marginTop: 12, marginBottom: 8 }}>
        <EmailButton href={manageSubscriptionUrl} variant="outline">
          Gestionar suscripción
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        ¿Tenés alguna duda con la facturación? Respondé este email y te ayudamos.
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
