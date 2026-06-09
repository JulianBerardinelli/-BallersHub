import type { ReactNode } from "react";
import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailLinkInline,
  EmailParagraph,
} from "@/emails";
import type { Locale } from "@/i18n/routing";

export type LeadWelcomeProps = {
  /** Display name of the player whose portfolio captured the lead. */
  playerName: string;
  /** Public URL of the portfolio they were viewing. */
  portfolioUrl: string;
  /** URL to create an account (so they can browse + save). */
  signUpUrl: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
  /**
   * Locale of the portfolio page the lead was on (F6 phase 3). Leads have no
   * account, so this is threaded from the page, not preferred_locale. Default es.
   */
  locale?: Locale;
};

type Copy = {
  preheader: (name: string) => string;
  eyebrow: string;
  heading: string;
  bodyUnlocked: (name: string, portfolioUrl: string) => ReactNode;
  noSpam: string;
  moreControlHeading: string;
  moreControlBody: string;
  ctaSignup: string;
  footer: (signUpUrl: string) => ReactNode;
};

const COPY: Record<Locale, Copy> = {
  es: {
    preheader: (n) => `Te avisamos cuando aparezcan nuevos perfiles como el de ${n}.`,
    eyebrow: "Acceso desbloqueado",
    heading: "Gracias por sumarte",
    bodyUnlocked: (name, url) => (
      <>
        Dejaste tu email para ver los datos de contacto de{" "}
        <EmailLinkInline href={url}>{name}</EmailLinkInline>. Listo — ahora ves los
        canales completos en el portfolio cada vez que vuelvas.
      </>
    ),
    noSpam:
      "Te vamos a avisar cuando se sumen perfiles nuevos relevantes para vos. Sin spam: 1 email cada dos semanas como máximo, y siempre con jugadores reales.",
    moreControlHeading: "¿Querés más control?",
    moreControlBody:
      "Crea una cuenta gratis para guardar perfiles favoritos, recibir alertas personalizadas por posición y país, y desbloquear contactos sin volver a llenar formularios.",
    ctaSignup: "Crear mi cuenta gratis",
    footer: (signUpUrl) => (
      <>
        ¿Sos jugador o representás una agencia? También podés{" "}
        <EmailLinkInline href={signUpUrl} tone="subtle">
          crear tu propio perfil profesional
        </EmailLinkInline>{" "}
        en &apos;BallersHub.
      </>
    ),
  },
  en: {
    preheader: (n) => `We'll let you know when new profiles like ${n}'s appear.`,
    eyebrow: "Access unlocked",
    heading: "Thanks for joining",
    bodyUnlocked: (name, url) => (
      <>
        You left your email to see the contact details for{" "}
        <EmailLinkInline href={url}>{name}</EmailLinkInline>. Done — you can now see
        the full channels on the portfolio every time you come back.
      </>
    ),
    noSpam:
      "We'll let you know when relevant new profiles join. No spam: at most 1 email every two weeks, always with real players.",
    moreControlHeading: "Want more control?",
    moreControlBody:
      "Create a free account to save favorite profiles, get personalized alerts by position and country, and unlock contacts without filling out forms again.",
    ctaSignup: "Create my free account",
    footer: (signUpUrl) => (
      <>
        Are you a player or do you represent an agency? You can also{" "}
        <EmailLinkInline href={signUpUrl} tone="subtle">
          create your own professional profile
        </EmailLinkInline>{" "}
        on &apos;BallersHub.
      </>
    ),
  },
  it: {
    preheader: (n) => `Ti avviseremo quando compariranno nuovi profili come quello di ${n}.`,
    eyebrow: "Accesso sbloccato",
    heading: "Grazie per esserti unito",
    bodyUnlocked: (name, url) => (
      <>
        Hai lasciato la tua email per vedere i contatti di{" "}
        <EmailLinkInline href={url}>{name}</EmailLinkInline>. Fatto — ora vedi tutti
        i canali nel portfolio ogni volta che torni.
      </>
    ),
    noSpam:
      "Ti avviseremo quando si aggiungono nuovi profili rilevanti per te. Niente spam: 1 email ogni due settimane al massimo, sempre con giocatori reali.",
    moreControlHeading: "Vuoi più controllo?",
    moreControlBody:
      "Crea un account gratuito per salvare i profili preferiti, ricevere avvisi personalizzati per ruolo e paese e sbloccare i contatti senza ricompilare moduli.",
    ctaSignup: "Crea il mio account gratuito",
    footer: (signUpUrl) => (
      <>
        Sei un giocatore o rappresenti un&apos;agenzia? Puoi anche{" "}
        <EmailLinkInline href={signUpUrl} tone="subtle">
          creare il tuo profilo professionale
        </EmailLinkInline>{" "}
        su &apos;BallersHub.
      </>
    ),
  },
  pt: {
    preheader: (n) => `Avisaremos quando surgirem novos perfis como o de ${n}.`,
    eyebrow: "Acesso desbloqueado",
    heading: "Obrigado por participar",
    bodyUnlocked: (name, url) => (
      <>
        Você deixou seu e-mail para ver os contatos de{" "}
        <EmailLinkInline href={url}>{name}</EmailLinkInline>. Pronto — agora você vê
        os canais completos no portfólio toda vez que voltar.
      </>
    ),
    noSpam:
      "Avisaremos quando entrarem novos perfis relevantes para você. Sem spam: no máximo 1 e-mail a cada duas semanas, sempre com jogadores reais.",
    moreControlHeading: "Quer mais controle?",
    moreControlBody:
      "Crie uma conta grátis para salvar perfis favoritos, receber alertas personalizados por posição e país, e desbloquear contatos sem preencher formulários de novo.",
    ctaSignup: "Criar minha conta grátis",
    footer: (signUpUrl) => (
      <>
        Você é jogador ou representa uma agência? Você também pode{" "}
        <EmailLinkInline href={signUpUrl} tone="subtle">
          criar seu próprio perfil profissional
        </EmailLinkInline>{" "}
        na &apos;BallersHub.
      </>
    ),
  },
};

/**
 * First touch for visitors that left their email on a public portfolio
 * (lead capture flow). Soft pitch: thanks them, sets expectation, and offers
 * the upgrade path to a real account.
 *
 * Localized (F6 phase 3): copy follows the portfolio page locale (threaded by
 * the lead route); falls back to es. The player name stays verbatim.
 */
export default function LeadWelcomeEmail({
  playerName,
  portfolioUrl,
  signUpUrl,
  recipientEmail,
  unsubscribeToken,
  locale = "es",
}: LeadWelcomeProps) {
  const firstName = (playerName || "").split(" ")[0] || playerName;
  const c = COPY[locale] ?? COPY.es;

  return (
    <EmailLayout
      preheader={c.preheader(firstName)}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading}</EmailHeading>

      <EmailParagraph>{c.bodyUnlocked(playerName, portfolioUrl)}</EmailParagraph>

      <EmailParagraph tone="muted">{c.noSpam}</EmailParagraph>

      <EmailDivider tone="subtle" spacing={24} />

      <EmailHeading level={3}>{c.moreControlHeading}</EmailHeading>
      <EmailParagraph tone="muted">{c.moreControlBody}</EmailParagraph>

      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <EmailButton href={signUpUrl} variant="lime">
          {c.ctaSignup}
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="subtle">{c.footer(signUpUrl)}</EmailParagraph>
    </EmailLayout>
  );
}
