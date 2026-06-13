import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { userProfiles } from "@/db/schema/users";
import { playerProfiles } from "@/db/schema/players";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import PlayerInviteManager from "@/components/dashboard/client/PlayerInviteManager";
import { getPendingPlayerInvitesForAgency } from "@/app/actions/player-invites";

export async function generateMetadata() {
  const t = await getTranslations("dashAgency");
  return { title: t("playersPage.metaTitle") };
}

export default async function AgencyPlayersPage() {
  const t = await getTranslations("dashAgency");
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
        <PageHeader title={t("playersPage.pageTitle")} description={t("playersPage.pageDescriptionFallback")} />
        <SectionCard title={t("playersPage.restrictedTitle")} description="">
          <p className="text-neutral-400">{t("playersPage.restrictedBody")}</p>
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
        title={t("playersPage.pageTitle")}
        description={t("playersPage.pageDescription", { name: up.agency.name })}
      />

      <SectionCard
        title={t("playersPage.directoryTitle")}
        description={t("playersPage.directoryDescription", { count: players.length })}
      >
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
             <p className="text-neutral-400">{t("playersPage.emptyTitle")}</p>
             <p className="text-sm text-neutral-500 mt-2">{t("playersPage.emptyHint")}</p>
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
                       <p className="truncate text-xs text-neutral-400">{player.currentClub || t("playersPage.freeAgent")}</p>
                     </div>
                  </div>

                  <div className="p-4 grid grid-cols-2 gap-2 text-xs text-neutral-400">
                    <div>
                      <span className="block font-medium text-neutral-500">{t("playersPage.statusLabel")}</span>
                      <span className="text-white capitalize">{player.status.replace("_", " ")}</span>
                    </div>
                    <div>
                      <span className="block font-medium text-neutral-500">{t("playersPage.visibilityLabel")}</span>
                      <span className="text-white capitalize">{player.visibility}</span>
                    </div>
                  </div>

                  <div className="mt-auto bg-neutral-900/50 p-3 text-center">
                    <Link href={`/${player.slug}`} target="_blank" className="text-sm font-medium text-primary hover:underline">
                      {t("playersPage.viewPublicProfile")}
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
