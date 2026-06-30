// Loader del JOB BOARD público `/staff` (directorio de Cuerpo Técnico).
// A diferencia de getIndexableCoaches (sitemap, sólo Pro/bio-rica), el
// directorio lista TODOS los perfiles approved+public — un coach Free también
// merece estar en el listado aunque su página no se indexe individualmente.
//
// El dataset del staff es chico (decenas), así que cargamos todo una vez y
// filtramos + faceteamos en memoria: filtros instantáneos + facets exactos sin
// N queries. Si esto creciera a cientos, migrar a filtros en SQL + paginación.
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { coachProfiles, coachPersonalDetails } from "@/db/schema";
import { isStaffRole, type StaffRoleType } from "@/lib/staff/roles";

export type StaffDirectoryItem = {
  slug: string;
  fullName: string;
  avatarUrl: string;
  primaryRole: StaffRoleType | null;
  secondaryRoles: StaffRoleType[];
  nationalityCodes: string[];
  currentClub: string | null;
  languages: string[];
};

export type StaffDirectoryFilters = {
  role?: string | null;
  nationality?: string | null;
  language?: string | null;
};

export type StaffDirectoryFacets = {
  // Roles presentes en el dataset (principal o secundario) → para el filtro.
  roles: StaffRoleType[];
  // Códigos de país presentes (char(2) en minúscula).
  nationalities: string[];
  // Idiomas hablados presentes (normalizados).
  languages: string[];
};

const norm = (s: string) => s.trim().toLowerCase();

/** Carga el dataset completo de staff público (sin filtrar). */
export async function loadStaffDirectory(): Promise<StaffDirectoryItem[]> {
  const rows = await db
    .select({
      slug: coachProfiles.slug,
      fullName: coachProfiles.fullName,
      avatarUrl: coachProfiles.avatarUrl,
      primaryRole: coachProfiles.primaryRole,
      secondaryRoles: coachProfiles.secondaryRoles,
      nationalityCodes: coachProfiles.nationalityCodes,
      currentClub: coachProfiles.currentClub,
      languages: coachPersonalDetails.languages,
    })
    .from(coachProfiles)
    .leftJoin(coachPersonalDetails, eq(coachPersonalDetails.coachId, coachProfiles.id))
    .where(and(eq(coachProfiles.status, "approved"), eq(coachProfiles.visibility, "public")))
    .orderBy(asc(coachProfiles.fullName));

  return rows.map((r) => ({
    slug: r.slug,
    fullName: r.fullName,
    avatarUrl: r.avatarUrl,
    primaryRole: r.primaryRole && isStaffRole(r.primaryRole) ? r.primaryRole : null,
    secondaryRoles: (r.secondaryRoles ?? []).filter(isStaffRole),
    nationalityCodes: (r.nationalityCodes ?? []).map((c) => (c ?? "").toLowerCase()).filter(Boolean),
    currentClub: r.currentClub,
    languages: (r.languages ?? []).map((l) => (l ?? "").trim()).filter(Boolean),
  }));
}

/** Facets (opciones disponibles) derivadas del dataset completo. */
export function computeStaffFacets(items: StaffDirectoryItem[]): StaffDirectoryFacets {
  const roles = new Set<StaffRoleType>();
  const nationalities = new Set<string>();
  const languages = new Set<string>();
  for (const it of items) {
    if (it.primaryRole) roles.add(it.primaryRole);
    it.secondaryRoles.forEach((r) => roles.add(r));
    it.nationalityCodes.forEach((c) => nationalities.add(c));
    it.languages.forEach((l) => languages.add(l));
  }
  return {
    roles: [...roles],
    nationalities: [...nationalities].sort(),
    languages: [...languages].sort((a, b) => a.localeCompare(b)),
  };
}

/** Aplica los filtros (en memoria) sobre el dataset. */
export function filterStaffDirectory(
  items: StaffDirectoryItem[],
  filters: StaffDirectoryFilters,
): StaffDirectoryItem[] {
  const role = filters.role && isStaffRole(filters.role) ? filters.role : null;
  const nat = filters.nationality ? norm(filters.nationality) : null;
  const lang = filters.language ? norm(filters.language) : null;

  return items.filter((it) => {
    if (role && it.primaryRole !== role && !it.secondaryRoles.includes(role)) return false;
    if (nat && !it.nationalityCodes.includes(nat)) return false;
    if (lang && !it.languages.some((l) => norm(l) === lang)) return false;
    return true;
  });
}
