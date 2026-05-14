import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { userProfiles } from "@/db/schema/users";
import { playerProfiles } from "@/db/schema/players";
import { eq } from "drizzle-orm";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import Image from "next/image";
import Link from "next/link";
import PlayerInviteManager from "@/components/dashboard/client/PlayerInviteManager";
import { getPendingPlayerInvitesForAgency } from "@/app/actions/player-invites";

export const metadata = {
  title: "Mis Jugadores - Dashboard",
};

export default async function AgencyPlayersPage() {
  const supa = await createSupabaseServerRSC();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const up = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
    with: { agency: true }
  });

  if (!up || up.role !== "manager" || !up.agencyId || !up.agency) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mis Jugadores" description="Cartera de futbolistas representados." />
        <SectionCard title="Acceso Restringido" description="">
          <p className="text-neutral-400">Aún no tienes una agencia aprobada o no eres un mánager activo.</p>
        </SectionCard>
      </div>
    );
  }

  const players = await db.query.playerProfiles.findMany({
    where: eq(playerProfiles.agencyId, up.agencyId),
    orderBy: (players, { desc }) => [desc(players.createdAt)]
  });

  const pendingInvitesRes = await getPendingPlayerInvitesForAgency();
  const pendingInvites = pendingInvitesRes.success && pendingInvitesRes.invites ? pendingInvitesRes.invites : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Jugadores"
        description={`Cartera de futbolistas representados de ${up.agency.name}`}
      />

      <SectionCard
        title="Directorio de Jugadores"
        description={`Actualmente tienes ${players.length} futbolista(s) vinculados a la agencia.`}
      >
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
             <p className="text-neutral-400">No hay jugadores vinculados aún.</p>
             <p className="text-sm text-neutral-500 mt-2">Envía una invitación al jugador para agregarlo a tu cartera.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mt-4">
            {players.map(player => (
               <div key={player.id} className="flex flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 transition-colors hover:border-neutral-700">
                  <div className="flex items-center gap-4 p-4 border-b border-neutral-800">
                     <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-neutral-900">
                       <Image
                         src={player.avatarUrl ?? "/images/player-default.png"}
                         alt={player.fullName}
                         fill
                         sizes="48px"
                         className="object-cover"
                         unoptimized
                       />
                     </div>
                     <div className="min-w-0">
                       <h3 className="truncate font-semibold text-white">{player.fullName}</h3>
                       <p className="truncate text-xs text-neutral-400">{player.currentClub || "Agente Libre"}</p>
                     </div>
                  </div>
                  
                  <div className="p-4 grid grid-cols-2 gap-2 text-xs text-neutral-400">
                    <div>
                      <span className="block font-medium text-neutral-500">Estado</span>
                      <span className="text-white capitalize">{player.status.replace("_", " ")}</span>
                    </div>
                    <div>
                      <span className="block font-medium text-neutral-500">Visibilidad</span>
                      <span className="text-white capitalize">{player.visibility}</span>
                    </div>
                  </div>

                  <div className="mt-auto bg-neutral-900/50 p-3 text-center">
                    <Link href={`/${player.slug}`} target="_blank" className="text-sm font-medium text-primary hover:underline">
                      Ver perfil público
                    </Link>
                  </div>
               </div>
            ))}
          </div>
        )}

        <PlayerInviteManager
          pendingInvites={pendingInvites}
          currentPlayersCount={players.length}
        />
      </SectionCard>
    </div>
  );
}
