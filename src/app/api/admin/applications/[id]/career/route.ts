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

  let items = (data ?? []).map((ci: any) => ({
    id: ci.id,
    team_name: ci.team?.name ?? ci.club,
    crest_url: ci.team?.crest_url ?? null,
    country_code: ci.team?.country_code ?? null,
    division: ci.division,
    start_year: ci.start_year,
    end_year: ci.end_year,
  }));

  if (items.length === 0) {
    const { data: app } = await admin
      .from("player_applications")
      .select("notes")
      .eq("id", id)
      .maybeSingle();
    const notes =
      app?.notes && typeof app.notes === "string"
        ? JSON.parse(app.notes)
        : app?.notes;
    const draft = Array.isArray(notes?.career_draft)
      ? notes.career_draft
      : [];
    items = draft.map((ci: any, idx: number) => ({
      id: ci.id ?? `draft-${idx}`,
      team_name: ci.team_name ?? ci.club ?? "—",
      crest_url: ci.crest_url ?? null,
      country_code: ci.country_code ?? null,
      division: ci.division ?? null,
      start_year: ci.start_year ?? null,
      end_year: ci.end_year ?? null,
    }));
  }

  return NextResponse.json({ items });
}
