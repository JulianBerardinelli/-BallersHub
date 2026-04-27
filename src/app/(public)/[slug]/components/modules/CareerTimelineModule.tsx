import { db } from "@/lib/db";
import { careerItems, teams, statsSeasons, playerHonours, divisions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import ProfileCareerTimelineModule from "./ProfileCareerTimelineModule";

export default async function CareerTimelineModule({ playerId }: { playerId: string }) {
  const [careerRecords, stats, honours, allLinks] = await Promise.all([
    db.select().from(careerItems).where(eq(careerItems.playerId, playerId)),
    db.select().from(statsSeasons).where(eq(statsSeasons.playerId, playerId)),
    db.select().from(playerHonours).where(eq(playerHonours.playerId, playerId)),
    // playerLinks table — same pattern as ProfileBioModule
    db.query.playerLinks.findMany({ where: (l, { eq }) => eq(l.playerId, playerId) }),
  ]);

  const teamIds = Array.from(new Set(careerRecords.map(c => c.teamId).filter(Boolean) as string[]));
  const mappedTeams = teamIds.length > 0 
    ? await db.select().from(teams).where(inArray(teams.id, teamIds))
    : [];

  const divisionIds = Array.from(new Set([
    ...careerRecords.map(c => c.divisionId),
    ...mappedTeams.map(t => t.divisionId)
  ].filter(Boolean) as string[]));
  const mappedDivisions = divisionIds.length > 0
    ? await db.select().from(divisions).where(inArray(divisions.id, divisionIds))
    : [];

  const career = careerRecords.map(item => {
    const teamDb = mappedTeams.find(t => t.id === item.teamId);
    const effectiveDivisionId = item.divisionId || teamDb?.divisionId;
    const divisionDb = mappedDivisions.find(d => d.id === effectiveDivisionId);
    return {
      ...item,
      stats: stats.filter(s => s.careerItemId === item.id),
      honours: honours.filter(h => h.careerItemId === item.id),
      team: teamDb || null,
      divisionData: divisionDb || null
    };
  });

  // Extract sport platform links by kind
  const findUrl = (kind: string) => allLinks.find(l => l.kind === kind)?.url ?? null;

  const externalLinks = {
    transfermarkt: findUrl("transfermarkt"),
    beSoccer: findUrl("besoccer"),
    flashscore: findUrl("flashscore"),
  };

  return (
    <div className="-mt-10">
      <ProfileCareerTimelineModule career={career} externalLinks={externalLinks} />
    </div>
  );
}
