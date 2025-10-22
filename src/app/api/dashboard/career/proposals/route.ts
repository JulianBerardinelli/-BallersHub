import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";

const CareerRequestSchema = z.object({
  action: z.enum(["create", "update"]),
  careerItemId: z.string().uuid().optional(),
  club: z.string().trim().min(2),
  division: z.string().trim().min(1).optional().nullable(),
  startYear: z.number().int().min(1900).max(2100).optional().nullable(),
  endYear: z.number().int().min(1900).max(2100).optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  proposedTeam: z
    .object({
      country: z
        .object({
          code: z.string().trim().min(2).max(3),
          name: z.string().trim().min(2),
        })
        .optional()
        .nullable(),
      tmUrl: z.string().url().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CareerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload", details: parsed.error.format() }, { status: 400 });
  }

  const { action, careerItemId, club, division, startYear, endYear, teamId, proposedTeam } = parsed.data;

  if (action === "update" && !careerItemId) {
    return NextResponse.json({ error: "missing_career_item" }, { status: 400 });
  }

  if (startYear && endYear && startYear > endYear) {
    return NextResponse.json({ error: "invalid_year_range" }, { status: 400 });
  }

  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dashboardState = await fetchDashboardState(supabase, user.id);
  const profileId = dashboardState.profile?.id ?? null;
  const applicationId = dashboardState.application?.id ?? null;

  if (!profileId || !applicationId) {
    return NextResponse.json({ error: "profile_or_application_missing" }, { status: 409 });
  }

  if (action === "update") {
    const { data: ownedItem, error: ownedErr } = await supabase
      .from("career_items")
      .select("id")
      .eq("id", careerItemId)
      .eq("player_id", profileId)
      .maybeSingle();

    if (ownedErr) {
      return NextResponse.json({ error: ownedErr.message }, { status: 400 });
    }

    if (!ownedItem) {
      return NextResponse.json({ error: "career_item_not_found" }, { status: 404 });
    }
  }

  const { data: pending } = await supabase
    .from("career_item_proposals")
    .select("id")
    .eq("application_id", applicationId)
    .in("status", ["pending", "waiting"] as const)
    .limit(1);

  if (pending && pending.length > 0) {
    return NextResponse.json({ error: "pending_request_exists" }, { status: 409 });
  }

  const payload: Record<string, unknown> = {
    application_id: applicationId,
    player_id: profileId,
    career_item_id: action === "update" ? careerItemId : null,
    club,
    division: division ? division : null,
    start_year: startYear ?? null,
    end_year: endYear ?? null,
    team_id: teamId ?? null,
    created_by_user_id: user.id,
    status: "pending",
    updated_at: new Date().toISOString(),
  };

  if (!teamId) {
    payload.proposed_team_name = club;
    payload.proposed_team_country = proposedTeam?.country?.name ?? null;
    payload.proposed_team_country_code = proposedTeam?.country?.code
      ? proposedTeam.country.code.trim().toUpperCase()
      : null;
    payload.proposed_team_transfermarkt_url = proposedTeam?.tmUrl ?? null;
  } else {
    payload.proposed_team_name = null;
    payload.proposed_team_country = null;
    payload.proposed_team_country_code = null;
    payload.proposed_team_transfermarkt_url = null;
  }

  const { error } = await supabase.from("career_item_proposals").insert(payload);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
