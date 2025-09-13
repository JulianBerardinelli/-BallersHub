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

  const nationalityNames = Array.isArray(body.nationalities)
    ? body.nationalities.map((n: any) => n.name)
    : null;
  const nationalityCodes = Array.isArray(body.nationalities)
    ? body.nationalities.map((n: any) => String(n.code || "").toUpperCase().slice(0, 2))
    : null;
  const positionArr = body.position
    ? [body.position.role, ...(body.position.subs ?? [])]
    : null;

  const nameOk = typeof body.full_name === "string" && body.full_name.trim().length >= 3;
  const birthOk = typeof body.birth_date === "string" && !Number.isNaN(Date.parse(body.birth_date));
  const heightNum = Number(body.height_cm);
  const weightNum = Number(body.weight_kg);
  const heightOk = Number.isFinite(heightNum) && heightNum >= 120 && heightNum <= 230;
  const weightOk = Number.isFinite(weightNum) && weightNum >= 40 && weightNum <= 140;
  const natOk =
    Array.isArray(nationalityNames) &&
    nationalityNames.length > 0 &&
    Array.isArray(nationalityCodes) &&
    nationalityCodes.every((c: any) => typeof c === "string" && c.length === 2);
  const posOk =
    Array.isArray(positionArr) &&
    positionArr.length > 1 &&
    positionArr.every((p: any) => typeof p === "string" && p.length > 0);

  if (!nameOk || !birthOk || !heightOk || !weightOk || !natOk || !posOk)
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const newNotes = {
    ...notes,
    birth_date: body.birth_date,
    height_cm: heightNum,
    weight_kg: weightNum,
    nationality_codes: nationalityCodes,
  };

  const { error } = await admin
    .from("player_applications")
    .update({
      full_name: body.full_name,
      nationality: nationalityNames,
      positions: positionArr,
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
