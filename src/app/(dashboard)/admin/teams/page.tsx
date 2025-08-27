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
      status, crest_url, created_at, updated_at, requested_in_application_id
    `)
    .order("created_at", { ascending: false });

  const items: TeamRow[] = (teams ?? []).map(t => ({
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
  }));

  return (
    <main className="mx-auto max-w-6xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Equipos</h1>
        <p className="text-sm text-neutral-500">
          Gestioná solicitudes pendientes y editá equipos aprobados.
        </p>
      </div>

      {error && <p className="text-red-500">{error.message}</p>}

      <TeamsTableUI items={items} />
    </main>
  );
}
