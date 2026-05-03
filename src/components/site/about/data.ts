// src/components/site/about/data.ts
// Fuente de datos centralizada para la página /about.
// Editar acá no requiere tocar la UI: cada sección consume desde este módulo.

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
  /** Reservado para foto real (path en /public/images/team/...). */
  imageSrc?: string;
  /** Iniciales mostradas como fallback hasta cargar la foto real. */
  initials: string;
  accent: Accent;
};

export type Partner = {
  name: string;
  /** Componente React del logo (preferido — vector inline, sin requests). */
  Logo?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Fallback para logos raster (path en /public/images/partners/...). */
  logoSrc?: string;
  category: string;
  /**
   * Clases CSS extra para casos especiales — p.ej. controlar `currentColor`
   * cuando un logo tiene paths que dependen del color del texto (Lawn Tennis).
   * Se mergean DESPUÉS del HOVER_FX, así pueden sobrescribirlo.
   */
  logoClassName?: string;
};

export type Audience = {
  /** Slug interno (útil para anchors / analytics). */
  id: string;
  title: string;
  /** Subtítulo corto (rol en el ecosistema). */
  subtitle: string;
  description: string;
  /** Bullets opcionales (típicamente 2-4). */
  bullets?: string[];
  icon: LucideIcon;
  accent: Accent;
  cta?: { label: string; href: string };
};

/* ---------------------------------------------- */
/* Hero                                           */
/* ---------------------------------------------- */
export const ABOUT_HERO = {
  eyebrow: "Quiénes somos",
  title: {
    line1: "Donde los futbolistas",
    highlight: "se venden",
    line2: "y conquistan sus objetivos.",
  },
  description:
    "Centralizamos trayectoria, estadísticas, datos y media de cada jugador y agencia en un portfolio web con link propio, optimizado para SEO. Construimos la plataforma de referencia mundial — empezando por LATAM y España.",
  primaryCta: { label: "Crear mi portfolio", href: "/auth/sign-up" },
  secondaryCta: { label: "Hablar con el equipo", href: "/contact" },
  /** Reservado para foto real del equipo en cancha. */
  imageSrc: undefined as string | undefined,
  imageAlt: "Equipo BallersHub durante una jornada de scouting",
} as const;

/* ---------------------------------------------- */
/* Misión / Visión / Objetivos                    */
/* ---------------------------------------------- */
export const PILLARS: Pillar[] = [
  {
    title: "Misión",
    description:
      "Convertir a cada futbolista —profesional, semi-profesional o amateur— y a cada agencia en un portfolio web profesional: un único link donde centralizan trayectoria, estadísticas, datos y media para venderse e impulsar su carrera en internet.",
    icon: Target,
    accent: "lime",
    tag: "Nuestro foco",
  },
  {
    title: "Visión",
    description:
      "Ser la página número uno a nivel mundial donde los futbolistas se presentan, muestran sus datos y conquistan sus objetivos. La referencia global cuando un club, periodista o scout busca talento — en cualquier nivel competitivo.",
    icon: Eye,
    accent: "blue",
    tag: "Hacia dónde vamos",
  },
  {
    title: "Objetivos",
    description:
      "Empezar por LATAM y España y escalar a mercados globales. Que cualquier futbolista o agencia pueda venderse online con un portfolio escalable, SEO-ready, con reviews verificadas (próxima beta) y conectado a una futura red activa de scouting.",
    icon: ListChecks,
    accent: "lime",
    tag: "Lo que queremos lograr",
  },
];

/* ---------------------------------------------- */
/* Audiencias — quién usa BallersHub              */
/* ---------------------------------------------- */
/**
 * Dos grupos:
 * - PRIMARY: usuarios que crean cuenta y construyen un portfolio.
 * - SECONDARY: actores que descubren talento y consumen contenido.
 */
export const AUDIENCES_PRIMARY: Audience[] = [
  {
    id: "jugadores",
    title: "Jugadores y atletas",
    subtitle: "Audiencia principal — el protagonista",
    description:
      "Sos el centro de la plataforma. Profesional, semi-profesional o amateur: armás tu portfolio en minutos y empezás a venderte con un link propio listo para compartir.",
    bullets: [
      "Trayectoria, estadísticas y datos físicos centralizados",
      "Galería de media (fotos, clips, partidos)",
      "Link único optimizado para SEO",
      "Reviews verificadas (próxima beta)",
    ],
    icon: UserCircle,
    accent: "lime",
    cta: { label: "Crear mi portfolio", href: "/auth/sign-up" },
  },
  {
    id: "agencias",
    title: "Agencias y representantes",
    subtitle: "Persona aliada — escalan su carpeta",
    description:
      "Mostrá toda la carpeta de jugadores que representás con un sitio profesional, identidad propia y datos consolidados. Posicionate en internet como una agencia seria.",
    bullets: [
      "Portfolio de agencia con tu marca",
      "Carpeta completa de representados",
      "Dashboard con métricas agregadas",
      "Onboarding asistido para tus jugadores",
    ],
    icon: Briefcase,
    accent: "blue",
    cta: { label: "Soy una agencia", href: "/contact?type=agency" },
  },
];

