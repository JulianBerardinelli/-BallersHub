import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("career_item_proposals")
    .select(
      `id, club, division, start_year, end_year,
       team:teams(name, crest_url, country_code)`
    )
    .eq("application_id", id)
    .order("start_year", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const items = (data ?? []).map((ci: any) => ({
    id: ci.id,
    team_name: ci.team?.name ?? ci.club,
    crest_url: ci.team?.crest_url ?? null,
    country_code: ci.team?.country_code ?? null,
    division: ci.division,
    start_year: ci.start_year,
    end_year: ci.end_year,
  }));

  return NextResponse.json({ items });
}
