// src/app/(dashboard)/admin/teams/page.tsx
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import TeamAdminCard from "./team_admin_card";

export default async function AdminTeamsPage() {
  noStore(); // 👈 evita cache en el listado

  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/teams");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, slug, country, status, crest_url, requested_by_user_id, requested_in_application_id, created_at, tags, alt_names, category, transfermarkt_url")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Equipos pendientes</h1>
      {error && <p className="text-red-500">{error.message}</p>}

      <div className="grid gap-4">
        {(teams ?? []).map((t) => (
          <TeamAdminCard key={t.id} team={t} />
        ))}
        {(!teams || teams.length === 0) && <p className="text-neutral-500">No hay equipos pendientes.</p>}
      </div>
    </main>
  );
}
