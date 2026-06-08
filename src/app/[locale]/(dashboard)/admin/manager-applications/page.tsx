import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { approveManagerApplication, rejectManagerApplication } from "@/app/actions/manager-applications";

import BhEmptyState from "@/components/ui/BhEmptyState";
import { bhButtonClass } from "@/components/ui/bh-button-class";

export const metadata = {
  title: "Manager Onboarding (Pendientes) - Admin",
};

// Mapped from snake_case Supabase REST to the camelCase the JSX
// below already uses (this used to come from a Drizzle select).
type ApplicationRow = {
  id: string;
  fullName: string;
  contactEmail: string;
  contactPhone: string | null;
  agencyName: string;
  agencyWebsiteUrl: string | null;
  verifiedLink: string | null;
  agentLicenseUrl: string | null;
  agentLicenseType: string | null;
  idDocUrl: string | null;
  selfieUrl: string | null;
  notes: string | null;
};

export default async function AdminManagerApplicationsPage() {
  const supa = await createSupabaseServerRSC();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: up } = await supa.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  // Migrated from Drizzle/postgres-js → Supabase REST (service role).
  // See PERFORMANCE_PLAN.md — this is one of the routes that
  // intermittently 504s in production.
  const admin = createSupabaseAdmin();
  const pendingRes = await admin
    .from("manager_applications")
    .select(
      "id, full_name, contact_email, contact_phone, agency_name, agency_website_url, verified_link, agent_license_url, agent_license_type, id_doc_url, selfie_url, notes",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const pendingApps: ApplicationRow[] = ((pendingRes.data ?? []) as Array<
    Record<string, unknown>
  >).map((row) => ({
    id: row.id as string,
    fullName: row.full_name as string,
    contactEmail: row.contact_email as string,
    contactPhone: (row.contact_phone as string | null) ?? null,
    agencyName: row.agency_name as string,
    agencyWebsiteUrl: (row.agency_website_url as string | null) ?? null,
    verifiedLink: (row.verified_link as string | null) ?? null,
    agentLicenseUrl: (row.agent_license_url as string | null) ?? null,
    agentLicenseType: (row.agent_license_type as string | null) ?? null,
    idDocUrl: (row.id_doc_url as string | null) ?? null,
    selfieUrl: (row.selfie_url as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  }));

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
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="font-bh-display text-xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-2xl">
            Solicitudes de managers / agencias
          </h2>
          <p className="text-sm leading-[1.55] text-bh-fg-3">
            Verificá la documentación y aprobá nuevos managers para la plataforma.
          </p>
        </header>
        <BhEmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="Bandeja vacía"
          description="No hay solicitudes de managers pendientes."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-2xl">
          Solicitudes de managers / agencias
        </h2>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Verificá la documentación y aprobá nuevos managers para la plataforma.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {appsWithUrls.map((app) => (
          <article
            key={app.id}
            className="flex flex-col gap-6 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5 md:flex-row"
          >
            <div className="flex-1 space-y-2 text-sm text-bh-fg-2">
              <p>
                <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
                  Manager
                </span>
                <br />
                <span className="text-bh-fg-1">{app.fullName}</span>{" "}
                <span className="text-bh-fg-4">
                  ({app.contactEmail}) {app.contactPhone}
                </span>
              </p>
              <p>
                <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
                  Agencia
                </span>
                <br />
                <span className="text-bh-fg-1">{app.agencyName}</span>
              </p>
              <p>
                <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
                  Web
                </span>
                <br />
                {app.agencyWebsiteUrl ? (
                  <a
                    href={app.agencyWebsiteUrl}
                    target="_blank"
                    className="text-bh-blue underline-offset-4 hover:underline"
                  >
                    Ver web
                  </a>
                ) : (
                  <span className="text-bh-fg-4">N/A</span>
                )}
              </p>
              <p>
                <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
                  Validación
                </span>
                <br />
                <a
                  href={app.verifiedLink ?? "#"}
                  target="_blank"
                  className="text-bh-blue underline-offset-4 hover:underline"
                >
                  Ver validación
                </a>
              </p>
              <p>
                <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
                  Tipo licencia
                </span>
                <br />
                <span className="text-bh-fg-2">{app.agentLicenseType || "Ninguna"}</span>
              </p>
              {app.notes && (
                <p>
                  <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
                    Notas
                  </span>
                  <br />
                  <span className="text-bh-fg-3">{app.notes}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-white/[0.06] pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              {app.agentLicenseUrl && (
                <a href={app.agentLicenseUrl} target="_blank" className="text-center text-[11px] text-bh-fg-3">
                  <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-bh-md border border-white/[0.08] bg-bh-surface-2 font-bh-mono">
                    PDF
                  </div>
                  Licencia
                </a>
              )}
              {app.idDocUrl && (
                <a href={app.idDocUrl} target="_blank" className="text-center text-[11px] text-bh-fg-3">
                  <div className="mb-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded-bh-md border border-white/[0.08] bg-bh-surface-2">
                    <img src={app.idDocUrl} alt="ID" className="h-full w-full object-cover" />
                  </div>
                  Documento
                </a>
              )}
              {app.selfieUrl && (
                <a href={app.selfieUrl} target="_blank" className="text-center text-[11px] text-bh-fg-3">
                  <div className="mb-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded-bh-md border border-white/[0.08] bg-bh-surface-2">
                    <img src={app.selfieUrl} alt="Selfie" className="h-full w-full object-cover" />
                  </div>
                  Selfie
                </a>
              )}
            </div>

            <div className="flex min-w-[160px] flex-col justify-center gap-2 border-t border-white/[0.06] pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <form
                action={async () => {
                  "use server";
                  await approveManagerApplication(app.id);
                }}
              >
                <button
                  type="submit"
                  className={bhButtonClass({ variant: "lime", size: "sm", className: "w-full" })}
                >
                  Aprobar
                </button>
              </form>

              <form
                action={async () => {
                  "use server";
                  await rejectManagerApplication(app.id);
                }}
              >
                <button
                  type="submit"
                  className={bhButtonClass({ variant: "danger-soft", size: "sm", className: "w-full" })}
                >
                  Rechazar
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
