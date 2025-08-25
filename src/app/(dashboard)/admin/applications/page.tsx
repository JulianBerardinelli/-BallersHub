// src/app/(dashboard)/admin/applications/page.tsx
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

// ...tu AdminApplicationsPage aquí...
export default async function AdminApplicationsPage() {
  noStore(); // evitar cache
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/applications");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const { data: apps, error } = await supabase
    .from("player_applications")
    .select(`
      id,user_id,full_name,nationality,positions,current_club,transfermarkt_url,
      id_doc_url,selfie_url,plan_requested,created_at,status,
      current_team_id, proposed_team_name, proposed_team_country, proposed_team_category, proposed_team_transfermarkt_url, free_agent
    `)
    .eq("status","pending")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Solicitudes de jugador (pendientes)</h1>
      {error && <p className="text-red-500">{error.message}</p>}

      <ul className="space-y-3">
        {(apps ?? []).map(a => {
          const hasPendingTeam = !a.current_team_id && !!a.proposed_team_name && !a.free_agent;
          const canApprove = !!a.current_team_id || a.free_agent || !a.proposed_team_name;

          return (
            <li key={a.id} className="rounded-lg border border-neutral-800 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{a.full_name ?? "(sin nombre)"} — {a.plan_requested}</p>
                  <p className="text-xs text-neutral-500">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <form action={`/api/admin/applications/${a.id}/approve`} method="post">
                  <button className="rounded-md border px-3 py-1.5" disabled={!canApprove}>
                    {hasPendingTeam ? "Esperando equipo…" : "Aprobar"}
                  </button>
                </form>
              </div>

              <div className="mt-3 text-sm text-neutral-300 space-y-1">
                {a.transfermarkt_url && <p>TM jugador: <a className="underline" href={a.transfermarkt_url} target="_blank">link</a></p>}
                {a.id_doc_url && <KycLink path={a.id_doc_url} label="Documento" />}
                {a.selfie_url && <KycLink path={a.selfie_url} label="Selfie" />}

                {a.current_team_id && <TeamBadge teamId={a.current_team_id} />}

                {!a.current_team_id && a.proposed_team_name && (
                  <div className="text-amber-400">
                    <p>Propuso equipo: “{a.proposed_team_name}”
                      {a.proposed_team_country ? ` · ${a.proposed_team_country}` : ""}</p>
                    {a.proposed_team_category && <p>Categoría: {a.proposed_team_category}</p>}
                    {a.proposed_team_transfermarkt_url && (
                      <p>TM equipo: <a className="underline" href={a.proposed_team_transfermarkt_url} target="_blank">link</a></p>
                    )}
                    <p><a href="/admin/teams" className="underline">Revisar en Equipos pendientes</a></p>
                  </div>
                )}

                {a.free_agent && <p>Jugador libre (sin equipo)</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

// Server helper para firmar KYC (ya lo tenías)
async function KycLink({ path, label }: { path: string; label: string }) {
  const supabase = await createSupabaseServerRSC();
  const { data, error } = await supabase.storage.from("kyc").createSignedUrl(path, 60 * 5);
  if (error || !data?.signedUrl) return <p className="text-red-500">No se pudo firmar {label}</p>;
  return <p>{label}: <a className="underline" href={data.signedUrl} target="_blank">ver</a></p>;
}

// 👇 Server Component local (mismo archivo)
async function TeamBadge({ teamId }: { teamId: string }) {
  noStore(); // evitar cache de crest
  const supabase = await createSupabaseServerRSC();
  const { data } = await supabase
  .from("teams")
  .select("name, slug, crest_url, country, updated_at")
  .eq("id", teamId)
  .maybeSingle();

  const crestSrc = data?.crest_url
    ? `${data.crest_url}?v=${Date.parse(data.updated_at ?? "") || 0}`
    : "/images/team-default.svg";

  return (
    <div className="flex items-center gap-2">
      <img
        src={data ? data.crest_url : "/images/team-default.svg"}
        alt=""
        className="h-5 w-5 rounded-sm object-cover"
      />
      <span>
        Equipo: {data ? data.name : "Desconocido"}{data?.country ? ` · ${data.country}` : ""} @{data?.slug}
      </span>
    </div>
  );
}