export const AUDIENCES_SECONDARY: Audience[] = [
  {
    id: "clubes",
    title: "Clubes profesionales",
    subtitle: "Buscan talento real",
    description:
      "Departamentos deportivos y cuerpos técnicos que filtran candidatos por posición, edad, métricas y disponibilidad — con datos verificados, no rumores.",
    icon: Building2,
    accent: "blue",
  },
  {
    id: "fans",
    title: "Comunidad y fans",
    subtitle: "Siguen carreras de cerca",
    description:
      "El fútbol es de la gente. Aficionados que quieren conocer la carrera completa de cada jugador, su trayectoria y sus números — sin filtros editoriales.",
    icon: Heart,
    accent: "lime",
  },
  {
    id: "periodistas",
    title: "Periodistas deportivos",
    subtitle: "Cobertura con datos",
    description:
      "Una fuente confiable y siempre actualizada para investigaciones, notas y coberturas — con stats, trayectoria y referencias verificables al alcance del link.",
    icon: Newspaper,
    accent: "blue",
  },
];

export const AUDIENCES_HEADER = {
  eyebrow: "Para quién lo construimos",
  title: {
    plain: "Construido para todo el",
    highlight: "ecosistema del fútbol",
  },
  description:
    "El producto está diseñado para que el jugador sea el protagonista, las agencias escalen su carpeta y el ecosistema (clubes, comunidad y prensa) descubra talento con datos reales.",
  primaryGroupTitle: "Crean su portfolio",
  secondaryGroupTitle: "Descubren talento y contenido",
} as const;

/* ---------------------------------------------- */
/* Diferenciadores del producto                   */
/* ---------------------------------------------- */
export const VALUES: Value[] = [
  {
    title: "Link propio para venderte",
    description:
      "Cada jugador y cada agencia tiene su URL única. Compartila por WhatsApp, mail o redes y abrí la puerta a clubes y representantes.",
    icon: Link2,
    accent: "lime",
  },
  {
    title: "Optimizado para SEO",
    description:
      "Construido para aparecer en Google cuando alguien busca tu nombre, tu posición o tu club. Tu portfolio trabaja para vos 24/7.",
    icon: Search,
    accent: "blue",
  },
  {
    title: "Toda tu carrera centralizada",
    description:
      "Trayectoria, estadísticas, datos físicos y media (fotos, clips, partidos) en un único lugar — fácil de mantener, listo para presentar.",
    icon: Database,
    accent: "lime",
  },
  {
    title: "Reviews verificadas",
    description:
      "Reseñas firmadas por cuentas verificadas (cuerpo técnico, scouts, ex-compañeros) que respaldan tu trayectoria. Próxima beta.",
    icon: BadgeCheck,
    accent: "blue",
  },
  {
    title: "Pensado para agencias",
    description:
      "Sumá toda tu carpeta de jugadores, mostrá datos consolidados y posicioná la identidad de tu agencia con un sitio profesional.",
    icon: Briefcase,
    accent: "lime",
  },
  {
    title: "Red de scouting (próxima)",
    description:
      "Una base de datos viva donde clubes y scouts descubren talento por filtros reales: posición, edad, métricas y disponibilidad.",
    icon: Telescope,
    accent: "blue",
  },
];

