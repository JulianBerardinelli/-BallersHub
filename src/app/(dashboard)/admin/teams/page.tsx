// src/app/(dashboard)/admin/teams/page.tsx
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import TeamsTableUI from "./TeamsTableUI";
import type { TeamRow } from "./types";

export default async function AdminTeamsPage() {
  noStore();

  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/teams");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  // ⚠️ Traemos TODOS los equipos (pendientes / aprobados / rechazados)
  const { data: teams, error } = await supabase
    .from("teams")
    .select(`
      id, name, slug, country, country_code, category, transfermarkt_url,
      status, crest_url, created_at, updated_at, requested_in_application_id,
      division_id
    `)
    .order("created_at", { ascending: false });

  const { data: allDivisions } = await supabase.from("divisions").select("id, name, crest_url, country_code").eq("status", "approved");

  const items: TeamRow[] = (teams ?? []).map(t => {
    const tDiv = allDivisions?.find((d) => d.id === t.division_id) || null;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug ?? null,
      country: t.country ?? null,
      country_code: t.country_code ?? null,
      category: t.category ?? null,
      transfermarkt_url: t.transfermarkt_url ?? null,
      status: t.status as TeamRow["status"],
      crest_url: t.crest_url ?? null,
      created_at: t.created_at,
      updated_at: t.updated_at ?? null,
      requested_in_application_id: t.requested_in_application_id ?? null,
      division: tDiv ? { id: tDiv.id, name: tDiv.name, crest_url: tDiv.crest_url } : null,
    };
  });

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Equipos</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Gestioná solicitudes pendientes y editá equipos aprobados.
        </p>
      </div>

      {error && <p className="text-red-500">{error.message}</p>}

      <TeamsTableUI items={items} allDivisions={allDivisions || []} />
    </main>
  );
}
