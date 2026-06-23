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

export type CompGrantWelcomeProps = {
  /** Display name shown in the greeting; falls back to email handle. */
  displayName: string;
  /** Plan id from the pricing matrix. */
  planId: "pro-player" | "pro-agency" | "pro-coach";
  /** ISO date when the comp expires; null = permanent. */
  expiresAt: string | null;
  /** Whether this is the first grant for this user, or an extension. */
  variant: "grant" | "extend";
  /** Where to send the user. */
  dashboardUrl: string;
  manageSubscriptionUrl: string;
  recipientEmail?: string;
  /** Recipient's preferred_locale (F6). Defaults to es. */
  locale?: Locale;
};

type Variant = "grant" | "extend";

type Copy = {
  eyebrow: string;
  heading: (name: string, variant: Variant) => string;
  preheader: (name: string, plan: string) => string;
  intro: (plan: string, variant: Variant) => string;
  expiryLine: (date: string | null) => string;
  step1: { title: string; body: string };
  step2: { title: string; badge: string; body: string };
  ctaDashboard: string;
  ctaManage: string;
  help: string;
};

const COPY: Record<Locale, Copy> = {
  es: {
    eyebrow: "Cuenta de cortesía",
    heading: (n, v) =>
      v === "extend" ? `Extendimos tu acceso, ${n}` : `Activamos tu acceso, ${n}`,
    preheader: (n, p) => `${n}, tu acceso a ${p} ya está activo.`,
    intro: (p, v) =>
      v === "extend"
        ? `El equipo de 'BallersHub extendió tu cuenta de cortesía a ${p}.`
        : `El equipo de 'BallersHub te activó una cuenta de cortesía a ${p} — sin cargo.`,
    expiryLine: (d) =>
      d
        ? `Tu acceso es válido hasta el ${d}.`
        : "Tu acceso es permanente — sin fecha de vencimiento.",
    step1: {
      title: "Tenés todas las features Pro disponibles",
      body: "Plantilla Pro Athlete, valoraciones, palmarés, valor de mercado, scouting analítico, galería catálogo y más. Aprovechalas para destacar tu perfil.",
    },
    step2: {
      title: "No hay tarjeta ni facturación involucrada",
      badge: "Sin cargo",
      body: "Esta cuenta está gestionada directamente por el equipo de 'BallersHub. No vas a recibir cobros ni necesitás registrar un método de pago.",
    },
    ctaDashboard: "Ir a mi dashboard",
    ctaManage: "Ver mi suscripción",
    help: "¿Dudas o problemas? Respondé este email y te ayudamos.",
  },
  en: {
    eyebrow: "Complimentary account",
    heading: (n, v) =>
      v === "extend" ? `We've extended your access, ${n}` : `Your access is live, ${n}`,
    preheader: (n, p) => `${n}, your access to ${p} is now active.`,
    intro: (p, v) =>
      v === "extend"
        ? `The 'BallersHub team extended your complimentary ${p} account.`
        : `The 'BallersHub team set up a complimentary ${p} account for you — at no charge.`,
    expiryLine: (d) =>
      d
        ? `Your access is valid until ${d}.`
        : "Your access is permanent — no expiry date.",
    step1: {
      title: "You have every Pro feature available",
      body: "Pro Athlete layout, ratings, honours, market value, analytical scouting, catalog gallery and more. Use them to make your profile stand out.",
    },
    step2: {
      title: "No card or billing involved",
      badge: "No charge",
      body: "This account is managed directly by the 'BallersHub team. You won't be charged and you don't need to register a payment method.",
    },
    ctaDashboard: "Go to my dashboard",
    ctaManage: "View my subscription",
    help: "Questions or issues? Just reply to this email and we'll help.",
  },
  it: {
    eyebrow: "Account omaggio",
    heading: (n, v) =>
      v === "extend"
        ? `Abbiamo esteso il tuo accesso, ${n}`
        : `Abbiamo attivato il tuo accesso, ${n}`,
    preheader: (n, p) => `${n}, il tuo accesso a ${p} è ora attivo.`,
    intro: (p, v) =>
      v === "extend"
        ? `Il team di 'BallersHub ha esteso il tuo account omaggio ${p}.`
        : `Il team di 'BallersHub ti ha attivato un account omaggio ${p} — senza alcun costo.`,
    expiryLine: (d) =>
      d
        ? `Il tuo accesso è valido fino al ${d}.`
        : "Il tuo accesso è permanente — senza data di scadenza.",
    step1: {
      title: "Hai tutte le funzionalità Pro disponibili",
      body: "Layout Pro Athlete, valutazioni, palmarès, valore di mercato, scouting analitico, galleria catalogo e altro. Sfruttale per far risaltare il tuo profilo.",
    },
    step2: {
      title: "Nessuna carta né fatturazione",
      badge: "Senza costo",
      body: "Questo account è gestito direttamente dal team di 'BallersHub. Non riceverai addebiti e non devi registrare un metodo di pagamento.",
    },
    ctaDashboard: "Vai alla mia dashboard",
    ctaManage: "Vedi il mio abbonamento",
    help: "Domande o problemi? Rispondi a questa email e ti aiutiamo.",
  },
  pt: {
    eyebrow: "Conta cortesia",
    heading: (n, v) =>
      v === "extend" ? `Estendemos seu acesso, ${n}` : `Ativamos seu acesso, ${n}`,
    preheader: (n, p) => `${n}, seu acesso ao ${p} já está ativo.`,
    intro: (p, v) =>
      v === "extend"
        ? `A equipe da 'BallersHub estendeu sua conta cortesia ${p}.`
        : `A equipe da 'BallersHub ativou uma conta cortesia ${p} para você — sem custo.`,
    expiryLine: (d) =>
      d
        ? `Seu acesso é válido até ${d}.`
        : "Seu acesso é permanente — sem data de expiração.",
    step1: {
      title: "Você tem todas as features Pro disponíveis",
      body: "Layout Pro Athlete, avaliações, títulos, valor de mercado, scouting analítico, galeria catálogo e mais. Aproveite para destacar seu perfil.",
    },
    step2: {
      title: "Sem cartão nem cobrança",
      badge: "Sem custo",
      body: "Esta conta é gerenciada diretamente pela equipe da 'BallersHub. Você não receberá cobranças e não precisa registrar um método de pagamento.",
    },
    ctaDashboard: "Ir para meu painel",
    ctaManage: "Ver minha assinatura",
    help: "Dúvidas ou problemas? Responda este e-mail e te ajudamos.",
  },
  de: {
    eyebrow: "Kostenloses Konto",
    heading: (n, v) =>
      v === "extend" ? `Wir haben Ihren Zugang verlängert, ${n}` : `Wir haben Ihren Zugang aktiviert, ${n}`,
    preheader: (n, p) => `${n}, Ihr Zugang zu ${p} ist jetzt aktiv.`,
    intro: (p, v) =>
      v === "extend"
        ? `Das 'BallersHub-Team hat Ihr kostenloses ${p}-Konto verlängert.`
        : `Das 'BallersHub-Team hat ein kostenloses ${p}-Konto für Sie eingerichtet — ohne Kosten.`,
    expiryLine: (d) =>
      d
        ? `Ihr Zugang ist gültig bis zum ${d}.`
        : "Ihr Zugang ist dauerhaft — ohne Ablaufdatum.",
    step1: {
      title: "Ihnen stehen alle Pro-Funktionen zur Verfügung",
      body: "Pro-Athlete-Layout, Bewertungen, Titel, Marktwert, analytisches Scouting, Katalog-Galerie und mehr. Nutzen Sie sie, um Ihr Profil hervorzuheben.",
    },
    step2: {
      title: "Keine Karte und keine Abrechnung erforderlich",
      badge: "Ohne Kosten",
      body: "Dieses Konto wird direkt vom 'BallersHub-Team verwaltet. Ihnen werden keine Beträge berechnet, und Sie müssen keine Zahlungsmethode hinterlegen.",
    },
    ctaDashboard: "Zu meinem Dashboard",
    ctaManage: "Mein Abonnement ansehen",
    help: "Fragen oder Probleme? Antworten Sie auf diese E-Mail, und wir helfen Ihnen.",
  },
  fr: {
    eyebrow: "Compte offert",
    heading: (n, v) =>
      v === "extend" ? `Nous avons prolongé votre accès, ${n}` : `Nous avons activé votre accès, ${n}`,
    preheader: (n, p) => `${n}, votre accès à ${p} est désormais actif.`,
    intro: (p, v) =>
      v === "extend"
        ? `L'équipe 'BallersHub a prolongé votre compte offert ${p}.`
        : `L'équipe 'BallersHub vous a activé un compte offert ${p} — sans frais.`,
    expiryLine: (d) =>
      d
        ? `Votre accès est valable jusqu'au ${d}.`
        : "Votre accès est permanent — sans date d'expiration.",
    step1: {
      title: "Vous disposez de toutes les fonctionnalités Pro",
      body: "Mise en page Pro Athlete, évaluations, palmarès, valeur marchande, recrutement analytique, galerie catalogue et plus encore. Profitez-en pour mettre en valeur votre profil.",
    },
    step2: {
      title: "Aucune carte ni facturation",
      badge: "Sans frais",
      body: "Ce compte est géré directement par l'équipe 'BallersHub. Vous ne serez pas débité et n'avez pas besoin d'enregistrer de moyen de paiement.",
    },
    ctaDashboard: "Accéder à mon tableau de bord",
    ctaManage: "Voir mon abonnement",
    help: "Des questions ou des problèmes ? Répondez à cet e-mail et nous vous aiderons.",
  },
  fi: {
    eyebrow: "Maksuton tili",
    heading: (n, v) =>
      v === "extend" ? `Jatkoimme käyttöoikeuttasi, ${n}` : `Aktivoimme käyttöoikeutesi, ${n}`,
    preheader: (n, p) => `${n}, käyttöoikeutesi kohteeseen ${p} on nyt aktiivinen.`,
    intro: (p, v) =>
      v === "extend"
        ? `'BallersHub-tiimi jatkoi maksutonta ${p}-tiliäsi.`
        : `'BallersHub-tiimi aktivoi sinulle maksuttoman ${p}-tilin — veloituksetta.`,
    expiryLine: (d) =>
      d
        ? `Käyttöoikeutesi on voimassa ${d} asti.`
        : "Käyttöoikeutesi on pysyvä — ilman päättymispäivää.",
    step1: {
      title: "Käytössäsi ovat kaikki Pro-ominaisuudet",
      body: "Pro Athlete -asettelu, arvostelut, saavutukset, markkina-arvo, analyyttinen skouttaus, katalogigalleria ja paljon muuta. Hyödynnä niitä erottaaksesi profiilisi.",
    },
    step2: {
      title: "Ei korttia eikä laskutusta",
      badge: "Veloituksetta",
      body: "Tätä tiliä hallinnoi suoraan 'BallersHub-tiimi. Sinua ei veloiteta, eikä sinun tarvitse rekisteröidä maksutapaa.",
    },
    ctaDashboard: "Siirry hallintapaneeliini",
    ctaManage: "Näytä tilaukseni",
    help: "Kysymyksiä tai ongelmia? Vastaa tähän sähköpostiin, niin autamme.",
  },
};

/**
 * Sent when an admin grants Pro access without payment (cuenta de cortesía)
 * or extends an existing comp. The copy avoids billing language since
 * there's no charge involved — this is a gift from the team.
 *
 * Localized (F6): copy + expiry date follow the recipient's preferred_locale
 * (resolved in resend.ts); falls back to es.
 */
export default function CompGrantWelcomeEmail({
  displayName,
  planId,
  expiresAt,
  variant,
  dashboardUrl,
  manageSubscriptionUrl,
  recipientEmail,
  locale = "es",
}: CompGrantWelcomeProps) {
  const firstName = (displayName || "").split(" ")[0] || displayName;
  const c = COPY[locale] ?? COPY.es;
  const planLabel =
    planId === "pro-agency"
      ? "'BallersHub Pro Agency"
      : planId === "pro-coach"
        ? "'BallersHub Pro DT"
        : "'BallersHub Pro Player";
  const expiryLine = c.expiryLine(
    expiresAt ? formatEmailDate(expiresAt, locale) : null,
  );

  return (
    <EmailLayout
      preheader={c.preheader(firstName, planLabel)}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading(firstName, variant)}</EmailHeading>

      <EmailParagraph>
        {c.intro(planLabel, variant)} {expiryLine}
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
