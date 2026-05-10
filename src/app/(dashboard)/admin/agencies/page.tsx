import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  agencyProfiles,
  userProfiles,
  managerProfiles,
  playerProfiles,
} from "@/db/schema";
import { eq, sql, and, isNotNull } from "drizzle-orm";
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

  const [agenciesData, staffData, playerCounts] = await Promise.all([
    db.query.agencyProfiles.findMany({
      orderBy: (a, { desc: d }) => [d(a.createdAt)],
    }),
    db
      .select({
        userProfileId: userProfiles.id,
        userId: userProfiles.userId,
        agencyId: userProfiles.agencyId,
        createdAt: userProfiles.createdAt,
        fullName: managerProfiles.fullName,
        avatarUrl: managerProfiles.avatarUrl,
        contactEmail: managerProfiles.contactEmail,
      })
      .from(userProfiles)
      .leftJoin(
        managerProfiles,
        eq(managerProfiles.userId, userProfiles.id),
      )
      .where(
        and(
          eq(userProfiles.role, "manager"),
          isNotNull(userProfiles.agencyId),
        ),
      ),
    db
      .select({
        agencyId: playerProfiles.agencyId,
        count: sql<number>`count(*)::int`,
      })
      .from(playerProfiles)
      .where(isNotNull(playerProfiles.agencyId))
      .groupBy(playerProfiles.agencyId),
  ]);

  const agentsByAgency = new Map<string, AgencyAgentRow[]>();
  for (const s of staffData) {
    if (!s.agencyId) continue;
    const list = agentsByAgency.get(s.agencyId) ?? [];
    list.push({
      user_profile_id: s.userProfileId,
      user_id: s.userId,
      full_name: s.fullName,
      avatar_url: s.avatarUrl,
      contact_email: s.contactEmail,
      joined_at:
        s.createdAt instanceof Date
          ? s.createdAt.toISOString()
          : String(s.createdAt),
    });
    agentsByAgency.set(s.agencyId, list);
  }

  const playerCountByAgency = new Map<string, number>();
  for (const row of playerCounts) {
    if (row.agencyId) playerCountByAgency.set(row.agencyId, Number(row.count));
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
      logo_url: a.logoUrl,
      tagline: a.tagline,
      headquarters: a.headquarters,
      operative_countries: a.operativeCountries ?? [],
      foundation_year: a.foundationYear,
      is_approved: a.isApproved,
      contact_email: a.contactEmail,
      website_url: a.websiteUrl,
      created_at:
        a.createdAt instanceof Date
          ? a.createdAt.toISOString()
          : String(a.createdAt),
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
