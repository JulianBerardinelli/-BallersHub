// src/app/(dashboard)/admin/teams/TeamsTableQuery.ts
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export async function fetchTeamsForAdmin() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { teams: [], error: "unauthenticated" };

  const { data: up } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") return { teams: [], error: "forbidden" };

  const { data, error } = await supabase
    .from("teams")
    .select(`
      id, name, slug, country, country_code, category, transfermarkt_url,
      status, crest_url, created_at, updated_at, requested_in_application_id
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  return { teams: data ?? [], error: error?.message ?? null };
}
