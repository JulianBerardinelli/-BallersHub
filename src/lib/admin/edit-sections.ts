// The ordered admin player-edit sections — shared by the nested edit nav
// (breadcrumb + tabs) and the player-row options dropdown so they never drift.
// Each `key` is also the route segment under /admin/players/[id]/edit/<key>.

import type { AdminEditDomain } from "./edit-domains";

export const ADMIN_EDIT_SECTIONS: { key: AdminEditDomain; label: string }[] = [
  { key: "datos", label: "Datos" },
  { key: "trayectoria", label: "Trayectoria" },
  { key: "estadisticas", label: "Estadísticas" },
  { key: "palmares", label: "Palmarés" },
  { key: "scouting", label: "Scouting" },
  { key: "valor", label: "Valor de mercado" },
  { key: "multimedia", label: "Multimedia" },
  { key: "links", label: "Enlaces" },
  { key: "prensa", label: "Notas de prensa" },
];

export function adminEditSectionLabel(key: string): string {
  return ADMIN_EDIT_SECTIONS.find((s) => s.key === key)?.label ?? key;
}
