import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export default async function AdminApplicationsPage() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/applications");

  // ¿es admin?
  const { data: up } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const { data: apps, error } = await supabase
    .from("player_applications")
    .select("id,user_id,full_name,nationality,positions,current_club,transfermarkt_url,id_doc_url,selfie_url,plan_requested,created_at,status")
    .eq("status","pending")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Solicitudes de jugador (pendientes)</h1>
      {error && <p className="text-red-500">{error.message}</p>}
      <ul className="space-y-3">
        {(apps ?? []).map(a => (
          <li key={a.id} className="rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{a.full_name ?? "(sin nombre)"} — {a.plan_requested}</p>
                <p className="text-xs text-neutral-500">{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <form action={`/api/admin/applications/${a.id}/approve`} method="post">
                <button className="rounded-md border px-3 py-1.5">Aprobar</button>
              </form>
            </div>

            <div className="mt-3 text-sm text-neutral-300">
              {a.transfermarkt_url && <p>TM: <a className="underline" href={a.transfermarkt_url} target="_blank">link</a></p>}
              {a.id_doc_url && <KycLink path={a.id_doc_url} label="Documento" />}
              {a.selfie_url && <KycLink path={a.selfie_url} label="Selfie" />}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

// Componente server para firmar URL de KYC
async function KycLink({ path, label }: { path: string; label: string }) {
  const supabase = await createSupabaseServerRSC();
  // signed URL 5 min
  const { data, error } = await supabase.storage.from("kyc").createSignedUrl(path, 60*5);
  if (error || !data?.signedUrl) return <p className="text-red-500">No se pudo firmar {label}</p>;
  return <p>{label}: <a className="underline" href={data.signedUrl} target="_blank">ver</a></p>;
}
