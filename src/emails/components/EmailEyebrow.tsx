import { Text } from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors, emailFonts } from "../tokens";

/**
 * Branded eyebrow label — small uppercase lime text used above section
 * headings (e.g. "NUEVO PERFIL", "CONTACTO DIRECTO"). Same role as the
 * `<span className="text-[var(--theme-accent)]">` patterns used across
 * the public portfolio.
 */
export function EmailEyebrow({ children }: { children: ReactNode }) {
  return <Text style={style}>{children}</Text>;
}

const style: React.CSSProperties = {
  fontFamily: emailFonts.body,
  fontSize: "10px",
  fontWeight: 800,
  lineHeight: 1.2,
  color: emailColors.lime,
  textTransform: "uppercase",
  letterSpacing: "0.32em",
  margin: "0 0 8px 0",
};
