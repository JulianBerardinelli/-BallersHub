import { Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors, emailFonts, emailRadius } from "../tokens";

type Props = {
  /** Number rendered inside the lime stamp on the left. */
  index: number;
  title: ReactNode;
  /** Optional pill rendered above the title (e.g. "Paso clave"). */
  badge?: string;
  children: ReactNode;
};

/**
 * Numbered step card — used in onboarding / instructional emails to
 * walk the recipient through a sequence. Mirrors the pattern used in
 * the legacy welcome HTML but rebuilt with brand tokens (lime stamp,
 * surface-1 card) and table-based layout for Outlook compat.
 */
export function EmailStep({ index, title, badge, children }: Props) {
  return (
    <Section style={cardStyle}>
      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tbody>
          <tr>
            <td valign="top" width={48} style={stampCellStyle}>
              <div style={stampStyle}>{index}</div>
            </td>
            <td valign="top">
              {badge ? <span style={badgeStyle}>{badge}</span> : null}
              <Text style={titleStyle}>{title}</Text>
              <Text style={bodyStyle}>{children}</Text>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

const cardStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  padding: "16px",
  borderRadius: `${emailRadius.lg}px`,
  backgroundColor: emailColors.surface1,
  border: `1px solid ${emailColors.borderSubtle}`,
};

const stampCellStyle: React.CSSProperties = {
  paddingRight: "14px",
  verticalAlign: "top",
};

const stampStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  lineHeight: "32px",
  borderRadius: `${emailRadius.md}px`,
  backgroundColor: emailColors.lime,
  color: emailColors.bg,
  fontFamily: emailFonts.display,
  fontWeight: 900,
  fontSize: "16px",
  textAlign: "center",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  marginBottom: "6px",
  padding: "2px 8px",
  borderRadius: `${emailRadius.sm}px`,
  backgroundColor: emailColors.lime,
  color: emailColors.bg,
  fontFamily: emailFonts.body,
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  lineHeight: 1.4,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 6px 0",
  fontFamily: emailFonts.display,
  fontSize: "16px",
  fontWeight: 700,
  lineHeight: 1.25,
  color: emailColors.fg1,
  textTransform: "uppercase",
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: emailFonts.body,
  fontSize: "13px",
  lineHeight: 1.6,
  color: emailColors.fg2,
};
