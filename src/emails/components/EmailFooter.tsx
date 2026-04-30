import { Hr, Link, Section, Text } from "@react-email/components";
import { emailColors, emailFonts, senderEmail, siteUrl } from "../tokens";

type Props = {
  unsubscribeToken?: string;
  recipientEmail?: string;
};

/**
 * Brand footer — legal copy + unsubscribe + support contact.
 *
 * `unsubscribeToken` is a short HMAC-signed token; `?token=...` is
 * appended to the public unsubscribe URL so the recipient never types
 * their email. Token signing is in `src/lib/marketing/unsubscribe-token.ts`.
 *
 * The unsubscribe link is required by CAN-SPAM, GDPR, and Resend's
 * deliverability rules. It must work without auth.
 */
export function EmailFooter({ unsubscribeToken, recipientEmail }: Props) {
  const unsubscribeUrl = unsubscribeToken
    ? `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
    : `${siteUrl}/unsubscribe`;

  const year = new Date().getFullYear();

  return (
    <Section style={wrapStyle}>
      <Hr style={dividerStyle} />

      <Text style={smallTextStyle}>
        Recibís este email porque te suscribiste a BallersHub o dejaste tu mail en
        un perfil profesional. Si no querés volver a recibir emails de marketing,{" "}
        <Link href={unsubscribeUrl} style={unsubLinkStyle}>
          desuscribite acá
        </Link>
        .
      </Text>

      {recipientEmail ? (
        <Text style={smallMutedStyle}>
          Enviado a {recipientEmail}.
        </Text>
      ) : null}

      <Text style={smallMutedStyle}>
        ¿Dudas? Escribinos a{" "}
        <Link href={`mailto:${senderEmail}`} style={subtleLinkStyle}>
          {senderEmail}
        </Link>
        .
      </Text>

      <Text style={legalStyle}>
        © {year} BallersHub. Todos los derechos reservados.
      </Text>
    </Section>
  );
}

const wrapStyle: React.CSSProperties = {
  padding: "32px 0 8px",
  textAlign: "left",
};

const dividerStyle: React.CSSProperties = {
  borderColor: emailColors.borderSubtle,
  borderWidth: "1px 0 0 0",
  borderStyle: "solid",
  margin: "0 0 24px 0",
};

const smallTextStyle: React.CSSProperties = {
  fontFamily: emailFonts.body,
  fontSize: "12px",
  lineHeight: 1.55,
  color: emailColors.fg2,
  margin: "0 0 12px 0",
};

const smallMutedStyle: React.CSSProperties = {
  fontFamily: emailFonts.body,
  fontSize: "11px",
  lineHeight: 1.55,
  color: emailColors.fg3,
  margin: "0 0 8px 0",
};

const legalStyle: React.CSSProperties = {
  fontFamily: emailFonts.body,
  fontSize: "11px",
  lineHeight: 1.55,
  color: emailColors.fg4,
  margin: "16px 0 0 0",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const unsubLinkStyle: React.CSSProperties = {
  color: emailColors.lime,
  textDecoration: "underline",
};

const subtleLinkStyle: React.CSSProperties = {
  color: emailColors.fg2,
  textDecoration: "underline",
};
