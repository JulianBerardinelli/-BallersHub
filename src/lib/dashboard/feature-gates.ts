// Feature gating matrix — declarative source of truth for what's locked
// behind Pro and how the lock should be presented to the user.
//
// Mirrors the 4 gating patterns from `docs/pricing-matrix.md §4`:
// - "hidden"     → not rendered for Free.
// - "blurred"    → rendered with blur + upgrade CTA on top.
// - "soft-save"  → field is editable, modal intercepts on save.
// - "hard-cap"   → counted limit; modal opens at N+1.
// - "badge"      → fully usable but with a "Pro" badge attached for awareness.
//
// `<PlanGate>` reads this matrix to pick the right behavior. Server actions
// also consult it via `requireProForFeature` in `gate-actions.ts`.

import type { PlanAudience } from "./plan-access";

export type GateBehavior =
  | "hidden"
  | "blurred"
  | "soft-save"
  | "hard-cap"
  | "badge";

export type FeatureGate = {
  id: string;
  /** Audience this gate applies to — "both" when player & agency share it. */
  audience: PlanAudience | "both";
  /** Lock pattern from the pricing-matrix doc. */
  behavior: GateBehavior;
  /** Numeric cap for `hard-cap` gates — ignored for others. */
  cap?: number;
  /** Short human label for telemetry / utm campaign tagging. */
  utmCampaign: string;
  /** Optional copy override for the UpgradeModal. Falls back to defaults. */
  copy?: {
    title: string;
    body: string;
    ctaLabel?: string;
  };
};

