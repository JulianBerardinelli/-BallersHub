import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffRole, type StaffRoleType } from "@/lib/staff/roles";
import CoachCareerRevisionsPanel, {
  type CoachRevisionRequest,
  type DiffStage,
  type DiffStat,
} from "./CoachCareerRevisionsPanel";
import CoachModerationHistory, {
  type ModerationHistoryEntry,
} from "../_components/CoachModerationHistory";

export const dynamic = "force-dynamic";

const yearOf = (d: unknown): number | null => {
  if (typeof d !== "string") return null;
  const y = Number(d.slice(0, 4));
  return Number.isFinite(y) ? y : null;
};

type RawStage = Record<string, unknown>;
type RawStat = Record<string, unknown>;

const snapRoles = (raw: unknown): StaffRoleType[] =>
  (Array.isArray(raw) ? raw : []).filter(isStaffRole);

const snapStage = (r: RawStage): DiffStage => ({
  club: (r.club as string) ?? "",
  roleTitle: (r.role_title as string | null) ?? null,
  roles: snapRoles(r.roles),
  division: (r.division as string | null) ?? null,
  startYear: yearOf(r.start_date) ?? (r.start_year as number | null) ?? null,
  endYear: yearOf(r.end_date) ?? (r.end_year as number | null) ?? null,
});

const snapStat = (r: RawStat): DiffStat => ({
  season: (r.season as string) ?? "",
  competition: (r.competition as string | null) ?? null,
  team: (r.team as string | null) ?? null,
  matches: (r.matches as number) ?? 0,
  wins: (r.wins as number) ?? 0,
  draws: (r.draws as number) ?? 0,
  losses: (r.losses as number) ?? 0,
  goalsFor: (r.goals_for as number) ?? 0,
  goalsAgainst: (r.goals_against as number) ?? 0,
});

export default async function CoachCareerRevisionsPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/coach-career-revisions");
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string | null }>();
  if (up?.role !== "admin" && up?.role !== "analyst") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: rows } = await admin
    .from("coach_career_revision_requests")
    .select(
      `id, status, submitted_at, change_summary, current_snapshot,
       coach:coach_profiles ( full_name, slug ),
       items:coach_career_revision_items ( club, role_title, roles, division, start_year, end_year, order_index ),
       stats:coach_stats_revision_items ( season, competition, team, matches, wins, draws, losses, goals_for, goals_against, order_index )`,
    )
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });

  const requests: CoachRevisionRequest[] = (rows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const coach = (r.coach ?? {}) as { full_name?: string; slug?: string | null };
    const snapshot = (r.current_snapshot ?? {}) as { career?: RawStage[]; stats?: RawStat[] };
    const items = ((r.items as RawStage[]) ?? [])
      .slice()
      .sort((a, b) => ((a.order_index as number) ?? 0) - ((b.order_index as number) ?? 0));
    const stats = ((r.stats as RawStat[]) ?? [])
      .slice()
      .sort((a, b) => ((a.order_index as number) ?? 0) - ((b.order_index as number) ?? 0));

    return {
      id: r.id as string,
      coachName: coach.full_name ?? "—",
      slug: coach.slug ?? null,
      submittedAt: (r.submitted_at as string | null) ?? null,
      note: (r.change_summary as string | null) ?? null,
      before: {
        career: (snapshot.career ?? []).map(snapStage),
        stats: (snapshot.stats ?? []).map(snapStat),
      },
      after: {
        career: items.map(snapStage),
        stats: stats.map(snapStat),
      },
    };
  });

  const { data: resolved } = await admin
    .from("coach_career_revision_requests")
    .select("id, status, resolution_note, updated_at, coach:coach_profiles ( full_name, slug )")
    .in("status", ["approved", "rejected", "cancelled"])
    .order("updated_at", { ascending: false })
    .limit(40);

  const history: ModerationHistoryEntry[] = (resolved ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const coach = (r.coach ?? {}) as { full_name?: string; slug?: string | null };
    return {
      id: r.id as string,
      primary: coach.full_name ?? "—",
      secondary: "Revisión de trayectoria",
      status: (r.status as string) ?? "approved",
      reason: (r.resolution_note as string | null) ?? null,
      slug: coach.slug ?? null,
      at: (r.updated_at as string | null) ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <CoachCareerRevisionsPanel requests={requests} />
      <CoachModerationHistory entries={history} />
    </div>
  );
}
