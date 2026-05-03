// src/app/(site)/about/page.tsx
// Página /about — composición declarativa de secciones del módulo About.
// Hereda layout, ambient (orbs + grid mesh) y motion provider del SiteLayout.

import type { Metadata } from "next";

import {
  AboutCTA,
  AboutHero,
  AudienceSplit,
  CoreValues,
  ImpactStats,
  MissionVision,
  PartnerLogos,
  SectionBand,
  StoryTimeline,
  TeamGrid,
} from "@/components/site/about";

export const metadata: Metadata = {
  title: "Nosotros · 'BallersHub",
  description:
    "Conocé al equipo, la misión, visión y valores detrás de BallersHub: el hub donde el talento futbolístico gana visibilidad real y verificada.",
  openGraph: {
    title: "Nosotros · 'BallersHub",
    description:
      "Construimos el escenario donde el fútbol profesional se conecta. Conocé nuestra misión, visión, equipo e impacto.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="space-y-24 pb-12 md:space-y-28">
      {/* Hero — sin band, ya tiene artwork propio */}
      <AboutHero />

      {/* Pilares: glow lime izquierda */}
      <SectionBand tone="lime" side="left">
        <MissionVision />
      </SectionBand>

      {/* Audiencias: glow blue derecha */}
      <SectionBand tone="blue" side="right">
        <AudienceSplit />
      </SectionBand>

      {/* Diferenciadores: mesh — vibra data/sistema */}
      <SectionBand tone="mesh">
        <CoreValues />
      </SectionBand>

      {/* Timeline: glow lime derecha (asimetría con la anterior lime) */}
      <SectionBand tone="lime" side="right">
        <StoryTimeline />
      </SectionBand>

      {/* Estado del proyecto — ya tiene su propio panel */}
      <ImpactStats />

      {/* Equipo: glow blue izquierda */}
      <SectionBand tone="blue" side="left">
        <TeamGrid />
      </SectionBand>

      {/* Partners — ya tiene su propia caja */}
      <PartnerLogos />

      {/* CTA — ya tiene su propio bloque con border lime */}
      <AboutCTA />
    </div>
  );
}
