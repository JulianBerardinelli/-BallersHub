import { Button } from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors, emailFonts, emailRadius } from "../tokens";

export type EmailButtonVariant = "lime" | "blue" | "outline";

type Props = {
  href: string;
  variant?: EmailButtonVariant;
  children: ReactNode;
  /** Set true for full-width pills (use sparingly). */
  block?: boolean;
};

/**
 * Email-safe primary CTA button. Mirrors `BhButton` variants `lime`,
 * `blue`, `outline` with the same brand language. Uses inline styles
 * because Outlook desktop ignores most external CSS.
 */
export function EmailButton({ href, variant = "lime", block = false, children }: Props) {
  const v = variantStyles[variant];
  return (
    <Button
      href={href}
      style={{
        ...baseStyle,
        ...v,
        width: block ? "100%" : undefined,
        boxSizing: "border-box",
      }}
    >
      {children}
    </Button>
  );
}

const baseStyle: React.CSSProperties = {
  display: "inline-block",
  fontFamily: emailFonts.body,
  fontSize: "13px",
  fontWeight: 700,
  lineHeight: 1.2,
  textDecoration: "none",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "12px 22px",
  borderRadius: `${emailRadius.md}px`,
  textAlign: "center",
};

const variantStyles: Record<EmailButtonVariant, React.CSSProperties> = {
  lime: {
    backgroundColor: emailColors.lime,
    color: emailColors.bg,
    border: `1px solid ${emailColors.lime}`,
  },
  blue: {
    backgroundColor: emailColors.blue,
    color: emailColors.bg,
    border: `1px solid ${emailColors.blue}`,
  },
  outline: {
    backgroundColor: "transparent",
    color: emailColors.fg1,
    border: `1px solid ${emailColors.borderStrong}`,
  },
};
