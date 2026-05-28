import {
  EmailButton,
  EmailCard,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";

export type BlogPostApprovedAuthorProps = {
  /** Display name del autor (firstname-first si lo derivamos). */
  authorName: string;
  /** Título del post aprobado. */
  postTitle: string;
  /** Cluster label en español. */
  clusterLabel: string;
  /** URL pública del post: /blog/[slug]. */
  postUrl: string;
  /** URL del author hub: /blog/authors/[slug] — para que el autor vea su hub. */
  authorHubUrl?: string;
  recipientEmail?: string;
};

/**
 * Notifica al autor blogger que su post fue aprobado y publicado.
 *
 * Audiencia: bloggers (autores invitados). Transactional puro —
 * accionable porque le pasamos link directo al post publicado.
 *
 * Tono: celebratorio sin ser cursi. Refuerza el flywheel del blog:
 * cuando publica, fortalece su author hub y aporta link equity a los
 * portfolios que linkeó.
 */
export default function BlogPostApprovedAuthorEmail({
  authorName,
  postTitle,
  clusterLabel,
  postUrl,
  authorHubUrl,
  recipientEmail,
}: BlogPostApprovedAuthorProps) {
  const firstName = (authorName || "").split(" ")[0] || authorName;

  return (
    <EmailLayout
      preheader={`Publicamos "${postTitle}".`}
      recipientEmail={recipientEmail}
    >
      <EmailEyebrow>Tu artículo está publicado</EmailEyebrow>
      <EmailHeading level={1}>¡Listo, {firstName}!</EmailHeading>

      <EmailParagraph>
        Aprobamos tu post y ya está en vivo en el blog de &apos;BallersHub.
      </EmailParagraph>

      <EmailCard>
        <EmailParagraph tone="default">
          <strong>{postTitle}</strong>
        </EmailParagraph>
        <EmailParagraph tone="muted">{clusterLabel}</EmailParagraph>
      </EmailCard>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={postUrl} variant="lime">
          Ver mi artículo publicado
        </EmailButton>
      </div>

      {authorHubUrl && (
        <>
          <EmailDivider tone="subtle" spacing={24} />
          <EmailParagraph tone="muted">
            También sumamos el post a tu página de autor. Podés compartir tu hub
            con clubes y agencias:
          </EmailParagraph>
          <div style={{ marginTop: 12, marginBottom: 8 }}>
            <EmailButton href={authorHubUrl} variant="outline">
              Ver mi página de autor
            </EmailButton>
          </div>
        </>
      )}

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">
        Gracias por sumar contenido editorial al ecosistema. Los posts con más
        links a perfiles reales son los que mejor performance tienen — si
        querés escribir otro, abrí /blog/write desde tu dashboard.
      </EmailParagraph>
    </EmailLayout>
  );
}
