// src/components/site/about/ImpactStats.tsx
// Bloque de impacto: números grandes con textura corporativa.
// Diseño edge-to-edge dentro del contenedor principal, respetando el grid del DS.

import { Sparkles } from "lucide-react";

import { ACCENT_STYLES, IMPACT_STATS, type Stat } from "./data";

export default function ImpactStats() {
  return (
    <section className="relative overflow-hidden rounded-bh-xl border border-white/[0.08] bg-bh-surface-1 px-6 py-12 md:px-10 md:py-14">
      {/* Glow corporativo de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 0% 30%, rgba(204,255,0,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 100% 70%, rgba(0,194,255,0.07) 0%, transparent 70%)",
        }}
      />
      {/* Grid mesh sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      <div className="relative">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-2 rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
              <Sparkles className="h-3 w-3" />
              Estado del proyecto
            </span>
            <h2 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
              En camino al{" "}
              <span className="text-bh-lime">lanzamiento</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-[1.6] text-bh-fg-3">
            Construimos en silencio durante 8 meses con jugadores y agencias
            piloto. En junio de 2026 abrimos la plataforma para LATAM y España.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {IMPACT_STATS.map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatTile({ stat }: { stat: Stat }) {
  const a = ACCENT_STYLES[stat.accent];
  return (
    <div
      className={`bh-card-lift relative overflow-hidden rounded-bh-lg border ${a.cardBorder} ${a.cardBg} px-6 py-5 backdrop-blur-md ${a.cardShadow}`}
    >
      <div
        className={`font-bh-display text-[2.5rem] font-black leading-none ${a.text}`}
      >
        {stat.value}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-bh-fg-1">
        {stat.label}
      </div>
      <div className="mt-1 text-[11px] leading-[1.5] text-bh-fg-3">
        {stat.description}
      </div>
    </div>
  );
}
