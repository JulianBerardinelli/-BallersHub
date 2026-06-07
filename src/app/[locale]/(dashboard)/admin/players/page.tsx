import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import PlayersTableUI from "./PlayersTableUI";
import type { PlayerProfileRow } from "./types";

// Raw query types
interface RawProfile {
  id: string;
  user_id: string;
  slug: string;
  full_name: string;
  nationality: string[] | null;
  birth_date: string | null;
  status: "draft" | "pending_review" | "approved" | "rejected";
  visibility: "public" | "private";
  market_value_eur: number | null;
  avatar_url: string;
  created_at: string;
  current_team: {
    name: string | null;
    crest_url: string | null;
    country_code: string | null;
  } | null;
  plan_public: "free" | "pro" | "pro_plus";
}

export default async function AdminPlayersPage() {
  noStore();
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/players");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const { data, error } = await supabase
    .from("player_profiles")
    .select(
      [
        "id",
        "user_id",
        "slug",
        "full_name",
        "nationality",
        "birth_date",
        "status",
        "visibility",
        "market_value_eur",
        "avatar_url",
        "created_at",
        "plan_public",
        "current_team:teams!player_profiles_current_team_id_fkey(name,crest_url,country_code)",
      ].join(",")
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="p-8">
        <p className="text-red-500">{error.message}</p>
      </main>
    );
  }

  const rows = (data ?? []) as unknown as RawProfile[];
  const items: PlayerProfileRow[] = rows.map((profile) => {
    const age = profile.birth_date
      ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / 31557600000)
      : null;

    const nationalities = (Array.isArray(profile.nationality) ? profile.nationality : []).map(
      (n) => ({ name: n, code: null }) // Nationality codes are mostly unused in this view
    );

    const plan = profile.plan_public ?? "free";

    return {
      id: profile.id,
      user_id: profile.user_id,
      slug: profile.slug,
      full_name: profile.full_name,
      nationalities,
      birth_date: profile.birth_date,
      age,
      status: profile.status,
      visibility: profile.visibility,
      market_value_eur: profile.market_value_eur,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      plan,
      current_team_name: profile.current_team?.name ?? null,
      current_team_crest_url: profile.current_team?.crest_url ?? null,
      current_team_country_code: profile.current_team?.country_code ?? null,
    };
  });

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Directorio de Jugadores</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Mantenimiento de catálogo global de perfiles de jugadores pre-existentes.
        </p>
      </div>
      <PlayersTableUI items={items} />
    </main>
  );
}