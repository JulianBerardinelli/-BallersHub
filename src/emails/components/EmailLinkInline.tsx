import { Link } from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors } from "../tokens";

/**
 * Branded inline link — for use inside a paragraph. Lime by default
 * (matches the public site's accent), but `tone="subtle"` produces
 * the muted underline style we use in the email footer.
 */
export function EmailLinkInline({
  href,
  tone = "lime",
  children,
}: {
  href: string;
  tone?: "lime" | "subtle";
  children: ReactNode;
}) {
  return (
    <Link href={href} style={tones[tone]}>
      {children}
    </Link>
  );
}

const tones = {
  lime: {
    color: emailColors.lime,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  } as React.CSSProperties,
  subtle: {
    color: emailColors.fg2,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  } as React.CSSProperties,
};
