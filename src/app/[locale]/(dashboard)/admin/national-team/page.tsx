import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import NationalTeamReviewList, { type PendingStint } from "./NationalTeamReviewList";
import type {
  NationalTeamAgeCategory,
  NationalTeamParticipation,
} from "@/db/schema/nationalTeams";

type RawPending = {
  id: string;
  country_code: string | null;
  proposed_team_name: string | null;
  age_category: string;
  participation: string;
  start_year: number | null;
  end_year: number | null;
  description: string | null;
  highlights: string[] | null;
  caps: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
  reference_url: string | null;
  created_at: string | null;
  player: { full_name: string | null; slug: string | null; gender: string | null } | null;
};

export default async function AdminNationalTeamPage() {
  noStore();
  const supa = await createSupabaseServerRSC();

  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/national-team");

  const { data: up } = await supa
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin" && up?.role !== "analyst") redirect("/dashboard");

  const { data, error } = await supa
    .from("national_team_stints")
    .select(
      `
      id, country_code, proposed_team_name, age_category, participation,
      start_year, end_year, description, highlights, caps, goals, assists, minutes,
      reference_url, created_at,
      player:player_profiles ( full_name, slug, gender )
    `,
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="p-8">
        <p className="text-red-500">{error.message}</p>
      </main>
    );
  }

  const rows = (data ?? []) as unknown as RawPending[];
  const items: PendingStint[] = rows.map((r) => ({
    id: r.id,
    countryCode: r.country_code,
    teamName: r.proposed_team_name,
    ageCategory: r.age_category as NationalTeamAgeCategory,
    participation: r.participation as NationalTeamParticipation,
    startYear: r.start_year,
    endYear: r.end_year,
    description: r.description,
    highlights: r.highlights,
    caps: r.caps,
    goals: r.goals,
    assists: r.assists,
    minutes: r.minutes,
    referenceUrl: r.reference_url,
    createdAt: r.created_at,
    playerName: r.player?.full_name ?? null,
    playerSlug: r.player?.slug ?? null,
    playerGender: r.player?.gender ?? null,
  }));

  return (
    <main className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">Selección Nacional</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Solicitudes de etapas de selección pendientes de verificación. Aprobá para publicarlas
          en el portfolio del jugador; rechazá con una nota para que pueda corregir.
        </p>
      </div>
      <NationalTeamReviewList items={items} canModerate={up?.role === "admin"} />
    </main>
  );
}
