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
  positions: string[] | null;
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
  notes: unknown | null;
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
      [
        "id",
        "full_name",
        "nationality",
        "positions",
        "plan_requested",
        "created_at",
        "status",
        "free_agent",
        "transfermarkt_url",
        "proposed_team_name",
        "proposed_team_country_code",
        "external_profile_url",
        "id_doc_url",
        "selfie_url",
        "notes",
        "current_team:teams!player_applications_current_team_id_fkey(name,crest_url,country_code)",
        "career_item_proposals(status)",
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

  const rows = (data ?? []) as unknown as RawApp[];
  const kycStorage = supabase.storage.from("kyc");
  const items: ApplicationRow[] = rows.map((app) => {
    const notes =
      app.notes && typeof app.notes === "string" ? JSON.parse(app.notes) : app.notes;
    const nationality_codes = Array.isArray(notes?.nationality_codes)
      ? notes.nationality_codes
      : [];
    const social_url = typeof notes?.social_url === "string" ? notes.social_url : null;
    const birth_date = typeof notes?.birth_date === "string" ? notes.birth_date : null;
    const height_cm = typeof notes?.height_cm === "number" ? notes.height_cm : null;
    const weight_kg = typeof notes?.weight_kg === "number" ? notes.weight_kg : null;
    const age = birth_date
      ? Math.floor((Date.now() - new Date(birth_date).getTime()) / 31557600000)
      : null;

    const pendingItems = (app.career_item_proposals ?? []).filter(
      (ci) => ci.status === "pending"
    ).length;
    const teamTask =
      !app.current_team && app.proposed_team_name && !app.free_agent;

    const links: ApplicationRow["links"] = [];
    if (app.transfermarkt_url)
      links.push({ label: "Transfermarkt", url: app.transfermarkt_url });
    if (app.external_profile_url)
      links.push({ label: "Perfil", url: app.external_profile_url });
    if (social_url) links.push({ label: "Social", url: social_url });

    const kyc_docs: ApplicationRow["kyc_docs"] = [];
    if (app.id_doc_url)
      kyc_docs.push({
        label: "Documento",
        url: kycStorage.getPublicUrl(app.id_doc_url).data.publicUrl,
      });
    if (app.selfie_url)
      kyc_docs.push({
        label: "Selfie",
        url: kycStorage.getPublicUrl(app.selfie_url).data.publicUrl,
      });

    const personalInfoProvided =
      links.length > 0 || kyc_docs.length > 0 || birth_date || height_cm || weight_kg;

    const tasks: ApplicationRow["tasks"] = [];
    if (app.status !== "approved") {
      if (pendingItems > 0) {
        tasks.push({
          label: "Trayectoria",
          className: "text-purple-700 bg-purple-100 border-purple-200",
        });
      }
      if (teamTask) {
        tasks.push({
          label: "Equipos",
          className: "text-pink-700 bg-pink-100 border-pink-200",
        });
      }
      if (personalInfoProvided) {
        tasks.push({
          label: "Informacion",
          className: "text-orange-700 bg-orange-100 border-orange-200",
        });
      }
    }

    const personal_info_approved = app.status === "approved" || !personalInfoProvided;

    const nationalities = (Array.isArray(app.nationality) ? app.nationality : []).map(
      (n, i) => ({ name: n, code: nationality_codes[i] ?? null })
    );

    return {
      id: app.id,
      applicant: app.full_name,
      nationalities,
      positions: Array.isArray(app.positions) ? app.positions : [],
      birth_date,
      age,
      height_cm,
      weight_kg,
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
      personal_info_approved,
      links,
      kyc_docs,
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
