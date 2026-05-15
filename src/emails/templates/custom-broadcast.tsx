import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";

export type CustomBroadcastProps = {
  /** Optional small lime label above the headline (e.g. "Anuncio", "Nuevo perfil"). */
  eyebrow?: string;
  /** Main headline of the email. */
  headline: string;
  /**
   * Body copy. Plain text is split by blank lines into paragraphs —
   * no markdown, no HTML to keep the surface predictable.
   */
  body: string;
  /** Optional CTA button. Both fields needed to render. */
  ctaLabel?: string;
  ctaUrl?: string;
  /** Optional shorter postscript paragraph after the CTA. */
  postscript?: string;
  recipientEmail?: string;
  unsubscribeToken?: string;
  /** Inbox preview text. Falls back to a heuristic if omitted. */
  preheader?: string;
};

/**
 * Generic broadcast template — for ad-hoc campaigns where the admin
 * doesn't want to ship a new TS template per send. Renders the same
 * BallersHub branded shell, exposes 3 props (eyebrow / headline / body)
 * + an optional CTA button.
 *
 * Use this for: feature announcements, weekly digest summaries, "new
 * profile alerts", etc.
 */
export default function CustomBroadcastEmail({
  eyebrow,
  headline,
  body,
  ctaLabel,
  ctaUrl,
  postscript,
  recipientEmail,
  unsubscribeToken,
  preheader,
}: CustomBroadcastProps) {
  const paragraphs = (body || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const hasCta = Boolean(ctaLabel && ctaUrl);
  const previewText = preheader || (paragraphs[0]?.slice(0, 110) ?? headline);

  return (
    <EmailLayout
      preheader={previewText}
      recipientEmail={recipientEmail}
      unsubscribeToken={unsubscribeToken}
    >
      {eyebrow ? <EmailEyebrow>{eyebrow}</EmailEyebrow> : null}
      <EmailHeading level={1}>{headline}</EmailHeading>

      {paragraphs.map((p, i) => (
        <EmailParagraph key={i}>{p}</EmailParagraph>
      ))}

      {hasCta ? (
        <div style={{ marginTop: 24, marginBottom: 8 }}>
          <EmailButton href={ctaUrl as string} variant="lime">
            {ctaLabel}
          </EmailButton>
        </div>
      ) : null}

      {postscript ? (
        <>
          <EmailDivider tone="subtle" spacing={28} />
          <EmailParagraph tone="muted">{postscript}</EmailParagraph>
        </>
      ) : null}
    </EmailLayout>
  );
}
