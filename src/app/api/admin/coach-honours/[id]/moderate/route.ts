// Modera un logro (pre-moderación: pending → approved/rejected). Espejo de
// coach-game-ideas/[id]/moderate. El render público exige status='approved'.
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

  const { data: honour } = await admin
    .from("coach_honours")
    .select("coach_id")
    .eq("id", id)
    .maybeSingle<{ coach_id: string }>();
  if (!honour) return NextResponse.json({ error: "honour not found" }, { status: 404 });

  const nextStatus = action === "approve" ? "approved" : "rejected";
  const now = new Date().toISOString();

  const { error } = await admin
    .from("coach_honours")
    .update({
      status: nextStatus,
      reviewed_by_user_id: user.id,
      reviewed_at: now,
      rejection_reason: action === "reject" ? reason : null,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: coachRow } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", honour.coach_id)
    .maybeSingle<{ slug: string | null }>();
  revalidateCoachPublicProfile(coachRow?.slug ?? null);
  revalidatePath("/admin/coach-honours");
  revalidateAdminCounters();

  return NextResponse.json({ success: true });
}
