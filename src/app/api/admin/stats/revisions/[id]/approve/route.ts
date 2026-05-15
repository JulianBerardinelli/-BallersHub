import { NextResponse } from "next/server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Params = Promise<{ id: string }>;

type RevisionRequestItemRow = {
  id: string;
  original_stat_id: string | null;
  season: string;
  matches: number | null;
  starts: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  competition: string | null;
  team: string | null;
  career_item_id: string | null;
  order_index: number;
};

type RevisionRequestRow = {
  id: string;
  status: string;
  player_id: string;
  submitted_by_user_id: string;
  change_summary: string | null;
  items: RevisionRequestItemRow[] | null;
};

export async function POST(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    resolutionNote?: string | null;
    modifiedStats?: Partial<RevisionRequestItemRow>[];
  };

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

  // Validate request exists and is pending
  const { data: requestRow, error: requestError } = await admin
    .from("career_revision_requests")
    .select(
      `id, status, player_id, submitted_by_user_id, change_summary,
       items:stats_revision_items (
         id,
         original_stat_id,
         season,
         matches,
         goals,
         assists,
         minutes,
         yellow_cards,
         red_cards,
         competition,
         team,
         career_item_id,
         order_index,
         starts
       )`
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

  const playerId = requestRow.player_id;

  const modifiedStatsHash = (body.modifiedStats ?? []).reduce((acc, curr) => {
    if (curr.id) acc[curr.id] = curr;
    return acc;
  }, {} as Record<string, Partial<RevisionRequestItemRow>>);

  for (const item of items) {
    const override = modifiedStatsHash[item.id] || {};
    
    const payload = {
      player_id: playerId,
      season: item.season,
      matches: override.matches !== undefined ? override.matches : item.matches,
      goals: override.goals !== undefined ? override.goals : item.goals,
      assists: override.assists !== undefined ? override.assists : item.assists,
      minutes: override.minutes !== undefined ? override.minutes : item.minutes,
      yellow_cards: override.yellow_cards !== undefined ? override.yellow_cards : item.yellow_cards,
      red_cards: override.red_cards !== undefined ? override.red_cards : item.red_cards,
      competition: item.competition,
      team: item.team,
      career_item_id: item.career_item_id,
      starts: override.starts !== undefined ? override.starts : item.starts,
    };

    if (item.original_stat_id) {
      // Update existing
      const { error } = await admin
        .from("stats_seasons")
        .update(payload)
        .eq("id", item.original_stat_id)
        .eq("player_id", playerId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Salvaguardar los cambios en stats_revision_items
      await admin
        .from("stats_revision_items")
        .update({
          updated_at: new Date().toISOString(),
          matches: override.matches !== undefined ? override.matches : item.matches,
          goals: override.goals !== undefined ? override.goals : item.goals,
          assists: override.assists !== undefined ? override.assists : item.assists,
          minutes: override.minutes !== undefined ? override.minutes : item.minutes,
          yellow_cards: override.yellow_cards !== undefined ? override.yellow_cards : item.yellow_cards,
          red_cards: override.red_cards !== undefined ? override.red_cards : item.red_cards,
          starts: override.starts !== undefined ? override.starts : item.starts,
        })
        .eq("id", item.id);
    } else {
      // Insert new
      const { error, data: insertData } = await admin
        .from("stats_seasons")
        .insert(payload)
        .select("id")
        .single<{ id: string }>();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      const newId = insertData.id;
      // Actualizar el item original apuntando al insertado, y sus campos
      await admin
        .from("stats_revision_items")
        .update({
          original_stat_id: newId,
          updated_at: new Date().toISOString(),
          matches: override.matches !== undefined ? override.matches : item.matches,
          goals: override.goals !== undefined ? override.goals : item.goals,
          assists: override.assists !== undefined ? override.assists : item.assists,
          minutes: override.minutes !== undefined ? override.minutes : item.minutes,
          yellow_cards: override.yellow_cards !== undefined ? override.yellow_cards : item.yellow_cards,
          red_cards: override.red_cards !== undefined ? override.red_cards : item.red_cards,
          starts: override.starts !== undefined ? override.starts : item.starts,
        })
        .eq("id", item.id);
    }
  }

  const resolutionNote = typeof body.resolutionNote === "string" ? body.resolutionNote : null;

  // Cierra la revision actual
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
