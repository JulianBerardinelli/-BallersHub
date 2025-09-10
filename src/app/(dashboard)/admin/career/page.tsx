// src/app/(dashboard)/admin/career/page.tsx
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import CareerInbox from "./CareerInboxTable";

// Tipos crudos de la consulta
type RawApp = {
  id: string;
  user_id: string;
  full_name: string | null;
  transfermarkt_url: string | null;
  external_profile_url: string | null;
  nationality: string[] | null;
  notes: any | null;
};
type RawRow = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  club: string;
  division: string | null;
  start_year: number | null;
  end_year: number | null;
  team_id: string | null;
  application_id: string;
  proposed_team_name: string | null;
  proposed_team_country: string | null;
  proposed_team_country_code: string | null;
  team: { name: string | null; crest_url: string | null; country_code: string | null } | null;
  // join
  player_applications?: RawApp[] | RawApp | null;
};

// Estructura agrupada por solicitud
export type Group = {
  application_id: string;
  applicant: {
    id: string;
    user_id: string;
    full_name: string | null;
    transfermarkt_url: string | null;
    external_profile_url: string | null;
    social_url: string | null;
    nationality_codes: string[];
  } | null;
  items: Array<{
    id: string;
    status: "pending" | "accepted" | "rejected";
    club: string;
    division: string | null;
    start_year: number | null;
    end_year: number | null;
    team_id: string | null;
    team_name: string;
    crest_url: string | null;
    country_code: string | null;
  }>;
};

export default async function CareerAdminPage() {
  noStore();
  const supa = await createSupabaseServerRSC();

  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/career");
  const { data: up } = await supa.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  // Traemos sólo propuestas PENDING
  const { data, error } = await supa
    .from("career_item_proposals")
    .select(`
      id, status, club, division, start_year, end_year, team_id, application_id,
      proposed_team_name, proposed_team_country, proposed_team_country_code,
      team:teams ( name, crest_url, country_code ),
      player_applications!inner (
        id, user_id, full_name, transfermarkt_url, external_profile_url, nationality, notes
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return <main className="p-8"><p className="text-red-500">{error.message}</p></main>;
  }

  // Agrupar por application_id
  const groupsMap = new Map<string, Group>();
  for (const r of (data as RawRow[] ?? [])) {
    const appRel = Array.isArray(r.player_applications)
      ? (r.player_applications[0] ?? null)
      : (r.player_applications ?? null);

    const notes = appRel?.notes && typeof appRel.notes === "string" ? JSON.parse(appRel.notes) : appRel?.notes;
    const nationality_codes = Array.isArray(notes?.nationality_codes) ? notes.nationality_codes : [];
    const social_url = typeof notes?.social_url === "string" ? notes.social_url : null;

    const g = groupsMap.get(r.application_id) ?? {
      application_id: r.application_id,
      applicant: appRel ? {
        id: appRel.id,
        user_id: appRel.user_id,
        full_name: appRel.full_name,
        transfermarkt_url: appRel.transfermarkt_url,
        external_profile_url: appRel.external_profile_url,
        social_url,
        nationality_codes,
      } : null,
      items: [],
    };
    g.items.push({
      id: r.id,
      status: r.status,
      club: r.club,
      division: r.division,
      start_year: r.start_year,
      end_year: r.end_year,
      team_id: r.team_id,
      team_name: r.team?.name ?? r.club,
      crest_url: r.team?.crest_url ?? null,
      country_code: r.team?.country_code ?? r.proposed_team_country_code ?? null,
    });
    groupsMap.set(r.application_id, g);
  }

  const groups = Array.from(groupsMap.values());

  return (
    <main className="mx-auto max-w-6xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trayectorias propuestas</h1>
        <p className="text-sm text-neutral-500">
          Aceptá la trayectoria completa. Los equipos que no existan se crearán en <b>Teams</b> como <b>pending</b>.
        </p>
      </div>
      <CareerInbox groups={groups} />
    </main>
  );
}
