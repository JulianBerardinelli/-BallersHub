import { NextResponse } from "next/server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureUniqueTeamSlug, findExistingTeamIdByName, slugify } from "@/lib/admin/teams";

type Params = Promise<{ id: string }>;

type RevisionItem = {
  id: string;
  original_item_id: string | null;
  club: string;
  division: string | null;
  start_year: number | null;
  end_year: number | null;
  team_id: string | null;
  order_index: number;
  proposed_team: {
    id: string;
    name: string | null;
    country_code: string | null;
    country_name: string | null;
    transfermarkt_url: string | null;
  } | null;
};

type RevisionRequestRow = {
  id: string;
  status: string;
  player_id: string;
  submitted_by_user_id: string;
  change_summary: string | null;
  items: RevisionItem[] | null;
};

function toStartDate(year: number | null): string | null {
  if (!year) return null;
  return `${year}-01-01`;
}

function toEndDate(year: number | null): string | null {
  if (!year) return null;
  return `${year}-12-31`;
}

export async function POST(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { resolutionNote?: string | null };

  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string | null }>();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdmin();

  const { data: requestRow, error: requestError } = await admin
    .from("career_revision_requests")
    .select(
      `id, status, player_id, submitted_by_user_id, change_summary,
       items:career_revision_items (
         id,
         original_item_id,
         club,
         division,
         start_year,
         end_year,
         order_index,
         team_id,
         proposed_team:career_revision_proposed_teams!career_revision_items_proposed_team_id_fkey (
           id,
           name,
           country_code,
           country_name,
           transfermarkt_url
         )
       )`,
    )
    .eq("id", id)
    .maybeSingle<RevisionRequestRow>();

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 400 });
  }

  if (!requestRow) {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }

  if (requestRow.status !== "pending") {
    return NextResponse.json({ error: "request_already_processed" }, { status: 409 });
  }

  const items = (requestRow.items ?? []).slice().sort((a, b) => a.order_index - b.order_index);

  if (items.length === 0) {
    return NextResponse.json({ error: "missing_revision_items" }, { status: 400 });
  }

  const requestedOriginalIds = new Set<string>();
  const playerId = requestRow.player_id;
  const createdTeams = new Map<string, string | null>();

  const { data: existingCareerRows, error: existingError } = await admin
    .from("career_items")
    .select("id")
    .eq("player_id", playerId);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  const resolvedItems: Array<RevisionItem & { resolvedTeamId: string | null }> = [];

  for (const item of items) {
    let resolvedTeamId = item.team_id;

    if (!resolvedTeamId && item.proposed_team) {
      const cacheKey = item.proposed_team.id;
      if (createdTeams.has(cacheKey)) {
        resolvedTeamId = createdTeams.get(cacheKey) ?? null;
      } else {
        const displayName = (item.proposed_team.name || item.club || "").trim();
        if (!displayName) {
          return NextResponse.json({ error: "proposed_team_missing_name" }, { status: 400 });
        }

        let teamId = await findExistingTeamIdByName(displayName, admin);

        if (!teamId) {
          const baseSlug = slugify(displayName);
          const slug = await ensureUniqueTeamSlug(baseSlug, admin);

          const insertResult = await admin
            .from("teams")
            .insert({
              name: displayName,
              slug,
              country: item.proposed_team.country_name ?? null,
              country_code: item.proposed_team.country_code ?? null,
              category: item.division ?? null,
              transfermarkt_url: item.proposed_team.transfermarkt_url ?? null,
              status: "pending",
              visibility: "public",
              requested_by_user_id: requestRow.submitted_by_user_id,
            })
            .select("id")
            .single<{ id: string }>();

          if (insertResult.error) {
            return NextResponse.json({ error: insertResult.error.message }, { status: 400 });
          }

          teamId = insertResult.data.id;
        }

        if (teamId) {
          const updateItem = await admin
            .from("career_revision_items")
            .update({ team_id: teamId, updated_at: new Date().toISOString() })
            .eq("id", item.id)
            .select("team_id")
            .maybeSingle<{ team_id: string }>();

          if (updateItem.error) {
            return NextResponse.json({ error: updateItem.error.message }, { status: 400 });
          }

          resolvedTeamId = updateItem.data?.team_id ?? teamId;
        }

        createdTeams.set(cacheKey, resolvedTeamId ?? null);
      }
    }

    resolvedItems.push({ ...item, resolvedTeamId: resolvedTeamId ?? null });
  }

  for (const item of resolvedItems) {
    const payload = {
      club: item.club,
      division: item.division ?? null,
      start_date: toStartDate(item.start_year),
      end_date: toEndDate(item.end_year),
      team_id: item.resolvedTeamId,
      updated_at: new Date().toISOString(),
    };

    if (item.original_item_id) {
      requestedOriginalIds.add(item.original_item_id);
      const { error } = await admin
        .from("career_items")
        .update(payload)
        .eq("id", item.original_item_id)
        .eq("player_id", playerId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      const insertResult = await admin
        .from("career_items")
        .insert({
          player_id: playerId,
          club: payload.club,
          division: payload.division,
          start_date: payload.start_date,
          end_date: payload.end_date,
          team_id: payload.team_id,
        })
        .select("id")
        .single<{ id: string }>();

      if (insertResult.error) {
        return NextResponse.json({ error: insertResult.error.message }, { status: 400 });
      }

      const newId = insertResult.data.id;
      requestedOriginalIds.add(newId);

      await admin
        .from("career_revision_items")
        .update({ original_item_id: newId, updated_at: new Date().toISOString() })
        .eq("id", item.id);
    }
  }

  const existingIds = (existingCareerRows ?? []).map((row) => row.id as string);
  const toDelete = existingIds.filter((careerId) => !requestedOriginalIds.has(careerId));

  if (toDelete.length > 0) {
    const { error } = await admin
      .from("career_items")
      .delete()
      .in("id", toDelete);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const currentStage = resolvedItems.find((item) => item.end_year === null) ?? null;
  const currentClub = currentStage?.club ?? null;
  const currentTeamId = currentStage?.resolvedTeamId ?? null;

  await admin
    .from("player_profiles")
    .update({
      current_team_id: currentTeamId,
      current_club: currentClub,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playerId);

  const resolutionNote = typeof body.resolutionNote === "string" ? body.resolutionNote : null;

  const { error: updateRequestError } = await admin
    .from("career_revision_requests")
    .update({
      status: "approved",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      resolution_note: resolutionNote,
    })
    .eq("id", id);

  if (updateRequestError) {
    return NextResponse.json({ error: updateRequestError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

