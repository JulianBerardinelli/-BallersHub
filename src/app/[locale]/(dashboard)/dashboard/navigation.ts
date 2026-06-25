import type { TaskSeverity } from "@/lib/dashboard/client/tasks";

export type ClientDashboardNavBadge = {
  count: number;
  severity: TaskSeverity;
};

export type ClientDashboardNavLink = {
  kind: "link";
  id: string;
  title: string;
  href: string;
  description?: string;
  badge?: ClientDashboardNavBadge;
};

export type ClientDashboardNavAction = {
  kind: "action";
  id: string;
  title: string;
  action: "sign-out";
  description?: string;
};

export type ClientDashboardNavItem =
  | ClientDashboardNavLink
  | ClientDashboardNavAction;

export type ClientDashboardNavSection = {
  id: string;
  title: string;
  items: ClientDashboardNavItem[];
};

const PLAYER_NAVIGATION: ClientDashboardNavSection[] = [
  {
    id: "dashboard",
    title: "Panel",
    items: [
      {
        kind: "link",
        id: "home",
        title: "Panel de control",
        href: "/dashboard",
        description: "Resumen general y próximos pasos prioritarios.",
      },
    ],
  },
  {
    id: "edit-profile",
    title: "Editar perfil",
    items: [
      {
        kind: "link",
        id: "personal-data",
        title: "Datos personales",
        href: "/dashboard/edit-profile/personal-data",
        description: "Información básica, avatar y datos de contacto.",
      },
      {
        kind: "link",
        id: "football-data",
        title: "Datos futbolísticos",
        href: "/dashboard/edit-profile/football-data",
        description: "Trayectoria, club actual y links destacados.",
      },
      {
        kind: "link",
        id: "national-team",
        title: "Selección Nacional",
        href: "/dashboard/edit-profile/national-team",
        description: "Tu paso por la selección (categorías, estadísticas y fotos).",
      },
      {
        kind: "link",
        id: "multimedia",
        title: "Multimedia",
        href: "/dashboard/edit-profile/multimedia",
        description: "Fotos, videos y notas de prensa.",
      },
      {
        kind: "link",
        id: "translations",
        title: "Idiomas",
        href: "/dashboard/edit-profile/translations",
        description: "Publicá tu perfil en inglés, italiano y portugués (Pro).",
      },
    ],
  },
  {
    id: "edit-template",
    title: "Editar plantilla",
    items: [
      {
        kind: "link",
        id: "template-styles",
        title: "Estilos",
        href: "/dashboard/edit-template/styles",
        description: "Seleccioná variantes visuales y colores.",
      },
      {
        kind: "link",
        id: "template-structure",
        title: "Estructura",
        href: "/dashboard/edit-template/structure",
        description: "Activa o desactiva bloques de contenido.",
      },
    ],
  },
  {
    id: "settings",
    title: "Configuración",
    items: [
      {
        kind: "link",
        id: "account",
        title: "Cuenta",
        href: "/dashboard/settings/account",
        description: "Datos de acceso y preferencias generales.",
      },
      {
        kind: "link",
        id: "subscription",
        title: "Suscripción",
        href: "/dashboard/settings/subscription",
        description: "Estado del plan y acciones de facturación.",
      },
      {
        kind: "action",
        id: "logout",
        title: "Cerrar sesión",
        action: "sign-out",
        description: "Salí del panel de manera segura.",
      },
    ],
  },
];

const MANAGER_NAVIGATION: ClientDashboardNavSection[] = [
  {
    id: "dashboard",
    title: "Panel",
    items: [
      {
        kind: "link",
        id: "home",
        title: "Panel de control",
        href: "/dashboard",
        description: "Resumen general de tu agencia.",
      },
    ],
  },
  {
    id: "agency",
    title: "Agencia",
    items: [
      {
        kind: "link",
        id: "agency-profile",
        title: "Datos principales",
        href: "/dashboard/agency",
        description: "Identidad, información general y contacto.",
      },
      {
        kind: "link",
        id: "agency-services",
        title: "Servicios",
        href: "/dashboard/agency/services",
        description: "Qué ofrece tu agencia.",
      },
      {
        kind: "link",
        id: "agency-reach",
        title: "Alcance y operativa",
        href: "/dashboard/agency/reach",
        description: "Países donde operás y su detalle.",
      },
      {
        kind: "link",
        id: "agency-collaborations",
        title: "Clubes",
        href: "/dashboard/agency/collaborations",
        description: "Relaciones y propuestas con clubes.",
      },
      {
        kind: "link",
        id: "agency-multimedia",
        title: "Multimedia",
        href: "/dashboard/agency/multimedia",
        description: "Galería de fotos e imágenes.",
      },
      {
        kind: "link",
        id: "agency-translations",
        title: "Idiomas",
        href: "/dashboard/agency/translations",
        description: "Publicá tu perfil en inglés, italiano y portugués (Pro).",
      },
    ],
  },
  {
    id: "agency-management",
    title: "Gestión",
    items: [
      {
        kind: "link",
        id: "manager-profile",
        title: "Mi perfil",
        href: "/dashboard/profile",
        description: "Tu ficha pública: bio y licencias.",
      },
      {
        kind: "link",
        id: "agency-players",
        title: "Mis Jugadores",
        href: "/dashboard/players",
        description: "Cartera de futbolistas representados.",
      },
      {
        kind: "link",
        id: "agency-staff",
        title: "Equipo Staff",
        href: "/dashboard/agency/staff",
        description: "Invita colegas y gestiona permisos.",
      },
    ],
  },
  {
    id: "agency-template",
    title: "Editar plantilla",
    items: [
      {
        kind: "link",
        id: "agency-template-styles",
        title: "Estilos",
        href: "/dashboard/agency/edit-template/styles",
        description: "Plantilla, paleta y tipografía del portfolio público.",
      },
      {
        kind: "link",
        id: "agency-template-structure",
        title: "Estructura",
        href: "/dashboard/agency/edit-template/structure",
        description: "Activa o desactiva bloques de contenido.",
      },
    ],
  },
  {
    id: "settings",
    title: "Configuración",
    items: [
      {
        kind: "link",
        id: "account",
        title: "Cuenta",
        href: "/dashboard/settings/account",
        description: "Datos de acceso y preferencias generales.",
      },
      {
        kind: "link",
        id: "subscription",
        title: "Suscripción",
        href: "/dashboard/settings/subscription",
        description: "Estado del plan y facturación.",
      },
      {
        kind: "action",
        id: "logout",
        title: "Cerrar sesión",
        action: "sign-out",
        description: "Salí del panel de manera segura.",
      },
    ],
  },
];

