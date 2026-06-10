import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { careerItems, teams, statsSeasons, playerHonours, divisions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getHonourTranslations, mergeHonourContent } from "@/lib/i18n/profile-content";
import ProfileCareerTimelineModule from "./ProfileCareerTimelineModule";

export default async function CareerTimelineModule({ playerId }: { playerId: string }) {
  const [careerRecords, stats, honours, allLinks] = await Promise.all([
    db.select().from(careerItems).where(eq(careerItems.playerId, playerId)),
    db.select().from(statsSeasons).where(eq(statsSeasons.playerId, playerId)),
    db.select().from(playerHonours).where(eq(playerHonours.playerId, playerId)),
    // playerLinks table — same pattern as ProfileBioModule
    db.query.playerLinks.findMany({ where: (l, { eq }) => eq(l.playerId, playerId) }),
  ]);

  // F6: localize the honours' free-text fields (title/competition/description)
  // for the page locale, falling back to es per field. Defensive — degrades to
  // es if the honours-translations table isn't migrated yet.
  const locale = await getLocale();
  const honourTranslations = await getHonourTranslations(
    honours.map((h) => h.id),
    locale,
  );
  const localizedHonours = honours.map((h) =>
    mergeHonourContent(h, honourTranslations.get(h.id)),
  );

  const teamIds = Array.from(new Set(careerRecords.map(c => c.teamId).filter(Boolean) as string[]));
  const mappedTeams = teamIds.length > 0 
    ? await db.select().from(teams).where(inArray(teams.id, teamIds))
    : [];

  // La división de cada card sale del career_item (snapshot histórico), no
  // del team — un equipo pudo cambiar de liga y eso no debe reflejarse en
  // etapas pasadas. Solo cargamos las divisions referenciadas por los
  // career_items (principal + secundaria).
  const divisionIds = Array.from(new Set([
    ...careerRecords.map(c => c.divisionId),
    ...careerRecords.map(c => c.secondaryDivisionId),
  ].filter(Boolean) as string[]));
  const mappedDivisions = divisionIds.length > 0
    ? await db.select().from(divisions).where(inArray(divisions.id, divisionIds))
    : [];

  const career = careerRecords.map(item => {
    const teamDb = mappedTeams.find(t => t.id === item.teamId);
    const divisionDb = item.divisionId
      ? mappedDivisions.find(d => d.id === item.divisionId) ?? null
      : null;
    const secondaryDivisionDb = item.secondaryDivisionId
      ? mappedDivisions.find(d => d.id === item.secondaryDivisionId) ?? null
      : null;
    // Si la secundaria no está enlazada al catálogo pero hay texto libre,
    // sintetizamos un shape compatible con el cliente. Crest queda null
    // (no hay match en `divisions`), pero el nombre se renderiza con el
    // chip "+ Liga" igual.
    const secondaryDivisionData =
      secondaryDivisionDb ??
      (item.secondaryDivision ? { name: item.secondaryDivision, crestUrl: null } : null);
    return {
      ...item,
      stats: stats.filter(s => s.careerItemId === item.id),
      honours: localizedHonours.filter(h => h.careerItemId === item.id),
      team: teamDb || null,
      divisionData: divisionDb,
      secondaryDivisionData
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
