import type { PlayerTaskMetrics } from "./metrics";

export type TaskSeverity = "danger" | "warning" | "secondary";

export type ClientTaskContext = {
  profile: {
    id: string;
    status: string;
    slug: string | null;
    visibility: string;
    full_name: string | null;
    birth_date: string | null;
    nationality: string[] | null;
    positions: string[] | null;
    current_club: string | null;
    bio: string | null;
    avatar_url: string | null;
    foot: string | null;
    height_cm: number | null;
    weight_kg: number | null;
  } | null;
  metrics: PlayerTaskMetrics;
};

export type TaskDefinition = {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  href: string;
  severity: TaskSeverity;
  check: (context: ClientTaskContext) => boolean;
};

export type EvaluatedTask = TaskDefinition & { completed: boolean };

export type SectionTaskSummary = {
  total: number;
  completed: number;
  pending: number;
  severityCounts: Record<TaskSeverity, number>;
};

export type TaskEvaluation = {
  tasks: EvaluatedTask[];
  sections: Record<string, SectionTaskSummary>;
  totals: Record<TaskSeverity, number>;
  bySeverity: Record<TaskSeverity, EvaluatedTask[]>;
};

function isFilled(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return value !== null && value !== undefined;
}

export const TASK_DEFINITIONS: TaskDefinition[] = [
  {
    id: "personal-full-name",
    sectionId: "personal-data",
    title: "Cargar nombre completo",
    description: "El nombre es indispensable para generar el CV y los listados públicos.",
    href: "/dashboard/edit-profile/personal-data",
    severity: "danger",
    check: (ctx) => isFilled(ctx.profile?.full_name),
  },
  {
    id: "personal-birth-date",
    sectionId: "personal-data",
    title: "Agregar fecha de nacimiento",
    description: "Necesitamos la fecha de nacimiento para validar elegibilidad y categorías.",
    href: "/dashboard/edit-profile/personal-data",
    severity: "danger",
    check: (ctx) => isFilled(ctx.profile?.birth_date),
  },
  {
    id: "personal-nationality",
    sectionId: "personal-data",
    title: "Definir nacionalidad",
    description: "La nacionalidad aparece en el perfil público y filtra búsquedas.",
    href: "/dashboard/edit-profile/personal-data",
    severity: "danger",
    check: (ctx) => isFilled(ctx.profile?.nationality),
  },
  {
    id: "personal-positions",
    sectionId: "personal-data",
    title: "Seleccionar posiciones principales",
    description: "Las posiciones son claves para el scouting y deben estar completas.",
    href: "/dashboard/edit-profile/personal-data",
    severity: "danger",
    check: (ctx) => isFilled(ctx.profile?.positions),
  },
  {
    id: "personal-avatar",
    sectionId: "personal-data",
    title: "Subir foto de perfil",
    description: "Una imagen clara ayuda a identificarte y desbloquea la generación del portfolio.",
    href: "/dashboard/edit-profile/personal-data",
    severity: "danger",
    check: (ctx) => isFilled(ctx.profile?.avatar_url) && ctx.profile?.avatar_url !== "/images/player-default.png",
  },
  {
    id: "personal-bio",
    sectionId: "personal-data",
    title: "Completar biografía",
    description: "Contá tu historia y fortalezas para contextualizar tu trayectoria.",
    href: "/dashboard/edit-profile/personal-data",
    severity: "warning",
    check: (ctx) => isFilled(ctx.profile?.bio),
  },
  {
    id: "personal-club",
    sectionId: "personal-data",
    title: "Informar club actual",
    description: "Indicá tu club actual o marcá que sos jugador libre.",
    href: "/dashboard/edit-profile/football-data",
    severity: "warning",
    check: (ctx) => isFilled(ctx.profile?.current_club),
  },
  {
    id: "personal-physical-data",
    sectionId: "personal-data",
    title: "Cargar datos físicos",
    description: "Altura, peso y pierna hábil ayudan a completar el informe técnico.",
    href: "/dashboard/edit-profile/personal-data",
    severity: "secondary",
    check: (ctx) => isFilled(ctx.profile?.height_cm) && isFilled(ctx.profile?.weight_kg) && isFilled(ctx.profile?.foot),
  },
  {
    id: "football-career",
    sectionId: "football-data",
    title: "Registrar trayectoria",
    description: "Añadí al menos un club en tu historial profesional.",
    href: "/dashboard/edit-profile/football-data",
    severity: "danger",
    check: (ctx) => ctx.metrics.careerItems > 0,
  },
  {
    id: "football-position-depth",
    sectionId: "football-data",
    title: "Ampliar información táctica",
    description: "Sumá posiciones secundarias o roles específicos.",
    href: "/dashboard/edit-profile/football-data",
    severity: "secondary",
    check: (ctx) => (ctx.profile?.positions?.length ?? 0) > 1,
  },
  {
    id: "multimedia-photo",
    sectionId: "multimedia",
    title: "Agregar foto destacada",
    description: "Necesitamos al menos una foto para generar tu galería y portada.",
    href: "/dashboard/edit-profile/multimedia",
    severity: "danger",
    check: (ctx) => ctx.metrics.media.photos > 0,
  },
  {
    id: "multimedia-video",
    sectionId: "multimedia",
    title: "Cargar video destacado",
    description: "Un video con highlights incrementa la visibilidad de tu perfil.",
    href: "/dashboard/edit-profile/multimedia",
    severity: "warning",
    check: (ctx) => ctx.metrics.media.videos > 0,
  },
  {
    id: "multimedia-galeria-ampliada",
    sectionId: "multimedia",
    title: "Completar galería multimedia",
    description: "Subí al menos cinco elementos para enriquecer tu portfolio.",
    href: "/dashboard/edit-profile/multimedia",
    severity: "secondary",
    check: (ctx) => ctx.metrics.media.total >= 5,
  },
];

