// src/components/country/CountryFlagIcon.tsx
"use client";

import React from "react";

export default function CountryFlag({
  code,
  title,
  size = 16, // px
  className,
}: {
  code?: string | null;   // ISO-2 (AR, FI, etc.)
  title?: string;         // tooltip (opcional)
  size?: number;          // altura aprox en px
  className?: string;
}) {
  const cc = (code ?? "").toLowerCase();
  const valid = /^[a-z]{2}$/.test(cc);
  // flag-icons escala con font-size
  const style = { fontSize: `${size}px`, lineHeight: 1 };

  if (!valid) {
    // fallback plano (sin emoji)
    return (
      <span
        className={`inline-block align-[-2px] rounded-sm bg-content3 text-transparent ${className ?? ""}`}
        style={{ width: size * (4 / 3), height: size }}
        title={title ?? "N/A"}
        aria-label="no-flag"
      />
    );
  }

  return (
    <span
      className={`fi fi-${cc} inline-block align-[-2px] ${className ?? ""}`}
      style={style}
      title={title ?? code ?? undefined}
      aria-label={title ?? code ?? "flag"}
    />
  );
}
