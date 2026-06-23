import type { ReactNode } from "react";
import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  formatEmailDate,
} from "@/emails";
import type { Locale } from "@/i18n/routing";

export type PaymentFailedProps = {
  displayName: string;
  planId: "pro-player" | "pro-agency" | "pro-coach";
  formattedAmount: string;
  /** ISO date for when the next retry will hit (Stripe handles retries). */
  nextRetryAt: string | null;
  /** Where to update the payment method (Stripe portal URL or settings). */
  updatePaymentUrl: string;
  recipientEmail?: string;
  /** Recipient's preferred_locale (F6). Defaults to es. */
  locale?: Locale;
};

type Copy = {
  eyebrow: string;
  heading: (name: string) => string;
  preheader: (name: string) => string;
  body: (plan: string, amount: string, retryLine: string) => ReactNode;
  retryLine: (date: string) => string;
  retryLineSoon: string;
  reason: string;
  cta: string;
  help: string;
};

const COPY: Record<Locale, Copy> = {
  es: {
    eyebrow: "Cobro pendiente",
    heading: (n) => `${n}, hay un problema con el pago`,
    preheader: (n) => `${n}, no pudimos cobrar tu suscripción.`,
    body: (plan, amount, retry) => (
      <>
        Intentamos renovar tu suscripción a <strong>{plan}</strong> por{" "}
        <strong>{amount}</strong> pero el cobro no pudo completarse. {retry}{" "}
        Mientras tanto, tu acceso queda en estado pendiente.
      </>
    ),
    retryLine: (d) => `Vamos a intentarlo de nuevo el ${d}.`,
    retryLineSoon: "Vamos a reintentar el cargo en los próximos días.",
    reason:
      "Lo más probable: la tarjeta venció, no tenía fondos suficientes o el banco bloqueó el cobro. Actualizar el método de pago lleva menos de un minuto.",
    cta: "Actualizar método de pago",
    help: "¿Algo no cuadra? Respondé este email y revisamos la cuenta con vos.",
  },
  en: {
    eyebrow: "Payment pending",
    heading: (n) => `${n}, there's a problem with your payment`,
    preheader: (n) => `${n}, we couldn't charge your subscription.`,
    body: (plan, amount, retry) => (
      <>
        We tried to renew your subscription to <strong>{plan}</strong> for{" "}
        <strong>{amount}</strong> but the charge couldn&apos;t be completed.{" "}
        {retry} In the meantime, your access is on hold.
      </>
    ),
    retryLine: (d) => `We'll try again on ${d}.`,
    retryLineSoon: "We'll retry the charge in the next few days.",
    reason:
      "Most likely: the card expired, had insufficient funds or the bank blocked the charge. Updating your payment method takes less than a minute.",
    cta: "Update payment method",
    help: "Something doesn't add up? Reply to this email and we'll review the account with you.",
  },
  it: {
    eyebrow: "Pagamento in sospeso",
    heading: (n) => `${n}, c'è un problema con il pagamento`,
    preheader: (n) => `${n}, non siamo riusciti ad addebitare il tuo abbonamento.`,
    body: (plan, amount, retry) => (
      <>
        Abbiamo provato a rinnovare il tuo abbonamento a <strong>{plan}</strong>{" "}
        per <strong>{amount}</strong> ma l&apos;addebito non è andato a buon fine.{" "}
        {retry} Nel frattempo, il tuo accesso resta in sospeso.
      </>
    ),
    retryLine: (d) => `Ci riproveremo il ${d}.`,
    retryLineSoon: "Riproveremo l'addebito nei prossimi giorni.",
    reason:
      "Molto probabilmente: la carta è scaduta, non aveva fondi sufficienti o la banca ha bloccato l'addebito. Aggiornare il metodo di pagamento richiede meno di un minuto.",
    cta: "Aggiorna metodo di pagamento",
    help: "Qualcosa non torna? Rispondi a questa email e controlliamo l'account insieme.",
  },
  pt: {
    eyebrow: "Cobrança pendente",
    heading: (n) => `${n}, há um problema com o pagamento`,
    preheader: (n) => `${n}, não conseguimos cobrar sua assinatura.`,
    body: (plan, amount, retry) => (
      <>
        Tentamos renovar sua assinatura do <strong>{plan}</strong> por{" "}
        <strong>{amount}</strong> mas a cobrança não pôde ser concluída. {retry}{" "}
        Enquanto isso, seu acesso fica pendente.
      </>
    ),
    retryLine: (d) => `Vamos tentar novamente em ${d}.`,
    retryLineSoon: "Vamos tentar a cobrança novamente nos próximos dias.",
    reason:
      "O mais provável: o cartão venceu, não tinha saldo suficiente ou o banco bloqueou a cobrança. Atualizar o método de pagamento leva menos de um minuto.",
    cta: "Atualizar método de pagamento",
    help: "Algo não está certo? Responda este e-mail e revisamos a conta com você.",
  },
  de: {
    eyebrow: "Zahlung ausstehend",
    heading: (n) => `${n}, es gibt ein Problem mit der Zahlung`,
    preheader: (n) => `${n}, wir konnten Ihr Abonnement nicht abbuchen.`,
    body: (plan, amount, retry) => (
      <>
        Wir haben versucht, Ihr Abonnement für <strong>{plan}</strong> in Höhe von{" "}
        <strong>{amount}</strong> zu verlängern, aber die Abbuchung konnte nicht
        abgeschlossen werden. {retry} In der Zwischenzeit ist Ihr Zugang ausgesetzt.
      </>
    ),
    retryLine: (d) => `Wir versuchen es am ${d} erneut.`,
    retryLineSoon: "Wir werden die Abbuchung in den nächsten Tagen erneut versuchen.",
    reason:
      "Am wahrscheinlichsten: Die Karte ist abgelaufen, hatte keine ausreichende Deckung oder die Bank hat die Abbuchung blockiert. Die Aktualisierung der Zahlungsmethode dauert weniger als eine Minute.",
    cta: "Zahlungsmethode aktualisieren",
    help: "Stimmt etwas nicht? Antworten Sie auf diese E-Mail, und wir prüfen das Konto gemeinsam mit Ihnen.",
  },
  fr: {
    eyebrow: "Paiement en attente",
    heading: (n) => `${n}, il y a un problème avec le paiement`,
    preheader: (n) => `${n}, nous n'avons pas pu débiter votre abonnement.`,
    body: (plan, amount, retry) => (
      <>
        Nous avons tenté de renouveler votre abonnement à <strong>{plan}</strong> pour{" "}
        <strong>{amount}</strong>, mais le prélèvement n&apos;a pas pu aboutir.{" "}
        {retry} Dans l&apos;intervalle, votre accès est suspendu.
      </>
    ),
    retryLine: (d) => `Nous réessaierons le ${d}.`,
    retryLineSoon: "Nous réessaierons le prélèvement dans les prochains jours.",
    reason:
      "Le plus probable : la carte a expiré, n'avait pas de fonds suffisants ou la banque a bloqué le prélèvement. La mise à jour du moyen de paiement prend moins d'une minute.",
    cta: "Mettre à jour le moyen de paiement",
    help: "Quelque chose ne va pas ? Répondez à cet e-mail et nous examinerons le compte avec vous.",
  },
  fi: {
    eyebrow: "Maksu odottaa",
    heading: (n) => `${n}, maksussa on ongelma`,
    preheader: (n) => `${n}, emme voineet veloittaa tilaustasi.`,
    body: (plan, amount, retry) => (
      <>
        Yritimme uusia tilauksesi <strong>{plan}</strong> hintaan{" "}
        <strong>{amount}</strong>, mutta veloitusta ei voitu suorittaa loppuun.{" "}
        {retry} Sillä välin käyttöoikeutesi on pidossa.
      </>
    ),
    retryLine: (d) => `Yritämme uudelleen ${d}.`,
    retryLineSoon: "Yritämme veloitusta uudelleen lähipäivinä.",
    reason:
      "Todennäköisin syy: kortti vanheni, katetta ei ollut riittävästi tai pankki esti veloituksen. Maksutavan päivittäminen vie alle minuutin.",
    cta: "Päivitä maksutapa",
    help: "Eikö jokin täsmää? Vastaa tähän sähköpostiin, niin käymme tilin läpi kanssasi.",
  },
};

