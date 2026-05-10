// Tutorial step definitions per audience × plan tier.
//
// Steps are auto-detected via predicates against a `ProfileSnapshot`.
// We DO NOT persist per-step completion server-side — recomputing is
// always cheaper and never stale.
//
// To add a step:
//   1. Append a new id to `TutorialStepId` in types.ts.
//   2. Define it here with a predicate that reads from the snapshot.
//   3. (optional) gate it by tier — Pro-only steps must NOT appear in
//      Free sets so we don't ask the user to do something they can't save.

import type {
  TutorialStep,
  TutorialStepId,
  TutorialPlanTier,
} from "./types";
import type { PlanAudience } from "@/lib/dashboard/plan-access";

/**
 * Snapshot of the data we need to resolve step completion. Fetched once
 * server-side at dashboard layout boot.
 */
export type ProfileSnapshot = {
  audience: PlanAudience;
  tier: TutorialPlanTier;

  // Player fields
  avatarUrl: string | null;
  fullName: string | null;
  birthDate: string | null;
  nationalityCount: number;
  positionsCount: number;
  marketValueEur: number | string | null;
  profileStatus: string | null; // 'draft' | 'pending_review' | 'approved' | 'rejected'
  themeLayout: string | null; // 'free' | 'pro' | legacy
  careerItemsCount: number;
  seasonStatsCount: number;
  mediaVideosCount: number;
  articlesCount: number;
  honoursCount: number;

  // Agency fields
  agencyLogoUrl: string | null;
  agencyName: string | null;
  agencyHeadquarters: string | null;
  agencyDescription: string | null;
  agencyOperativeCountriesCount: number;
  agencyServicesCount: number;
  agencyPlayersCount: number;
  agencyHeroHeadline: string | null;
  agencyTeamRelationsCount: number;
};

type StepDefinition = Omit<TutorialStep, "completed"> & {
  /** Returns true when this step is completed for the given snapshot. */
  isCompleted: (s: ProfileSnapshot) => boolean;
};

// ---------------------------------------------------------------
// Player steps
// ---------------------------------------------------------------

const PLAYER_AVATAR: StepDefinition = {
  id: "player.avatar",
  title: "Subí tu foto de perfil",
  subtitle: "Una foto profesional aumenta el contacto en un 60%.",
  href: "/dashboard/edit-profile/personal-data",
  isCompleted: (s) =>
    !!s.avatarUrl &&
    s.avatarUrl !== "/images/player-default.png" &&
    !s.avatarUrl.endsWith("/player-default.png"),
};

const PLAYER_BASICS: StepDefinition = {
  id: "player.basics",
  title: "Completá tus datos personales",
  subtitle: "Nombre, fecha de nacimiento, nacionalidad y posición.",
  href: "/dashboard/edit-profile/personal-data",
  isCompleted: (s) =>
    !!s.fullName &&
    !!s.birthDate &&
    s.nationalityCount > 0 &&
    s.positionsCount > 0,
};

const PLAYER_CAREER: StepDefinition = {
  id: "player.career",
  title: "Sumá tu trayectoria",
  subtitle: "Al menos un club o etapa de carrera.",
  href: "/dashboard/edit-profile/football-data",
  isCompleted: (s) => s.careerItemsCount > 0,
};

const PLAYER_SEASON_STATS: StepDefinition = {
  id: "player.season-stats",
  title: "Cargá estadísticas por temporada",
  subtitle: "PJ, goles y asistencias por torneo.",
  href: "/dashboard/edit-profile/football-data",
  isCompleted: (s) => s.seasonStatsCount > 0,
};

const PLAYER_MEDIA: StepDefinition = {
  id: "player.media",
  title: "Subí tu primer video o highlight",
  subtitle: "Un highlight es la mejor forma de mostrar tu juego.",
  href: "/dashboard/edit-profile/multimedia",
  isCompleted: (s) => s.mediaVideosCount > 0,
};

const PLAYER_PRESS_ARTICLES: StepDefinition = {
  id: "player.press-articles",
  title: "Sumá una nota de prensa",
  subtitle: "Si te entrevistaron en un medio, agregá el link.",
  href: "/dashboard/edit-profile/multimedia",
  isCompleted: (s) => s.articlesCount > 0,
};

const PLAYER_PUBLISHED: StepDefinition = {
  id: "player.published",
  title: "Verificá tu perfil público",
  subtitle: "Una vez aprobado, compartilo con clubes.",
  href: "/dashboard",
  isCompleted: (s) => s.profileStatus === "approved",
};

const PLAYER_MARKET_VALUE: StepDefinition = {
  id: "player.market-value",
  title: "Cargá tu valor de mercado",
  subtitle: "Visible solo en planes Pro — potenciá tus negociaciones.",
  href: "/dashboard/edit-profile/football-data",
  isCompleted: (s) => {
    if (s.marketValueEur == null) return false;
    const num = Number(s.marketValueEur);
    return Number.isFinite(num) && num > 0;
  },
};

const PLAYER_HONOURS: StepDefinition = {
  id: "player.honours",
  title: "Documentá tu palmarés",
  subtitle: "Títulos, premios individuales, reconocimientos.",
  href: "/dashboard/edit-profile/football-data",
  isCompleted: (s) => s.honoursCount > 0,
};

const PLAYER_TEMPLATE_PRO: StepDefinition = {
  id: "player.template-pro",
  title: "Activá la plantilla Pro Athlete",
  subtitle: "Motion + parallax + assets premium en tu perfil público.",
  href: "/dashboard/edit-template/styles",
  isCompleted: (s) => s.themeLayout === "pro",
};

