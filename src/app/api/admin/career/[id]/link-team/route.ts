import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const { team_id } = await req.json();

  if (!team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });

  const supa = await createSupabaseServerRoute();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: up } = await supa.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createSupabaseAdmin();

  // validar que el team exista
  const { data: t } = await admin.from("teams").select("id").eq("id", team_id).maybeSingle();
  if (!t?.id) return NextResponse.json({ error: "team not found" }, { status: 404 });

  const { data, error } = await admin
    .from("career_item_proposals")
    .update({
      team_id,
      proposed_team_name: null,
      proposed_team_country: null,
      proposed_team_country_code: null,
      proposed_team_transfermarkt_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
