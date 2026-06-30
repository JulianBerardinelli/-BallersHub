// The ordered admin coach-edit sections — shared by the nested edit nav
// (breadcrumb + tabs), the finalize-review bar, the row options dropdown and the
// admin coach actions so they never drift. Mirrors the player module
// (@/lib/admin/edit-sections + edit-domains), adapted to what a coach has
// editable (no separate stats / scouting / market value / links / press).
//
// Client + server safe — no side-effect imports — so the client nav/finalize bar
// AND the "use server" actions can all read it.

export const COACH_ADMIN_EDIT_DOMAINS = [
  "datos",
  "datos-personales",
  "enlaces",
  "trayectoria",
  "licencias",
  "multimedia",
  "metodologia",
  "ideas-juego",
  "logros",
  "idiomas",
] as const;

export type CoachAdminEditDomain = (typeof COACH_ADMIN_EDIT_DOMAINS)[number];

// Each `key` is also the route segment under /admin/coaches/[id]/edit/<key>
// (except `datos`, which is the index that redirects there).
export const COACH_ADMIN_EDIT_SECTIONS: { key: CoachAdminEditDomain; label: string }[] = [
  { key: "datos", label: "Datos" },
  { key: "datos-personales", label: "Datos personales" },
  { key: "trayectoria", label: "Trayectoria" },
  { key: "licencias", label: "Licencias" },
  { key: "multimedia", label: "Multimedia" },
  { key: "metodologia", label: "Metodología" },
  { key: "ideas-juego", label: "Ideas de Juego" },
  { key: "logros", label: "Logros" },
  { key: "enlaces", label: "Enlaces" },
  { key: "idiomas", label: "Idiomas" },
];

export function coachAdminEditSectionLabel(key: string): string {
  return COACH_ADMIN_EDIT_SECTIONS.find((s) => s.key === key)?.label ?? key;
}

/** Short noun phrase used inside sentences ("revisamos tu {label}"). */
export const COACH_ADMIN_EDIT_DOMAIN_LABELS: Record<CoachAdminEditDomain, string> = {
  datos: "datos de perfil",
  "datos-personales": "datos personales",
  enlaces: "enlaces",
  trayectoria: "trayectoria",
  licencias: "licencias",
  multimedia: "multimedia",
  metodologia: "metodología",
  "ideas-juego": "ideas de juego",
  logros: "logros",
  idiomas: "traducciones",
};

/** Where "Ver mi perfil" sends the coach (the matching dashboard editor). */
export const COACH_ADMIN_EDIT_DOMAIN_HREFS: Record<CoachAdminEditDomain, string> = {
  datos: "/dashboard/coach/edit",
  "datos-personales": "/dashboard/coach/personal-data",
  enlaces: "/dashboard/coach/links",
  trayectoria: "/dashboard/coach/career",
  licencias: "/dashboard/coach/licenses",
  multimedia: "/dashboard/coach/multimedia",
  metodologia: "/dashboard/coach/methodology",
  "ideas-juego": "/dashboard/coach/game-ideas",
  logros: "/dashboard/coach/honours",
  idiomas: "/dashboard/coach/translations",
};

export function isCoachAdminEditDomain(value: string): value is CoachAdminEditDomain {
  return (COACH_ADMIN_EDIT_DOMAINS as readonly string[]).includes(value);
}
