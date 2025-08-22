import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard");

  const [{ data: pp }, { data: app }] = await Promise.all([
    supabase.from("player_profiles").select("id,status,slug,visibility").eq("user_id", user.id).maybeSingle(),
    supabase.from("player_applications").select("status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Mi Dashboard</h1>
      <p className="text-sm text-neutral-400">Sesión: {user.email}</p>

      {!pp && (
        <div className="rounded-lg border border-neutral-800 p-4">
          {app?.status === "pending" ? (
            <p className="text-neutral-300">Tu solicitud de cuenta de jugador está <b>en revisión</b>.</p>
          ) : (
            <p className="text-neutral-300">
              Aún no tenés un perfil de jugador.{" "}
              <a className="underline" href="/onboarding/start">Crear ahora</a>
            </p>
          )}
        </div>
      )}

      {pp && (
        <div className="rounded-lg border border-neutral-800 p-4">
          <p className="text-neutral-300">
            Perfil: <b>{pp.status}</b> — Visibilidad: <b>{pp.visibility}</b>
            {pp.slug ? <> — <a className="underline" href={`/${pp.slug}`} target="_blank">ver público</a></> : null}
          </p>
        </div>
      )}
    </main>
  );
}
