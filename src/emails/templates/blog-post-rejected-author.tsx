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

export type BlogPostRejectedAuthorProps = {
  authorName: string;
  postTitle: string;
  /** Feedback del admin. Puede ser largo (form input). Se preserva
   *  whitespace con CSS en el template via white-space: pre-wrap. */
  rejectionReason: string;
  /** URL del editor para iterar: /blog/write/[id]. */
  editUrl: string;
  recipientEmail?: string;
  /** Author's preferred_locale (F6 phase 3). Defaults to es. */
  locale?: Locale;
};

type Copy = {
  preheader: (title: string) => string;
  eyebrow: string;
  heading: (name: string) => string;
  intro: string;
  feedbackLabel: string;
  ctaEdit: string;
  footer: string;
};

const COPY: Record<Locale, Copy> = {
  es: {
    preheader: (t) => `Feedback editorial sobre "${t}".`,
    eyebrow: "Feedback editorial",
    heading: (n) => `Pedimos ajustes, ${n}`,
    intro:
      "Revisamos tu artículo y necesita unos cambios antes de publicar. Nada roto — el draft sigue tuyo, podés iterar y volver a enviar.",
    feedbackLabel: "Feedback del editor:",
    ctaEdit: "Editar y volver a enviar",
    footer:
      'Cuando aplicaste los cambios, hacé click en "Enviar para revisión" en el editor — vuelve a pending_review y te avisamos al aprobar.',
  },
  en: {
    preheader: (t) => `Editorial feedback on "${t}".`,
    eyebrow: "Editorial feedback",
    heading: (n) => `A few changes needed, ${n}`,
    intro:
      "We reviewed your article and it needs a few changes before publishing. Nothing's broken — the draft is still yours, you can iterate and resubmit.",
    feedbackLabel: "Editor's feedback:",
    ctaEdit: "Edit and resubmit",
    footer:
      'Once you\'ve applied the changes, click "Submit for review" in the editor — it goes back to pending_review and we\'ll notify you on approval.',
  },
  it: {
    preheader: (t) => `Feedback editoriale su "${t}".`,
    eyebrow: "Feedback editoriale",
    heading: (n) => `Servono alcune modifiche, ${n}`,
    intro:
      "Abbiamo rivisto il tuo articolo e servono alcune modifiche prima di pubblicarlo. Niente di rotto — la bozza resta tua, puoi modificarla e inviarla di nuovo.",
    feedbackLabel: "Feedback dell'editor:",
    ctaEdit: "Modifica e invia di nuovo",
    footer:
      'Una volta applicate le modifiche, fai click su "Invia per revisione" nell\'editor — torna a pending_review e ti avviseremo all\'approvazione.',
  },
  pt: {
    preheader: (t) => `Feedback editorial sobre "${t}".`,
    eyebrow: "Feedback editorial",
    heading: (n) => `Precisamos de ajustes, ${n}`,
    intro:
      "Revisamos seu artigo e ele precisa de alguns ajustes antes de publicar. Nada quebrado — o rascunho continua seu, você pode iterar e enviar de novo.",
    feedbackLabel: "Feedback do editor:",
    ctaEdit: "Editar e enviar novamente",
    footer:
      'Depois de aplicar as mudanças, clique em "Enviar para revisão" no editor — volta para pending_review e avisamos quando aprovar.',
  },
  de: {
    preheader: (t) => `Redaktionelles Feedback zu "${t}".`,
    eyebrow: "Redaktionelles Feedback",
    heading: (n) => `Ein paar Anpassungen nötig, ${n}`,
    intro:
      "Wir haben deinen Artikel geprüft, und er braucht noch ein paar Änderungen vor der Veröffentlichung. Alles in Ordnung — der Entwurf bleibt deiner, du kannst ihn überarbeiten und erneut einreichen.",
    feedbackLabel: "Feedback des Redakteurs:",
    ctaEdit: "Bearbeiten und erneut einreichen",
    footer:
      'Sobald du die Änderungen umgesetzt hast, klicke im Editor auf "Zur Prüfung einreichen" — der Beitrag wechselt zurück zu pending_review, und wir benachrichtigen dich bei der Freigabe.',
  },
  fr: {
    preheader: (t) => `Retour éditorial sur "${t}".`,
    eyebrow: "Retour éditorial",
    heading: (n) => `Quelques ajustements nécessaires, ${n}`,
    intro:
      "Nous avons relu ton article et il nécessite quelques modifications avant publication. Rien de grave — le brouillon reste le tien, tu peux le retravailler et le renvoyer.",
    feedbackLabel: "Retour de l'éditeur :",
    ctaEdit: "Modifier et renvoyer",
    footer:
      'Une fois les modifications appliquées, clique sur "Soumettre pour révision" dans l\'éditeur — l\'article repasse en pending_review et nous te prévenons dès son approbation.',
  },
  fi: {
    preheader: (t) => `Toimituksellinen palaute artikkelista "${t}".`,
    eyebrow: "Toimituksellinen palaute",
    heading: (n) => `Muutamia muutoksia tarvitaan, ${n}`,
    intro:
      "Kävimme artikkelisi läpi, ja se kaipaa muutamia muutoksia ennen julkaisua. Mikään ei ole pielessä — luonnos on yhä sinun, voit muokata sitä ja lähettää uudelleen.",
    feedbackLabel: "Toimittajan palaute:",
    ctaEdit: "Muokkaa ja lähetä uudelleen",
    footer:
      'Kun olet tehnyt muutokset, klikkaa editorissa "Lähetä tarkistettavaksi" — artikkeli palaa tilaan pending_review ja ilmoitamme sinulle hyväksynnästä.',
  },
};

/**
 * Notifica al autor blogger que su post fue rechazado con feedback.
 *
 * Localized (F6 phase 3): copy follows the author's preferred_locale (resolved
 * in resend.ts); falls back to es. The admin's rejection feedback is shown
 * verbatim (it's written by the editor, not translated).
 */
export default function BlogPostRejectedAuthorEmail({
  authorName,
  postTitle,
  rejectionReason,
  editUrl,
  recipientEmail,
  locale = "es",
}: BlogPostRejectedAuthorProps) {
  const firstName = (authorName || "").split(" ")[0] || authorName;
  const c = COPY[locale] ?? COPY.es;

  return (
    <EmailLayout
      preheader={c.preheader(postTitle)}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading(firstName)}</EmailHeading>

      <EmailParagraph>{c.intro}</EmailParagraph>

      <EmailCard>
        <EmailParagraph tone="default">
          <strong>{postTitle}</strong>
        </EmailParagraph>
      </EmailCard>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailParagraph tone="default">
        <strong>{c.feedbackLabel}</strong>
      </EmailParagraph>

      {/*
        EmailCard neutral + raw <div> con white-space: pre-wrap.
        Usamos <div> en lugar de EmailParagraph porque este último no
        expone una prop `style` y necesitamos preservar saltos de línea
        del feedback del admin (textarea input).
      */}
      <EmailCard tone="neutral">
        <div
          style={{
            fontFamily:
              "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#FFFFFF",
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {rejectionReason}
        </div>
      </EmailCard>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={editUrl} variant="lime">
          {c.ctaEdit}
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">{c.footer}</EmailParagraph>
    </EmailLayout>
  );
}
