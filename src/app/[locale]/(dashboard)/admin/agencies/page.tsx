import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import AgenciesTableUI from "./AgenciesTableUI";
import type { AgencyAgentRow, AgencyRow } from "./types";

export default async function AdminAgenciesPage() {
  noStore();

  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/agencies");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!up?.role || !["admin", "moderator", "analyst"].includes(up.role)) {
    redirect("/dashboard");
  }

  // Migrated 3 db.query.* calls → Supabase REST (service role) to
  // avoid postgres-js ClientRead zombies under Vercel load.
  // See PERFORMANCE_PLAN.md.
  const admin = createSupabaseAdmin();

  const [agenciesRes, staffUsersRes, playerProfilesRes] = await Promise.all([
    admin
      .from("agency_profiles")
      .select(
        "id, name, slug, logo_url, tagline, headquarters, operative_countries, foundation_year, is_approved, contact_email, website_url, created_at",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("user_profiles")
      .select("id, user_id, agency_id, created_at")
      .eq("role", "manager")
      .not("agency_id", "is", null),
    admin
      .from("player_profiles")
      .select("agency_id")
      .not("agency_id", "is", null),
  ]);

  type AgencyRowRaw = {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    tagline: string | null;
    headquarters: string | null;
    operative_countries: string[] | null;
    foundation_year: number | null;
    is_approved: boolean;
    contact_email: string | null;
    website_url: string | null;
    created_at: string;
  };
  type StaffUserRow = {
    id: string; // user_profiles.id
    user_id: string; // auth user id
    agency_id: string;
    created_at: string;
  };

  const agenciesData = (agenciesRes.data ?? []) as AgencyRowRaw[];
  const staffUsers = (staffUsersRes.data ?? []) as StaffUserRow[];
  const playerProfiles = (playerProfilesRes.data ?? []) as Array<{
    agency_id: string;
  }>;

  // Second hop: fetch manager_profiles for the staff users we found.
  // We use this two-step pattern because manager_profiles is keyed by
  // user_profiles.id (not auth user_id) and we don't rely on REST
  // embedded selects (no FK guarantee across reorgs).
  const userProfileIds = staffUsers.map((s) => s.id);
  const managerProfilesRes = userProfileIds.length
    ? await admin
        .from("manager_profiles")
        .select("user_id, full_name, avatar_url, contact_email")
        .in("user_id", userProfileIds)
    : { data: [] as Array<{
        user_id: string;
        full_name: string;
        avatar_url: string | null;
        contact_email: string | null;
      }> };
  const managerByUserProfileId = new Map<string, {
    full_name: string;
    avatar_url: string | null;
    contact_email: string | null;
  }>();
  for (const m of (managerProfilesRes.data ?? []) as Array<{
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    contact_email: string | null;
  }>) {
    managerByUserProfileId.set(m.user_id, {
      full_name: m.full_name,
      avatar_url: m.avatar_url,
      contact_email: m.contact_email,
    });
  }

  const agentsByAgency = new Map<string, AgencyAgentRow[]>();
  for (const s of staffUsers) {
    const mp = managerByUserProfileId.get(s.id);
    const list = agentsByAgency.get(s.agency_id) ?? [];
    list.push({
      user_profile_id: s.id,
      user_id: s.user_id,
      full_name: mp?.full_name ?? null,
      avatar_url: mp?.avatar_url ?? null,
      contact_email: mp?.contact_email ?? null,
      joined_at: s.created_at,
    });
    agentsByAgency.set(s.agency_id, list);
  }

  const playerCountByAgency = new Map<string, number>();
  for (const p of playerProfiles) {
    playerCountByAgency.set(
      p.agency_id,
      (playerCountByAgency.get(p.agency_id) ?? 0) + 1,
    );
  }

  const items: AgencyRow[] = agenciesData.map((a) => {
    const agents = (agentsByAgency.get(a.id) ?? []).sort((x, y) => {
      const xn = (x.full_name ?? "").toLowerCase();
      const yn = (y.full_name ?? "").toLowerCase();
      return xn.localeCompare(yn);
    });
    return {
      id: a.id,
      name: a.name,
      slug: a.slug,
      logo_url: a.logo_url,
      tagline: a.tagline,
      headquarters: a.headquarters,
      operative_countries: a.operative_countries ?? [],
      foundation_year: a.foundation_year,
      is_approved: a.is_approved,
      contact_email: a.contact_email,
      website_url: a.website_url,
      created_at: a.created_at,
      agents,
      agent_count: agents.length,
      player_count: playerCountByAgency.get(a.id) ?? 0,
    };
  });

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Directorio de Agencias
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Mantenimiento del catálogo global de agencias representativas. Tocá
          una fila para ver los agentes registrados que trabajan en ella.
        </p>
      </div>
      <AgenciesTableUI items={items} />
    </main>
  );
}
