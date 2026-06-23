import {
  EmailButton,
  EmailCard,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";
import type { Locale } from "@/i18n/routing";

export type AdminProfileCorrectedProps = {
  /** Display name del jugador (firstname-first si lo derivamos). */
  playerName: string;
  /** Label de la sección revisada (ES, p.ej. "trayectoria"). */
  sectionLabel: string;
  /** Nota que el admin escribió al finalizar la revisión. */
  note: string;
  /** URL al editor del dashboard correspondiente. */
  dashboardUrl: string;
  recipientEmail?: string;
  /** preferred_locale del jugador (resuelto en resend.ts). Default es. */
  locale?: Locale;
};

type Copy = {
  preheader: string;
  eyebrow: string;
  heading: (name: string) => string;
  intro: (section: string) => string;
  noteLabel: string;
  cta: string;
  footer: string;
};

const COPY: Record<Locale, Copy> = {
  es: {
    preheader: "Un miembro del equipo revisó tu perfil y te dejó una nota.",
    eyebrow: "Revisión de tu perfil",
    heading: (n) => `Revisamos tu perfil, ${n}`,
    intro: (section) =>
      `Un miembro del equipo de 'BallersHub revisó tu ${section} y te dejó esta nota:`,
    noteLabel: "Nota del equipo",
    cta: "Ver mi perfil",
    footer:
      "Si tenés dudas sobre esta revisión, respondé este correo y te ayudamos. Podés seguir editando tu perfil desde tu dashboard cuando quieras.",
  },
  en: {
    preheader: "A team member reviewed your profile and left you a note.",
    eyebrow: "Profile review",
    heading: (n) => `We reviewed your profile, ${n}`,
    intro: (section) =>
      `A 'BallersHub team member reviewed your ${section} and left you this note:`,
    noteLabel: "Note from the team",
    cta: "View my profile",
    footer:
      "If you have questions about this review, just reply to this email. You can keep editing your profile from your dashboard anytime.",
  },
  it: {
    preheader: "Un membro del team ha revisionato il tuo profilo e ti ha lasciato una nota.",
    eyebrow: "Revisione del profilo",
    heading: (n) => `Abbiamo revisionato il tuo profilo, ${n}`,
    intro: (section) =>
      `Un membro del team di 'BallersHub ha revisionato il tuo ${section} e ti ha lasciato questa nota:`,
    noteLabel: "Nota del team",
    cta: "Vedi il mio profilo",
    footer:
      "Se hai domande su questa revisione, rispondi a questa email. Puoi continuare a modificare il tuo profilo dalla tua dashboard quando vuoi.",
  },
  pt: {
    preheader: "Um membro da equipe revisou seu perfil e deixou uma nota.",
    eyebrow: "Revisão do seu perfil",
    heading: (n) => `Revisamos seu perfil, ${n}`,
    intro: (section) =>
      `Um membro da equipe da 'BallersHub revisou seu ${section} e deixou esta nota:`,
    noteLabel: "Nota da equipe",
    cta: "Ver meu perfil",
    footer:
      "Se tiver dúvidas sobre esta revisão, responda este e-mail. Você pode continuar editando seu perfil no seu painel quando quiser.",
  },
  de: {
    preheader: "Ein Teammitglied hat Ihr Profil überprüft und Ihnen eine Notiz hinterlassen.",
    eyebrow: "Überprüfung Ihres Profils",
    heading: (n) => `Wir haben Ihr Profil überprüft, ${n}`,
    intro: (section) =>
      `Ein Teammitglied von 'BallersHub hat Ihren Abschnitt „${section}“ überprüft und Ihnen diese Notiz hinterlassen:`,
    noteLabel: "Notiz vom Team",
    cta: "Mein Profil ansehen",
    footer:
      "Wenn Sie Fragen zu dieser Überprüfung haben, antworten Sie einfach auf diese E-Mail. Sie können Ihr Profil jederzeit über Ihr Dashboard weiter bearbeiten.",
  },
  fr: {
    preheader: "Un membre de l'équipe a examiné votre profil et vous a laissé une note.",
    eyebrow: "Examen de votre profil",
    heading: (n) => `Nous avons examiné votre profil, ${n}`,
    intro: (section) =>
      `Un membre de l'équipe 'BallersHub a examiné votre section « ${section} » et vous a laissé cette note :`,
    noteLabel: "Note de l'équipe",
    cta: "Voir mon profil",
    footer:
      "Si vous avez des questions sur cet examen, répondez simplement à cet e-mail. Vous pouvez continuer à modifier votre profil depuis votre tableau de bord à tout moment.",
  },
  fi: {
    preheader: "Tiimin jäsen tarkisti profiilisi ja jätti sinulle viestin.",
    eyebrow: "Profiilisi tarkistus",
    heading: (n) => `Tarkistimme profiilisi, ${n}`,
    intro: (section) =>
      `'BallersHub-tiimin jäsen tarkisti osiosi ”${section}” ja jätti sinulle tämän viestin:`,
    noteLabel: "Tiimin viesti",
    cta: "Näytä profiilini",
    footer:
      "Jos sinulla on kysyttävää tästä tarkistuksesta, vastaa tähän sähköpostiin. Voit jatkaa profiilisi muokkaamista hallintapaneelistasi milloin tahansa.",
  },
};

/**
 * Notifica al jugador que el staff revisó/corrigió una sección de su perfil,
 * incluyendo la NOTA que el admin escribió al finalizar la revisión.
 * Frame localizado por preferred_locale; el sectionLabel + note llegan en ES.
 */
export default function AdminProfileCorrectedEmail({
  playerName,
  sectionLabel,
  note,
  dashboardUrl,
  recipientEmail,
  locale = "es",
}: AdminProfileCorrectedProps) {
  const firstName = (playerName || "").split(" ")[0] || playerName || "";
  const c = COPY[locale] ?? COPY.es;

  return (
    <EmailLayout preheader={c.preheader} recipientEmail={recipientEmail}>
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading(firstName)}</EmailHeading>

      <EmailParagraph>{c.intro(sectionLabel)}</EmailParagraph>

      <EmailCard>
        <EmailParagraph tone="muted">{c.noteLabel}</EmailParagraph>
        <EmailParagraph tone="default">
          <strong>{note}</strong>
        </EmailParagraph>
      </EmailCard>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={dashboardUrl} variant="lime">
          {c.cta}
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">{c.footer}</EmailParagraph>
    </EmailLayout>
  );
}
