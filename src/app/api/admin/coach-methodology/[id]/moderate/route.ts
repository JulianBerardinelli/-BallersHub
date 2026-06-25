// Modera un rubro de metodología (pre-moderación: pending → approved/rejected).
// Los archivos adjuntos (coach_media type='doc') heredan la decisión del rubro:
// aprobar el rubro aprueba sus docs pendientes; rechazarlo los rechaza. El
// render público exige rubro.status='approved' Y doc.status='approved'.
import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { revalidateAdminCounters } from "@/lib/admin/counters";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, ctx: { params: Params }) {
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
    .maybeSingle<{ role: string | null }>();
  if (up?.role !== "admin" && up?.role !== "moderator")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action as "approve" | "reject" | undefined;
  if (action !== "approve" && action !== "reject")
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  const reason = typeof body?.reason === "string" ? body.reason.trim() || null : null;

  const admin = createSupabaseAdmin();

  const { data: rubro } = await admin
    .from("coach_methodology_rubros")
    .select("coach_id")
    .eq("id", id)
    .maybeSingle<{ coach_id: string }>();
  if (!rubro) return NextResponse.json({ error: "rubro not found" }, { status: 404 });

  const nextStatus = action === "approve" ? "approved" : "rejected";
  const now = new Date().toISOString();

  const { error } = await admin
    .from("coach_methodology_rubros")
    .update({
      status: nextStatus,
      reviewed_by_user_id: user.id,
      reviewed_at: now,
      rejection_reason: action === "reject" ? reason : null,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Cascada a los archivos adjuntos (heredan la decisión del rubro). En reject,
  // sólo se tocan los que no estaban ya rechazados; en approve, los pendientes.
  await admin
    .from("coach_media")
    .update({
      status: nextStatus,
      reviewed_by_user_id: user.id,
      reviewed_at: now,
      rejection_reason: action === "reject" ? reason : null,
    })
    .eq("rubro_id", id)
    .eq("type", "doc")
    .neq("status", nextStatus);

  const { data: coachRow } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", rubro.coach_id)
    .maybeSingle<{ slug: string | null }>();
  revalidateCoachPublicProfile(coachRow?.slug ?? null);
  revalidatePath("/admin/coach-methodology");
  revalidateAdminCounters();

  return NextResponse.json({ success: true });
}
