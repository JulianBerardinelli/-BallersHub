import {
  EmailButton,
  EmailCard,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";

export type BlogPostRejectedAuthorProps = {
  authorName: string;
  postTitle: string;
  /** Feedback del admin. Puede ser largo (form input). Se preserva
   *  whitespace con CSS en el template via white-space: pre-wrap. */
  rejectionReason: string;
  /** URL del editor para iterar: /blog/write/[id]. */
  editUrl: string;
  recipientEmail?: string;
};

/**
 * Notifica al autor blogger que su post fue rechazado con feedback.
 *
 * Audiencia: bloggers (autores invitados). Transactional puro.
 *
 * Tono: respetuoso, constructivo. El feedback del admin va destacado en
 * una card. CTA principal es editar el post (que ya viene en estado
 * 'rejected', editable, y al re-submitear vuelve a 'pending_review').
 */
export default function BlogPostRejectedAuthorEmail({
  authorName,
  postTitle,
  rejectionReason,
  editUrl,
  recipientEmail,
}: BlogPostRejectedAuthorProps) {
  const firstName = (authorName || "").split(" ")[0] || authorName;

  return (
    <EmailLayout
      preheader={`Feedback editorial sobre "${postTitle}".`}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>Feedback editorial</EmailEyebrow>
      <EmailHeading level={1}>Pedimos ajustes, {firstName}</EmailHeading>

      <EmailParagraph>
        Revisamos tu artículo y necesita unos cambios antes de publicar. Nada
        roto — el draft sigue tuyo, podés iterar y volver a enviar.
      </EmailParagraph>

      <EmailCard>
        <EmailParagraph tone="default">
          <strong>{postTitle}</strong>
        </EmailParagraph>
      </EmailCard>

      <EmailDivider tone="subtle" spacing={20} />

      <EmailParagraph tone="default">
        <strong>Feedback del editor:</strong>
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
          Editar y volver a enviar
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        Cuando aplicaste los cambios, hacé click en &quot;Enviar para
        revisión&quot; en el editor — vuelve a pending_review y te avisamos al
        aprobar.
      </EmailParagraph>
    </EmailLayout>
  );
}
