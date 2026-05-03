// src/components/site/about/StoryTimeline.tsx
// Línea de tiempo vertical con hitos. Diseño responsive:
// - Mobile: timeline a la izquierda, cards a la derecha.
// - Desktop: timeline central con cards alternadas (zig-zag).

import SectionHeader from "./SectionHeader";
import { ACCENT_STYLES, MILESTONES, type Milestone } from "./data";

export default function StoryTimeline() {
  return (
    <section className="space-y-12">
      <SectionHeader
        eyebrow="Nuestra historia"
        title={
          <>
            De una idea en cancha a una red{" "}
            <span className="text-bh-lime">en expansión</span>
          </>
        }
        description="Cada hito está marcado por feedback real de la comunidad. Iteramos rápido, escuchamos primero y construimos a largo plazo."
      />

      {/* Timeline */}
      <ol className="relative mx-auto max-w-5xl">
        {/* Eje vertical */}
        <span
          aria-hidden
          className="absolute left-3 top-1 h-full w-px bg-gradient-to-b from-bh-lime/40 via-white/[0.10] to-bh-blue/40 md:left-1/2 md:-translate-x-1/2"
        />
        <div className="space-y-10 md:space-y-14">
          {MILESTONES.map((milestone, index) => (
            <MilestoneItem
              key={milestone.year}
              milestone={milestone}
              index={index}
            />
          ))}
        </div>
      </ol>
    </section>
  );
}

function MilestoneItem({
  milestone,
  index,
}: {
  milestone: Milestone;
  index: number;
}) {
  const a = ACCENT_STYLES[milestone.accent];
  const isEven = index % 2 === 0;

  return (
    <li className="relative pl-12 md:pl-0">
      {/* Punto sobre el eje */}
      <span
        aria-hidden
        className={`absolute left-2 top-2 h-3 w-3 -translate-x-1/2 rounded-full ${a.dot} md:left-1/2`}
      />
      {/* Layout desktop: cards alternadas */}
      <div
        className={`grid gap-6 md:grid-cols-2 md:items-center ${
          isEven ? "" : "md:[&>*:first-child]:order-2"
        }`}
      >
        {/* Año / etiqueta */}
        <div
          className={`hidden md:flex ${
            isEven ? "md:justify-end md:pr-10" : "md:justify-start md:pl-10"
          }`}
        >
          <YearBadge year={milestone.year} accent={milestone.accent} />
        </div>

        {/* Card del hito */}
        <div
          className={`bh-card-lift relative rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5 md:p-6 ${
            isEven ? "md:ml-10" : "md:mr-10"
          }`}
        >
          {/* Año visible en mobile (encima del título) */}
          <div className="mb-3 md:hidden">
            <YearBadge year={milestone.year} accent={milestone.accent} />
          </div>
          <h3 className="font-bh-heading text-lg font-bold leading-[1.2] text-bh-fg-1 md:text-xl">
            {milestone.title}
          </h3>
          <p className="mt-2 text-sm leading-[1.6] text-bh-fg-3">
            {milestone.description}
          </p>
        </div>
      </div>
    </li>
  );
}

function YearBadge({ year, accent }: { year: string; accent: Milestone["accent"] }) {
  const a = ACCENT_STYLES[accent];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-bh-pill border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${a.tagBg} ${a.tagText} ${a.tagBorder}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${a.dot}`} />
      {year}
    </div>
  );
}
