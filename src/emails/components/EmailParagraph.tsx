import { Text } from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors, emailFonts } from "../tokens";

type Tone = "default" | "muted" | "subtle";

type Props = {
  tone?: Tone;
  children: ReactNode;
};

/** Body paragraph in DM Sans. */
export function EmailParagraph({ tone = "default", children }: Props) {
  return <Text style={tones[tone]}>{children}</Text>;
}

const base: React.CSSProperties = {
  fontFamily: emailFonts.body,
  fontSize: "14px",
  lineHeight: 1.6,
  margin: "0 0 16px 0",
};

const tones: Record<Tone, React.CSSProperties> = {
  default: { ...base, color: emailColors.fg1 },
  muted: { ...base, color: emailColors.fg2, fontSize: "13px" },
  subtle: { ...base, color: emailColors.fg3, fontSize: "12px" },
};
