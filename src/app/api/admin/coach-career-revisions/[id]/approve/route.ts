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
import { ensureUniqueTeamSlug, findExistingTeamIdByName, slugify } from "@/lib/admin/teams";

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
    .select("id, status, coach_id, submitted_by_user_id")
    .eq("id", id)
    .maybeSingle<{ id: string; status: string; coach_id: string; submitted_by_user_id: string | null }>();
  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 400 });
  if (!reqRow) return NextResponse.json({ error: "request not found" }, { status: 404 });
  if (reqRow.status !== "pending")
    return NextResponse.json({ error: "request already resolved" }, { status: 409 });

  const coachId = reqRow.coach_id;

  const [{ data: items }, { data: stats }, { data: proposedTeams }] = await Promise.all([
    admin
      .from("coach_career_revision_items")
      .select(
        "id, club, role_title, division, division_id, secondary_division, secondary_division_id, start_year, end_year, team_id, proposed_team_id, order_index",
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
    admin
      .from("coach_career_revision_proposed_teams")
      .select("id, name, country_code, country_name, transfermarkt_url")
      .eq("request_id", id),
  ]);

  // ── Resolve proposed teams → pending catalog teams (mirrors the player
  //    revision approve). Each proposed team becomes a `teams` row status=pending
  //    that an admin later completes (crest, etc.); the materialized career item
  //    links to it via team_id. Deduped per proposal id; existing teams reused. ──
  type ProposedTeam = {
    id: string;
    name: string | null;
    country_code: string | null;
    country_name: string | null;
    transfermarkt_url: string | null;
  };
  const proposedById = new Map<string, ProposedTeam>(
    ((proposedTeams ?? []) as ProposedTeam[]).map((p) => [p.id, p]),
  );
  const createdTeams = new Map<string, string | null>();
  const resolvedItems: Array<Record<string, unknown> & { resolvedTeamId: string | null }> = [];
  for (const raw of items ?? []) {
    const it = raw as Record<string, unknown>;
    let teamId = (it.team_id as string | null) ?? null;
    const proposedTeamId = it.proposed_team_id as string | null;
    if (!teamId && proposedTeamId) {
      if (createdTeams.has(proposedTeamId)) {
        teamId = createdTeams.get(proposedTeamId) ?? null;
      } else {
        const prop = proposedById.get(proposedTeamId);
        const displayName = (prop?.name || (it.club as string) || "").trim();
        if (displayName) {
          let existing = await findExistingTeamIdByName(displayName, admin);
          if (!existing) {
            const slug = await ensureUniqueTeamSlug(slugify(displayName), admin);
            const ins = await admin
              .from("teams")
              .insert({
                name: displayName,
                slug,
                country: prop?.country_name ?? null,
                country_code: prop?.country_code ?? null,
                category: (it.division as string | null) ?? null,
                transfermarkt_url: prop?.transfermarkt_url ?? null,
                status: "pending",
                visibility: "public",
                requested_by_user_id: reqRow.submitted_by_user_id ?? null,
              })
              .select("id")
              .single<{ id: string }>();
            if (ins.error) {
              return NextResponse.json({ error: `team insert failed: ${ins.error.message}` }, { status: 400 });
            }
            existing = ins.data.id;
          }
          teamId = existing;
          createdTeams.set(proposedTeamId, teamId);
        }
      }
    }
    resolvedItems.push({ ...it, resolvedTeamId: teamId });
  }

  // ── Materialize career (insert-new-then-delete-old so a failed insert never
  //    leaves the coach with an empty trayectoria) ──
  const { data: oldCareer } = await admin
    .from("coach_career_items")
    .select("id")
    .eq("coach_id", coachId);
  const oldCareerIds = (oldCareer ?? []).map((r) => r.id as string);

  if (resolvedItems.length > 0) {
    const { error } = await admin.from("coach_career_items").insert(
      resolvedItems.map((it) => ({
        coach_id: coachId,
        club: it.club,
        role_title: it.role_title,
        division: it.division,
        division_id: it.division_id,
        secondary_division: it.secondary_division,
        secondary_division_id: it.secondary_division_id,
        start_date: toStartDate(it.start_year as number | null),
        end_date: toEndDate(it.end_year as number | null),
        team_id: it.resolvedTeamId,
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