export const FEATURE_GATES = {
  // -------------------------------------------------------------------
  // Template editor
  // -------------------------------------------------------------------
  templateProLayout: {
    id: "templateProLayout",
    audience: "both",
    behavior: "blurred",
    utmCampaign: "template-pro-layout",
    copy: {
      title: "Plantilla Pro Athlete",
      body: "Activá Pro para usar la plantilla con motion, parallax y assets premium.",
      ctaLabel: "Ver planes Pro",
    },
  },
  templateColors: {
    id: "templateColors",
    audience: "both",
    behavior: "blurred",
    utmCampaign: "template-colors",
    copy: {
      title: "Personalización de colores",
      body: "Definí tu paleta de marca con Pro. La plantilla Free usa los colores editoriales por defecto.",
    },
  },
  templateLivePreview: {
    id: "templateLivePreview",
    audience: "both",
    behavior: "blurred",
    utmCampaign: "template-live-preview",
    copy: {
      title: "Live preview",
      body: "Visualizá en tiempo real cómo queda tu perfil antes de publicar. Disponible solo en Pro.",
    },
  },

  // -------------------------------------------------------------------
  // Personal data (player)
  // -------------------------------------------------------------------
  marketValue: {
    id: "marketValue",
    audience: "player",
    behavior: "soft-save",
    utmCampaign: "market-value",
    copy: {
      title: "Valor de mercado",
      body: "Mostrá tu valor estimado en tu perfil público. Disponible en el plan Pro.",
    },
  },
  careerObjectives: {
    id: "careerObjectives",
    audience: "player",
    behavior: "soft-save",
    utmCampaign: "career-objectives",
    copy: {
      title: "Objetivos de carrera",
      body: "Compartí tu visión profesional con clubes y reclutadores. Activá Pro para guardar este campo.",
    },
  },

  // -------------------------------------------------------------------
  // Football data (player)
  // -------------------------------------------------------------------
  advancedStats: {
    id: "advancedStats",
    audience: "player",
    behavior: "soft-save",
    utmCampaign: "advanced-stats",
    copy: {
      title: "Estadísticas avanzadas",
      body: "Cargá métricas avanzadas por temporada (xG, asistencias clave, regates completados). Solo Pro.",
    },
  },
  careerStageDescriptions: {
    id: "careerStageDescriptions",
    audience: "player",
    behavior: "soft-save",
    utmCampaign: "career-stage-descriptions",
    copy: {
      title: "Descripciones por etapa",
      body: "Sumá una descripción narrativa a cada etapa de tu trayectoria. Activá Pro.",
    },
  },
  honoursValuation: {
    id: "honoursValuation",
    audience: "player",
    behavior: "soft-save",
    utmCampaign: "honours-valuation",
    copy: {
      title: "Palmarés y reconocimientos",
      body: "Cargá títulos y premios individuales. Para guardarlos en tu perfil necesitás Pro.",
    },
  },

  // -------------------------------------------------------------------
  // Multimedia + external links (both audiences, caps from pricing-matrix §B)
  // -------------------------------------------------------------------
  catalogVideos: {
    id: "catalogVideos",
    audience: "both",
    behavior: "hard-cap",
    cap: 2,
    utmCampaign: "catalog-videos",
    copy: {
      title: "Más videos de YouTube",
      body: "Plan Free permite hasta 2 videos en tu catálogo. Activá Pro para sumar todos los que quieras.",
    },
  },
  socialLinks: {
    id: "socialLinks",
    audience: "both",
    behavior: "hard-cap",
    cap: 3,
    utmCampaign: "social-links",
    copy: {
      title: "Más redes sociales",
      body: "Plan Free permite hasta 3 redes. Pro las habilita ilimitadas.",
    },
  },
  pressArticles: {
    id: "pressArticles",
    audience: "both",
    behavior: "hard-cap",
    cap: 3,
    utmCampaign: "press-articles",
    copy: {
      title: "Más notas de prensa",
      body: "Plan Free permite hasta 3 notas. Activá Pro para sumar todas las que quieras.",
    },
  },
  catalogGallery: {
    id: "catalogGallery",
    audience: "both",
    behavior: "blurred",
    cap: 5,
    utmCampaign: "catalog-gallery",
    copy: {
      title: "Galería catálogo (fotos)",
      body: "Las fotos de catálogo son una feature Pro (hasta 5 imágenes). En Free podés cargar videos.",
    },
  },
  proAssets: {
    id: "proAssets",
    audience: "player",
    behavior: "blurred",
    utmCampaign: "pro-assets",
    copy: {
      title: "Pro Assets (Hero + Modelos)",
      body: "Recortes PNG para la plantilla Pro Athlete con motion y parallax. Activá Pro para subirlos.",
    },
  },

  // -------------------------------------------------------------------
  // Agency-only
  // -------------------------------------------------------------------
  agencyPlayerSlots: {
    id: "agencyPlayerSlots",
    audience: "agency",
    behavior: "hard-cap",
    cap: 5,
    utmCampaign: "agency-player-slots",
    copy: {
      title: "Más jugadores en cartera",
      body: "Plan Free Agency permite hasta 5 jugadores. Pro Agency es ilimitado.",
    },
  },
  agencyStaffSlots: {
    id: "agencyStaffSlots",
    audience: "agency",
    behavior: "hard-cap",
    cap: 2,
    utmCampaign: "agency-staff-slots",
    copy: {
      title: "Más staff en el equipo",
      body: "Plan Free Agency permite hasta 2 colaboradores. Pro Agency es ilimitado.",
    },
  },

  // -------------------------------------------------------------------
  // Support / corrections
  // -------------------------------------------------------------------
  weeklyCorrections: {
    id: "weeklyCorrections",
    audience: "both",
    behavior: "hard-cap",
    cap: 2,
    utmCampaign: "weekly-corrections",
    copy: {
      title: "Más correcciones por semana",
      body: "Plan Free permite 2 solicitudes de corrección por rubro/semana. Pro lo lleva a 5.",
    },
  },
} as const satisfies Record<string, FeatureGate>;

export type FeatureId = keyof typeof FEATURE_GATES;

/**
 * Lookup a feature gate by id with strict typing. Returns undefined if the
 * id doesn't exist — call sites should fail loudly when this happens.
 */
export function getFeatureGate<K extends FeatureId>(id: K): (typeof FEATURE_GATES)[K] {
  return FEATURE_GATES[id];
}

/**
 * Check whether a feature applies to a given audience. Used to filter
 * which gates should render in player vs agency dashboards.
 */
export function isFeatureForAudience(
  feature: FeatureGate,
  audience: PlanAudience,
): boolean {
  return feature.audience === "both" || feature.audience === audience;
}