// ---------------------------------------------------------------
// Agency steps
// ---------------------------------------------------------------

const AGENCY_LOGO: StepDefinition = {
  id: "agency.logo",
  title: "Subí el logo de tu agencia",
  subtitle: "Tu identidad visual en cada portfolio.",
  href: "/dashboard/agency",
  isCompleted: (s) => !!s.agencyLogoUrl,
};

const AGENCY_BASICS: StepDefinition = {
  id: "agency.basics",
  title: "Completá los datos de la agencia",
  subtitle: "Nombre, sede y descripción.",
  href: "/dashboard/agency",
  isCompleted: (s) =>
    !!s.agencyName && !!s.agencyHeadquarters && !!s.agencyDescription,
};

const AGENCY_FIRST_PLAYER: StepDefinition = {
  id: "agency.first-player",
  title: "Sumá tu primer jugador",
  subtitle: "Empezá a construir tu cartera de representados.",
  href: "/dashboard/players",
  isCompleted: (s) => s.agencyPlayersCount > 0,
};

const AGENCY_COUNTRIES: StepDefinition = {
  id: "agency.countries",
  title: "Definí países operativos",
  subtitle: "Dónde opera tu agencia, para que clubes te encuentren.",
  href: "/dashboard/agency",
  isCompleted: (s) => s.agencyOperativeCountriesCount > 0,
};

const AGENCY_SERVICES: StepDefinition = {
  id: "agency.services",
  title: "Listá tus servicios",
  subtitle: "Representación, asesoría legal, scouting, etc.",
  href: "/dashboard/agency",
  isCompleted: (s) => s.agencyServicesCount > 0,
};

const AGENCY_TEMPLATE_PRO: StepDefinition = {
  id: "agency.template-pro",
  title: "Activá la plantilla Pro Agency",
  subtitle: "Hero cinematográfico, parallax, módulos premium.",
  href: "/dashboard/agency/edit-template/styles",
  isCompleted: (s) => s.themeLayout === "pro",
};

const AGENCY_HERO_HEADLINE: StepDefinition = {
  id: "agency.hero-headline",
  title: "Personalizá el hero del portfolio",
  subtitle: "Una frase que represente la esencia de tu agencia.",
  href: "/dashboard/agency/edit-template/styles",
  isCompleted: (s) => !!s.agencyHeroHeadline,
};

const AGENCY_TEAM_RELATIONS: StepDefinition = {
  id: "agency.team-relations",
  title: "Sumá relaciones con equipos",
  subtitle: "Clubes con los que trabajás, partnerships, alianzas.",
  href: "/dashboard/agency",
  isCompleted: (s) => s.agencyTeamRelationsCount > 0,
};

// ---------------------------------------------------------------
// Step sets per audience × tier
// ---------------------------------------------------------------

const PLAYER_FREE_STEPS: StepDefinition[] = [
  PLAYER_AVATAR,
  PLAYER_BASICS,
  PLAYER_CAREER,
  PLAYER_SEASON_STATS,
  PLAYER_MEDIA,
  PLAYER_PRESS_ARTICLES,
  PLAYER_PUBLISHED,
];

const PLAYER_PRO_STEPS: StepDefinition[] = [
  PLAYER_AVATAR,
  PLAYER_BASICS,
  PLAYER_CAREER,
  PLAYER_SEASON_STATS,
  PLAYER_MEDIA,
  PLAYER_PRESS_ARTICLES,
  PLAYER_MARKET_VALUE,
  PLAYER_HONOURS,
  PLAYER_TEMPLATE_PRO,
  PLAYER_PUBLISHED,
];

const AGENCY_FREE_STEPS: StepDefinition[] = [
  AGENCY_LOGO,
  AGENCY_BASICS,
  AGENCY_FIRST_PLAYER,
  AGENCY_COUNTRIES,
  AGENCY_SERVICES,
];

const AGENCY_PRO_STEPS: StepDefinition[] = [
  AGENCY_LOGO,
  AGENCY_BASICS,
  AGENCY_FIRST_PLAYER,
  AGENCY_COUNTRIES,
  AGENCY_SERVICES,
  AGENCY_TEMPLATE_PRO,
  AGENCY_HERO_HEADLINE,
  AGENCY_TEAM_RELATIONS,
];

export function getStepsForSet(
  audience: PlanAudience,
  tier: TutorialPlanTier,
): StepDefinition[] {
  if (audience === "agency") {
    return tier === "pro" ? AGENCY_PRO_STEPS : AGENCY_FREE_STEPS;
  }
  return tier === "pro" ? PLAYER_PRO_STEPS : PLAYER_FREE_STEPS;
}

export function resolveStepsForSnapshot(
  snapshot: ProfileSnapshot,
): TutorialStep[] {
  const definitions = getStepsForSet(snapshot.audience, snapshot.tier);
  return definitions.map((def) => ({
    id: def.id,
    title: def.title,
    subtitle: def.subtitle,
    href: def.href,
    completed: def.isCompleted(snapshot),
  }));
}

export function isKnownStepId(id: string): id is TutorialStepId {
  const all = new Set<string>([
    ...PLAYER_FREE_STEPS.map((s) => s.id),
    ...PLAYER_PRO_STEPS.map((s) => s.id),
    ...AGENCY_FREE_STEPS.map((s) => s.id),
    ...AGENCY_PRO_STEPS.map((s) => s.id),
  ]);
  return all.has(id);
}
