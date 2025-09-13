import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function PATCH(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid" }, { status: 400 });

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
  const { data: app, error: appErr } = await admin
    .from("player_applications")
    .select("notes")
    .eq("id", id)
    .maybeSingle();
  if (appErr) return NextResponse.json({ error: appErr.message }, { status: 400 });

  const notes = (app?.notes && typeof app.notes === "object" ? app.notes : {}) as Record<string, unknown>;
  const newNotes = {
    ...notes,
    birth_date: body.birth_date ?? null,
    height_cm: body.height_cm ?? null,
    weight_kg: body.weight_kg ?? null,
  };

  const { error } = await admin
    .from("player_applications")
    .update({
      full_name: body.full_name ?? null,
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
