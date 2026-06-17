// Approves a coach trayectoria/stats revision and materializes it into the live
// tables. Mirrors the player career-revision approve route, but coach v1 career
// items are free-text (no proposed-team resolution), so we do a clean
// full-replace of coach_career_items + coach_stats_seasons from the proposed
// set. Auth is checked with the cookie client; writes use the service-role
// client (bypasses RLS) like the player route.
import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { revalidateAdminCounters } from "@/lib/admin/counters";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const toStartDate = (year: number | null): string | null => (year ? `${year}-01-01` : null);
const toEndDate = (year: number | null): string | null => (year ? `${year}-12-31` : null);

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

  const { data: reqRow, error: reqErr } = await admin
    .from("coach_career_revision_requests")
    .select("id, status, coach_id")
    .eq("id", id)
    .maybeSingle<{ id: string; status: string; coach_id: string }>();
  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 400 });
  if (!reqRow) return NextResponse.json({ error: "request not found" }, { status: 404 });
  if (reqRow.status !== "pending")
    return NextResponse.json({ error: "request already resolved" }, { status: 409 });

  const coachId = reqRow.coach_id;

  const [{ data: items }, { data: stats }] = await Promise.all([
    admin
      .from("coach_career_revision_items")
      .select(
        "club, role_title, division, division_id, secondary_division, secondary_division_id, start_year, end_year, team_id, order_index",
      )
      .eq("request_id", id)
      .order("order_index", { ascending: true }),
    admin
      .from("coach_stats_revision_items")
      .select(
        "season, matches, wins, draws, losses, goals_for, goals_against, competition, team, order_index",
      )
      .eq("request_id", id)
      .order("order_index", { ascending: true }),
  ]);

  // ── Materialize career (insert-new-then-delete-old so a failed insert never
  //    leaves the coach with an empty trayectoria) ──
  const { data: oldCareer } = await admin
    .from("coach_career_items")
    .select("id")
    .eq("coach_id", coachId);
  const oldCareerIds = (oldCareer ?? []).map((r) => r.id as string);

  if (items && items.length > 0) {
    const { error } = await admin.from("coach_career_items").insert(
      items.map((it) => ({
        coach_id: coachId,
        club: it.club,
        role_title: it.role_title,
        division: it.division,
        division_id: it.division_id,
        secondary_division: it.secondary_division,
        secondary_division_id: it.secondary_division_id,
        start_date: toStartDate(it.start_year as number | null),
        end_date: toEndDate(it.end_year as number | null),
        team_id: it.team_id,
      })),
    );
    if (error) return NextResponse.json({ error: `career insert failed: ${error.message}` }, { status: 400 });
  }
  if (oldCareerIds.length > 0) {
    await admin.from("coach_career_items").delete().in("id", oldCareerIds);
  }

  // ── Materialize stats (same safe replace) ──
  const { data: oldStats } = await admin
    .from("coach_stats_seasons")
    .select("id")
    .eq("coach_id", coachId);
  const oldStatIds = (oldStats ?? []).map((r) => r.id as string);

  if (stats && stats.length > 0) {
    const { error } = await admin.from("coach_stats_seasons").insert(
      stats.map((s) => ({
        coach_id: coachId,
        season: s.season,
        matches: s.matches,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goals_for: s.goals_for,
        goals_against: s.goals_against,
        competition: s.competition,
        team: s.team,
      })),
    );
    if (error) return NextResponse.json({ error: `stats insert failed: ${error.message}` }, { status: 400 });
  }
  if (oldStatIds.length > 0) {
    await admin.from("coach_stats_seasons").delete().in("id", oldStatIds);
  }

  // Sync the profile's current club from the open stage (end_year null), if any.
  const currentStage = (items ?? []).find((it) => (it.end_year as number | null) === null);
  if (currentStage) {
    await admin
      .from("coach_profiles")
      .update({ current_club: currentStage.club, updated_at: new Date().toISOString() })
      .eq("id", coachId);
  }

  const { data: coachRow } = await admin
    .from("coach_profiles")
    .select("slug")
    .eq("id", coachId)
    .maybeSingle<{ slug: string | null }>();

  const { error: updErr } = await admin
    .from("coach_career_revision_requests")
    .update({
      status: "approved",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      resolution_note: resolutionNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  revalidateCoachPublicProfile(coachRow?.slug ?? null);
  revalidatePath("/admin/coach-career-revisions");
  revalidatePath("/dashboard", "layout");
  revalidateAdminCounters();

  return NextResponse.json({ success: true });
}
