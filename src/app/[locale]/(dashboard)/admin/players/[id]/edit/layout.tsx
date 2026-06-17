import { notFound, redirect } from "next/navigation";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import { PlanAccessProvider } from "@/components/dashboard/plan/PlanAccessProvider";

import AdminPlayerHeader from "./_components/AdminPlayerHeader";
import EditSectionNav from "./_components/EditSectionNav";

export default async function AdminPlayerEditLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;

  // Strict gate: editing ALL of a player's data directly (bypassing the review
  // queue) is admin-only — stricter than the parent admin layout's
  // admin/moderator/analyst set. Defense in depth — every action re-checks too.
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/players");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string | null }>();
  if (up?.role !== "admin") redirect("/admin/players");

  // Load the target player + their plan via service-role (the [id] is the
  // player_profiles UUID — matches the "Copiar ID" affordance on the row).
  const admin = createSupabaseAdmin();
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { eq }) => eq(p.id, id),
    columns: {
      id: true,
      userId: true,
      slug: true,
      fullName: true,
      avatarUrl: true,
      status: true,
    },
  });
  if (!player) notFound();

  const state = await fetchDashboardState(admin, player.userId);
  const access = resolvePlanAccess(state.subscription ?? null);

  return (
    // Provide the TARGET player's plan so the reused dashboard components gate
    // Pro/Free exactly as that player would see — no component changes needed.
    <PlanAccessProvider value={{ access, audience: "player" }}>
      <div className="space-y-6">
        <EditSectionNav playerId={player.id} playerName={player.fullName} />
        <AdminPlayerHeader
          name={player.fullName}
          slug={player.slug}
          avatarUrl={player.avatarUrl}
          status={player.status}
          isPro={access.isPro}
        />
        <div>{children}</div>
      </div>
    </PlanAccessProvider>
  );
}