export function evaluateDashboardTasks(context: ClientTaskContext): TaskEvaluation {
  const totals: Record<TaskSeverity, number> = {
    danger: 0,
    warning: 0,
    secondary: 0,
  };

  const sections: Record<string, SectionTaskSummary> = {};
  const bySeverity: Record<TaskSeverity, EvaluatedTask[]> = {
    danger: [],
    warning: [],
    secondary: [],
  };

  const tasks = TASK_DEFINITIONS.map((definition) => {
    const completed = definition.check(context);

    const summary = sections[definition.sectionId] ?? {
      total: 0,
      completed: 0,
      pending: 0,
      severityCounts: {
        danger: 0,
        warning: 0,
        secondary: 0,
      } as Record<TaskSeverity, number>,
    };

    summary.total += 1;
    if (completed) {
      summary.completed += 1;
    } else {
      summary.pending += 1;
      summary.severityCounts[definition.severity] += 1;
      totals[definition.severity] += 1;
    }

    sections[definition.sectionId] = summary;

    const evaluatedTask: EvaluatedTask = {
      ...definition,
      completed,
    };

    if (!completed) {
      bySeverity[definition.severity].push(evaluatedTask);
    }

    return evaluatedTask;
  });

  return { tasks, sections, totals, bySeverity };
}

export function pickHighestSeverity(summary: SectionTaskSummary): TaskSeverity | null {
  if (summary.severityCounts.danger > 0) return "danger";
  if (summary.severityCounts.warning > 0) return "warning";
  if (summary.severityCounts.secondary > 0) return "secondary";
  return null;
}

export function orderTasksBySeverity(tasks: EvaluatedTask[]): EvaluatedTask[] {
  const order: Record<TaskSeverity, number> = {
    danger: 0,
    warning: 1,
    secondary: 2,
  };

  return [...tasks].sort((a, b) => {
    const severityDiff = order[a.severity] - order[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return TASK_DEFINITIONS.findIndex((task) => task.id === a.id) - TASK_DEFINITIONS.findIndex((task) => task.id === b.id);
  });
}
