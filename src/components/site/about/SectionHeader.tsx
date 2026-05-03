// src/components/site/about/SectionHeader.tsx
// Encabezado reutilizable: eyebrow + título display + subtítulo opcional.
// Mantiene consistencia tipográfica entre secciones del módulo About.

import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
}: Props) {
  const alignClasses =
    align === "center" ? "items-center text-center mx-auto" : "items-start text-left";

  return (
    <header
      className={`flex max-w-2xl flex-col gap-3 ${alignClasses} ${className}`}
    >
      <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
        {eyebrow}
      </span>
      <h2 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="text-sm leading-[1.65] text-bh-fg-3 md:text-[15px]">
          {description}
        </p>
      ) : null}
    </header>
  );
}
