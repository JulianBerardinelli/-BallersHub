// Shared (client + server safe — no side-effect imports) vocabulary for the
// admin player CRUD. The same domain keys flow through: the edit route segments,
// the server actions, the audit action string, the persisted notification
// payload, the in-app toast copy, and the correction email. Centralised here so
// the wording stays consistent everywhere.

export const ADMIN_EDIT_DOMAINS = [
  "datos",
  "trayectoria",
  "estadisticas",
  "palmares",
  "scouting",
  "valor",
  "multimedia",
  "links",
  "prensa",
] as const;

export type AdminEditDomain = (typeof ADMIN_EDIT_DOMAINS)[number];

/** Short noun phrase used inside sentences ("actualizamos tu {label}"). */
export const ADMIN_EDIT_DOMAIN_LABELS: Record<AdminEditDomain, string> = {
  datos: "datos de perfil",
  trayectoria: "trayectoria",
  estadisticas: "estadísticas",
  palmares: "palmarés",
  scouting: "reporte de scouting",
  valor: "valor de mercado",
  multimedia: "multimedia",
  links: "enlaces",
  prensa: "notas de prensa",
};

/** One-line notice (reused by the in-app toast body + the correction email). */
export const ADMIN_EDIT_DOMAIN_NOTICE: Record<AdminEditDomain, string> = {
  datos: "Corregimos tus datos de perfil luego de una revisión.",
  trayectoria: "Editamos una etapa de tu trayectoria luego de una revisión.",
  estadisticas: "Corregimos tus estadísticas luego de una revisión.",
  palmares: "Corregimos tu palmarés luego de una revisión.",
  scouting: "Actualizamos tu reporte de scouting luego de una revisión.",
  valor: "Ajustamos tu valor de mercado luego de una revisión.",
  multimedia: "Actualizamos tu multimedia luego de una revisión.",
  links: "Actualizamos tus enlaces luego de una revisión.",
  prensa: "Actualizamos tus notas de prensa luego de una revisión.",
};

/** Where "Ver mi perfil" sends the player (the matching dashboard editor). */
export const ADMIN_EDIT_DOMAIN_HREFS: Record<AdminEditDomain, string> = {
  datos: "/dashboard/edit-profile/personal-data",
  trayectoria: "/dashboard/edit-profile/football-data",
  estadisticas: "/dashboard/edit-profile/football-data",
  palmares: "/dashboard/edit-profile/football-data",
  scouting: "/dashboard/edit-profile/football-data",
  valor: "/dashboard/edit-profile/football-data",
  multimedia: "/dashboard/edit-profile/multimedia",
  links: "/dashboard/edit-profile/football-data",
  prensa: "/dashboard/edit-profile/multimedia",
};

export function isAdminEditDomain(value: string): value is AdminEditDomain {
  return (ADMIN_EDIT_DOMAINS as readonly string[]).includes(value);
}
