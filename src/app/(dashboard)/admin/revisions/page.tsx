import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import CareerRevisionPanel from "./CareerRevisionPanel";
import type { RevisionRequest } from "./types";
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
  } | null;
  items: Array<{
    id: string;
    original_item_id: string | null;
    club: string;
    division: string | null;
    start_year: number | null;
    end_year: number | null;
    order_index: number;
    team: {
      id: string | null;
      name: string | null;
      crest_url: string | null;
      country_code: string | null;
    } | null;
    proposed_team: {
      id: string;
      name: string | null;
      country_code: string | null;
      country_name: string | null;
      transfermarkt_url: string | null;
    } | null;
  }> | null;
};

type SubmitterRow = { user_id: string; full_name: string | null };

function mapRevisionRequest(
  row: RevisionRequestRow,
  submitters: Map<string, SubmitterRow>,
): RevisionRequest | null {
  if (!row.player) return null;

  const nationalities = Array.isArray(row.player.nationality)
    ? (row.player.nationality.filter((code): code is string => typeof code === "string") as string[])
    : [];

  const submittedByProfile = submitters.get(row.submitted_by_user_id) ?? null;

  const items = (row.items ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((item) => ({
      id: item.id,
      originalItemId: item.original_item_id,
      club: item.club,
      division: item.division ?? null,
      startYear: item.start_year ?? null,
      endYear: item.end_year ?? null,
      team: {
        id: item.team?.id ?? null,
        name: item.team?.name ?? null,
        crestUrl: item.team?.crest_url ?? null,
        countryCode: item.team?.country_code ?? null,
      },
      proposedTeam: item.proposed_team
        ? {
            id: item.proposed_team.id,
            name: item.proposed_team.name ?? null,
            countryCode: item.proposed_team.country_code ?? null,
            countryName: item.proposed_team.country_name ?? null,
            transfermarktUrl: item.proposed_team.transfermarkt_url ?? null,
          }
        : null,
    }));

  return {
    id: row.id,
    status: (row.status as RevisionRequest["status"]) ?? "pending",
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
    },
    submittedBy: submittedByProfile
      ? { id: submittedByProfile.user_id, name: submittedByProfile.full_name ?? null }
      : null,
    items,
  };
}

export default async function CareerRevisionsPage() {
  noStore();
  const supabase = await createSupabaseServerRSC();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirect=/admin/revisions");
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
          )
        ),
        items:career_revision_items (
          id,
          original_item_id,
          club,
          division,
          start_year,
          end_year,
          order_index,
          team:teams!career_revision_items_team_id_fkey (
            id,
            name,
            crest_url,
            country_code
          ),
          proposed_team:career_revision_proposed_teams!career_revision_items_proposed_team_id_fkey (
            id,
            name,
            country_code,
            country_name,
            transfermarkt_url
          )
        )
      `,
    )
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as RevisionRequestRow[];
  const submitterIds = Array.from(new Set(rows.map((row) => row.submitted_by_user_id))).filter(Boolean);

  let submitterMap = new Map<string, SubmitterRow>();

  if (submitterIds.length > 0) {
    const { data: submitters } = await supabase
      .from("user_profiles")
      .select("user_id, full_name")
      .in("user_id", submitterIds);

    submitterMap = new Map(
      (submitters ?? []).map((row) => [row.user_id as string, { user_id: row.user_id as string, full_name: row.full_name ?? null }]),
    );
  }

  const requests = rows
    .map((row) => mapRevisionRequest(row, submitterMap))
    .filter((value): value is RevisionRequest => Boolean(value));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <CareerRevisionPanel initialRequests={requests} />
    </main>
  );
}