/**
 * Sent when a renewal invoice fails (insufficient funds, expired card,
 * etc.). Stripe retries 4× over 3 weeks by default; this email gives the
 * user a direct path to fix payment before access lapses.
 *
 * Localized (F6): copy + retry date follow the recipient's preferred_locale
 * (resolved in resend.ts); falls back to es. Plan label + amount stay verbatim.
 */
export default function PaymentFailedEmail({
  displayName,
  planId,
  formattedAmount,
  nextRetryAt,
  updatePaymentUrl,
  recipientEmail,
  locale = "es",
}: PaymentFailedProps) {
  const firstName = (displayName || "").split(" ")[0] || displayName;
  const c = COPY[locale] ?? COPY.es;
  const planLabel =
    planId === "pro-agency"
      ? "'BallersHub Pro Agency"
      : planId === "pro-coach"
        ? "'BallersHub Pro DT"
        : "'BallersHub Pro Player";
  const retryLine = nextRetryAt
    ? c.retryLine(formatEmailDate(nextRetryAt, locale))
    : c.retryLineSoon;

  return (
    <EmailLayout
      preheader={c.preheader(firstName)}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading(firstName)}</EmailHeading>

      <EmailParagraph>{c.body(planLabel, formattedAmount, retryLine)}</EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailParagraph>{c.reason}</EmailParagraph>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={updatePaymentUrl} variant="lime">
          {c.cta}
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">{c.help}</EmailParagraph>
    </EmailLayout>
  );
}