// Coach (DT) navigation. PR-4a shipped Panel + profile edit + settings; PR-4b
// adds the moderated sections (trayectoria con revisiones, licencias,
// multimedia, idiomas). Plantilla/estilos land later.
export const COACH_NAVIGATION: ClientDashboardNavSection[] = [
  {
    id: "dashboard",
    title: "Panel",
    items: [
      {
        kind: "link",
        id: "home",
        title: "Panel de control",
        href: "/dashboard",
        description: "Resumen de tu perfil de entrenador.",
      },
    ],
  },
  {
    id: "edit-profile",
    title: "Editar perfil",
    items: [
      {
        kind: "link",
        id: "coach-edit",
        title: "Datos del perfil",
        href: "/dashboard/coach/edit",
        description: "Bio, cargo, ideas de juego, formaciones y objetivos.",
      },
      {
        kind: "link",
        id: "coach-career",
        title: "Trayectoria",
        href: "/dashboard/coach/career",
        description: "Clubes dirigidos y estadísticas por temporada (con revisión).",
      },
      {
        kind: "link",
        id: "coach-licenses",
        title: "Licencias",
        href: "/dashboard/coach/licenses",
        description: "Titulaciones y certificaciones, verificadas por el equipo.",
      },
      {
        kind: "link",
        id: "coach-multimedia",
        title: "Multimedia",
        href: "/dashboard/coach/multimedia",
        description: "Fotos y videos de tu trabajo.",
      },
      {
        kind: "link",
        id: "coach-methodology",
        title: "Metodología",
        href: "/dashboard/coach/methodology",
        description: "Tu metodología de trabajo en rubros (+ archivos PDF/PPT en Pro).",
      },
      {
        kind: "link",
        id: "coach-translations",
        title: "Idiomas",
        href: "/dashboard/coach/translations",
        description: "Publicá tu página en inglés, italiano y portugués (Pro).",
      },
    ],
  },
  {
    id: "settings",
    title: "Configuración",
    items: [
      {
        kind: "link",
        id: "account",
        title: "Cuenta",
        href: "/dashboard/settings/account",
        description: "Datos de acceso y preferencias generales.",
      },
      {
        kind: "link",
        id: "subscription",
        title: "Suscripción",
        href: "/dashboard/settings/subscription",
        description: "Estado del plan y acciones de facturación.",
      },
      {
        kind: "action",
        id: "logout",
        title: "Cerrar sesión",
        action: "sign-out",
        description: "Salí del panel de manera segura.",
      },
    ],
  },
];

export function buildClientDashboardNavigation(
  badges: Partial<Record<string, ClientDashboardNavBadge>> = {},
  isManager: boolean = false,
  t?: (key: string) => string,
): ClientDashboardNavSection[] {
  const source = isManager ? MANAGER_NAVIGATION : PLAYER_NAVIGATION;
  const role = isManager ? "manager" : "player";

  return source.map((section) => ({
    ...section,
    title: t ? t(`nav.sections.${section.id}`) : section.title,
    items: section.items.map((item) => {
      const translated = t
        ? {
            ...item,
            title: t(`nav.${role}.${item.id}.title`),
            description: t(`nav.${role}.${item.id}.description`),
          }
        : item;

      return translated.kind === "link"
        ? {
            ...translated,
            badge: badges[translated.id],
          }
        : translated;
    }),
  }));
}

export const clientDashboardNavigation = buildClientDashboardNavigation();
