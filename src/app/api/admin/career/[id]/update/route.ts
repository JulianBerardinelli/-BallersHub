import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Params = Promise<{ id: string }>;

export async function PATCH(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { start_year, end_year, division } = body as {
    start_year?: number | null;
    end_year?: number | null;
    division?: string | null;
  };

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
  const { error } = await admin
    .from("career_item_proposals")
    .update({ start_year, end_year, division, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
