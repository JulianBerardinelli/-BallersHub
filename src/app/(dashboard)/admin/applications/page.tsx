import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ApplicationsPanel from "./ApplicationsPanel";

export const metadata = {
  title: "Onboarding (Pendientes) - Ballers Hub",
};

export default async function AdminApplicationsPage() {
  const supa = await createSupabaseServerRSC();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: up } = await supa
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const { data: rawApps, error } = await supa
    .from("player_applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const kycStorage = supa.storage.from("kyc");
  const apps = await Promise.all((rawApps || []).map(async (app) => {
    let id_doc_url = app.id_doc_url;
    let selfie_url = app.selfie_url;

    if (id_doc_url) {
      const { data } = await kycStorage.createSignedUrl(id_doc_url, 60 * 60 * 24);
      if (data?.signedUrl) id_doc_url = data.signedUrl;
    }
    
    if (selfie_url) {
      const { data } = await kycStorage.createSignedUrl(selfie_url, 60 * 60 * 24);
      if (data?.signedUrl) selfie_url = data.signedUrl;
    }

    return { ...app, id_doc_url, selfie_url };
  }));

  const { data: countriesData } = await supa.from("countries").select("code, name_es");
  const countryMap = (countriesData || []).reduce((acc, curr) => {
    if (curr.name_es && curr.code) {
      acc[curr.name_es.toUpperCase()] = curr.code.toLowerCase();
    }
    return acc;
  }, {} as Record<string, string>);

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6 text-danger">
        No se pudieron cargar las solicitudes: {error.message}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Bandeja de Entrada: Onboarding</h1>
        <p className="text-sm text-neutral-500">
          Revisá y aprobá las nuevas solicitudes de creación de perfiles.
        </p>
      </header>

      <ApplicationsPanel initialItems={apps ?? []} countryMap={countryMap} />
    </div>
  );
}
