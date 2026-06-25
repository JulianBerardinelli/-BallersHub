import { and, asc, eq, inArray } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";

import { db } from "@/lib/db";
import { nationalTeamStints, nationalTeamMedia, teams } from "@/db/schema";
import {
  NT_AGE_CATEGORY_ORDER,
  NT_PARTICIPATION_ORDER,
} from "@/lib/dashboard/national-team";
import type {
  NationalTeamAgeCategory,
  NationalTeamParticipation,
} from "@/db/schema/nationalTeams";
import ProfileNationalTeamModule from "./ProfileNationalTeamModule";

// Módulo Pro "Selección Nacional". Async server component (mismo patrón que
// CareerTimelineModule). Solo muestra etapas APROBADAS + fotos APROBADAS.
// Si el jugador no tiene etapas aprobadas, no renderiza nada.
export default async function NationalTeamModule({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const [stints, media] = await Promise.all([
    db
      .select()
      .from(nationalTeamStints)
      .where(
        and(eq(nationalTeamStints.playerId, playerId), eq(nationalTeamStints.status, "approved")),
      )
      .orderBy(asc(nationalTeamStints.orderIndex)),
    db
      .select()
      .from(nationalTeamMedia)
      .where(
        and(eq(nationalTeamMedia.playerId, playerId), eq(nationalTeamMedia.isApproved, true)),
      )
      .orderBy(asc(nationalTeamMedia.position)),
  ]);

  if (stints.length === 0) return null;

  const teamIds = Array.from(new Set(stints.map((s) => s.teamId).filter(Boolean) as string[]));
  const mappedTeams =
    teamIds.length > 0 ? await db.select().from(teams).where(inArray(teams.id, teamIds)) : [];

  const t = await getTranslations("portfolio");

  // Nombre de país en el locale del visitante para etapas con country_code pero
  // sin proposed_team_name (catalogadas/backfill) — evita "Selección " sin nombre.
  const locale = await getLocale();
  const regionNames =
    "DisplayNames" in Intl
      ? new Intl.DisplayNames([locale], { type: "region", fallback: "code" })
      : null;
  const countryName = (code: string | null): string | null => {
    if (!code) return null;
    try {
      return regionNames?.of(code) ?? code;
    } catch {
      return code;
    }
  };

  const shaped = stints.map((s) => {
    const team = s.teamId ? mappedTeams.find((x) => x.id === s.teamId) ?? null : null;
    const countryCode = s.countryCode ?? team?.countryCode ?? null;
    return {
      id: s.id,
      countryCode,
      teamName: team?.name ?? s.proposedTeamName ?? countryName(countryCode),
      crestUrl: team?.crestUrl ?? null,
      ageCategory: s.ageCategory,
      participation: s.participation,
      startYear: s.startYear,
      endYear: s.endYear,
      description: s.description,
      highlights: s.highlights ?? [],
      caps: s.caps,
      goals: s.goals,
      assists: s.assists,
      minutes: s.minutes,
    };
  });

  const photos = media.map((m) => ({ id: m.id, url: m.url, title: m.title, altText: m.altText }));

  // Localized enum labels (category / participation) — resolved server-side from
  // the portfolio namespace so the client module renders in the viewer's locale
  // instead of the ES constants.
  const ageCategoryLabels = Object.fromEntries(
    NT_AGE_CATEGORY_ORDER.map((c) => [c, t(`modules.nationalTeam.ageCategory.${c}`)]),
  ) as Record<NationalTeamAgeCategory, string>;
  const participationLabels = Object.fromEntries(
    NT_PARTICIPATION_ORDER.map((p) => [p, t(`modules.nationalTeam.participation.${p}`)]),
  ) as Record<NationalTeamParticipation, string>;

  return (
    <div className="-mt-10">
      <ProfileNationalTeamModule
        stints={shaped}
        photos={photos}
        playerName={playerName}
        labels={{
          title: t("modules.nationalTeam.title"),
          subtitle: t("modules.nationalTeam.subtitle"),
          current: t("modules.nationalTeam.current"),
          callups: t("modules.nationalTeam.callups"),
          scrollHint: t("modules.nationalTeam.scrollHint"),
          navPrev: t("modules.nationalTeam.navPrev"),
          navNext: t("modules.nationalTeam.navNext"),
          ageCategory: ageCategoryLabels,
          participation: participationLabels,
          stats: {
            caps: t("modules.nationalTeam.stats.caps"),
            goals: t("modules.nationalTeam.stats.goals"),
            assists: t("modules.nationalTeam.stats.assists"),
            minutes: t("modules.nationalTeam.stats.minutes"),
          },
        }}
      />
    </div>
  );
}
