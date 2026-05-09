import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  agencyTeamRelationSubmissions,
  agencyTeamRelationProposals,
  agencyProfiles,
  teams,
} from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

import AgencyTeamProposalsClient from "./components/AgencyTeamProposalsClient";

export const metadata = {
  title: "Solicitudes de equipos · Admin",
};

export default async function AgencyTeamProposalsAdminPage() {
  noStore();

  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/agency-team-proposals");

  const submissions = await db.query.agencyTeamRelationSubmissions.findMany({
    where: eq(agencyTeamRelationSubmissions.status, "pending"),
    orderBy: desc(agencyTeamRelationSubmissions.submittedAt),
  });

  const submissionIds = submissions.map((s) => s.id);
  const items = submissionIds.length
    ? await db.query.agencyTeamRelationProposals.findMany({
        where: inArray(agencyTeamRelationProposals.submissionId, submissionIds),
      })
    : [];

  const agencyIds = Array.from(new Set(submissions.map((s) => s.agencyId)));
  const agencies = agencyIds.length
    ? await db.query.agencyProfiles.findMany({
        where: inArray(agencyProfiles.id, agencyIds),
        columns: { id: true, name: true, slug: true, logoUrl: true },
      })
    : [];
  const agencyMap = new Map(agencies.map((a) => [a.id, a]));

  const teamIds = items
    .map((i) => i.teamId)
    .filter((id): id is string => !!id);
  const refTeams = teamIds.length
    ? await db.query.teams.findMany({
        where: inArray(teams.id, teamIds),
        columns: { id: true, name: true, country: true, countryCode: true, slug: true },
      })
    : [];
  const teamMap = new Map(refTeams.map((t) => [t.id, t]));

  const data = submissions.map((s) => ({
    submission: {
      id: s.id,
      note: s.note,
      submittedAt: s.submittedAt.toISOString(),
    },
    agency: agencyMap.get(s.agencyId) ?? null,
    items: items
      .filter((it) => it.submissionId === s.id)
      .map((it) => ({
        id: it.id,
        teamId: it.teamId,
        proposedTeamName: it.proposedTeamName,
        proposedTeamCountry: it.proposedTeamCountry,
        proposedTeamCountryCode: it.proposedTeamCountryCode,
        proposedTeamDivision: it.proposedTeamDivision,
        proposedTeamTransfermarktUrl: it.proposedTeamTransfermarktUrl,
        relationKind: it.relationKind,
        description: it.description,
        team: it.teamId ? teamMap.get(it.teamId) ?? null : null,
      })),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Solicitudes de equipos · Agencias
        </h1>
        <p className="mt-1 text-sm text-bh-fg-3 max-w-3xl">
          Las agencias proponen equipos con los que han trabajado. Aprobá ítem por ítem; los equipos nuevos se materializan en el directorio con estado &quot;pending&quot;.
        </p>
      </header>

      <AgencyTeamProposalsClient submissions={data} />
    </div>
  );
}
