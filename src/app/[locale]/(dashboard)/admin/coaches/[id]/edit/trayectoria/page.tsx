import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import AdminCoachCareerForm, {
  type CareerStage,
  type SeasonStat,
} from "./AdminCoachCareerForm";

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
    .select("id, full_name, slug")
    .eq("id", id)
    .maybeSingle<{ id: string; full_name: string; slug: string | null }>();
  if (!coach) notFound();

  const [{ data: careerRows }, { data: statRows }] = await Promise.all([
    admin
      .from("coach_career_items")
      .select("club, role_title, division, start_date, end_date")
      .eq("coach_id", id)
      .order("start_date", { ascending: false }),
    admin
      .from("coach_stats_seasons")
      .select("season, team, competition, matches, wins, draws, losses, goals_for, goals_against")
      .eq("coach_id", id)
      .order("season", { ascending: false }),
  ]);

  const items: CareerStage[] = (careerRows ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      club: (x.club as string) ?? "",
      roleTitle: (x.role_title as string | null) ?? "",
      division: (x.division as string | null) ?? "",
      startYear: yearOf(x.start_date),
      endYear: yearOf(x.end_date),
    };
  });
  const stats: SeasonStat[] = (statRows ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      season: (x.season as string) ?? "",
      team: (x.team as string | null) ?? "",
      competition: (x.competition as string | null) ?? "",
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
        <Link href="/admin/coaches" className="text-[12px] text-bh-fg-3 hover:text-bh-fg-1">
          ← Directorio
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Trayectoria · {coach.full_name}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Edición directa (sin pasar por revisión). Reemplaza la trayectoria y estadísticas vivas del DT.
        </p>
      </div>
      <AdminCoachCareerForm coachId={id} initialItems={items} initialStats={stats} />
    </main>
  );
}
