import { NextResponse } from "next/server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Params = Promise<{ id: string }>;

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

  const resolutionNote = typeof body.resolutionNote === "string" ? body.resolutionNote : null;

  const { data: requestRow, error } = await admin
    .from("career_revision_requests")
    .select("status")
    .eq("id", id)
    .maybeSingle<{ status: string }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!requestRow) {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }

  if (requestRow.status !== "pending") {
    return NextResponse.json({ error: "request_already_processed" }, { status: 409 });
  }

  const { error: updateError } = await admin
    .from("career_revision_requests")
    .update({
      status: "rejected",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      resolution_note: resolutionNote,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

