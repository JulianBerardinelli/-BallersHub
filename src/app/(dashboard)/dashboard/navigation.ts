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
        id: "multimedia",
        title: "Multimedia",
        href: "/dashboard/edit-profile/multimedia",
        description: "Fotos, videos y notas de prensa.",
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
        title: "Perfil de la Agencia",
        href: "/dashboard/agency",
        description: "Detalles, información y verificación.",
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
    id: "settings",
    title: "Configuración",
    items: [
      {
        kind: "link",
        id: "manager-profile",
        title: "Mi Perfil",
        href: "/dashboard/profile",
        description: "Tus datos públicos personales.",
      },
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

export function buildClientDashboardNavigation(
  badges: Partial<Record<string, ClientDashboardNavBadge>> = {},
  isManager: boolean = false
): ClientDashboardNavSection[] {
  const source = isManager ? MANAGER_NAVIGATION : PLAYER_NAVIGATION;
  
  return source.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.kind === "link"
        ? {
            ...item,
            badge: badges[item.id],
          }
        : item,
    ),
  }));
}

export const clientDashboardNavigation = buildClientDashboardNavigation();
