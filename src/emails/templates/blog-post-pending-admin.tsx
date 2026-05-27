import {
  EmailButton,
  EmailCard,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";

export type BlogPostPendingAdminProps = {
  /** Display name del autor que submiteó (de blog_authors o fallback). */
  authorName: string;
  /** Email del autor — mostrado al admin para context (no envío). */
  authorEmail: string;
  /** Título del post submitido. */
  postTitle: string;
  /** Cluster (career_guidance / agency_ops / industry_ar) en label. */
  clusterLabel: string;
  /** Reading time en minutos calculado al submit. */
  readingTimeMin: number;
  /** URL del review screen: /admin/blog/[id]. */
  reviewUrl: string;
  /** Email del admin destinatario — opcional, solo para footer/personalización. */
  recipientEmail?: string;
};

/**
 * Notificación al admin cuando un blogger submitea post para review.
 *
 * Audiencia: admins (Julián por ahora). Es transactional puro — no
 * incluye unsubscribe (el admin no se desuscribiría de notificaciones
 * editoriales de su propio sistema).
 *
 * Tono: directo, neutral, accionable. El CTA principal es "Revisar",
 * que lleva a /admin/blog/[id] donde puede approve/reject.
 */
export default function BlogPostPendingAdminEmail({
  authorName,
  authorEmail,
  postTitle,
  clusterLabel,
  readingTimeMin,
  reviewUrl,
  recipientEmail,
}: BlogPostPendingAdminProps) {
  return (
    <EmailLayout
      preheader={`${authorName} envió "${postTitle}" para revisión.`}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>Cola editorial</EmailEyebrow>
      <EmailHeading level={1}>Post nuevo en revisión</EmailHeading>

      <EmailParagraph>
        <strong>{authorName}</strong> ({authorEmail}) envió un artículo para que
        lo revises antes de publicar.
      </EmailParagraph>

      <EmailCard>
        <EmailParagraph tone="default">
          <strong>{postTitle}</strong>
        </EmailParagraph>
        <EmailParagraph tone="muted">
          {clusterLabel} · {readingTimeMin} min de lectura
        </EmailParagraph>
      </EmailCard>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={reviewUrl} variant="lime">
          Revisar artículo
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        Desde la pantalla de review podés aprobar (status → published, aparece
        en /blog), rechazar con feedback (el autor recibe email), editar el
        contenido vos mismo, o despublicar después.
      </EmailParagraph>
    </EmailLayout>
  );
}
