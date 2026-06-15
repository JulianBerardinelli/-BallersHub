// Rejects a coach trayectoria/stats revision. The live tables are untouched;
// the coach can fix the data and resubmit. Mirrors the player reject route.
import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { revalidateAdminCounters } from "@/lib/admin/counters";

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
  if (up?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let resolutionNote: string | null = null;
  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.resolutionNote === "string") resolutionNote = body.resolutionNote.trim() || null;
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("coach_career_revision_requests")
    .update({
      status: "rejected",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      resolution_note: resolutionNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidatePath("/admin/coach-career-revisions");
  revalidatePath("/dashboard", "layout");
  revalidateAdminCounters();

  return NextResponse.json({ success: true });
}
