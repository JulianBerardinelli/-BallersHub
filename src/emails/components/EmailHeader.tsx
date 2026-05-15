import { Img, Section } from "@react-email/components";
import { emailColors, emailFonts, siteUrl } from "../tokens";

/**
 * Brand header — hosted lime isotipo + text wordmark.
 *
 * The isotipo is served from `/public/images/logo/isotipo-lime.svg`.
 * Modern web/mobile clients (Gmail web, Apple Mail, Outlook 365 web,
 * iOS Mail, Android Gmail) render SVG fine; Outlook desktop falls back
 * to the alt text — and we keep the text wordmark next to it so the
 * header always *says something* even when images are blocked.
 *
 * Mirrors `src/components/brand/Wordmark.tsx`: `'BALLERSHUB` with the
 * apostrophe and "BALLERS" in lime, "HUB" in white.
 */
export function EmailHeader() {
  const logoUrl = `${siteUrl}/images/logo/isotipo-lime.svg`;

  return (
    <Section style={wrapStyle}>
      <a href={siteUrl} style={linkStyle}>
        <table cellPadding={0} cellSpacing={0} border={0} role="presentation" style={tableStyle}>
          <tbody>
            <tr>
              <td valign="middle" style={isotipoCellStyle}>
                <Img
                  src={logoUrl}
                  alt="BallersHub"
                  width="28"
                  height="26"
                  style={isotipoStyle}
                />
              </td>
              <td valign="middle" style={wordmarkCellStyle}>
                <span aria-hidden style={apostropheStyle}>&apos;</span>
                <span style={baseWordStyle}>BALLERS</span>
                <span style={{ ...baseWordStyle, color: emailColors.fg1 }}>HUB</span>
              </td>
            </tr>
          </tbody>
        </table>
      </a>
    </Section>
  );
}

const wrapStyle: React.CSSProperties = {
  padding: "8px 0 28px",
  textAlign: "left",
};

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  letterSpacing: "0.5px",
};

const tableStyle: React.CSSProperties = {
  borderCollapse: "collapse",
};

const isotipoCellStyle: React.CSSProperties = {
  paddingRight: "10px",
  verticalAlign: "middle",
};

const isotipoStyle: React.CSSProperties = {
  display: "block",
  border: 0,
  outline: "none",
  textDecoration: "none",
};

const wordmarkCellStyle: React.CSSProperties = {
  verticalAlign: "middle",
  whiteSpace: "nowrap",
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
