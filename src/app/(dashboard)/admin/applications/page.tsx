// src/app/(dashboard)/admin/applications/page.tsx
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import ApplicationsTableUI from "./ApplicationsTableUI";
import type { ApplicationRow } from "./types";

// Raw query types
interface RawApp {
  id: string;
  full_name: string | null;
  nationality: string[] | null;
  plan_requested: "free" | "pro" | "pro_plus";
  created_at: string;
  status: "pending" | "approved" | "rejected";
  free_agent: boolean;
  transfermarkt_url: string | null;
  proposed_team_name: string | null;
  proposed_team_country_code: string | null;
  external_profile_url: string | null;
  id_doc_url: string | null;
  selfie_url: string | null;
  current_team: {
    name: string | null;
    crest_url: string | null;
    country_code: string | null;
  } | null;
  career_item_proposals: { status: string }[] | null;
}

export default async function AdminApplicationsPage() {
  noStore();
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/applications");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const { data, error } = await supabase
    .from("player_applications")
    .select(
      `
      id, full_name, nationality, plan_requested, created_at, status,
      free_agent, transfermarkt_url,
      proposed_team_name, proposed_team_country_code,
      external_profile_url, id_doc_url, selfie_url,
      current_team:teams!player_applications_current_team_id_fkey ( name, crest_url, country_code ),
      career_item_proposals ( status )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="p-8">
        <p className="text-red-500">{error.message}</p>
      </main>
    );
  }

  const rows = (data ?? []) as unknown as RawApp[];
  const items: ApplicationRow[] = rows.map((app) => {
    const pendingItems = (app.career_item_proposals ?? []).filter(
      (ci) => ci.status === "pending"
    ).length;
    const teamTask =
      !app.current_team && app.proposed_team_name && !app.free_agent;

    const links = app.external_profile_url ? [app.external_profile_url] : [];
    const kyc_urls = [app.id_doc_url, app.selfie_url].filter(
      (u): u is string => !!u
    );
    const personalInfoProvided = links.length > 0 || kyc_urls.length > 0;

    const tasks: ApplicationRow["tasks"] = [];
    if (pendingItems > 0) {
      tasks.push({ label: "Trayectoria", color: "bg-violet-600" });
    }
    if (teamTask) {
      tasks.push({ label: "Equipos", color: "bg-orange-600" });
    }
    if (personalInfoProvided) {
      tasks.push({ label: "Informacion", color: "bg-pink-600" });
    }

    return {
      id: app.id,
      applicant: app.full_name,
      nationalities: Array.isArray(app.nationality) ? app.nationality : [],
      created_at: app.created_at,
      status: app.status,
      plan: app.plan_requested,
      current_team_name: app.current_team?.name ?? null,
      current_team_crest_url: app.current_team?.crest_url ?? null,
      current_team_country_code: app.current_team?.country_code ?? null,
      proposed_team_name: app.proposed_team_name,
      proposed_team_country_code: app.proposed_team_country_code,
      free_agent: app.free_agent,
      tasks,
      transfermarkt_url: app.transfermarkt_url,
      personal_info_approved: !personalInfoProvided,
      links,
      kyc_urls,
    };
  });

  return (
    <main className="mx-auto max-w-6xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Solicitudes de jugador</h1>
        <p className="text-sm text-neutral-500">
          Revisá y aprobá solicitudes de cuentas de jugador.
        </p>
      </div>
      <ApplicationsTableUI items={items} />
    </main>
  );
}
