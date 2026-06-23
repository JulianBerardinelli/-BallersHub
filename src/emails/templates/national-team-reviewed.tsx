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

export type NationalTeamReviewedProps = {
  /** Display name del jugador (firstname-first si lo derivamos). */
  playerName: string;
  /** Resultado de la moderación de la etapa de selección. */
  result: "approved" | "rejected";
  /** Nota opcional que el admin escribió al aprobar/rechazar. */
  note?: string | null;
  /** URL al editor de Selección Nacional del dashboard. */
  dashboardUrl: string;
  recipientEmail?: string;
  /** preferred_locale del jugador (resuelto en resend.ts). Default es. */
  locale?: Locale;
};

type Variant = {
  preheader: string;
  eyebrow: string;
  heading: (name: string) => string;
  intro: string;
  noteLabel: string;
  cta: string;
  footer: string;
};

const COPY: Record<Locale, { approved: Variant; rejected: Variant }> = {
  es: {
    approved: {
      preheader: "Aprobamos tu experiencia en la selección. Ya es visible en tu perfil.",
      eyebrow: "Selección Nacional",
      heading: (n) => `¡Aprobamos tu Selección Nacional, ${n}! 🏅`,
      intro:
        "Revisamos tu experiencia a nivel selección nacional y la aprobamos. Ya aparece publicada en tu perfil de 'BallersHub.",
      noteLabel: "Nota del equipo",
      cta: "Ver mi sección",
      footer:
        "Podés agregar más experiencias o fotos desde tu panel cuando quieras. Cada cambio vuelve a pasar por una revisión rápida.",
    },
    rejected: {
      preheader: "Revisamos tu experiencia en la selección y necesitamos algunos ajustes.",
      eyebrow: "Selección Nacional",
      heading: (n) => `Revisamos tu Selección Nacional, ${n}`,
      intro:
        "Revisamos tu experiencia a nivel selección nacional y, por ahora, no pudimos publicarla. Revisá las observaciones y reenviála cuando esté lista.",
      noteLabel: "Observación del equipo",
      cta: "Revisar mi sección",
      footer:
        "Si tenés dudas sobre esta revisión, respondé este correo y te ayudamos. Podés editar y reenviar tu experiencia desde tu panel.",
    },
  },
  en: {
    approved: {
      preheader: "We approved your national team experience. It's now live on your profile.",
      eyebrow: "National Team",
      heading: (n) => `Your National Team is approved, ${n}! 🏅`,
      intro:
        "We reviewed your national team experience and approved it. It's now published on your 'BallersHub profile.",
      noteLabel: "Note from the team",
      cta: "View my section",
      footer:
        "You can add more experiences or photos from your dashboard anytime. Each change goes through a quick review.",
    },
    rejected: {
      preheader: "We reviewed your national team experience and need a few changes.",
      eyebrow: "National Team",
      heading: (n) => `We reviewed your National Team, ${n}`,
      intro:
        "We reviewed your national team experience and couldn't publish it for now. Check the notes and resubmit when it's ready.",
      noteLabel: "Note from the team",
      cta: "Review my section",
      footer:
        "If you have questions about this review, just reply to this email. You can edit and resubmit your experience from your dashboard.",
    },
  },
  it: {
    approved: {
      preheader: "Abbiamo approvato la tua esperienza in nazionale. Ora è visibile sul tuo profilo.",
      eyebrow: "Nazionale",
      heading: (n) => `La tua Nazionale è approvata, ${n}! 🏅`,
      intro:
        "Abbiamo revisionato la tua esperienza in nazionale e l'abbiamo approvata. Ora è pubblicata sul tuo profilo 'BallersHub.",
      noteLabel: "Nota del team",
      cta: "Vedi la mia sezione",
      footer:
        "Puoi aggiungere altre esperienze o foto dalla tua dashboard quando vuoi. Ogni modifica passa per una revisione rapida.",
    },
    rejected: {
      preheader: "Abbiamo revisionato la tua esperienza in nazionale e servono alcune modifiche.",
      eyebrow: "Nazionale",
      heading: (n) => `Abbiamo revisionato la tua Nazionale, ${n}`,
      intro:
        "Abbiamo revisionato la tua esperienza in nazionale e per ora non abbiamo potuto pubblicarla. Controlla le note e inviala di nuovo quando è pronta.",
      noteLabel: "Nota del team",
      cta: "Rivedi la mia sezione",
      footer:
        "Se hai domande su questa revisione, rispondi a questa email. Puoi modificare e reinviare la tua esperienza dalla tua dashboard.",
    },
  },
  pt: {
    approved: {
      preheader: "Aprovamos sua experiência na seleção. Já está visível no seu perfil.",
      eyebrow: "Seleção Nacional",
      heading: (n) => `Sua Seleção Nacional foi aprovada, ${n}! 🏅`,
      intro:
        "Revisamos sua experiência na seleção nacional e a aprovamos. Já está publicada no seu perfil 'BallersHub.",
      noteLabel: "Nota da equipe",
      cta: "Ver minha seção",
      footer:
        "Você pode adicionar mais experiências ou fotos no seu painel quando quiser. Cada alteração passa por uma revisão rápida.",
    },
    rejected: {
      preheader: "Revisamos sua experiência na seleção e precisamos de alguns ajustes.",
      eyebrow: "Seleção Nacional",
      heading: (n) => `Revisamos sua Seleção Nacional, ${n}`,
      intro:
        "Revisamos sua experiência na seleção nacional e, por enquanto, não pudemos publicá-la. Confira as observações e reenvie quando estiver pronta.",
      noteLabel: "Observação da equipe",
      cta: "Revisar minha seção",
      footer:
        "Se tiver dúvidas sobre esta revisão, responda este e-mail. Você pode editar e reenviar sua experiência no seu painel.",
    },
  },
};

/**
 * Notifica al jugador el resultado de la moderación de su bloque "Selección
 * Nacional" (aprobado o rechazado), incluyendo la nota opcional del admin.
 * Frame localizado por preferred_locale; la nota llega tal cual la escribió el
 * admin (ES). Falla en silencio en el caller (resend.ts).
 */
export default function NationalTeamReviewedEmail({
  playerName,
  result,
  note,
  dashboardUrl,
  recipientEmail,
  locale = "es",
}: NationalTeamReviewedProps) {
  const firstName = (playerName || "").split(" ")[0] || playerName || "";
  const c = (COPY[locale] ?? COPY.es)[result];
  const trimmedNote = typeof note === "string" ? note.trim() : "";

  return (
    <EmailLayout preheader={c.preheader} recipientEmail={recipientEmail}>
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading(firstName)}</EmailHeading>

      <EmailParagraph>{c.intro}</EmailParagraph>

      {trimmedNote ? (
        <EmailCard>
          <EmailParagraph tone="muted">{c.noteLabel}</EmailParagraph>
          <EmailParagraph tone="default">
            <strong>{trimmedNote}</strong>
          </EmailParagraph>
        </EmailCard>
      ) : null}

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
