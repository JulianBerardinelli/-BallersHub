import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { managerApplications } from "@/db/schema/managerApplications";
import { eq } from "drizzle-orm";
import { approveManagerApplication, rejectManagerApplication } from "@/app/actions/manager-applications";

export const metadata = {
  title: "Manager Onboarding (Pendientes) - Admin",
};

export default async function AdminManagerApplicationsPage() {
  const supa = await createSupabaseServerRSC();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: up } = await supa.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  // Fetch pending applications
  const pendingApps = await db.query.managerApplications.findMany({
    where: eq(managerApplications.status, "pending"),
    orderBy: (ma, { desc }) => [desc(ma.createdAt)],
  });

  const kycStorage = supa.storage.from("kyc");
  const appsWithUrls = await Promise.all(pendingApps.map(async (app) => {
    let idDocUrl = app.idDocUrl;
    let selfieUrl = app.selfieUrl;
    let licenseUrl = app.agentLicenseUrl;

    if (idDocUrl) {
      const { data } = await kycStorage.createSignedUrl(idDocUrl, 60 * 60 * 24);
      if (data?.signedUrl) idDocUrl = data.signedUrl;
    }
    if (selfieUrl) {
      const { data } = await kycStorage.createSignedUrl(selfieUrl, 60 * 60 * 24);
      if (data?.signedUrl) selfieUrl = data.signedUrl;
    }
    if (licenseUrl) {
      // Check if it's an external url or a storage path. Storage keys usually don't start with http
      if (!licenseUrl.startsWith("http")) {
        const { data } = await kycStorage.createSignedUrl(licenseUrl, 60 * 60 * 24);
        if (data?.signedUrl) licenseUrl = data.signedUrl;
      }
    }

    return { ...app, idDocUrl, selfieUrl, agentLicenseUrl: licenseUrl };
  }));

  if (appsWithUrls.length === 0) {
    return <div className="p-6">No hay solicitudes de managers pendientes.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Solicitudes de Managers / Agencias</h1>
      <div className="flex flex-col gap-4">
        {appsWithUrls.map(app => (
          <div key={app.id} className="border border-neutral-800 rounded-md p-4 bg-neutral-900/50 flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2 text-sm">
              <p><strong>Manager:</strong> {app.fullName} ({app.contactEmail}) {app.contactPhone}</p>
              <p><strong>Agencia:</strong> {app.agencyName}</p>
              <p><strong>Web:</strong> {app.agencyWebsiteUrl ? <a href={app.agencyWebsiteUrl} target="_blank" className="text-blue-400">Ver Web</a> : "N/A"}</p>
              <p><strong>Validación:</strong> <a href={app.verifiedLink ?? "#"} target="_blank" className="text-blue-400">Ver Validación</a></p>
              <p><strong>Tipo Licencia:</strong> {app.agentLicenseType || "Ninguna"}</p>
              {app.notes && <p><strong>Notas:</strong> {app.notes}</p>}
            </div>

            <div className="flex gap-4 items-center border-l border-neutral-800 pl-6">
              {app.agentLicenseUrl && (
                <a href={app.agentLicenseUrl} target="_blank" className="text-xs text-center">
                  <div className="w-16 h-16 bg-neutral-800 rounded flex items-center justify-center mb-1">PDF/IMG</div>
                  Licencia Oficial
                </a>
              )}
              {app.idDocUrl && (
                <a href={app.idDocUrl} target="_blank" className="text-xs text-center">
                  <div className="w-16 h-16 bg-neutral-800 rounded flex items-center justify-center overflow-hidden mb-1">
                    <img src={app.idDocUrl} alt="ID" className="object-cover w-full h-full" />
                  </div>
                  Documento ID
                </a>
              )}
              {app.selfieUrl && (
                <a href={app.selfieUrl} target="_blank" className="text-xs text-center">
                  <div className="w-16 h-16 bg-neutral-800 rounded flex items-center justify-center overflow-hidden mb-1">
                    <img src={app.selfieUrl} alt="Selfie" className="object-cover w-full h-full" />
                  </div>
                  Selfie
                </a>
              )}
            </div>

            <div className="flex flex-col gap-2 justify-center border-l border-neutral-800 pl-6 min-w-[150px]">
              <form action={async () => {
                "use server";
                await approveManagerApplication(app.id);
              }}>
                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-semibold text-sm">
                  Aprobar
                </button>
              </form>

              <form action={async () => {
                "use server";
                await rejectManagerApplication(app.id);
              }}>
                <button type="submit" className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-500 py-2 rounded-md font-semibold text-sm">
                  Rechazar
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
