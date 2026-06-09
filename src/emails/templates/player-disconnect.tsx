import type { ReactNode } from "react";
import {
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";
import type { Locale } from "@/i18n/routing";

export type PlayerDisconnectProps = {
  playerName: string;
  agencyName: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
  /** Recipient's (agency manager) preferred_locale (F6). Defaults to es. */
  locale?: Locale;
};

type Copy = {
  eyebrow: string;
  heading: string;
  preheader: (player: string, agency: string) => string;
  body: (player: string, agency: string) => ReactNode;
  applied: (agency: string) => string;
  footer: string;
};

const COPY: Record<Locale, Copy> = {
  es: {
    eyebrow: "Notificación · Desvinculación",
    heading: "Cambio en tu roster",
    preheader: (p, a) => `${p} canceló la representación con ${a}.`,
    body: (p, a) => (
      <>
        El jugador <strong>{p}</strong> canceló su vinculación con la agencia{" "}
        <strong>{a}</strong> en &apos;BallersHub.
      </>
    ),
    applied: (a) =>
      `El cambio ya está aplicado: el portfolio público del jugador ya no muestra a ${a} como representante, y dejó de aparecer en tu directorio de roster.`,
    footer:
      "Si pensás que esto es un error, contactá a tu jugador directamente. Las desvinculaciones son acciones del titular del perfil y no las gestiona 'BallersHub.",
  },
  en: {
    eyebrow: "Notification · Representation ended",
    heading: "A change in your roster",
    preheader: (p, a) => `${p} ended representation with ${a}.`,
    body: (p, a) => (
      <>
        The player <strong>{p}</strong> has ended their representation with the
        agency <strong>{a}</strong> on &apos;BallersHub.
      </>
    ),
    applied: (a) =>
      `The change is already applied: the player's public portfolio no longer shows ${a} as their representative, and they no longer appear in your roster directory.`,
    footer:
      "If you think this is a mistake, contact your player directly. Disconnections are actions taken by the profile owner and are not managed by 'BallersHub.",
  },
  it: {
    eyebrow: "Notifica · Rappresentanza terminata",
    heading: "Un cambiamento nella tua rosa",
    preheader: (p, a) => `${p} ha concluso la rappresentanza con ${a}.`,
    body: (p, a) => (
      <>
        Il giocatore <strong>{p}</strong> ha concluso il suo legame con
        l&apos;agenzia <strong>{a}</strong> su &apos;BallersHub.
      </>
    ),
    applied: (a) =>
      `La modifica è già applicata: il portfolio pubblico del giocatore non mostra più ${a} come procuratore e non compare più nella tua rosa.`,
    footer:
      "Se pensi che sia un errore, contatta direttamente il tuo giocatore. Le disconnessioni sono azioni del titolare del profilo e non sono gestite da 'BallersHub.",
  },
  pt: {
    eyebrow: "Notificação · Representação encerrada",
    heading: "Mudança na sua carteira",
    preheader: (p, a) => `${p} encerrou a representação com ${a}.`,
    body: (p, a) => (
      <>
        O jogador <strong>{p}</strong> encerrou seu vínculo com a agência{" "}
        <strong>{a}</strong> na &apos;BallersHub.
      </>
    ),
    applied: (a) =>
      `A mudança já está aplicada: o portfólio público do jogador não mostra mais ${a} como representante, e ele deixou de aparecer na sua carteira.`,
    footer:
      "Se você acha que isso é um erro, entre em contato com seu jogador diretamente. As desvinculações são ações do titular do perfil e não são gerenciadas pela 'BallersHub.",
  },
};

/**
 * Notification to an agency when a player unilaterally cancels their
 * representation link. Strictly transactional — no CTA, just info.
 *
 * Localized (F6): copy follows the agency manager's preferred_locale (resolved
 * in resend.ts); falls back to es.
 */
export default function PlayerDisconnectEmail({
  playerName,
  agencyName,
  recipientEmail,
  unsubscribeToken,
  locale = "es",
}: PlayerDisconnectProps) {
  const c = COPY[locale] ?? COPY.es;

  return (
    <EmailLayout
      preheader={c.preheader(playerName, agencyName)}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={2}>{c.heading}</EmailHeading>

      <EmailParagraph>{c.body(playerName, agencyName)}</EmailParagraph>

      <EmailParagraph tone="muted">{c.applied(agencyName)}</EmailParagraph>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="subtle">{c.footer}</EmailParagraph>
    </EmailLayout>
  );
}
