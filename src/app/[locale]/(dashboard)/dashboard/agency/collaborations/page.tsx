import { eq, desc, and, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { db } from "@/lib/db";
import {
  agencyTeamRelations,
  agencyTeamRelationSubmissions,
  agencyTeamRelationProposals,
  teams,
} from "@/db/schema";
import PageHeader from "@/components/dashboard/client/PageHeader";
import { requireManagerAgency } from "../_lib/require-manager-agency";
import AgencyRestricted from "../_lib/AgencyRestricted";
import TeamRelationsSection from "../components/lazy/TeamRelationsSectionLazy";

export async function generateMetadata() {
  const t = await getTranslations("dashAgency");
  return { title: t("collaborationsPage.metaTitle") };
}

export default async function AgencyCollaborationsPage() {
  const ctx = await requireManagerAgency();
  if (!ctx) return <AgencyRestricted />;
  const { agency } = ctx;
  const t = await getTranslations("dashAgency");

  // Confirmed team relations + their team rows
  const relations = await db.query.agencyTeamRelations.findMany({
    where: eq(agencyTeamRelations.agencyId, agency.id),
    orderBy: desc(agencyTeamRelations.approvedAt),
  });
  const relationTeamIds = relations.map((r) => r.teamId);
  const relationTeams = relationTeamIds.length
    ? await db.query.teams.findMany({
        where: inArray(teams.id, relationTeamIds),
        columns: {
          id: true,
          name: true,
          country: true,
          countryCode: true,
          crestUrl: true,
          transfermarktUrl: true,
        },
      })
    : [];
  const teamMap = new Map(relationTeams.map((tm) => [tm.id, tm]));
  const relationsWithTeams = relations
    .map((r) => {
      const team = teamMap.get(r.teamId);
      if (!team) return null;
      return {
        id: r.id,
        team: {
          id: team.id,
          name: team.name,
          country: team.country,
          countryCode: team.countryCode,
          crestUrl: team.crestUrl,
          transfermarktUrl: team.transfermarktUrl,
        },
        relationKind: r.relationKind,
        description: r.description,
        approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Pending submissions + their items
  const pendingSubs = await db.query.agencyTeamRelationSubmissions.findMany({
    where: and(
      eq(agencyTeamRelationSubmissions.agencyId, agency.id),
      inArray(agencyTeamRelationSubmissions.status, ["pending", "rejected"]),
    ),
    orderBy: desc(agencyTeamRelationSubmissions.submittedAt),
    limit: 8,
  });
  const submissionIds = pendingSubs.map((s) => s.id);
  const subItems = submissionIds.length
    ? await db.query.agencyTeamRelationProposals.findMany({
        where: inArray(agencyTeamRelationProposals.submissionId, submissionIds),
      })
    : [];
  const subItemTeamIds = subItems.map((i) => i.teamId).filter((id): id is string => !!id);
  const subItemTeams = subItemTeamIds.length
    ? await db.query.teams.findMany({
        where: inArray(teams.id, subItemTeamIds),
        columns: { id: true, name: true, countryCode: true },
      })
    : [];
  const subTeamMap = new Map(subItemTeams.map((tm) => [tm.id, tm]));
  const submissionsForUi = pendingSubs.map((s) => ({
    id: s.id,
    status: s.status,
    note: s.note,
    resolutionNote: s.resolutionNote,
    submittedAt: s.submittedAt.toISOString(),
    reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
    items: subItems
      .filter((it) => it.submissionId === s.id)
      .map((it) => ({
        id: it.id,
        proposedTeamName: it.proposedTeamName,
        proposedTeamCountry: it.proposedTeamCountry,
        proposedTeamCountryCode: it.proposedTeamCountryCode,
        proposedTeamDivision: it.proposedTeamDivision,
        proposedTeamTransfermarktUrl: it.proposedTeamTransfermarktUrl,
        relationKind: it.relationKind,
        description: it.description,
        status: it.status,
        team: it.teamId
          ? subTeamMap.get(it.teamId)
            ? {
                id: it.teamId,
                name: subTeamMap.get(it.teamId)!.name,
                countryCode: subTeamMap.get(it.teamId)!.countryCode,
              }
            : null
          : null,
      })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("collaborationsPage.pageTitle")}
        description={t("collaborationsPage.pageDescription")}
      />
      <TeamRelationsSection
        agencyName={agency.name}
        relations={relationsWithTeams}
        pendingSubmissions={submissionsForUi}
      />
    </div>
  );
}
