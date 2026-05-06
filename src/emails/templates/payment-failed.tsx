import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";

export type PaymentFailedProps = {
  displayName: string;
  planId: "pro-player" | "pro-agency";
  formattedAmount: string;
  /** ISO date for when the next retry will hit (Stripe handles retries). */
  nextRetryAt: string | null;
  /** Where to update the payment method (Stripe portal URL or settings). */
  updatePaymentUrl: string;
  recipientEmail?: string;
};

/**
 * Sent when a renewal invoice fails (insufficient funds, expired card,
 * etc.). Stripe retries 4× over 3 weeks by default; this email gives the
 * user a direct path to fix payment before access lapses.
 */
export default function PaymentFailedEmail({
  displayName,
  planId,
  formattedAmount,
  nextRetryAt,
  updatePaymentUrl,
  recipientEmail,
}: PaymentFailedProps) {
  const firstName = (displayName || "").split(" ")[0] || displayName;
  const planLabel =
    planId === "pro-agency" ? "BallersHub Pro Agency" : "BallersHub Pro Player";
  const retryLine = nextRetryAt
    ? `Vamos a intentarlo de nuevo el ${formatDate(nextRetryAt)}.`
    : "Vamos a reintentar el cargo en los próximos días.";

  return (
    <EmailLayout
      preheader={`${firstName}, no pudimos cobrar tu suscripción.`}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>Cobro pendiente</EmailEyebrow>
      <EmailHeading level={1}>{firstName}, hay un problema con el pago</EmailHeading>

      <EmailParagraph>
        Intentamos renovar tu suscripción a <strong>{planLabel}</strong> por{" "}
        <strong>{formattedAmount}</strong> pero el cobro no pudo completarse.{" "}
        {retryLine} Mientras tanto, tu acceso queda en estado pendiente.
      </EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailParagraph>
        Lo más probable: la tarjeta venció, no tenía fondos suficientes o el
        banco bloqueó el cobro. Actualizar el método de pago lleva menos de un
        minuto.
      </EmailParagraph>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={updatePaymentUrl} variant="lime">
          Actualizar método de pago
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        ¿Algo no cuadra? Respondé este email y revisamos la cuenta con vos.
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
