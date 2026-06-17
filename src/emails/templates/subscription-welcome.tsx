import type { ReactNode } from "react";
import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailStep,
  formatEmailDate,
} from "@/emails";
import type { Locale } from "@/i18n/routing";

export type SubscriptionWelcomeProps = {
  /** Display name shown in the greeting; falls back to email handle. */
  displayName: string;
  /** Plan id from the pricing matrix (e.g. "pro-player", "pro-agency"). */
  planId: "pro-player" | "pro-agency" | "pro-coach";
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
  /** Recipient's preferred_locale (F6). Defaults to es. */
  locale?: Locale;
};

type Copy = {
  eyebrow: string;
  heading: (name: string) => string;
  preheader: (name: string, plan: string) => string;
  activated: (plan: string) => ReactNode;
  trialLine: (trialEnd: string, amount: string) => string;
  activeLine: (plan: string, amount: string) => string;
  nextChargeLine: (date: string) => string;
  step1: { title: string; body: string };
  step2: { title: string; badge: string; body: string };
  ctaDashboard: string;
  ctaManage: string;
  help: string;
};

const COPY: Record<Locale, Copy> = {
  es: {
    eyebrow: "Suscripción confirmada",
    heading: (n) => `¡Listo, ${n}!`,
    preheader: (n, p) => `${n}, tu plan ${p} ya está activo.`,
    activated: (p) => (
      <>
        Tu plan <strong>{p}</strong> quedó activo.
      </>
    ),
    trialLine: (d, a) =>
      `Tu prueba gratuita corre hasta el ${d}. Si no cancelás antes, te cobramos automáticamente ${a}.`,
    activeLine: (p, a) => `Tu suscripción anual a ${p} ya está activa por ${a}.`,
    nextChargeLine: (d) => `Próximo cargo: ${d}.`,
    step1: {
      title: "Aprovechá los próximos días",
      body: "Tenés acceso completo a todas las funcionalidades Pro durante este período. Subí material, completá tu perfil y dejalo listo para destacar.",
    },
    step2: {
      title: "Gestioná tu cuenta cuando quieras",
      badge: "Self-service",
      body: "Desde Configuración → Suscripción podés ver tu estado, descargar facturas y cancelar si necesitás. Sin llamadas, sin trámites.",
    },
    ctaDashboard: "Ir a mi dashboard",
    ctaManage: "Gestionar suscripción",
    help: "¿Tenés alguna duda con la facturación? Respondé este email y te ayudamos.",
  },
  en: {
    eyebrow: "Subscription confirmed",
    heading: (n) => `You're all set, ${n}!`,
    preheader: (n, p) => `${n}, your ${p} plan is now active.`,
    activated: (p) => (
      <>
        Your <strong>{p}</strong> plan is now active.
      </>
    ),
    trialLine: (d, a) =>
      `Your free trial runs until ${d}. If you don't cancel before then, we'll automatically charge you ${a}.`,
    activeLine: (p, a) => `Your annual subscription to ${p} is now active for ${a}.`,
    nextChargeLine: (d) => `Next charge: ${d}.`,
    step1: {
      title: "Make the most of the next few days",
      body: "You have full access to all Pro features during this period. Upload material, complete your profile and get it ready to stand out.",
    },
    step2: {
      title: "Manage your account anytime",
      badge: "Self-service",
      body: "From Settings → Subscription you can check your status, download invoices and cancel if you need to. No calls, no paperwork.",
    },
    ctaDashboard: "Go to my dashboard",
    ctaManage: "Manage subscription",
    help: "Any questions about billing? Just reply to this email and we'll help.",
  },
  it: {
    eyebrow: "Abbonamento confermato",
    heading: (n) => `Tutto pronto, ${n}!`,
    preheader: (n, p) => `${n}, il tuo piano ${p} è ora attivo.`,
    activated: (p) => (
      <>
        Il tuo piano <strong>{p}</strong> è ora attivo.
      </>
    ),
    trialLine: (d, a) =>
      `La tua prova gratuita dura fino al ${d}. Se non disdici prima, ti addebiteremo automaticamente ${a}.`,
    activeLine: (p, a) => `Il tuo abbonamento annuale a ${p} è ora attivo per ${a}.`,
    nextChargeLine: (d) => `Prossimo addebito: ${d}.`,
    step1: {
      title: "Sfrutta i prossimi giorni",
      body: "Hai accesso completo a tutte le funzionalità Pro in questo periodo. Carica materiale, completa il tuo profilo e preparalo per metterti in mostra.",
    },
    step2: {
      title: "Gestisci il tuo account quando vuoi",
      badge: "Self-service",
      body: "Da Impostazioni → Abbonamento puoi vedere il tuo stato, scaricare le fatture e disdire se necessario. Senza telefonate, senza pratiche.",
    },
    ctaDashboard: "Vai alla mia dashboard",
    ctaManage: "Gestisci abbonamento",
    help: "Hai domande sulla fatturazione? Rispondi a questa email e ti aiutiamo.",
  },
  pt: {
    eyebrow: "Assinatura confirmada",
    heading: (n) => `Tudo pronto, ${n}!`,
    preheader: (n, p) => `${n}, seu plano ${p} já está ativo.`,
    activated: (p) => (
      <>
        Seu plano <strong>{p}</strong> está ativo.
      </>
    ),
    trialLine: (d, a) =>
      `Seu período de teste gratuito vai até ${d}. Se você não cancelar antes, cobraremos automaticamente ${a}.`,
    activeLine: (p, a) => `Sua assinatura anual do ${p} já está ativa por ${a}.`,
    nextChargeLine: (d) => `Próxima cobrança: ${d}.`,
    step1: {
      title: "Aproveite os próximos dias",
      body: "Você tem acesso completo a todas as funcionalidades Pro neste período. Envie material, complete seu perfil e deixe-o pronto para se destacar.",
    },
    step2: {
      title: "Gerencie sua conta quando quiser",
      badge: "Self-service",
      body: "Em Configurações → Assinatura você pode ver seu status, baixar faturas e cancelar se precisar. Sem ligações, sem burocracia.",
    },
    ctaDashboard: "Ir para meu painel",
    ctaManage: "Gerenciar assinatura",
    help: "Alguma dúvida sobre a cobrança? Responda este e-mail e te ajudamos.",
  },
};

