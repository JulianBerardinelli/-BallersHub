import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors, emailFonts, emailLayout } from "../tokens";
import { EmailHeader } from "./EmailHeader";
import { EmailFooter } from "./EmailFooter";

type Props = {
  /** Inbox preview text shown next to the subject in the listing. */
  preheader: string;
  /**
   * Token used to build the public unsubscribe link in the footer.
   * MUST be HMAC-signed for the recipient (see `unsubscribe-token.ts`).
   * For previews / dev, leave undefined and a placeholder is rendered.
   */
  unsubscribeToken?: string;
  /** Optional list-unsubscribe header content for one-click providers. */
  recipientEmail?: string;
  children: ReactNode;
};

/**
 * Master email wrapper — every BallersHub email composes from this.
 *
 * The shell is intentionally minimal: dark page background, centered
 * 600px column on `bh-black`, branded header on top, branded footer
 * on bottom (with legal text + unsubscribe link). Templates only fill
 * the `children` slot.
 */
export function EmailLayout({ preheader, unsubscribeToken, recipientEmail, children }: Props) {
  return (
    <Html lang="es">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark light" />
      </Head>
      <Preview>{preheader}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <EmailHeader />
          <Section style={contentStyle}>{children}</Section>
          <EmailFooter unsubscribeToken={unsubscribeToken} recipientEmail={recipientEmail} />
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  backgroundColor: emailColors.bg,
  fontFamily: emailFonts.body,
  color: emailColors.fg1,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: `${emailLayout.contentWidthPx}px`,
  margin: "0 auto",
  padding: `${emailLayout.outerPaddingPx}px`,
  backgroundColor: emailColors.bg,
};

const contentStyle: React.CSSProperties = {
  padding: "8px 0 0",
};
