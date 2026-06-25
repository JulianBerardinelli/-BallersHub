// Taxonomía canónica de roles del staff (cuerpo técnico) — single source of
// truth en CÓDIGO para los 13 oficios del enum `staff_role_type`
// (src/db/schema/enums.ts). Define el orden de display/onboarding, el grouping
// para el picker, las labels es nativas y el fork de layout DT vs universal.
//
// Eje ORTOGONAL al `role` de auth (member/player/coach/...). Ver docs/staff/PLAN.md §3-§5.
//
// Import type-only del enum → no arrastra drizzle-orm al bundle del cliente; la
// completitud de los 13 valores la garantiza el Record<StaffRoleType,…> de labels.

import type { StaffRoleType } from "@/db/schema/enums";

export type { StaffRoleType };

// Los 13 oficios en orden canónico de display/onboarding. Espeja el pgEnum.
export const STAFF_ROLES = [
  "head_coach",
  "assistant_head_coach",
  "assistant_coach",
  "fitness_coach",
  "rehab_physio",
  "goalkeeping_coach",
  "set_piece_coach",
  "tactical_analyst",
  "data_analyst",
  "scouting",
  "sporting_director",
  "academy_coordinator",
  "methodology_director",
] as const satisfies readonly StaffRoleType[];

// Grupo "Cuerpo Técnico": si el rol PRINCIPAL es uno de estos, el portfolio
// monta el layout DT (Ideas de Juego / pizarra). El resto usa el layout
// universal. Decisión D1: sólo el primary_role decide. Ver docs/staff/PLAN.md §5.
export const HEAD_COACH_ROLES = [
  "head_coach",
  "assistant_head_coach",
  "assistant_coach",
] as const satisfies readonly StaffRoleType[];

const HEAD_COACH_SET = new Set<StaffRoleType>(HEAD_COACH_ROLES);

/** True cuando el rol PRINCIPAL desbloquea el layout DT (D1: sólo primary). */
export function isHeadCoachLayout(primaryRole: StaffRoleType | null | undefined): boolean {
  return primaryRole != null && HEAD_COACH_SET.has(primaryRole);
}

/** True si el rol pertenece al grupo Cuerpo Técnico (head-coach). */
export function isHeadCoachRole(role: StaffRoleType): boolean {
  return HEAD_COACH_SET.has(role);
}

// Labels canónicas en español (locale nativo). Otros locales las traducen vía
// el namespace i18n `staff` (clave staff.roles.<role>); pasá un translator de
// next-intl a staffRoleLabel() para usarlas.
export const STAFF_ROLE_LABELS_ES: Record<StaffRoleType, string> = {
  head_coach: "Entrenador",
  assistant_head_coach: "Segundo Entrenador",
  assistant_coach: "Entrenador Asistente",
  fitness_coach: "Preparador Físico",
  rehab_physio: "Readaptador / Fisio",
  goalkeeping_coach: "Entrenador de Arqueros",
  set_piece_coach: "Entrenador de Balón Parado",
  tactical_analyst: "Analista Táctico",
  data_analyst: "Analista de Datos",
  scouting: "Scouting",
  sporting_director: "Director Deportivo",
  academy_coordinator: "Coordinador de Cantera",
  methodology_director: "Director de Metodología",
};

// Grouping para el picker del onboarding. "cuerpo_tecnico" = roles head-coach
// (desbloquean el layout DT); "especialistas" = el resto (layout universal).
export const STAFF_ROLE_GROUPS = [
  { id: "cuerpo_tecnico", roles: HEAD_COACH_ROLES },
  {
    id: "especialistas",
    roles: STAFF_ROLES.filter((r) => !HEAD_COACH_SET.has(r)),
  },
] as const;

/**
 * Label de un rol. Si se pasa un translator de next-intl (namespace con clave
 * `roles.<role>`, ej `getTranslations("staff")`) lo usa; si no, cae a la es nativa.
 */
export function staffRoleLabel(
  role: StaffRoleType,
  t?: (key: string) => string,
): string {
  if (t) {
    try {
      const v = t(`roles.${role}`);
      if (v && v !== `roles.${role}`) return v;
    } catch {
      // namespace/clave ausente → fallback es.
    }
  }
  return STAFF_ROLE_LABELS_ES[role];
}

/** Label combinado: principal + secundarios, ej "Entrenador · Analista Táctico". */
export function staffRolesSummary(
  primaryRole: StaffRoleType | null | undefined,
  secondaryRoles: readonly StaffRoleType[] | null | undefined,
  t?: (key: string) => string,
): string {
  const parts: string[] = [];
  if (primaryRole) parts.push(staffRoleLabel(primaryRole, t));
  for (const r of secondaryRoles ?? []) parts.push(staffRoleLabel(r, t));
  return parts.join(" · ");
}

// Caps de validación (para las server actions). Ver docs/staff/PLAN.md §4.
export const MAX_SECONDARY_ROLES = 2;
export const MAX_STAGE_ROLES = 3;

/** Type guard: ¿el valor es un rol válido del enum? */
export function isStaffRole(value: unknown): value is StaffRoleType {
  return (
    typeof value === "string" &&
    (STAFF_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Normaliza/valida una selección de roles del onboarding:
 * - primary obligatorio y válido
 * - secundarios válidos, sin repetir el principal, deduplicados, máx 2
 * Devuelve null si el principal es inválido.
 */
export function normalizeStaffRoleSelection(input: {
  primaryRole: unknown;
  secondaryRoles?: unknown;
}): { primaryRole: StaffRoleType; secondaryRoles: StaffRoleType[] } | null {
  if (!isStaffRole(input.primaryRole)) return null;
  const primary = input.primaryRole;
  const raw = Array.isArray(input.secondaryRoles) ? input.secondaryRoles : [];
  const secondary: StaffRoleType[] = [];
  for (const r of raw) {
    if (isStaffRole(r) && r !== primary && !secondary.includes(r)) {
      secondary.push(r);
    }
    if (secondary.length >= MAX_SECONDARY_ROLES) break;
  }
  return { primaryRole: primary, secondaryRoles: secondary };
}

/** Valida/normaliza los roles de una etapa de trayectoria (máx 3, dedup). */
export function normalizeStageRoles(input: unknown): StaffRoleType[] {
  const raw = Array.isArray(input) ? input : [];
  const out: StaffRoleType[] = [];
  for (const r of raw) {
    if (isStaffRole(r) && !out.includes(r)) out.push(r);
    if (out.length >= MAX_STAGE_ROLES) break;
  }
  return out;
}