/**
 * Sent immediately after a successful checkout (Stripe or MP). Confirms
 * the trial period, amount, and next charge date — and routes the user
 * back into the product.
 *
 * Localized (F6): copy + dates follow the recipient's preferred_locale
 * (resolved in resend.ts); falls back to es. Plan label + amount stay verbatim.
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
  locale = "es",
}: SubscriptionWelcomeProps) {
  const firstName = (displayName || "").split(" ")[0] || displayName;
  const c = COPY[locale] ?? COPY.es;
  const planLabel =
    planId === "pro-agency"
      ? "'BallersHub Pro Agency"
      : planId === "pro-coach"
        ? "'BallersHub Pro DT"
        : "'BallersHub Pro Player";
  const trialLine = trialEndsAt
    ? c.trialLine(formatEmailDate(trialEndsAt, locale), formattedAmount)
    : c.activeLine(planLabel, formattedAmount);
  const nextChargeLine = nextChargeAt
    ? c.nextChargeLine(formatEmailDate(nextChargeAt, locale))
    : null;

  return (
    <EmailLayout
      preheader={c.preheader(firstName, planLabel)}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading(firstName)}</EmailHeading>

      <EmailParagraph>
        {c.activated(planLabel)} {trialLine}
        {nextChargeLine ? ` ${nextChargeLine}` : ""}
      </EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailStep index={1} title={c.step1.title}>
        {c.step1.body}
      </EmailStep>

      <EmailStep index={2} title={c.step2.title} badge={c.step2.badge}>
        {c.step2.body}
      </EmailStep>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={dashboardUrl} variant="lime">
          {c.ctaDashboard}
        </EmailButton>
      </div>

      <div style={{ marginTop: 12, marginBottom: 8 }}>
        <EmailButton href={manageSubscriptionUrl} variant="outline">
          {c.ctaManage}
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">{c.help}</EmailParagraph>
    </EmailLayout>
  );
}
