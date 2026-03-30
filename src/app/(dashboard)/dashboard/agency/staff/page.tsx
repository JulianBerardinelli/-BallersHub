import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { userProfiles, agencyInvites } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import AgencyStaffManager from "./components/AgencyStaffManager";
import { UsersRound } from "lucide-react";

export default async function AgencyStaffPage() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // 1. Get user profile to ensure they are a manager
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!userProfile || userProfile.role !== "manager" || !userProfile.agencyId) {
    redirect("/dashboard");
  }

  // 2. Fetch active staff count (all userProfiles under this agencyId)
  const staffMembers = await db.query.userProfiles.findMany({
    where: eq(userProfiles.agencyId, userProfile.agencyId),
  });

  // 3. Fetch pending invites
  const invites = await db.query.agencyInvites.findMany({
    where: and(
      eq(agencyInvites.agencyId, userProfile.agencyId),
      eq(agencyInvites.status, "pending")
    ),
    orderBy: (ag, { desc }) => [desc(ag.createdAt)],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Equipo (Staff)"
        description="Invita a colegas a tu agencia para que administren de forma colaborativa a tus jugadores."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 flex items-center justify-between">
           <div>
             <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Managers Activos</p>
             <p className="text-3xl font-bold text-white">{staffMembers.length}</p>
           </div>
           <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">
              <UsersRound className="h-5 w-5" />
           </div>
        </div>
      </div>

      <SectionCard
        title="Invitaciones"
        description="Administra quién tiene acceso al dashboard y jugadores de tu agencia."
      >
        <AgencyStaffManager pendingInvites={invites} />
      </SectionCard>
    </div>
  );
}
