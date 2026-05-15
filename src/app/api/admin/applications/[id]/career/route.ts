import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;

  const supa = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: up } = await supa
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });


  const { data, error } = await supa
    .from("career_item_proposals")
    .select(
      `
        id,
        club,
        division,
        start_year,
        end_year,
        status,
        proposed_team_name,
        proposed_team_country_code,
        team:teams!career_item_proposals_team_id_fkey (
          name,
          crest_url,
          country_code,
          status
        )
      `,
    )
    .eq("application_id", id)
    .order("start_year", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let items = (data ?? []).map((ci: Record<string, unknown>) => ({
    id: ci.id as string,
    status: (ci.status as string) ?? "pending",
    team_status: (ci.team as Record<string, unknown>)?.status as string ?? null,
    team_name: (ci.team as Record<string, unknown>)?.name as string ?? (ci.proposed_team_name as string) ?? (ci.club as string),
    crest_url: (ci.team as Record<string, unknown>)?.crest_url as string ?? null,
    country_code: (ci.team as Record<string, unknown>)?.country_code as string ?? (ci.proposed_team_country_code as string) ?? null,
    division: (ci.division as string) ?? null,
    start_year: (ci.start_year as number) ?? null,
    end_year: (ci.end_year as number) ?? null,
  }));

  if (items.length === 0) {
    const { data: app, error: appError } = await supa
      .from("player_applications")
      .select("notes")
      .eq("id", id)
      .maybeSingle();

    if (appError) return NextResponse.json({ error: appError.message }, { status: 400 });

    let notes: unknown = app?.notes ?? null;
    if (typeof notes === "string") {
      try {
        notes = JSON.parse(notes);
      } catch (err) {
        console.error("career draft parse", err);
        notes = null;
      }
    }

    const draft = Array.isArray((notes as Record<string, unknown>)?.career_draft)
      ? ((notes as Record<string, unknown>).career_draft as Record<string, unknown>[])
      : [];

    items = draft.map((ci: Record<string, unknown>, idx: number) => ({
      id: (ci.id as string) ?? `draft-${idx}`,
      status: "draft",
      team_status: "verified",
      team_name: (ci.team_name as string) ?? (ci.club as string) ?? "—",
      crest_url: (ci.crest_url as string) ?? null,
      country_code: (ci.country_code as string) ?? null,
      division: (ci.division as string) ?? null,
      start_year: (ci.start_year as number) ?? null,
      end_year: (ci.end_year as number) ?? null,
    }));
  }

  return NextResponse.json({ items });
}
