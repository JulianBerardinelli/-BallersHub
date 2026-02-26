import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Params = Promise<{ itemId: string }>;

export async function PATCH(req: Request, ctx: { params: Params }) {
  const { itemId } = await ctx.params;
  const payload = (await req.json().catch(() => ({}))) as {
    startYear?: number | null;
    endYear?: number | null;
    division?: string | null;
    club?: string | null;
    teamId?: string | null;
    status?: string;
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

  const updatePayload: Record<string, unknown> = {};

  if ("startYear" in payload) {
    updatePayload.start_year = payload.startYear;
  }
  if ("endYear" in payload) {
    updatePayload.end_year = payload.endYear;
  }
  if ("division" in payload) {
    updatePayload.division = payload.division ?? null;
  }
  if ("club" in payload) {
    updatePayload.club = payload.club ?? null;
  }
  if ("teamId" in payload) {
    updatePayload.team_id = payload.teamId ?? null;
  }
  if ("status" in payload) {
    updatePayload.status = payload.status;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin
    .from("career_item_proposals")
    .update({ ...updatePayload, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
