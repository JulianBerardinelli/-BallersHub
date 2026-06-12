// src/components/site/about/data.ts
// Estructura central de la página /about. El TEXTO ahora vive en
// messages/<locale>/about.json (i18n); este módulo aporta la estructura
// (iconos, accents, hrefs, logos) y funciones getX(t) que combinan
// estructura + texto traducido. Cada sección llama su getX(t) con el
// translator de getTranslations('about').

import type { ComponentType, SVGProps } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Database,
  Eye,
  Heart,
  Link2,
  ListChecks,
  Newspaper,
  Search,
  Target,
  Telescope,
  UserCircle,
} from "lucide-react";

import {
  FYFIcon,
  LawnTennisIcon,
  NexionsIcon,
} from "@/components/icons/partners";

/* ---------------------------------------------- */
/* Translator (subset del de next-intl)           */
/* ---------------------------------------------- */
export type AboutT = {
  (key: string, values?: Record<string, string | number | Date>): string;
  raw: (key: string) => unknown;
};

/* ---------------------------------------------- */
/* Tipos compartidos                              */
/* ---------------------------------------------- */
export type Accent = "lime" | "blue";

export type Pillar = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: Accent;
  tag: string;
};

export type Value = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: Accent;
};

export type Milestone = {
  year: string;
  title: string;
  description: string;
  accent: Accent;
};

export type Stat = {
  value: string;
  label: string;
  description: string;
  accent: Accent;
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  imageSrc?: string;
  initials: string;
  accent: Accent;
};

export type Partner = {
  name: string;
  Logo?: ComponentType<SVGProps<SVGSVGElement>>;
  logoSrc?: string;
  category: string;
  logoClassName?: string;
};

export type Audience = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  bullets?: string[];
  icon: LucideIcon;
  accent: Accent;
  cta?: { label: string; href: string };
};

/* ---------------------------------------------- */
/* Hero                                           */
/* ---------------------------------------------- */
export function getAboutHero(t: AboutT) {
  return {
    eyebrow: t("hero.eyebrow"),
    title: {
      line1: t("hero.titleLine1"),
      highlight: t("hero.titleHighlight"),
      line2: t("hero.titleLine2"),
    },
    description: t("hero.description"),
    primaryCta: { label: t("hero.primaryCta"), href: "/auth/sign-up" },
    secondaryCta: { label: t("hero.secondaryCta"), href: "/contact" },
    imageSrc: undefined as string | undefined,
    imageAlt: t("hero.imageAlt"),
  };
}

/* ---------------------------------------------- */
/* Misión / Visión / Objetivos                    */
/* ---------------------------------------------- */
export function getPillars(t: AboutT): Pillar[] {
  return [
    { title: t("pillars.mission.title"), description: t("pillars.mission.description"), icon: Target, accent: "lime", tag: t("pillars.mission.tag") },
    { title: t("pillars.vision.title"), description: t("pillars.vision.description"), icon: Eye, accent: "blue", tag: t("pillars.vision.tag") },
    { title: t("pillars.objectives.title"), description: t("pillars.objectives.description"), icon: ListChecks, accent: "lime", tag: t("pillars.objectives.tag") },
  ];
}

/* ---------------------------------------------- */
/* Audiencias                                     */
/* ---------------------------------------------- */
export function getAudiencesPrimary(t: AboutT): Audience[] {
  return [
    {
      id: "jugadores",
      title: t("audiences.players.title"),
      subtitle: t("audiences.players.subtitle"),
      description: t("audiences.players.description"),
      bullets: t.raw("audiences.players.bullets") as string[],
      icon: UserCircle,
      accent: "lime",
      cta: { label: t("audiences.players.cta"), href: "/auth/sign-up" },
    },
    {
      id: "agencias",
      title: t("audiences.agencies.title"),
      subtitle: t("audiences.agencies.subtitle"),
      description: t("audiences.agencies.description"),
      bullets: t.raw("audiences.agencies.bullets") as string[],
      icon: Briefcase,
      accent: "blue",
      cta: { label: t("audiences.agencies.cta"), href: "/contact?type=agency" },
    },
  ];
}

export function getAudiencesSecondary(t: AboutT): Audience[] {
  return [
    { id: "clubes", title: t("audiences.clubs.title"), subtitle: t("audiences.clubs.subtitle"), description: t("audiences.clubs.description"), icon: Building2, accent: "blue" },
    { id: "fans", title: t("audiences.fans.title"), subtitle: t("audiences.fans.subtitle"), description: t("audiences.fans.description"), icon: Heart, accent: "lime" },
    { id: "periodistas", title: t("audiences.journalists.title"), subtitle: t("audiences.journalists.subtitle"), description: t("audiences.journalists.description"), icon: Newspaper, accent: "blue" },
  ];
}

export function getAudiencesHeader(t: AboutT) {
  return {
    eyebrow: t("audiencesHeader.eyebrow"),
    title: { plain: t("audiencesHeader.titlePlain"), highlight: t("audiencesHeader.titleHighlight") },
    description: t("audiencesHeader.description"),
    primaryGroupTitle: t("audiencesHeader.primaryGroupTitle"),
    secondaryGroupTitle: t("audiencesHeader.secondaryGroupTitle"),
  };
}

