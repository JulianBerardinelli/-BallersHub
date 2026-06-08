// src/app/(site)/about/page.tsx
// Página /about — composición declarativa de secciones del módulo About.
// Hereda layout, ambient (orbs + grid mesh) y motion provider del SiteLayout.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { localizedAlternates } from "@/lib/seo/hreflang";
import type { Locale } from "@/i18n/routing";
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
import { AboutPageJsonLd } from "@/lib/seo/aboutPageJsonLd";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("about");
  const title = t("meta.title");
  const description = t("meta.description");
  return {
    title,
    description,
    alternates: localizedAlternates(locale as Locale, "/about"),
    openGraph: {
      title: `${title} · 'BallersHub`,
      description,
      url: "/about",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · 'BallersHub`,
      description,
    },
  };
}

export default function AboutPage() {
  return (
    <div className="space-y-24 pb-12 md:space-y-28">
      <AboutPageJsonLd />
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
