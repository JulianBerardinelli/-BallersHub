// src/components/datetime/ClientDateOnly.tsx
"use client";

import React from "react";

export default function ClientDate({
  iso,
  locale = "es-AR",
  className,
}: {
  iso: string;
  locale?: string;
  className?: string;
}) {
  const [dateText, setDateText] = React.useState("");
  const [fullText, setFullText] = React.useState("");

  React.useEffect(() => {
    const d = new Date(iso);
    setDateText(d.toLocaleDateString(locale)); // solo fecha
    setFullText(d.toLocaleString(locale, { hour12: false })); // fecha+hora → tooltip
  }, [iso, locale]);

  return (
    <span className={`tabular-nums ${className ?? ""}`} title={fullText} suppressHydrationWarning>
      {dateText || "—"}
    </span>
  );
}
