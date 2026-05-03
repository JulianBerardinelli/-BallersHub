import { Heading } from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors, emailFonts } from "../tokens";

type Props = {
  level?: 1 | 2 | 3;
  children: ReactNode;
};

/**
 * Display headings for marketing emails. Levels:
 * - 1: hero of the email (big, uppercase, Barlow Condensed Black)
 * - 2: section title
 * - 3: card title
 */
export function EmailHeading({ level = 2, children }: Props) {
  const style = stylesByLevel[level];
  const tag = (`h${level}` as "h1" | "h2" | "h3");
  return (
    <Heading as={tag} style={style}>
      {children}
    </Heading>
  );
}

const baseHeading: React.CSSProperties = {
  fontFamily: emailFonts.display,
  color: emailColors.fg1,
  textTransform: "uppercase",
  margin: "0 0 12px 0",
};

const stylesByLevel: Record<1 | 2 | 3, React.CSSProperties> = {
  1: {
    ...baseHeading,
    fontSize: "32px",
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: "-0.005em",
  },
  2: {
    ...baseHeading,
    fontSize: "22px",
    fontWeight: 800,
    lineHeight: 1.15,
  },
  3: {
    ...baseHeading,
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: "0.005em",
  },
};
