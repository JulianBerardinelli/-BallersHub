// src/app/(dashboard)/admin/career/page.tsx
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import CareerTableUI from "./CareerTableUI";
import type { CareerRow } from "./types";

// Raw query types
type RawApp = {
  id: string;
  user_id: string;
  full_name: string | null;
  transfermarkt_url: string | null;
  external_profile_url: string | null;
  nationality: string[] | null;
  notes: unknown | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type RawItem = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  club: string;
  division: string | null;
  start_year: number | null;
  end_year: number | null;
  team_id: string | null;
  team: { name: string | null; crest_url: string | null; country_code: string | null } | null;
};

type RawRow = RawApp & {
  current_team: { name: string | null; crest_url: string | null; country_code: string | null } | null;
  career_item_proposals: RawItem[] | null;
};

export default async function CareerAdminPage() {
  noStore();
  const supa = await createSupabaseServerRSC();

  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/career");
  const { data: up } = await supa
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const { data, error } = await supa
    .from("player_applications")
    .select(
      `
      id, user_id, full_name, status, created_at,
      transfermarkt_url, external_profile_url, nationality, notes,
      current_team:teams!player_applications_current_team_id_fkey ( name, crest_url, country_code ),
      career_item_proposals (
        id, status, club, division, start_year, end_year, team_id,
        team:teams!career_item_proposals_team_id_fkey ( name, crest_url, country_code )
      )
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

  const rows = (data ?? []) as unknown as RawRow[];
  const items: CareerRow[] = rows.map((app) => {
    const notes =
      app.notes && typeof app.notes === "string" ? JSON.parse(app.notes) : app.notes;
    const nationality_codes = Array.isArray(notes?.nationality_codes)
      ? notes.nationality_codes
      : [];
    const social_url = typeof notes?.social_url === "string" ? notes.social_url : null;
    const links = [app.transfermarkt_url, app.external_profile_url, social_url].filter(
      Boolean
    ) as string[];

    const items = (app.career_item_proposals ?? []).map((ci) => ({
      id: ci.id,
      status: ci.status,
      club: ci.club,
      division: ci.division,
      start_year: ci.start_year,
      end_year: ci.end_year,
      team_id: ci.team_id,
      team_name: ci.team?.name ?? ci.club,
      crest_url: ci.team?.crest_url ?? null,
      country_code: ci.team?.country_code ?? null,
    }));

    let current = app.current_team;
    if (!current) {
      const curItem = items.find((i) => i.end_year == null);
      if (curItem) {
        current = {
          name: curItem.team_name,
          crest_url: curItem.crest_url,
          country_code: curItem.country_code,
        };
      }
    }

    return {
      id: app.id,
      applicant: app.full_name,
      status: app.status,
      created_at: app.created_at,
      current_team_name: current?.name ?? null,
      current_team_crest_url: current?.crest_url ?? null,
      current_team_country_code: current?.country_code ?? null,
      nationalities: nationality_codes,
      links,
      items,
    };
  });

  return (
    <main className="mx-auto max-w-6xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trayectorias</h1>
        <p className="text-sm text-neutral-500">
          Gestioná trayectorias propuestas y aprobadas.
        </p>
      </div>
      <CareerTableUI items={items} />
    </main>
  );
}
