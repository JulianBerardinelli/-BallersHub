import { Section } from "@react-email/components";
import { emailColors, emailFonts, siteUrl } from "../tokens";

/**
 * Brand header — text-based wordmark for resilience across email clients.
 * Mirrors `src/components/brand/Wordmark.tsx`: `'BALLERSHUB` with the
 * apostrophe and "BALLERS" in lime, "HUB" in white. No images here, so
 * the header always renders even with images blocked (Outlook default).
 */
export function EmailHeader() {
  return (
    <Section style={wrapStyle}>
      <a href={siteUrl} style={linkStyle}>
        <span aria-hidden style={apostropheStyle}>&apos;</span>
        <span style={baseWordStyle}>BALLERS</span>
        <span style={{ ...baseWordStyle, color: emailColors.fg1 }}>HUB</span>
      </a>
    </Section>
  );
}

const wrapStyle: React.CSSProperties = {
  padding: "8px 0 24px",
  textAlign: "left",
};

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  letterSpacing: "0.5px",
};

const baseWordStyle: React.CSSProperties = {
  fontFamily: emailFonts.display,
  fontWeight: 900,
  fontSize: "22px",
  lineHeight: 1,
  color: emailColors.lime,
  textTransform: "uppercase",
};

const apostropheStyle: React.CSSProperties = {
  ...baseWordStyle,
  color: emailColors.lime,
  marginRight: "1px",
};
