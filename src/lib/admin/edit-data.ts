// Server-side loaders for the admin player CRUD section pages. Mirror the
// data the dashboard's football-data page builds (career stages + the
// season/honour career options) but keyed by an arbitrary playerId via a
// service-role client. The period-string helpers are replicated 1:1 from the
// dashboard page so the season value written by the reused managers stays
// identical (locale-stable canonical es).

import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, any, any>;

export type AdminCareerStage = {
  id: string;
  club: string | null;
  division: string | null;
  division_id: string | null;
  secondaryDivisionId: string | null;
  secondaryDivisionName: string | null;
  startYear: number | null;
  endYear: number | null;
  team: { id: string | null; name: string | null; crestUrl: string | null; countryCode: string | null } | null;
};

export type AdminCareerOption = {
  id: string;
  label: string;
  club: string;
  period: string;
  periodLabel: string;
  crestUrl: string | null;
};

type CareerItemRow = {
  id: string;
  club: string | null;
  division: string | null;
  division_id: string | null;
  secondary_division: string | null;
  secondary_division_id: string | null;
  secondary_division_division: { id: string | null; name: string | null } | null;
  start_date: string | null;
  end_date: string | null;
  team: { id: string | null; name: string | null; crest_url: string | null; country_code: string | null } | null;
};

const CLUB_UNDEFINED = "Sin club";
const CURRENT_PERIOD = "Actual";

function safeYear(value: string): number | null {
  const year = new Date(value).getUTCFullYear();
  return Number.isNaN(year) ? null : year;
}

function describeCareerStage(stage: AdminCareerStage): string {
  const club = stage.team?.name ?? stage.club ?? CLUB_UNDEFINED;
  const from = stage.startYear ?? "¿?";
  const to = stage.endYear ?? CURRENT_PERIOD;
  const division = stage.division ? ` · ${stage.division}` : "";
  return `${club}${division} (${from} – ${to})`;
}

// Locale-stable canonical period — see the dashboard page note. MUST match so
// the season string persisted by the managers is identical across player/admin.
function describeCareerPeriod(stage: AdminCareerStage): string {
  const from = stage.startYear ?? "¿?";
  const to = stage.endYear ?? "Actual";
  return `${from} – ${to}`;
}

export async function loadPlayerCareerForAdmin(
  admin: AdminClient,
  playerId: string,
): Promise<{ stages: AdminCareerStage[]; options: AdminCareerOption[] }> {
  const { data } = await admin
    .from("career_items")
    .select(
      `id, club, division, start_date, end_date, division_id, secondary_division, secondary_division_id,
       team:teams!career_items_team_id_fkey ( id, name, crest_url, country_code ),
       secondary_division_division:divisions!career_items_secondary_division_id_divisions_id_fk ( id, name )`,
    )
    .eq("player_id", playerId)
    .order("start_date", { ascending: false })
    .returns<CareerItemRow[]>();

  const rows = data ?? [];

  const stages: AdminCareerStage[] = rows.map((item) => ({
    id: item.id,
    club: item.club,
    division: item.division,
    division_id: item.division_id,
    secondaryDivisionId: item.secondary_division_id ?? null,
    secondaryDivisionName: item.secondary_division ?? item.secondary_division_division?.name ?? null,
    startYear: item.start_date ? safeYear(item.start_date) : null,
    endYear: item.end_date ? safeYear(item.end_date) : null,
    team: item.team
      ? {
          id: item.team.id ?? null,
          name: item.team.name ?? null,
          crestUrl: item.team.crest_url ?? null,
          countryCode: item.team.country_code ?? null,
        }
      : null,
  }));

  const options: AdminCareerOption[] = stages.map((stage) => ({
    id: stage.id,
    label: describeCareerStage(stage),
    club: stage.team?.name ?? stage.club ?? CLUB_UNDEFINED,
    period: describeCareerPeriod(stage),
    periodLabel: describeCareerPeriod(stage),
    crestUrl: stage.team?.crestUrl ?? null,
  }));

  return { stages, options };
}

export function formatAdminMarketValue(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "";
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(numeric);
}
