import { Hr } from "@react-email/components";
import { emailColors } from "../tokens";

type Props = {
  /** "subtle" (default), "default", or "strong" — maps to bh border tokens. */
  tone?: "subtle" | "default" | "strong";
  /** Vertical space above + below the rule, in px. */
  spacing?: number;
};

export function EmailDivider({ tone = "subtle", spacing = 24 }: Props) {
  const color = colorByTone[tone];
  return (
    <Hr
      style={{
        borderColor: color,
        borderWidth: "1px 0 0 0",
        borderStyle: "solid",
        margin: `${spacing}px 0`,
      }}
    />
  );
}

const colorByTone = {
  subtle: emailColors.borderSubtle,
  default: emailColors.borderDefault,
  strong: emailColors.borderStrong,
} as const;
