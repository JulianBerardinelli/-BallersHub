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

export type WelcomeAgencyProps = {
  managerName: string;
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

// One copy block per locale — `Record<Locale, Copy>` enforces field parity.
const COPY: Record<Locale, Copy> = {
  es: {
    eyebrow: "Bienvenida — Agencia",
    heading: (n) => `Hola ${n}`,
    preheader: (n) => `${n}, organizá tu cartera en 'BallersHub.`,
    intro:
      "'BallersHub es tu directorio de talento. Acá centralizás scouting, gestionás a tus representados y publicás portfolios profesionales con un nivel de terminación de élite. Estos tres pasos son tu setup inicial.",
    step1: {
      title: "Configurá tu agencia",
      body: "Subí logo corporativo, completá biografía y datos de contacto. Es el primer toque que ven los jugadores cuando los invitás.",
    },
    step2: {
      title: "Sumá a tus jugadores",
      badge: "Paso clave",
      body: "Usá el sistema de invitaciones para vincular formalmente a cada futbolista. Una vez vinculados, su portfolio público muestra tu agencia como representante.",
    },
    step3: {
      title: "Publicá portfolios profesionales",
      body: "Cada perfil aprobado se renderiza con el layout Pro de 'BallersHub — animaciones, datos validados y media en alta. Listos para mandar a clubes.",
    },
    cta: "Ir a mi panel",
    help: "Cualquier pregunta, respondé este email y te orientamos.",
  },
  en: {
    eyebrow: "Welcome — Agency",
    heading: (n) => `Hi ${n}`,
    preheader: (n) => `${n}, organize your roster on 'BallersHub.`,
    intro:
      "'BallersHub is your talent directory. Here you centralize scouting, manage your represented players and publish professional portfolios with an elite finish. These three steps are your initial setup.",
    step1: {
      title: "Set up your agency",
      body: "Upload your corporate logo, complete your bio and contact details. It's the first impression players get when you invite them.",
    },
    step2: {
      title: "Add your players",
      badge: "Key step",
      body: "Use the invitation system to formally link each player. Once linked, their public portfolio shows your agency as their representative.",
    },
    step3: {
      title: "Publish professional portfolios",
      body: "Every approved profile renders with the 'BallersHub Pro layout — animations, validated data and high-res media. Ready to send to clubs.",
    },
    cta: "Go to my panel",
    help: "Any questions, reply to this email and we'll guide you.",
  },
  it: {
    eyebrow: "Benvenuto — Agenzia",
    heading: (n) => `Ciao ${n}`,
    preheader: (n) => `${n}, organizza la tua scuderia su 'BallersHub.`,
    intro:
      "'BallersHub è la tua directory dei talenti. Qui centralizzi lo scouting, gestisci i tuoi assistiti e pubblichi portfolio professionali con una finitura di élite. Questi tre passi sono il tuo setup iniziale.",
    step1: {
      title: "Configura la tua agenzia",
      body: "Carica il logo aziendale, completa la biografia e i contatti. È la prima impressione che hanno i giocatori quando li inviti.",
    },
    step2: {
      title: "Aggiungi i tuoi giocatori",
      badge: "Passo chiave",
      body: "Usa il sistema di inviti per collegare formalmente ogni calciatore. Una volta collegati, il loro portfolio pubblico mostra la tua agenzia come procuratore.",
    },
    step3: {
      title: "Pubblica portfolio professionali",
      body: "Ogni profilo approvato viene mostrato con il layout Pro di 'BallersHub — animazioni, dati validati e media in alta. Pronti da inviare ai club.",
    },
    cta: "Vai al mio pannello",
    help: "Per qualsiasi domanda, rispondi a questa email e ti aiutiamo.",
  },
  pt: {
    eyebrow: "Bem-vindo — Agência",
    heading: (n) => `Olá ${n}`,
    preheader: (n) => `${n}, organize sua carteira na 'BallersHub.`,
    intro:
      "A 'BallersHub é o seu diretório de talentos. Aqui você centraliza o scouting, gerencia seus representados e publica portfólios profissionais com acabamento de elite. Estes três passos são a sua configuração inicial.",
    step1: {
      title: "Configure sua agência",
      body: "Envie o logo corporativo, complete a biografia e os dados de contato. É o primeiro contato que os jogadores têm quando você os convida.",
    },
    step2: {
      title: "Adicione seus jogadores",
      badge: "Passo-chave",
      body: "Use o sistema de convites para vincular formalmente cada jogador. Uma vez vinculados, o portfólio público deles mostra sua agência como representante.",
    },
    step3: {
      title: "Publique portfólios profissionais",
      body: "Cada perfil aprovado é renderizado com o layout Pro da 'BallersHub — animações, dados validados e mídia em alta. Prontos para enviar aos clubes.",
    },
    cta: "Ir para meu painel",
    help: "Qualquer dúvida, responda este e-mail e te orientamos.",
  },
  de: {
    eyebrow: "Willkommen — Agentur",
    heading: (n) => `Hallo ${n}`,
    preheader: (n) => `${n}, organisieren Sie Ihren Kader auf 'BallersHub.`,
    intro:
      "'BallersHub ist Ihr Talentverzeichnis. Hier bündeln Sie das Scouting, verwalten Ihre Mandanten und veröffentlichen professionelle Portfolios mit erstklassiger Verarbeitung. Diese drei Schritte sind Ihr erstes Setup.",
    step1: {
      title: "Richten Sie Ihre Agentur ein",
      body: "Laden Sie Ihr Firmenlogo hoch, vervollständigen Sie Biografie und Kontaktdaten. Das ist der erste Eindruck, den Spieler erhalten, wenn Sie sie einladen.",
    },
    step2: {
      title: "Fügen Sie Ihre Spieler hinzu",
      badge: "Schlüsselschritt",
      body: "Nutzen Sie das Einladungssystem, um jeden Spieler formal zu verknüpfen. Sobald sie verknüpft sind, zeigt ihr öffentliches Portfolio Ihre Agentur als Vertretung an.",
    },
    step3: {
      title: "Veröffentlichen Sie professionelle Portfolios",
      body: "Jedes freigegebene Profil wird mit dem Pro-Layout von 'BallersHub dargestellt — Animationen, validierte Daten und hochauflösende Medien. Bereit zum Versand an Klubs.",
    },
    cta: "Zu meinem Panel",
    help: "Bei Fragen antworten Sie einfach auf diese E-Mail, und wir helfen Ihnen weiter.",
  },
  fr: {
    eyebrow: "Bienvenue — Agence",
    heading: (n) => `Bonjour ${n}`,
    preheader: (n) => `${n}, organisez votre effectif sur 'BallersHub.`,
    intro:
      "'BallersHub est votre annuaire de talents. Vous y centralisez le recrutement, gérez vos joueurs représentés et publiez des portfolios professionnels d'une finition d'élite. Ces trois étapes constituent votre configuration initiale.",
    step1: {
      title: "Configurez votre agence",
      body: "Téléchargez votre logo d'entreprise, complétez votre biographie et vos coordonnées. C'est la première impression que les joueurs ont lorsque vous les invitez.",
    },
    step2: {
      title: "Ajoutez vos joueurs",
      badge: "Étape clé",
      body: "Utilisez le système d'invitations pour lier formellement chaque joueur. Une fois liés, leur portfolio public affiche votre agence comme représentant.",
    },
    step3: {
      title: "Publiez des portfolios professionnels",
      body: "Chaque profil approuvé s'affiche avec la mise en page Pro de 'BallersHub — animations, données validées et médias en haute résolution. Prêts à envoyer aux clubs.",
    },
    cta: "Accéder à mon panneau",
    help: "Pour toute question, répondez à cet e-mail et nous vous guiderons.",
  },
  fi: {
    eyebrow: "Tervetuloa — Agentuuri",
    heading: (n) => `Hei ${n}`,
    preheader: (n) => `${n}, järjestä pelaajakaartisi 'BallersHubissa.`,
    intro:
      "'BallersHub on lahjakkuushakemistosi. Täällä keskität skouttauksen, hallinnoit edustamiasi pelaajia ja julkaiset ammattimaisia portfolioita huippuluokan viimeistelyllä. Nämä kolme vaihetta ovat alkuasetuksesi.",
    step1: {
      title: "Määritä agentuurisi",
      body: "Lataa yrityslogo, täytä esittely ja yhteystiedot. Se on ensivaikutelma, jonka pelaajat saavat, kun kutsut heidät.",
    },
    step2: {
      title: "Lisää pelaajasi",
      badge: "Avainvaihe",
      body: "Käytä kutsujärjestelmää liittääksesi jokaisen pelaajan virallisesti. Kun heidät on liitetty, heidän julkinen portfolionsa näyttää agentuurisi edustajana.",
    },
    step3: {
      title: "Julkaise ammattimaisia portfolioita",
      body: "Jokainen hyväksytty profiili näytetään 'BallersHubin Pro-asettelulla — animaatiot, vahvistetut tiedot ja korkearesoluutioinen media. Valmiina lähetettäväksi seuroille.",
    },
    cta: "Siirry paneeliini",
    help: "Jos sinulla on kysyttävää, vastaa tähän sähköpostiin, niin opastamme sinua.",
  },
};

/**
 * Welcome flow for agencies/managers. Three steps mapped to their
 * dashboard: agency setup → import roster → publish portfolios.
 *
 * Localized (F6): copy follows the recipient's preferred_locale; falls back
 * to es. Dynamic data (name, dashboardUrl) stays in props.
 */
export default function WelcomeAgencyEmail({
  managerName,
  dashboardUrl,
  recipientEmail,
  unsubscribeToken,
  locale = "es",
}: WelcomeAgencyProps) {
  const firstName = (managerName || "").split(" ")[0] || managerName;
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
