// Server-side loader for the coach trayectoria editor — the coach mirror of
// loadPlayerCareerForAdmin. Loads the rich career stages (team catalog link +
// division ids + secondary + role) so the shared CareerEditor renders the team
// picker / division picker / crests, plus the season stats. Works with either
// the session client (dashboard, RLS) or the service-role admin client (admin).

import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

export type CoachEditorStage = {
  id: string;
  originalId: string | null;
  club: string;
  roleTitle: string | null;
  division: string | null;
  divisionId: string | null;
  secondaryDivision: string | null;
  secondaryDivisionId: string | null;
  startYear: number | null;
  endYear: number | null;
  team: {
    id: string | null;
    name: string | null;
    crestUrl: string | null;
    countryCode: string | null;
  } | null;
};

export type CoachEditorStat = {
  id: string;
  originalStatId: string | null;
  season: string;
  competition: string;
  team: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

type CareerRow = {
  id: string;
  club: string | null;
  role_title: string | null;
  division: string | null;
  division_id: string | null;
  secondary_division: string | null;
  secondary_division_id: string | null;
  start_date: string | null;
  end_date: string | null;
  team_id: string | null;
};

type TeamRow = {
  id: string;
  name: string | null;
  crest_url: string | null;
  country_code: string | null;
};

type StatRow = {
  id: string;
  season: string | null;
  competition: string | null;
  team: string | null;
  matches: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goals_for: number | null;
  goals_against: number | null;
};

const yearOf = (d: string | null): number | null => {
  if (!d) return null;
  const y = Number(d.slice(0, 4));
  return Number.isFinite(y) ? y : null;
};

export async function loadCoachCareerForEditor(
  client: AnyClient,
  coachId: string,
): Promise<{ stages: CoachEditorStage[]; stats: CoachEditorStat[] }> {
  const [{ data: careerData }, { data: statData }] = await Promise.all([
    client
      .from("coach_career_items")
      .select(
        "id, club, role_title, division, division_id, secondary_division, secondary_division_id, start_date, end_date, team_id",
      )
      .eq("coach_id", coachId)
      .order("start_date", { ascending: false, nullsFirst: false })
      .returns<CareerRow[]>(),
    client
      .from("coach_stats_seasons")
      .select("id, season, competition, team, matches, wins, draws, losses, goals_for, goals_against")
      .eq("coach_id", coachId)
      .order("season", { ascending: false })
      .returns<StatRow[]>(),
  ]);

  const careerRows = careerData ?? [];

  // Resolve team crests/country in one extra query (robust against FK-embed
  // naming quirks). Only rows linked to the catalog need it.
  const teamIds = [...new Set(careerRows.map((r) => r.team_id).filter(Boolean))] as string[];
  const teamsById = new Map<string, TeamRow>();
  if (teamIds.length > 0) {
    const { data: teams } = await client
      .from("teams")
      .select("id, name, crest_url, country_code")
      .in("id", teamIds)
      .returns<TeamRow[]>();
    for (const t of teams ?? []) teamsById.set(t.id, t);
  }

  const stages: CoachEditorStage[] = careerRows.map((r) => {
    const team = r.team_id ? teamsById.get(r.team_id) : undefined;
    return {
      id: r.id,
      originalId: r.id,
      club: r.club ?? "",
      roleTitle: r.role_title ?? null,
      division: r.division ?? null,
      divisionId: r.division_id ?? null,
      secondaryDivision: r.secondary_division ?? null,
      secondaryDivisionId: r.secondary_division_id ?? null,
      startYear: yearOf(r.start_date),
      endYear: yearOf(r.end_date),
      team: team
        ? {
            id: team.id,
            name: team.name ?? null,
            crestUrl: team.crest_url ?? null,
            countryCode: team.country_code ?? null,
          }
        : null,
    };
  });

  const stats: CoachEditorStat[] = (statData ?? []).map((r) => ({
    id: r.id,
    originalStatId: r.id,
    season: r.season ?? "",
    competition: r.competition ?? "",
    team: r.team ?? "",
    matches: r.matches ?? 0,
    wins: r.wins ?? 0,
    draws: r.draws ?? 0,
    losses: r.losses ?? 0,
    goalsFor: r.goals_for ?? 0,
    goalsAgainst: r.goals_against ?? 0,
  }));

  return { stages, stats };
}
