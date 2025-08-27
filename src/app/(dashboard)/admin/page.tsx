import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminShell from "./ui/AdminShell";
import type { TeamRow } from "./teams/types";

type ApplicationRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  plan_requested: "free" | "pro" | "pro_plus";
  current_team_id: string | null;
  proposed_team_name: string | null;
  proposed_team_country: string | null;
  created_at: string;
  status: string;
  transfermarkt_url: string | null;
};

export default async function AdminPage() {
  const supabase = await createSupabaseServerRSC();

  // auth + admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin");

  const { data: up } = await supabase
    .from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  // datos iniciales (pendientes de jugador y equipos)
  const [{ data: apps }, { data: teams }] = await Promise.all([
    supabase
      .from("player_applications")
      .select("id,user_id,full_name,plan_requested,current_team_id,proposed_team_name,proposed_team_country,transfermarkt_url,created_at,status")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("teams")
      .select("id,name,slug,country,category,transfermarkt_url,status,crest_url,created_at,updated_at,requested_in_application_id")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <AdminShell
      initialApps={(apps ?? []) as ApplicationRow[]}
      initialTeams={(teams ?? []) as TeamRow[]}
    />
  );
}
