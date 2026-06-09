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

export type WelcomePlayerProps = {
  playerName: string;
  dashboardUrl: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
  /** Recipient's preferred_locale (F6). Defaults to es. */
  locale?: Locale;
};

type Copy = {
  eyebrow: string;
  heading: (name: string) => string;
  preheader: (name: string) => string;
  intro: string;
  step1: { title: string; body: string };
  step2: { title: string; badge: string; body: string };
  step3: { title: string; body: string };
  cta: string;
  help: string;
};

// One copy block per locale. The `Record<Locale, Copy>` type makes TypeScript
// enforce that every locale has exactly the same fields — parity by compiler.
const COPY: Record<Locale, Copy> = {
  es: {
    eyebrow: "Bienvenida",
    heading: (n) => `Bienvenido, ${n}`,
    preheader: (n) => `${n}, así arrancás en 'BallersHub.`,
    intro:
      "Diste el primer paso. Clubes, agencias y scouts buscan jugadores en 'BallersHub todos los días — para destacar, te recomendamos seguir esta hoja de ruta corta.",
    step1: {
      title: "Completá tus datos personales",
      body: "Foto, nacionalidad, altura/peso, idiomas y datos de contacto. Es lo primero que se ve en tu perfil público.",
    },
    step2: {
      title: "Cargá tus datos futbolísticos",
      badge: "Paso clave",
      body: "Posiciones, pierna hábil, club actual y trayectoria. Mientras más completo esté, más fácil es que te encuentren con búsquedas específicas.",
    },
    step3: {
      title: "Subí media (foto + video)",
      body: "Fotos en alta, video resumen y notas de prensa. Tu portfolio Pro toma vida cuando hay material: el branding lo armamos nosotros automáticamente.",
    },
    cta: "Ir a mi dashboard",
    help: "¿Necesitás ayuda con algún paso? Respondé este email — leemos cada uno.",
  },
  en: {
    eyebrow: "Welcome",
    heading: (n) => `Welcome, ${n}`,
    preheader: (n) => `${n}, here's how to get started on 'BallersHub.`,
    intro:
      "You've taken the first step. Clubs, agencies and scouts search for players on 'BallersHub every day — to stand out, we recommend following this short roadmap.",
    step1: {
      title: "Complete your personal details",
      body: "Photo, nationality, height/weight, languages and contact details. It's the first thing seen on your public profile.",
    },
    step2: {
      title: "Add your football data",
      badge: "Key step",
      body: "Positions, preferred foot, current club and career history. The more complete it is, the easier it is to be found in specific searches.",
    },
    step3: {
      title: "Upload media (photos + video)",
      body: "High-res photos, a highlight video and press clippings. Your Pro portfolio comes alive with material — we handle the branding automatically.",
    },
    cta: "Go to my dashboard",
    help: "Need help with any step? Just reply to this email — we read every one.",
  },
  it: {
    eyebrow: "Benvenuto",
    heading: (n) => `Benvenuto, ${n}`,
    preheader: (n) => `${n}, ecco come iniziare su 'BallersHub.`,
    intro:
      "Hai fatto il primo passo. Club, agenzie e scout cercano calciatori su 'BallersHub ogni giorno — per metterti in mostra, ti consigliamo di seguire questa breve tabella di marcia.",
    step1: {
      title: "Completa i tuoi dati personali",
      body: "Foto, nazionalità, altezza/peso, lingue e contatti. È la prima cosa che si vede nel tuo profilo pubblico.",
    },
    step2: {
      title: "Inserisci i tuoi dati calcistici",
      badge: "Passo chiave",
      body: "Ruoli, piede preferito, squadra attuale e carriera. Più è completo, più è facile essere trovato in ricerche specifiche.",
    },
    step3: {
      title: "Carica i media (foto + video)",
      body: "Foto in alta risoluzione, video highlights e rassegna stampa. Il tuo portfolio Pro prende vita con il materiale: il branding lo curiamo noi automaticamente.",
    },
    cta: "Vai alla mia dashboard",
    help: "Hai bisogno di aiuto con qualche passo? Rispondi a questa email — le leggiamo tutte.",
  },
  pt: {
    eyebrow: "Bem-vindo",
    heading: (n) => `Bem-vindo, ${n}`,
    preheader: (n) => `${n}, veja como começar na 'BallersHub.`,
    intro:
      "Você deu o primeiro passo. Clubes, agências e scouts buscam jogadores na 'BallersHub todos os dias — para se destacar, recomendamos seguir este roteiro curto.",
    step1: {
      title: "Complete seus dados pessoais",
      body: "Foto, nacionalidade, altura/peso, idiomas e dados de contato. É a primeira coisa que aparece no seu perfil público.",
    },
    step2: {
      title: "Adicione seus dados futebolísticos",
      badge: "Passo-chave",
      body: "Posições, pé dominante, clube atual e trajetória. Quanto mais completo, mais fácil ser encontrado em buscas específicas.",
    },
    step3: {
      title: "Envie mídia (fotos + vídeo)",
      body: "Fotos em alta, vídeo de melhores momentos e clipes de imprensa. Seu portfólio Pro ganha vida com material — o branding fazemos nós automaticamente.",
    },
    cta: "Ir para meu painel",
    help: "Precisa de ajuda com algum passo? Responda este e-mail — lemos todos.",
  },
};

/**
 * Welcome flow for newly-registered players. Three concrete next steps
 * that map to the dashboard sections (datos personales → datos
 * futbolísticos → media), framed as "the path to publication".
 *
 * Localized (F6): copy follows the recipient's preferred_locale; falls back
 * to es. Dynamic data (name, dashboardUrl) stays in props.
 */
export default function WelcomePlayerEmail({
  playerName,
  dashboardUrl,
  recipientEmail,
  unsubscribeToken,
  locale = "es",
}: WelcomePlayerProps) {
  const firstName = (playerName || "").split(" ")[0] || playerName;
  const c = COPY[locale] ?? COPY.es;

  return (
    <EmailLayout
      preheader={c.preheader(firstName)}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading(firstName)}</EmailHeading>

      <EmailParagraph>{c.intro}</EmailParagraph>

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
