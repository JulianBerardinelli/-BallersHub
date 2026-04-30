import { Section } from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors, emailRadius } from "../tokens";

type Tone = "neutral" | "lime" | "blue";

type Props = {
  tone?: Tone;
  children: ReactNode;
};

/**
 * Surface card. Mirrors `SectionCard` in the dashboard — soft surface,
 * subtle border, branded variants for accenting feature drops.
 */
export function EmailCard({ tone = "neutral", children }: Props) {
  return <Section style={styles[tone]}>{children}</Section>;
}

const baseStyle: React.CSSProperties = {
  borderRadius: `${emailRadius.lg}px`,
  padding: "20px",
  margin: "0 0 16px 0",
  borderWidth: "1px",
  borderStyle: "solid",
};

const styles: Record<Tone, React.CSSProperties> = {
  neutral: {
    ...baseStyle,
    backgroundColor: emailColors.surface1,
    borderColor: emailColors.borderSubtle,
  },
  lime: {
    ...baseStyle,
    backgroundColor: emailColors.limeOnBgGlow,
    borderColor: emailColors.lime,
  },
  blue: {
    ...baseStyle,
    backgroundColor: emailColors.surface1,
    borderColor: emailColors.blue,
  },
};
