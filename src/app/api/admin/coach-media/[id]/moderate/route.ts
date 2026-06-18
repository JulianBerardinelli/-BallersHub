// Moderates a single coach_media item (pre-moderation: pending → approved /
// rejected). Approving makes it visible on the public portfolio; rejecting
// keeps it for the coach to fix, with a reason.
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

  const { data: row } = await admin
    .from("coach_media")
    .select("coach_id")
    .eq("id", id)
    .maybeSingle<{ coach_id: string }>();
  if (!row) return NextResponse.json({ error: "media not found" }, { status: 404 });

  const { error } = await admin
    .from("coach_media")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: action === "reject" ? reason : null,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: coachRow } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", row.coach_id)
    .maybeSingle<{ slug: string | null }>();
  revalidateCoachPublicProfile(coachRow?.slug ?? null);
  revalidatePath("/admin/coach-media");
  revalidateAdminCounters();

  return NextResponse.json({ success: true });
}