/* ---------------------------------------------- */
/* Diferenciadores                                */
/* ---------------------------------------------- */
export function getValues(t: AboutT): Value[] {
  return [
    { title: t("values.ownLink.title"), description: t("values.ownLink.description"), icon: Link2, accent: "lime" },
    { title: t("values.seo.title"), description: t("values.seo.description"), icon: Search, accent: "blue" },
    { title: t("values.centralized.title"), description: t("values.centralized.description"), icon: Database, accent: "lime" },
    { title: t("values.reviews.title"), description: t("values.reviews.description"), icon: BadgeCheck, accent: "blue" },
    { title: t("values.agencies.title"), description: t("values.agencies.description"), icon: Briefcase, accent: "lime" },
    { title: t("values.scouting.title"), description: t("values.scouting.description"), icon: Telescope, accent: "blue" },
  ];
}

/* ---------------------------------------------- */
/* Historia / timeline                            */
/* ---------------------------------------------- */
export function getMilestones(t: AboutT): Milestone[] {
  return [
    { year: t("milestones.start.year"), title: t("milestones.start.title"), description: t("milestones.start.description"), accent: "lime" },
    { year: t("milestones.prototype.year"), title: t("milestones.prototype.title"), description: t("milestones.prototype.description"), accent: "blue" },
    { year: t("milestones.beta.year"), title: t("milestones.beta.title"), description: t("milestones.beta.description"), accent: "lime" },
    { year: t("milestones.launch.year"), title: t("milestones.launch.title"), description: t("milestones.launch.description"), accent: "blue" },
    { year: t("milestones.next.year"), title: t("milestones.next.title"), description: t("milestones.next.description"), accent: "lime" },
  ];
}

/* ---------------------------------------------- */
/* Stats / impacto                                */
/* ---------------------------------------------- */
export function getImpactStats(t: AboutT): Stat[] {
  return [
    { value: t("stats.projectStart.value"), label: t("stats.projectStart.label"), description: t("stats.projectStart.description"), accent: "lime" },
    { value: t("stats.launch.value"), label: t("stats.launch.label"), description: t("stats.launch.description"), accent: "blue" },
    { value: t("stats.seo.value"), label: t("stats.seo.label"), description: t("stats.seo.description"), accent: "lime" },
    { value: t("stats.reviews.value"), label: t("stats.reviews.label"), description: t("stats.reviews.description"), accent: "blue" },
  ];
}

/* ---------------------------------------------- */
/* Equipo  (nombres propios NO se traducen)       */
/* ---------------------------------------------- */
export function getTeam(t: AboutT): TeamMember[] {
  return [
    { name: "Julián Berardinelli", role: t("team.julian.role"), bio: t("team.julian.bio"), initials: "JB", accent: "lime", imageSrc: "/images/team/julian.avif" },
    { name: t("team.validation.name"), role: t("team.validation.role"), bio: t("team.validation.bio"), initials: "SC", accent: "blue", imageSrc: "/images/team/validation.avif" },
  ];
}

/* ---------------------------------------------- */
/* Partners (nombres propios + logo fijos)        */
/* ---------------------------------------------- */
export function getPartners(t: AboutT): Partner[] {
  return [
    { name: "Nexions", Logo: NexionsIcon, category: t("partners.techPartner") },
    { name: "FYF", Logo: FYFIcon, category: t("partners.federation") },
    { name: "Lawn Tennis Club", Logo: LawnTennisIcon, category: t("partners.alliedClub"), logoClassName: "text-transparent group-hover:text-[#020180]" },
  ];
}

/* ---------------------------------------------- */
/* CTA final                                      */
/* ---------------------------------------------- */
export function getAboutCta(t: AboutT) {
  return {
    eyebrow: t("cta.eyebrow"),
    title: t("cta.title"),
    description: t("cta.description"),
    primaryCta: { label: t("cta.primaryCta"), href: "/auth/sign-up" },
    secondaryCta: { label: t("cta.secondaryCta"), href: "/contact?type=agency" },
  };
}

/* ---------------------------------------------- */
/* Helpers de estilo (mantener accent en un lugar) */
/* ---------------------------------------------- */
export const ACCENT_STYLES: Record<
  Accent,
  {
    text: string;
    iconWrap: string;
    cardBorder: string;
    cardBg: string;
    cardShadow: string;
    tagBg: string;
    tagText: string;
    tagBorder: string;
    dot: string;
  }
> = {
  lime: {
    text: "text-bh-lime",
    iconWrap: "bg-[rgba(204,255,0,0.08)] text-bh-lime border-[rgba(204,255,0,0.22)]",
    cardBorder: "border-[rgba(204,255,0,0.18)]",
    cardBg: "bg-[rgba(204,255,0,0.04)]",
    cardShadow: "shadow-[0_0_28px_rgba(204,255,0,0.06)]",
    tagBg: "bg-[rgba(204,255,0,0.10)]",
    tagText: "text-bh-lime",
    tagBorder: "border-[rgba(204,255,0,0.22)]",
    dot: "bg-bh-lime shadow-[0_0_18px_rgba(204,255,0,0.55)]",
  },
  blue: {
    text: "text-bh-blue",
    iconWrap: "bg-[rgba(0,194,255,0.08)] text-bh-blue border-[rgba(0,194,255,0.22)]",
    cardBorder: "border-[rgba(0,194,255,0.18)]",
    cardBg: "bg-[rgba(0,194,255,0.04)]",
    cardShadow: "shadow-[0_0_28px_rgba(0,194,255,0.06)]",
    tagBg: "bg-[rgba(0,194,255,0.10)]",
    tagText: "text-bh-blue",
    tagBorder: "border-[rgba(0,194,255,0.22)]",
    dot: "bg-bh-blue shadow-[0_0_18px_rgba(0,194,255,0.55)]",
  },
};