/* ---------------------------------------------- */
/* Historia / línea de tiempo                     */
/* ---------------------------------------------- */
export const MILESTONES: Milestone[] = [
  {
    year: "Ago 2025",
    title: "Arranca el proyecto",
    description:
      "Detectamos el mismo problema en jugadores y agencias: fichas en PDF, links rotos a videos de YouTube, redes informales. Ningún portfolio profesional con identidad propia. Decidimos construir la solución.",
    accent: "lime",
  },
  {
    year: "Nov 2025",
    title: "Primer prototipo del portfolio",
    description:
      "Armamos la primera versión del producto: portfolio con link único, carga de trayectoria, datos físicos y media. Pruebas internas con jugadores y agencias cercanos.",
    accent: "blue",
  },
  {
    year: "Mar 2026",
    title: "Beta cerrada · pilotos en LATAM + España",
    description:
      "Validamos el producto con un grupo acotado de jugadores y agencias piloto en Latinoamérica y España. Cada portfolio nace optimizado para SEO y listo para compartirse con su link propio.",
    accent: "lime",
  },
  {
    year: "Jun 2026",
    title: "Lanzamiento oficial",
    description:
      "Apertura pública para jugadores y agencias en LATAM y España. Acceso libre al portfolio con link único, datos centralizados y posicionamiento en internet desde el día uno.",
    accent: "blue",
  },
  {
    year: "Próximo",
    title: "Reviews verificadas + red de scouting global",
    description:
      "Reseñas firmadas por cuentas verificadas (cuerpo técnico, scouts, ex-compañeros) y una base de datos activa donde clubes descubren talento por posición, edad y métricas. El camino hacia ser la página #1 a nivel mundial.",
    accent: "lime",
  },
];

/* ---------------------------------------------- */
/* Stats / impacto                                */
/* ---------------------------------------------- */
export const IMPACT_STATS: Stat[] = [
  {
    value: "Ago 2025",
    label: "Inicio del proyecto",
    description: "8 meses construyendo con jugadores y agencias piloto.",
    accent: "lime",
  },
  {
    value: "Jun 2026",
    label: "Lanzamiento oficial",
    description: "Apertura pública en LATAM y España con SEO desde el día 1.",
    accent: "blue",
  },
  {
    value: "100%",
    label: "Optimizados para SEO",
    description: "Cada portfolio nace listo para aparecer en Google.",
    accent: "lime",
  },
  {
    value: "Beta",
    label: "Reviews verificadas",
    description: "Reseñas firmadas por cuentas verificadas — próximamente.",
    accent: "blue",
  },
];

/* ---------------------------------------------- */
/* Equipo                                         */
/* ---------------------------------------------- */
export const TEAM: TeamMember[] = [
  {
    name: "Julián Berardinelli",
    role: "Co-Founder & Desarrollador",
    bio: "Jugador profesional de fútbol, ideador y desarrollador de BallersHub. Vivió en carne propia la falta de una plataforma seria para que un jugador se venda profesionalmente — así que decidió construirla. Combina cancha, código y producto para que cada portfolio se sienta hecho por alguien que entiende el deporte desde adentro.",
    initials: "JB",
    accent: "lime",
    imageSrc: undefined,
  },
  {
    name: "Equipo de validación",
    role: "Scouting deportivo",
    bio: "Jugadores en actividad, ex-jugadores y analistas que verifican cada perfil. Conocen el oficio porque lo viven o lo vivieron — saben distinguir un dato real de un dato inflado y mantienen la calidad de la red.",
    initials: "SC",
    accent: "blue",
    imageSrc: undefined,
  },
  {
    name: "Equipo de operaciones",
    role: "Soporte · Onboarding",
    bio: "Acompañan a jugadores y agencias en cada paso de su incorporación a la plataforma. Onboarding asistido, soporte humano y respuesta rápida.",
    initials: "OP",
    accent: "lime",
    imageSrc: undefined,
  },
];

/* ---------------------------------------------- */
/* Partners / logos                               */
/* ---------------------------------------------- */
export const PARTNERS: Partner[] = [
  { name: "Nexions", Logo: NexionsIcon, category: "Aliado tecnológico" },
  { name: "FYF", Logo: FYFIcon, category: "Federación" },
  {
    name: "Lawn Tennis Club",
    Logo: LawnTennisIcon,
    category: "Club aliado",
    // En estado gris las "ventanas" navy del crest deben ser transparentes
    // (huecos) — al hover vuelven al navy del brand.
    logoClassName: "text-transparent group-hover:text-[#020180]",
  },
];

/* ---------------------------------------------- */
/* CTA final                                      */
/* ---------------------------------------------- */
export const ABOUT_CTA = {
  eyebrow: "Sumate a BallersHub",
  title: "Tu portfolio. Tu link. Tu carrera.",
  description:
    "Centralizá tu trayectoria, mostrá tus datos y posicionate en internet. Para jugadores que quieren venderse profesionalmente y para agencias que quieren escalar su identidad.",
  primaryCta: { label: "Crear mi portfolio", href: "/auth/sign-up" },
  secondaryCta: { label: "Soy una agencia", href: "/contact?type=agency" },
} as const;

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

