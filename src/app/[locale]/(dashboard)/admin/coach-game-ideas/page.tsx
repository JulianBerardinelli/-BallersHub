import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import GameIdeasModerationPanel, { type PendingGameIdea } from "./GameIdeasModerationPanel";

export const dynamic = "force-dynamic";

export default async function CoachGameIdeasModerationPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/coach-game-ideas");
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string | null }>();
  if (up?.role !== "admin" && up?.role !== "moderator") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: rows } = await admin
    .from("coach_game_ideas")
    .select(
      "id, title, formation, blurb, link, pitch_board, status, created_at, coach:coach_profiles ( full_name, slug )",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const items: PendingGameIdea[] = (rows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const coach = (r.coach ?? {}) as { full_name?: string; slug?: string | null };
    return {
      id: r.id as string,
      title: (r.title as string | null) ?? null,
      formation: (r.formation as string | null) ?? null,
      blurb: (r.blurb as string | null) ?? null,
      link: (r.link as string | null) ?? null,
      board: r.pitch_board,
      coachName: coach.full_name ?? "—",
      slug: coach.slug ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Ideas de Juego · pendientes
        </h2>
        <p className="text-sm text-bh-fg-3">
          Aprobá o rechazá las pizarras tácticas de los entrenadores.
        </p>
      </div>
      <GameIdeasModerationPanel items={items} />
    </div>
  );
}
