import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import StatsRevisionPanel from "./StatsRevisionPanel";
import type { StatsRevisionRequest } from "./types";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

type RevisionRequestRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  change_summary: string | null;
  submitted_by_user_id: string;
  player: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    nationality: string[] | null;
    current_club: string | null;
    current_team: {
      id: string | null;
      name: string | null;
      crest_url: string | null;
      country_code: string | null;
    } | null;
    links: Array<{
      url: string;
      kind: string;
    }> | null;
  } | null;
  items: Array<{
    id: string;
    original_stat_id: string | null;
    season: string;
    competition: string | null;
    team: string | null;
    matches: number | null;
    starts: number | null;
    goals: number | null;
    assists: number | null;
    minutes: number | null;
    yellow_cards: number | null;
    red_cards: number | null;
    career_item_id: string | null;
    order_index: number;
    career_item: {
      team: {
        crest_url: string | null;
      } | null;
    } | null;
  }> | null;
};

type SubmitterRow = { user_id: string; full_name: string | null };

function mapRevisionRequest(
  row: RevisionRequestRow,
  submitters: Map<string, SubmitterRow>,
): StatsRevisionRequest | null {
  if (!row.player) return null;

  const nationalities = Array.isArray(row.player.nationality)
    ? (row.player.nationality.filter((code): code is string => typeof code === "string") as string[])
    : [];

  const submittedByProfile = submitters.get(row.submitted_by_user_id) ?? null;

  const tmLink =
    row.player.links?.find((l) => l.kind === "transfermarkt" || l.url.includes("transfermarkt"))?.url ?? null;

  const stats = (row.items ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((item) => ({
      id: item.id,
      originalStatId: item.original_stat_id,
      season: item.season,
      competition: item.competition,
      team: item.team,
      matches: item.matches,
      starts: item.starts,
      goals: item.goals,
      assists: item.assists,
      minutes: item.minutes,
      yellowCards: item.yellow_cards,
      redCards: item.red_cards,
      careerItemId: item.career_item_id,
      crestUrl: item.career_item?.team?.crest_url ?? null,
    }));

  return {
    id: row.id,
    status: (row.status as StatsRevisionRequest["status"]) ?? "pending",
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    note: row.change_summary ?? null,
    player: {
      id: row.player.id,
      name: row.player.full_name ?? null,
      avatarUrl: row.player.avatar_url ?? null,
      nationalities,
      currentClub: row.player.current_club ?? null,
      currentTeam: {
        id: row.player.current_team?.id ?? null,
        name: row.player.current_team?.name ?? null,
        crestUrl: row.player.current_team?.crest_url ?? null,
        countryCode: row.player.current_team?.country_code ?? null,
      },
      transfermarktUrl: tmLink,
    },
    submittedBy: submittedByProfile
      ? { id: submittedByProfile.user_id, name: submittedByProfile.full_name ?? null }
      : null,
    stats,
  };
}

export default async function StatsRevisionsPage() {
  noStore();
  const supabase = await createSupabaseServerRSC();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirect=/admin/stats-revisions");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string | null }>();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data, error } = await supabase
    .from("career_revision_requests")
    .select(
      `
        id,
        status,
        submitted_at,
        reviewed_at,
        change_summary,
        submitted_by_user_id,
        player:player_profiles (
          id,
          full_name,
          avatar_url,
          nationality,
          current_club,
          current_team:teams!player_profiles_current_team_id_fkey (
            id,
            name,
            crest_url,
            country_code
          ),
          links:player_links (
            url,
            kind
          )
        ),
        items:stats_revision_items (
          id,
          original_stat_id,
          season,
          matches,
          starts,
          goals,
          assists,
          minutes,
          yellow_cards,
          red_cards,
          competition,
          team,
          career_item_id,
          order_index,
          career_item:career_items (
            team:teams (
              crest_url
            )
          )
        )
      `,
    )
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as RevisionRequestRow[];
  const submitterIds = Array.from(new Set(rows.map((row) => row.submitted_by_user_id))).filter(Boolean);

  let submitterMap = new Map<string, SubmitterRow>();

  if (submitterIds.length > 0) {
    const { data: submitters } = await supabase
      .from("user_profiles")
      .select("user_id, full_name")
      .in("user_id", submitterIds);

    submitterMap = new Map(
      (submitters ?? []).map((row) => [
        row.user_id as string,
        { user_id: row.user_id as string, full_name: row.full_name ?? null },
      ]),
    );
  }

  const requests = rows
    .map((row) => mapRevisionRequest(row, submitterMap))
    .filter((value): value is StatsRevisionRequest => value !== null && value.stats.length > 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <StatsRevisionPanel initialRequests={requests} />
    </main>
  );
}
