import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { NotificationProvider } from "@/modules/notifications";
import CoachCareerManager, {
  type CoachCareerStage,
  type CoachSeasonStat,
} from "@/app/[locale]/(dashboard)/dashboard/coach/career/CoachCareerManager";
import { adminSubmitCoachCareerLive } from "@/app/actions/admin-coach";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar trayectoria - Ballers Hub" };

const yearOf = (d: unknown): number | null => {
  if (typeof d !== "string") return null;
  const y = Number(d.slice(0, 4));
  return Number.isFinite(y) ? y : null;
};

export default async function AdminCoachCareerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/trayectoria`);
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: coach } = await admin
    .from("coach_profiles")
    .select("id, full_name")
    .eq("id", id)
    .maybeSingle<{ id: string; full_name: string }>();
  if (!coach) notFound();

  const [{ data: careerRows }, { data: statRows }] = await Promise.all([
    admin
      .from("coach_career_items")
      .select("id, club, role_title, division, start_date, end_date")
      .eq("coach_id", id)
      .order("start_date", { ascending: false }),
    admin
      .from("coach_stats_seasons")
      .select("id, season, team, competition, matches, wins, draws, losses, goals_for, goals_against")
      .eq("coach_id", id)
      .order("season", { ascending: false }),
  ]);

  const career: CoachCareerStage[] = (careerRows ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: x.id as string,
      originalId: x.id as string,
      club: (x.club as string) ?? "",
      roleTitle: (x.role_title as string | null) ?? "",
      division: (x.division as string | null) ?? "",
      startYear: yearOf(x.start_date),
      endYear: yearOf(x.end_date),
    };
  });
  const stats: CoachSeasonStat[] = (statRows ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: x.id as string,
      originalStatId: x.id as string,
      season: (x.season as string) ?? "",
      competition: (x.competition as string | null) ?? "",
      team: (x.team as string | null) ?? "",
      matches: (x.matches as number) ?? 0,
      wins: (x.wins as number) ?? 0,
      draws: (x.draws as number) ?? 0,
      losses: (x.losses as number) ?? 0,
      goalsFor: (x.goals_for as number) ?? 0,
      goalsAgainst: (x.goals_against as number) ?? 0,
    };
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href={`/admin/coaches/${id}/edit`} className="text-[12px] text-bh-fg-3 hover:text-bh-fg-1">
          ← {coach.full_name}
        </Link>
        <p className="mt-1 text-sm text-neutral-400">
          Edición directa (sin pasar por revisión): al guardar se reemplaza la trayectoria viva del DT.
        </p>
      </div>
      <NotificationProvider>
        <CoachCareerManager
          coachId={id}
          coachName={coach.full_name}
          career={career}
          stats={stats}
          latestRequest={null}
          submitAction={adminSubmitCoachCareerLive}
          liveMode
        />
      </NotificationProvider>
    </main>
  );
}
