// src/components/site/about/index.ts
// Barril del módulo About — un único punto de import desde la page.

export { default as AboutHero } from "./AboutHero";
export { default as MissionVision } from "./MissionVision";
export { default as AudienceSplit } from "./AudienceSplit";
export { default as CoreValues } from "./CoreValues";
export { default as StoryTimeline } from "./StoryTimeline";
export { default as ImpactStats } from "./ImpactStats";
export { default as TeamGrid } from "./TeamGrid";
export { default as PartnerLogos } from "./PartnerLogos";
export { default as AboutCTA } from "./AboutCTA";
export { default as SectionHeader } from "./SectionHeader";
export { default as SectionBand } from "./SectionBand";
export type { SectionTone } from "./SectionBand";

// Re-exporto los datos por si otros módulos (p.ej. footer, sitemap) los necesitan.
export * from "./data";
