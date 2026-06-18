import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CoachApplicationsPanel from "./CoachApplicationsPanel";

export const metadata = {
  title: "Solicitudes de DTs (Pendientes) - Ballers Hub",
};

export const dynamic = "force-dynamic";

export default async function AdminCoachApplicationsPage() {
  const supa = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/coach-applications");

  const { data: up } = await supa
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  // Trae la solicitud + sus propuestas de trayectoria embebidas (FK
  // coach_career_item_proposals.application_id → coach_applications.id).
  const { data: rawApps, error } = await supa
    .from("coach_applications")
    .select("*, coach_career_item_proposals(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  // Firmar las URLs de KYC (bucket privado) por 24h, como en el admin del jugador.
  const kycStorage = supa.storage.from("kyc");
  const apps = await Promise.all(
    (rawApps || []).map(async (app) => {
      let id_doc_url = app.id_doc_url as string | null;
      let selfie_url = app.selfie_url as string | null;
      if (id_doc_url) {
        const { data } = await kycStorage.createSignedUrl(id_doc_url, 60 * 60 * 24);
        if (data?.signedUrl) id_doc_url = data.signedUrl;
      }
      if (selfie_url) {
        const { data } = await kycStorage.createSignedUrl(selfie_url, 60 * 60 * 24);
        if (data?.signedUrl) selfie_url = data.signedUrl;
      }
      return { ...app, id_doc_url, selfie_url };
    }),
  );

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6 text-bh-danger">
        No se pudieron cargar las solicitudes: {error.message}
      </div>
    );
  }

  return <CoachApplicationsPanel initialItems={apps ?? []} />;
}
