// src/components/site/about/MissionVision.tsx
// Tres pilares: Misión, Visión, Propósito.
// Cada bloque usa el accent del DS (lime/blue) y tarjetas con bh-card-lift.

import SectionHeader from "./SectionHeader";
import { ACCENT_STYLES, PILLARS, type Pillar } from "./data";

export default function MissionVision() {
  return (
    <section className="space-y-10">
      <SectionHeader
        eyebrow="Misión · Visión · Objetivos"
        title={
          <>
            Tres pilares que sostienen{" "}
            <span className="text-bh-lime">cada decisión</span>
          </>
        }
        description="Misión, visión y objetivos no son frases en una pared: son el filtro con el que decidimos qué construir, qué priorizar y cómo acompañar a jugadores y agencias."
      />

      <div className="grid gap-5 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <PillarCard key={pillar.title} pillar={pillar} />
        ))}
      </div>
    </section>
  );
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  const Icon = pillar.icon;
  const a = ACCENT_STYLES[pillar.accent];

  return (
    <article
      className={`bh-card-lift group relative flex h-full flex-col gap-5 overflow-hidden rounded-bh-lg border ${a.cardBorder} bg-bh-surface-1 p-6 ${a.cardShadow}`}
    >
      {/* Glow esquina superior — refuerza identidad accent */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl transition-opacity duration-300 ${a.cardBg} group-hover:opacity-100`}
      />

      <div className="relative flex items-center justify-between">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-bh-md border ${a.iconWrap}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={`inline-flex items-center rounded-bh-pill border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${a.tagBg} ${a.tagText} ${a.tagBorder}`}
        >
          {pillar.tag}
        </span>
      </div>

      <h3 className="relative font-bh-display text-2xl font-black uppercase leading-none tracking-[-0.005em] text-bh-fg-1">
        {pillar.title}
      </h3>

      <p className="relative text-sm leading-[1.6] text-bh-fg-3">
        {pillar.description}
      </p>
    </article>
  );
}
