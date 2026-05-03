"use client";

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

type NewsletterFormProps = {
  /** Solid color used for the eyebrow + button. */
  accentColor: string;
  /** Foreground color for paragraph copy. */
  fgColor?: string;
  /** Foreground color for hint copy. */
  hintColor?: string;
  /** Background of the input. */
  inputBg?: string;
  /** Border color for the input. */
  inputBorder?: string;
  /** Color of the input text. */
  inputColor?: string;
  /** Color of the button text. Use a high-contrast color against accent. */
  buttonFg?: string;
  /** Optional label above the form. */
  eyebrow?: string;
  /** Optional copy under the eyebrow. */
  copy?: string;
  /** Display font (eyebrow). */
  displayFont?: string;
  /** Body font. */
  bodyFont?: string;
};

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/^([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!m) return `rgba(255,255,255,${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function NewsletterForm({
  accentColor,
  fgColor = "rgba(255,255,255,0.65)",
  hintColor = "rgba(255,255,255,0.40)",
  inputBg = "#080808",
  inputBorder = "rgba(255,255,255,0.10)",
  inputColor = "#FFFFFF",
  buttonFg = "#080808",
  eyebrow = "Newsletter Pro",
  copy = "Insights de scouting, nuevas funciones y casos de éxito. Una vez al mes, sin ruido.",
  displayFont = "var(--font-barlow-condensed), 'Barlow Condensed', sans-serif",
  bodyFont = "var(--font-dm-sans), 'DM Sans', sans-serif",
}: NewsletterFormProps) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div>
      <div
        style={{
          fontFamily: displayFont,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: accentColor,
          marginBottom: 12,
        }}
      >
        {eyebrow}
      </div>
      <p
        style={{
          fontFamily: bodyFont,
          fontSize: 13,
          color: fgColor,
          lineHeight: 1.55,
          margin: "0 0 16px",
          maxWidth: 320,
        }}
      >
        {copy}
      </p>
      <form
        style={{ display: "flex", gap: 6 }}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <input
          type="email"
          required
          aria-label="Tu email"
          placeholder="tu@email.com"
          style={{
            flex: 1,
            height: 42,
            padding: "0 14px",
            background: inputBg,
            border: `1px solid ${inputBorder}`,
            borderRadius: 8,
            fontFamily: bodyFont,
            fontSize: 13,
            color: inputColor,
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            height: 42,
            padding: "0 16px",
            borderRadius: 8,
            border: 0,
            background: accentColor,
            color: buttonFg,
            fontFamily: bodyFont,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow: `0 0 24px ${hexToRgba(accentColor, 0.35)}`,
          }}
        >
          {submitted ? "¡Listo!" : "Suscribirme"}
          {submitted ? (
            <Check size={14} strokeWidth={2.5} />
          ) : (
            <ArrowRight size={14} strokeWidth={2} />
          )}
        </button>
      </form>
      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 11,
          color: hintColor,
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Check size={11} strokeWidth={2.5} />
        Sin spam. Cancelás cuando quieras.
      </div>
    </div>
  );
}
