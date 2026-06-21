"use server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { slugify, ensureUniqueTeamSlug } from "@/lib/admin/teams";
import { revalidatePath } from "next/cache";
import { revalidateAdminCounters } from "@/lib/admin/counters";

// Columns returned to the client — mirror what `page.tsx` selects so the
// freshly created row maps cleanly onto a `TeamRow` without an extra fetch.
const TEAM_RETURN_COLS =
  "id, name, slug, country, country_code, city, latitude, longitude, " +
  "category, transfermarkt_url, status, crest_url, created_at, updated_at, " +
  "requested_in_application_id, division_id";

type TeamStatus = "pending" | "approved" | "rejected";

/**
 * Verifies the caller is an admin via the cookie-scoped client (RLS), then
 * hands back a service-role client for the actual mutation — same pattern the
 * `/api/admin/teams/[id]/update` route uses.
 */
async function requireAdmin() {
  const supa = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return { ok: false as const, message: "No autenticado." };

  const { data: profile } = await supa
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin")
    return { ok: false as const, message: "No autorizado." };

  return { ok: true as const, admin: createSupabaseAdmin() };
}

function num(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export type CreateTeamInput = {
  name: string;
  slug?: string | null;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  divisionId?: string | null;
  transfermarktUrl?: string | null;
  tags?: string[] | null;
  altNames?: string[] | null;
  status?: TeamStatus;
  featured?: boolean;
  crestUrl?: string | null;
};

/**
 * Manual team creation (admin). Mirrors the "Crear división" flow: a real
 * INSERT with admin auth, a guaranteed-unique slug, and the same field set the
 * edit form persists. Returns the inserted row so the table can prepend it
 * without a full reload.
 */
export async function createTeam(input: CreateTeamInput) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false as const, message: auth.message };
  const { admin } = auth;

  const name = (input.name ?? "").trim();
  if (!name) return { success: false as const, message: "El nombre es obligatorio." };

  const base = input.slug?.trim() ? slugify(input.slug) : slugify(name);
  const slug = await ensureUniqueTeamSlug(base, admin);

  const row = {
    name,
    slug,
    country: input.country?.trim() || null,
    country_code: input.countryCode?.trim().toUpperCase().slice(0, 2) || null,
    city: input.city?.trim() || null,
    latitude: num(input.latitude),
    longitude: num(input.longitude),
    category: input.category?.trim() || null,
    division_id: input.divisionId || null,
    transfermarkt_url: input.transfermarktUrl?.trim() || null,
    tags: Array.isArray(input.tags) ? input.tags : [],
    alt_names: Array.isArray(input.altNames) ? input.altNames : [],
    status: (input.status ?? "approved") as TeamStatus,
    featured: !!input.featured,
    crest_url: input.crestUrl?.trim() || "/images/team-default.svg",
  };

  const { data, error } = await admin
    .from("teams")
    .insert(row)
    .select(TEAM_RETURN_COLS)
    .single();

  if (error) return { success: false as const, message: error.message };

  revalidatePath("/admin/teams");
  revalidateAdminCounters();
  // `.select(<string>)` widens to a non-parseable type; the row is a plain
  // object — expose it as such so the client can map it onto a TeamRow.
  return { success: true as const, team: data as Record<string, any> };
}

/**
 * Hard-deletes a team. Safe in production: every FK referencing `teams` is
 * ON DELETE CASCADE (agency relations, career/coach proposals) or SET NULL
 * (player/coach profiles & applications, career items) — verified against the
 * live schema — so no constraint blocks the delete. Service-role client
 * bypasses RLS after the admin check.
 */
export async function deleteTeam(teamId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false as const, message: auth.message };
  const { admin } = auth;

  if (!teamId) return { success: false as const, message: "Falta el id del equipo." };

  const { error } = await admin.from("teams").delete().eq("id", teamId);
  if (error) return { success: false as const, message: error.message };

  revalidatePath("/admin/teams");
  revalidateAdminCounters();
  return { success: true as const };
}
