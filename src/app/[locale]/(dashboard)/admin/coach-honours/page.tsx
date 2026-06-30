import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import HonoursModerationPanel, { type PendingHonour } from "./HonoursModerationPanel";

export const dynamic = "force-dynamic";

export default async function CoachHonoursModerationPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/coach-honours");
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string | null }>();
  if (up?.role !== "admin" && up?.role !== "moderator") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: rows } = await admin
    .from("coach_honours")
    .select(
      "id, title, competition, season, description, video_url, status, created_at, coach:coach_profiles ( full_name, slug ), stage:coach_career_items ( club )",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const items: PendingHonour[] = (rows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const coach = (r.coach ?? {}) as { full_name?: string; slug?: string | null };
    const stage = (r.stage ?? {}) as { club?: string | null };
    return {
      id: r.id as string,
      title: (r.title as string) ?? "",
      competition: (r.competition as string | null) ?? null,
      season: (r.season as string | null) ?? null,
      description: (r.description as string | null) ?? null,
      videoUrl: (r.video_url as string | null) ?? null,
      careerLabel: stage.club ?? null,
      coachName: coach.full_name ?? "—",
      slug: coach.slug ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Logros · pendientes
        </h2>
        <p className="text-sm text-bh-fg-3">Aprobá o rechazá los logros cargados por el staff.</p>
      </div>
      <HonoursModerationPanel items={items} />
    </div>
  );
}
