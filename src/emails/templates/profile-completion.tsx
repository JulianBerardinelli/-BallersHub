import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  EmailStep,
} from "@/emails";
import type { Locale } from "@/i18n/routing";

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
  /** Recipient's preferred_locale (F6). Defaults to es. */
  locale?: Locale;
};

type Copy = {
  eyebrow: string;
  heading: (name: string) => string;
  intro: (missing?: number) => string;
  valueProp: string;
  step1: { title: string; body: string };
  step2: { title: string; badge: string; body: string };
  step3: { title: string; body: string };
  cta: string;
  help: string;
};

const COPY: Record<Locale, Copy> = {
  es: {
    eyebrow: "A un paso de publicar",
    heading: (n) => `${n}, te falta poco`,
    intro: (m) =>
      typeof m === "number" && m > 0
        ? `Te quedan ${m} ${m === 1 ? "sección" : "secciones"} por completar para publicar tu perfil.`
        : "Te falta poco para publicar tu perfil profesional.",
    valueProp:
      "Los perfiles completos reciben hasta 5× más visitas de scouts y agencias — y cuando alguien busca por posición o liga, los incompletos no aparecen en los resultados. Es la diferencia entre estar visible o no.",
    step1: {
      title: "Datos personales y contacto",
      body: "Foto, nacionalidad y datos básicos. Toma 2 minutos.",
    },
    step2: {
      title: "Datos futbolísticos",
      badge: "Importante",
      body: "Posiciones, club actual, trayectoria. Es lo primero que mira un scout.",
    },
    step3: {
      title: "Subí media",
      body: "Fotos en alta y video resumen. El portfolio Pro toma vida con material.",
    },
    cta: "Completar mi perfil",
    help: "Si necesitás ayuda para completar alguna sección, respondé este email y te orientamos.",
  },
  en: {
    eyebrow: "One step from publishing",
    heading: (n) => `${n}, you're almost there`,
    intro: (m) =>
      typeof m === "number" && m > 0
        ? `You have ${m} ${m === 1 ? "section" : "sections"} left to complete before publishing your profile.`
        : "You're almost ready to publish your professional profile.",
    valueProp:
      "Complete profiles get up to 5× more visits from scouts and agencies — and when someone searches by position or league, incomplete ones don't show up in the results. It's the difference between being visible or not.",
    step1: {
      title: "Personal details and contact",
      body: "Photo, nationality and basic info. Takes 2 minutes.",
    },
    step2: {
      title: "Football data",
      badge: "Important",
      body: "Positions, current club, career history. It's the first thing a scout looks at.",
    },
    step3: {
      title: "Upload media",
      body: "High-res photos and a highlight video. Your Pro portfolio comes alive with material.",
    },
    cta: "Complete my profile",
    help: "If you need help completing any section, just reply to this email and we'll guide you.",
  },
  it: {
    eyebrow: "A un passo dalla pubblicazione",
    heading: (n) => `${n}, ci sei quasi`,
    intro: (m) =>
      typeof m === "number" && m > 0
        ? `Ti ${m === 1 ? "resta" : "restano"} ${m} ${m === 1 ? "sezione" : "sezioni"} da completare per pubblicare il tuo profilo.`
        : "Manca poco per pubblicare il tuo profilo professionale.",
    valueProp:
      "I profili completi ricevono fino a 5× più visite da scout e agenzie — e quando qualcuno cerca per ruolo o campionato, quelli incompleti non compaiono nei risultati. È la differenza tra essere visibile o no.",
    step1: {
      title: "Dati personali e contatti",
      body: "Foto, nazionalità e dati di base. Bastano 2 minuti.",
    },
    step2: {
      title: "Dati calcistici",
      badge: "Importante",
      body: "Ruoli, squadra attuale, carriera. È la prima cosa che guarda uno scout.",
    },
    step3: {
      title: "Carica i media",
      body: "Foto in alta risoluzione e video highlights. Il portfolio Pro prende vita con il materiale.",
    },
    cta: "Completa il mio profilo",
    help: "Se hai bisogno di aiuto per completare qualche sezione, rispondi a questa email e ti aiutiamo.",
  },
  pt: {
    eyebrow: "A um passo de publicar",
    heading: (n) => `${n}, falta pouco`,
    intro: (m) =>
      typeof m === "number" && m > 0
        ? `${m === 1 ? "Falta" : "Faltam"} ${m} ${m === 1 ? "seção" : "seções"} para você publicar seu perfil.`
        : "Falta pouco para publicar seu perfil profissional.",
    valueProp:
      "Perfis completos recebem até 5× mais visitas de scouts e agências — e quando alguém busca por posição ou liga, os incompletos não aparecem nos resultados. É a diferença entre estar visível ou não.",
    step1: {
      title: "Dados pessoais e contato",
      body: "Foto, nacionalidade e dados básicos. Leva 2 minutos.",
    },
    step2: {
      title: "Dados futebolísticos",
      badge: "Importante",
      body: "Posições, clube atual, trajetória. É a primeira coisa que um scout olha.",
    },
    step3: {
      title: "Envie mídia",
      body: "Fotos em alta e vídeo de melhores momentos. O portfólio Pro ganha vida com material.",
    },
    cta: "Completar meu perfil",
    help: "Se precisar de ajuda para completar alguma seção, responda este e-mail e te orientamos.",
  },
};

/**
 * Reactivation email for users that registered but never completed
 * their profile. Sent at day 3 / 7 / 14 of the post-signup drip.
 *
 * Localized (F6): copy follows the recipient's preferred_locale (resolved by
 * the drip dispatcher); falls back to es.
 */
export default function ProfileCompletionEmail({
  firstName,
  dashboardUrl,
  missingSections,
  recipientEmail,
  unsubscribeToken,
  locale = "es",
}: ProfileCompletionProps) {
  const c = COPY[locale] ?? COPY.es;
  const intro = c.intro(missingSections);

  return (
    <EmailLayout
      preheader={intro}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading(firstName)}</EmailHeading>

      <EmailParagraph>{intro}</EmailParagraph>

      <EmailParagraph tone="muted">{c.valueProp}</EmailParagraph>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailStep index={1} title={c.step1.title}>
        {c.step1.body}
      </EmailStep>

      <EmailStep index={2} title={c.step2.title} badge={c.step2.badge}>
        {c.step2.body}
      </EmailStep>

      <EmailStep index={3} title={c.step3.title}>
        {c.step3.body}
      </EmailStep>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={dashboardUrl} variant="lime">
          {c.cta}
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">{c.help}</EmailParagraph>
    </EmailLayout>
  );
}
